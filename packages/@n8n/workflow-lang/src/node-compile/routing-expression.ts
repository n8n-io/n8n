import ts from 'typescript';

export class RoutingRefusal extends Error {}

export interface RoutingScope {
	value?: string;
	parameter: (name: string) => string;
	credentials?: string;
	response?: string;
	responseItem?: string;
	request?: string;
	index?: string;
	parent?: string;
	version: number;
}

const GLOBAL_NAMES = new Set([
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
	'encodeURIComponent',
	'encodeURI',
]);

const NATIVE_METHODS = new Set([
	'toString',
	'toLowerCase',
	'toUpperCase',
	'trim',
	'split',
	'join',
	'map',
	'filter',
	'includes',
	'replace',
	'slice',
	'substring',
	'startsWith',
	'endsWith',
	'concat',
	'indexOf',
	'some',
	'every',
	'find',
	'keys',
	'values',
	'entries',
	'stringify',
	'parse',
	'isArray',
	'floor',
	'ceil',
	'round',
	'min',
	'max',
	'padStart',
	'toFixed',
	'pop',
	'charAt',
	'lastIndexOf',
	'trimStart',
	'trimEnd',
]);

function hasSyntaxErrors(code: string): boolean {
	const { diagnostics } = ts.transpileModule(code, { reportDiagnostics: true });
	return (diagnostics ?? []).length > 0;
}

