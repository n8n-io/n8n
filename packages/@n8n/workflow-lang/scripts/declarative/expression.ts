/**
 * Translates the n8n expressions of a declarative node description into
 * workflow subset code.
 *
 * The translator edits the expression text: it replaces the n8n variables
 * (`$parameter`, `$value`, `$response`, ...) with local names, and rejects
 * what it cannot translate. The compiler checks the rest of the subset later.
 */
import ts from 'typescript';

/** True when the code has a syntax error. */
function hasSyntaxErrors(code: string): boolean {
	const { diagnostics } = ts.transpileModule(code, { reportDiagnostics: true });
	return (diagnostics ?? []).length > 0;
}

export class Untranslatable extends Error {}

/** What an expression can see where it occurs. */
export interface ExpressionScope {
	/** Code for `$value`, or undefined when `$value` is not available. */
	value?: string;
	/** Code for `$parameter.<name>`. */
	parameter: (name: string) => string;
	/** Code for `$response`, when available. */
	response?: string;
	/** Code for `$responseItem`, when available. */
	responseItem?: string;
	/** Code for `$index` and `$parent` in a fixed collection. */
	index?: string;
	parent?: string;
	version: number;
	/** The helpers that the translated code calls. */
	helpers: Set<string>;
}

const GLOBALS = new Set([
	'String',
	'Number',
	'Boolean',
	'JSON',
	'Math',
	'Object',
	'Array',
	'parseInt',
	'parseFloat',
	'isNaN',
	'undefined',
	'NaN',
	'Infinity',
]);

const RENAMED_FUNCTIONS: Record<string, string> = {
	toPathSegment: 'toPathSegment',
	encodeURIComponent: 'encodeComponent',
	encodeURI: 'encodeUri',
};

interface Edit {
	start: number;
	end: number;
	text: string;
}

/** Reads `$credentials.a.b` or `$credentials["a"]`. Returns the path and the outermost node. */
function credentialChain(node: ts.Identifier): { path: string[]; outer: ts.Expression } | null {
	const path: string[] = [];
	let outer: ts.Expression = node;
	for (;;) {
		const parent = outer.parent;
		if (ts.isPropertyAccessExpression(parent) && parent.expression === outer) {
			path.push(parent.name.text);
			outer = parent;
		} else if (
			ts.isElementAccessExpression(parent) &&
			parent.expression === outer &&
			ts.isStringLiteral(parent.argumentExpression)
		) {
			path.push(parent.argumentExpression.text);
			outer = parent;
		} else {
			break;
		}
	}
	return path.length > 0 ? { path, outer } : null;
}

/** True when a string-valued node is used as text: in `+`, a template or as the whole expression. */
function usedAsText(node: ts.Node, root: ts.Node): boolean {
	let current = node;
	while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
	const parent = current.parent;
	if (current === root || parent === root) return true;
	if (ts.isTemplateSpan(parent)) return true;
	if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.PlusToken) {
		return true;
	}
	return false;
}

