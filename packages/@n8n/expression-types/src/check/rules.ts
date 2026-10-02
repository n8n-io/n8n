// What the n8n expression check reports, shared by every caller of `shadowOf`: which errors of
// the shadow count, and n8n's own sandbox rules. The rules read the shadow's syntax tree through
// `CheckAst`, the part of a TypeScript AST API that TypeScript 6 (`typescript`) and TypeScript 7
// (`typescript/unstable/ast`) both have. This module does not import a TypeScript API.
import { locate, type Located, type Shadow } from './shadow';

/**
 * The property that marks a type as an n8n expression. A field whose type a call infers from its
 * value has the type of the value there, so a branded value marks the field.
 */
export const EXPRESSION_BRAND = '__n8n';

/**
 * A callback parameter over an untyped read, e.g. `$json.list.filter(o => …)` after `node()`.
 * It is `any` in plain JavaScript too, and the expression cannot declare its type.
 */
const IMPLICIT_ANY_ERRORS = new Set([7006, 7031]);

/** Errors of TypeScript that are bugs in plain JavaScript too. Others are type strictness. */
const CODE_ERRORS = new Set([2304, 2339, 2349, 2448, 2551, 2552, 2588]);

/** TypeScript codes 1000-1999 are syntax errors. */
const FIRST_SEMANTIC_ERROR = 2000;

/** The rule name that sandbox rule errors carry in place of a TypeScript code. */
export const SANDBOX_RULE = 'n8n';

export const resultMismatchMessage = (reasons: readonly string[]) =>
	`The expression result does not fit the field: ${reasons.join(' ')}`;

export interface CheckNode<N> {
	readonly parent: N;
	readonly end: number;
	getStart(): number;
	forEachChild(visit: (node: N) => void): unknown;
}

type Named = { readonly text: string };

/** The guards of a TypeScript AST API that the rules use. Pass the API module itself. */
export interface CheckAst<N extends CheckNode<N>> {
	readonly SyntaxKind: { readonly EqualsToken: number };
	isPropertyAccessExpression(
		node: N,
	): node is N & { readonly expression: N; readonly name: N & Named };
	isElementAccessExpression(node: N): node is N & { readonly argumentExpression: N };
	isStringLiteral(node: N): node is N & Named;
	isIdentifier(node: N): node is N & Named;
	isCallExpression(node: N): node is N & { readonly expression: N };
	isClassDeclaration(node: N): node is N & { readonly heritageClauses?: ArrayLike<unknown> };
	isClassExpression(node: N): node is N & { readonly heritageClauses?: ArrayLike<unknown> };
	isBinaryExpression(
		node: N,
	): node is N & { readonly left: N; readonly operatorToken: { readonly kind: number } };
}

function walk<N extends CheckNode<N>>(root: N, visit: (node: N) => void): void {
	const each = (node: N): void => {
		visit(node);
		node.forEachChild(each);
	};
	root.forEachChild(each);
}

/**
 * In JavaScript, `object.field = value` adds a field, so code that adds a field may read it.
 * The shadow offsets of the reads `object.field` when the code also assigns `object.field`.
 */
export function addedFieldReads<N extends CheckNode<N>>(
	ast: CheckAst<N>,
	root: N,
	text: string,
): Set<number> {
	const accesses: Array<{ pos: number; key: string }> = [];
	const added = new Set<string>();
	const keyOf = (node: { readonly expression: N; readonly name: Named }) =>
		`${text.slice(node.expression.getStart(), node.expression.end)}.${node.name.text}`;
	walk(root, (node) => {
		if (ast.isPropertyAccessExpression(node)) {
			accesses.push({ pos: node.name.getStart(), key: keyOf(node) });
		}
		if (
			ast.isBinaryExpression(node) &&
			node.operatorToken.kind === ast.SyntaxKind.EqualsToken &&
			ast.isPropertyAccessExpression(node.left)
		) {
			added.add(keyOf(node.left));
		}
	});
	return new Set(accesses.filter(({ key }) => added.has(key)).map(({ pos }) => pos));
}

/**
 * The source place of a shadow error that the check reports, or `undefined` when it does not
 * count: no expression owns it, it is an untyped callback parameter, or, in Code, it is type
 * strictness rather than a bug, or the read of a field that the code adds.
 */
export function findingOf(
	shadow: Shadow,
	diagnostic: { readonly pos: number; readonly code: number },
	addedReads: ReadonlySet<number>,
): Located | undefined {
	const { pos, code } = diagnostic;
	const located = locate(shadow, pos, code);
	if (!located || (located.inBody && IMPLICIT_ANY_ERRORS.has(code))) return undefined;
	if (located.replacement.span.kind !== 'code') return located;
	const syntax = code < FIRST_SEMANTIC_ERROR;
	const added = (code === 2339 || code === 2551) && addedReads.has(pos);
	return located.inBody && !added && (syntax || CODE_ERRORS.has(code)) ? located : undefined;
}

/** n8n's own expression rules, which its sandbox enforces rather than types (expression-sandboxing.ts). */
export function sandboxRuleIssues<N extends CheckNode<N>>(
	ast: CheckAst<N>,
	root: N,
	shadow: Shadow,
): Array<{ readonly start: number; readonly message: string }> {
	const issues: Array<{ start: number; message: string }> = [];
	const report = (pos: number, message: string) => {
		const located = locate(shadow, pos, 0);
		if (located?.inBody && located.replacement.span.kind !== 'code') {
			issues.push({ start: located.start, message });
		}
	};
	walk(root, (node) => {
		const pos = node.getStart();
		const member = ast.isPropertyAccessExpression(node)
			? node.name.text
			: ast.isElementAccessExpression(node) && ast.isStringLiteral(node.argumentExpression)
				? node.argumentExpression.text
				: undefined;
		const memberPos = ast.isPropertyAccessExpression(node) ? node.name.getStart() : pos;
		if (member === 'constructor') {
			report(
				memberPos,
				"Expression contains invalid constructor function call. n8n rejects any '.constructor' access.",
			);
		} else if (member === 'prototype' || member === '__proto__') {
			report(memberPos, 'n8n blocks prototype access in expressions.');
		} else if (
			ast.isIdentifier(node) &&
			node.text === '$' &&
			!(ast.isCallExpression(node.parent) && node.parent.expression === node) &&
			!(ast.isPropertyAccessExpression(node.parent) && node.parent.name === node)
		) {
			report(pos, 'Cannot access "$" without calling it as a function.');
		} else if (
			(ast.isClassDeclaration(node) || ast.isClassExpression(node)) &&
			(node.heritageClauses?.length ?? 0) > 0
		) {
			report(pos, 'Cannot use dynamic class extension due to security concerns.');
		}
	});
	return issues;
}
