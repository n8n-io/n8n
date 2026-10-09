import { childNodes, compileLambdaSource, type LambdaRoot } from '@n8n/workflow-sdk/lambda';
import * as acorn from 'acorn';
import { Expression as N8nExpression, UserError, type IDataObject } from 'n8n-workflow';

/**
 * An n8n expression, e.g. `'={{ $json.name }}'` or `'=#{{ $json.name }}'`. The tsserver plugin of
 * `@n8n/expression-types` checks the code in it.
 */
export type Expression = `=${string}`;

/** The variable that an expression reads: the lookup entry, or the credential fields. */
export type ExpressionRoot = Extract<LambdaRoot, '$json' | '$credentials'>;

/** What code in an expression may read beside its root, as a lambda may. */
const GLOBALS = new Set([
	'JSON',
	'Math',
	'Number',
	'String',
	'Boolean',
	'Array',
	'Object',
	'parseInt',
	'parseFloat',
	'isNaN',
	'isFinite',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'decodeURI',
	'undefined',
	'NaN',
	'Infinity',
]);

/**
 * The n8n expression of a value: a string as it is, a lambda compiled over `root`. `label` names
 * the value in the error of a lambda that does not compile.
 */
export function expressionOf(
	value: string | ((...args: never[]) => unknown),
	root: ExpressionRoot,
	label: string,
): string {
	if (typeof value === 'string') return value;
	const compiled = compileLambdaSource(value.toString(), new Set(), root);
	if (!compiled.ok) throw new UserError(`${label}: ${compiled.error}`);
	return compiled.expression;
}

/** The code parts of an expression, as n8n reads them: from each `{{` to the next `}}`. */
function codeSpans(expression: string): Array<readonly [number, number]> {
	const spans: Array<readonly [number, number]> = [];
	for (let at = expression.indexOf('{{'); at !== -1; ) {
		const end = expression.indexOf('}}', at + 2);
		if (end === -1) break;
		spans.push([at + 2, end]);
		at = expression.indexOf('{{', end + 2);
	}
	return spans;
}

const namesOf = (pattern: acorn.AnyNode): string[] =>
	pattern.type === 'Identifier' ? [pattern.name] : childNodes(pattern).flatMap(namesOf);

/** The field that a member expression reads of `root`, `null` for a read that is not static. */
function staticKeyOf(node: acorn.MemberExpression): string | null {
	const { property } = node;
	if (!node.computed) return property.type === 'Identifier' ? property.name : null;
	return property.type === 'Literal' &&
		(typeof property.value === 'string' || typeof property.value === 'number')
		? String(property.value)
		: null;
}

interface Scan {
	/** The fields of the root that the expression reads. */
	readonly reads: readonly string[];
	readonly problems: readonly string[];
	/** Where the root name is, to rename it. */
	readonly roots: ReadonlyArray<readonly [number, number]>;
}

/**
 * Reads each code part of an expression. The code may read only static fields of `root`, its own
 * parameters and JavaScript globals: no other n8n variable, e.g. `$env`, and no `this`.
 */
export function scanExpression(expression: string, root: ExpressionRoot): Scan {
	if (!expression.startsWith('=')) return { reads: [], problems: [], roots: [] };
	const reads: string[] = [];
	const problems: string[] = [];
	const roots: Array<readonly [number, number]> = [];
	const visit = (node: acorn.AnyNode, offset: number, scope: ReadonlySet<string>): void => {
		if (node.type === 'MemberExpression') {
			if (node.object.type === 'Identifier' && node.object.name === root) {
				const key = staticKeyOf(node);
				if (key !== null) reads.push(key);
				else if (root === '$credentials') {
					problems.push(`reads ${root} with a key that is not a literal`);
				}
				roots.push([offset + node.object.start, offset + node.object.end]);
				if (node.computed) visit(node.property, offset, scope);
				return;
			}
			visit(node.object, offset, scope);
			if (node.computed) visit(node.property, offset, scope);
			return;
		}
		if (node.type === 'Identifier') {
			if (node.name === root) {
				// A credential value names each field it reads, so the checks of a field apply.
				if (root === '$credentials') problems.push(`reads ${root} as a whole; read one field`);
				roots.push([offset + node.start, offset + node.end]);
			} else if (!scope.has(node.name) && !GLOBALS.has(node.name)) {
				problems.push(`reads ${node.name}, which is not ${root} or a JavaScript global`);
			}
			return;
		}
		if (node.type === 'ThisExpression') {
			problems.push('reads this');
			return;
		}
		if (node.type === 'Property' && !node.computed && !node.shorthand) {
			visit(node.value, offset, scope);
			return;
		}
		if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
			const inner = new Set([...scope, ...node.params.flatMap(namesOf)]);
			visit(node.body, offset, inner);
			return;
		}
		for (const child of childNodes(node)) visit(child, offset, scope);
	};
	for (const [start, end] of codeSpans(expression)) {
		const code = expression.slice(start, end);
		try {
			const parsed = acorn.parseExpressionAt(code, 0, { ecmaVersion: 'latest' });
			if (code.slice(parsed.end).trim() !== '') throw new SyntaxError('more than one expression');
			visit(parsed, start, new Set());
		} catch (error) {
			problems.push(
				`{{${code}}} is not one JavaScript expression: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	return { reads, problems, roots };
}

/** The expression with each read of `from` reading `to`, e.g. `$self` for a hidden n8n field. */
export function withRoot(expression: string, from: ExpressionRoot, to: string): string {
	return [...scanExpression(expression, from).roots]
		.sort(([a], [b]) => b - a)
		.reduce((text, [start, end]) => text.slice(0, start) + to + text.slice(end), expression);
}

/**
 * The value of an expression over `data`, e.g. `{ $json: entry }`, in the n8n expression sandbox.
 * Text that does not start with `=` is its own value.
 */
export function evaluated(expression: string, data: IDataObject): unknown {
	if (!expression.startsWith('=')) return expression;
	const value = N8nExpression.resolveWithoutWorkflow(expression.slice(1), data);
	return typeof value === 'function' ? value() : value;
}