function declaredNames(root: ts.Node): Set<string> {
	const names = new Set<string>();
	const visit = (node: ts.Node) => {
		if ((ts.isParameter(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name)) {
			names.add(node.name.text);
		}
		ts.forEachChild(node, visit);
	};
	visit(root);
	return names;
}

function isPropertyName(node: ts.Identifier): boolean {
	const parent = node.parent;
	return (
		(ts.isPropertyAccessExpression(parent) && parent.name === node) ||
		(ts.isPropertyAssignment(parent) && parent.name === node) ||
		(ts.isShorthandPropertyAssignment(parent) && false)
	);
}

/** Translates the code inside one `{{ ... }}`. */
export function translateExpression(code: string, scope: ExpressionScope): string {
	const wrapped = `(${code.trim()}\n)`;
	const sf = ts.createSourceFile('expression.ts', wrapped, ts.ScriptTarget.ES2022, true);
	const statement = sf.statements[0];
	if (
		sf.statements.length !== 1 ||
		!statement ||
		!ts.isExpressionStatement(statement) ||
		hasSyntaxErrors(sf.text)
	) {
		throw new Untranslatable(`cannot parse expression: ${code.trim()}`);
	}
	const root = statement.expression;
	const locals = declaredNames(root);
	const edits: Edit[] = [];
	const replace = (node: ts.Node, text: string) =>
		edits.push({ start: node.getStart(sf), end: node.getEnd(), text });

	const visit = (node: ts.Node): void => {
		if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
			throw new Untranslatable('regular expression');
		}
		if (ts.isNewExpression(node)) {
			throw new Untranslatable(`"new ${node.expression.getText(sf)}"`);
		}
		if (ts.isShorthandPropertyAssignment(node)) {
			throw new Untranslatable('shorthand property');
		}
		if (ts.isIdentifier(node) && !isPropertyName(node)) {
			const name = node.text;
			if (name === '$parameter' || name === '$rawParameter') {
				const parent = node.parent;
				let field: string | undefined;
				if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
					field = parent.name.text;
				} else if (
					ts.isElementAccessExpression(parent) &&
					parent.expression === node &&
					ts.isStringLiteral(parent.argumentExpression)
				) {
					field = parent.argumentExpression.text;
				}
				if (field === undefined) throw new Untranslatable('"$parameter" without a field name');
				replace(parent, scope.parameter(field));
				return;
			}
			if (name === '$credentials') {
				const chain = credentialChain(node);
				if (!chain) throw new Untranslatable('"$credentials" without a field name');
				if (!usedAsText(chain.outer, root)) {
					throw new Untranslatable('a credential field is used other than as text');
				}
				replace(chain.outer, JSON.stringify(`{{$credentials.${chain.path.join('.')}}}`));
				return;
			}
			if (name === '$value') {
				if (scope.value === undefined) throw new Untranslatable('"$value" is not available here');
				replace(node, scope.value);
				return;
			}
			if (name === '$response') {
				if (scope.response === undefined) throw new Untranslatable('"$response" is not available');
				const parent = node.parent;
				if (
					ts.isPropertyAccessExpression(parent) &&
					parent.expression === node &&
					parent.name.text === 'statusCode'
				) {
					replace(parent, `${scope.response}.status`);
					return;
				}
				replace(node, scope.response);
				return;
			}
			if (name === '$responseItem') {
				if (scope.responseItem === undefined) {
					throw new Untranslatable('"$responseItem" is not available');
				}
				replace(node, scope.responseItem);
				return;
			}
			if (name === '$index' || name === '$parent') {
				const local = name === '$index' ? scope.index : scope.parent;
				if (local === undefined) throw new Untranslatable(`"${name}" is not available`);
				replace(node, local);
				return;
			}
			if (name === '$version') {
				replace(node, String(scope.version));
				return;
			}
			if (Object.hasOwn(RENAMED_FUNCTIONS, name)) {
				const helper = RENAMED_FUNCTIONS[name];
				scope.helpers.add(helper);
				replace(node, helper);
				return;
			}
			if (name === 'Boolean' || name === 'String' || name === 'Number') {
				const parent = node.parent;
				const called = ts.isCallExpression(parent) && parent.expression === node;
				const member = ts.isPropertyAccessExpression(parent) && parent.expression === node;
				// The subset cannot pass a library function as a value, as in `.filter(Boolean)`.
				if (!called && !member) {
					replace(node, `((v) => ${name}(v))`);
					return;
				}
			}
			if (name.startsWith('$')) throw new Untranslatable(`"${name}"`);
			if (!locals.has(name) && !GLOBALS.has(name)) throw new Untranslatable(`"${name}"`);
		}
		ts.forEachChild(node, visit);
	};
	visit(root);

	let out = wrapped;
	for (const edit of edits.sort((a, b) => b.start - a.start)) {
		out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
	}
	return out.replace(/\n\)$/, ')');
}

/** Renders a literal value as code. */
export function literal(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') {
		const escaped = JSON.stringify(value).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'");
		return `'${escaped}'`;
	}
	return JSON.stringify(value) ?? 'undefined';
}

/**
 * Translates a description value: an expression (`=...`), a template
 * (`=text {{ x }} text`) or a literal. Objects and arrays translate member by
 * member, as n8n resolves expressions inside them.
 */
export function translateValue(value: unknown, scope: ExpressionScope): string {
	if (Array.isArray(value)) return `[${value.map((v) => translateValue(v, scope)).join(', ')}]`;
	if (typeof value === 'object' && value !== null) {
		const members = Object.entries(value).map(
			([k, v]) => `${literal(k)}: ${translateValue(v, scope)}`,
		);
		return `{ ${members.join(', ')} }`;
	}
	if (typeof value === 'function') throw new Untranslatable('function value');
	if (typeof value !== 'string' || !value.startsWith('=')) return literal(value);
	const body = value.slice(1);
	if (body.startsWith('{{') && body.endsWith('}}')) {
		const inner = body.slice(2, -2);
		if (!inner.includes('{{') && !inner.includes('}}')) {
			return translateExpression(inner, scope);
		}
	}
	const parts: string[] = [];
	let rest = body;
	while (rest.length > 0) {
		const start = rest.indexOf('{{');
		if (start < 0) {
			parts.push(literal(rest));
			break;
		}
		if (start > 0) parts.push(literal(rest.slice(0, start)));
		const end = rest.indexOf('}}', start);
		if (end < 0) throw new Untranslatable(`unclosed expression: ${value}`);
		scope.helpers.add('str');
		parts.push(`str(${translateExpression(rest.slice(start + 2, end), scope)})`);
		rest = rest.slice(end + 2);
	}
	return parts.length === 0 ? "''" : parts.join(' + ');
}