function declaredNames(root: ts.Node): Set<string> {
	const names = new Set<string>();
	const visit = (node: ts.Node) => {
		if ((ts.isParameter(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name))
			names.add(node.name.text);
		ts.forEachChild(node, visit);
	};
	visit(root);
	return names;
}

function isMemberName(node: ts.Identifier): boolean {
	const parent = node.parent;
	return (
		(ts.isPropertyAccessExpression(parent) && parent.name === node) ||
		(ts.isPropertyAssignment(parent) && parent.name === node)
	);
}

function fieldOf(node: ts.Identifier): { field: string; outer: ts.Expression } | undefined {
	const parent = node.parent;
	if (ts.isPropertyAccessExpression(parent) && parent.expression === node)
		return { field: parent.name.text, outer: parent };
	if (
		ts.isElementAccessExpression(parent) &&
		parent.expression === node &&
		ts.isStringLiteral(parent.argumentExpression)
	)
		return { field: parent.argumentExpression.text, outer: parent };
	return undefined;
}

interface Translated {
	code: string;
	fails: boolean;
}

function translateExpression(code: string, scope: RoutingScope): Translated {
	const wrapped = `(${code.trim()}\n)`;
	const sf = ts.createSourceFile('expression.ts', wrapped, ts.ScriptTarget.ES2022, true);
	const statement = sf.statements[0];
	if (
		sf.statements.length !== 1 ||
		!statement ||
		!ts.isExpressionStatement(statement) ||
		hasSyntaxErrors(sf.text)
	)
		throw new RoutingRefusal(`the expression '${code.trim()}' does not parse`);
	const root = statement.expression;
	const locals = declaredNames(root);
	const edits: Array<{ start: number; end: number; text: string }> = [];
	let fails = false;
	const replace = (node: ts.Node, text: string): void => {
		edits.push({ start: node.getStart(sf), end: node.getEnd(), text });
	};
	const need = (text: string | undefined, name: string): string => {
		if (text === undefined) throw new RoutingRefusal(`'${name}' has no value at this place`);
		return text;
	};
	const visit = (node: ts.Node): void => {
		if (ts.isNewExpression(node))
			throw new RoutingRefusal(`'new ${node.expression.getText(sf)}' in an expression`);
		if (ts.isShorthandPropertyAssignment(node))
			throw new RoutingRefusal('a shorthand property in an expression');
		if (
			ts.isFunctionExpression(node) ||
			ts.isAwaitExpression(node) ||
			ts.isTaggedTemplateExpression(node)
		)
			throw new RoutingRefusal('a function, await or tagged template in an expression');
		if (ts.isCallExpression(node)) {
			fails = true;
			const callee = node.expression;
			if (ts.isPropertyAccessExpression(callee)) {
				if (!NATIVE_METHODS.has(callee.name.text))
					throw new RoutingRefusal(`the method '${callee.name.text}' in an expression`);
			} else if (!ts.isIdentifier(callee) || !GLOBAL_NAMES.has(callee.text)) {
				throw new RoutingRefusal(`the call '${callee.getText(sf)}' in an expression`);
			}
		}
		if (
			(ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
			!node.questionDotToken
		)
			fails = true;
		if (ts.isIdentifier(node) && !isMemberName(node)) {
			const name = node.text;
			if (name === '$parameter') {
				const read = fieldOf(node);
				if (!read) throw new RoutingRefusal("'$parameter' without a parameter name");
				replace(read.outer, scope.parameter(read.field));
				return;
			}
			if (name === '$credentials') {
				const read = fieldOf(node);
				if (!read) throw new RoutingRefusal("'$credentials' without a field name");
				replace(node, need(scope.credentials, name));
				return;
			}
			if (name === '$value') return replace(node, need(scope.value, name));
			if (name === '$response') return replace(node, need(scope.response, name));
			if (name === '$responseItem') return replace(node, need(scope.responseItem, name));
			if (name === '$request') return replace(node, need(scope.request, name));
			if (name === '$index') return replace(node, need(scope.index, name));
			if (name === '$parent') return replace(node, need(scope.parent, name));
			if (name === '$version') return replace(node, String(scope.version));
			if (name.startsWith('$') || (!locals.has(name) && !GLOBAL_NAMES.has(name)))
				throw new RoutingRefusal(`the name '${name}' in an expression`);
		}
		ts.forEachChild(node, visit);
	};
	visit(root);
	let out = wrapped;
	for (const edit of edits.sort((a, b) => b.start - a.start))
		out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
	return { code: out.replace(/\n\)$/, ')'), fails };
}

export function routingLiteral(value: unknown): string {
	return value === undefined ? 'undefined' : (JSON.stringify(value) ?? 'undefined');
}

function guarded(translated: Translated): string {
	return translated.fails
		? `(() => { try { return ${translated.code}; } catch (error) { return null; } })()`
		: translated.code;
}

function translateText(value: string, scope: RoutingScope, objectAsText: boolean): string {
	const body = value.slice(1);
	if (body.startsWith('{{') && body.endsWith('}}')) {
		const inner = body.slice(2, -2);
		if (!inner.includes('{{') && !inner.includes('}}')) {
			const code = guarded(translateExpression(inner, scope));
			return objectAsText ? `routingName(${code})` : code;
		}
	}
	const parts: string[] = [];
	let fails = false;
	let rest = body;
	while (rest.length > 0) {
		const start = rest.indexOf('{{');
		if (start < 0) {
			parts.push(routingLiteral(rest));
			break;
		}
		if (start > 0) parts.push(routingLiteral(rest.slice(0, start)));
		const end = rest.indexOf('}}', start);
		if (end < 0) throw new RoutingRefusal(`the expression '${value}' has no end`);
		const translated = translateExpression(rest.slice(start + 2, end), scope);
		fails ||= translated.fails;
		parts.push(`routingText(${translated.code})`);
		rest = rest.slice(end + 2);
	}
	return guarded({ code: parts.length === 0 ? '""' : `(${parts.join(' + ')})`, fails });
}

export function routingValue(value: unknown, scope: RoutingScope, objectAsText = false): string {
	if (Array.isArray(value)) return `[${value.map((v) => routingValue(v, scope)).join(', ')}]`;
	if (typeof value === 'function') throw new RoutingRefusal('a function as a routing value');
	if (typeof value === 'object' && value !== null) {
		if (Object.getPrototypeOf(value) !== Object.prototype)
			throw new RoutingRefusal('a routing value that is not plain data');
		const members = Object.entries(value).map(
			([key, member]) => `${JSON.stringify(key)}: ${routingValue(member, scope)}`,
		);
		return `{ ${members.join(', ')} }`;
	}
	if (typeof value !== 'string' || !value.startsWith('=')) return routingLiteral(value);
	return translateText(value, scope, objectAsText);
}

export const ROUTING_TEXT_HELPERS = `function routingText(value: any): string {
	if (value === undefined || value === null || value === false || value === '') return '';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

function routingName(value: any): any {
	if (typeof value !== 'object' || value === null) return value;
	return '[' + (Array.isArray(value) ? 'Array' : 'Object') + ': ' + JSON.stringify(value) + ']';
}
`;
