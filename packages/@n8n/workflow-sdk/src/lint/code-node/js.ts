import * as acorn from 'acorn';
import type { CallExpression, Node, Program } from 'estree';

import { walkAst } from '../ast-walk';
import type { CodeExecutionMode } from './extract-snippets';
import { lintIssue, type SourceLintIssue } from '../types';

const NETWORK_CALLEE_NAMES = new Set(['fetch', 'axios', 'XMLHttpRequest']);

const HTTP_MODULES = new Set([
	'http',
	'https',
	'http2',
	'node-fetch',
	'axios',
	'got',
	'undici',
	'node:http',
	'node:https',
	'node:http2',
]);

const FORBIDDEN_MODULE_PREFIXES = ['luxon', 'openai', '@openai/', 'langchain', '@langchain/'];

/**
 * $input methods rejected at runtime in runOnceForEachItem mode — mirrors
 * validateNoDisallowedMethodsInRunForEach in nodes-base/Code.
 */
const EACH_ITEM_DISALLOWED_INPUT_METHODS = new Set(['first', 'last', 'all', 'itemMatching']);

export interface LintJsCodeOptions {
	mode?: CodeExecutionMode;
	nodeName?: string;
}

function parseJs(code: string): Program | undefined {
	const opts = {
		ecmaVersion: 'latest' as const,
		locations: true,
		// Code-node bodies are function bodies; agents often start with `return …`.
		allowReturnOutsideFunction: true,
	};
	try {
		return acorn.parse(code, { ...opts, sourceType: 'script' }) as unknown as Program;
	} catch {
		try {
			return acorn.parse(code, { ...opts, sourceType: 'module' }) as unknown as Program;
		} catch {
			return undefined;
		}
	}
}

function stringLiteralArg(node: Node | undefined): string | undefined {
	if (!node) return undefined;
	if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
	return undefined;
}

function isRequireCall(call: CallExpression): boolean {
	return call.callee.type === 'Identifier' && call.callee.name === 'require';
}

function moduleSpecifierFromCall(call: CallExpression): string | undefined {
	if (isRequireCall(call)) {
		return stringLiteralArg(call.arguments[0] as Node | undefined);
	}
	return undefined;
}

function moduleIsForbidden(specifier: string): boolean {
	return FORBIDDEN_MODULE_PREFIXES.some(
		(prefix) => specifier === prefix || specifier.startsWith(prefix),
	);
}

function hasNestedTemplateLiteral(ast: Program): boolean {
	let found = false;
	walkAst(ast, (node) => {
		if (found || node.type !== 'TemplateLiteral') return;
		for (const expr of node.expressions) {
			let nested = false;
			walkAst(expr, (inner) => {
				if (inner.type === 'TemplateLiteral') nested = true;
			});
			if (nested) {
				found = true;
				return;
			}
		}
	});
	return found;
}

/**
 * Lint JavaScript written for a Code node (`jsCode` parameter).
 * Uses acorn so comments/strings do not trigger false positives.
 */
export function lintJsCode(jsCode: string, options: LintJsCodeOptions = {}): SourceLintIssue[] {
	if (jsCode.length === 0) return [];

	const ast = parseJs(jsCode);
	if (!ast) return [];

	const issues: SourceLintIssue[] = [];
	const namePrefix = options.nodeName ? `'${options.nodeName}' ` : '';
	let sawNetwork = false;
	let sawForbiddenImport = false;
	let disallowedInputMethod: string | undefined;

	walkAst(ast, (node) => {
		if (node.type === 'ImportDeclaration') {
			const source = node.source.type === 'Literal' ? String(node.source.value) : '';
			if (moduleIsForbidden(source)) sawForbiddenImport = true;
			if (HTTP_MODULES.has(source)) sawNetwork = true;
			return;
		}

		if (node.type === 'ImportExpression') {
			const mod = stringLiteralArg(node.source);
			if (mod) {
				if (HTTP_MODULES.has(mod)) sawNetwork = true;
				if (moduleIsForbidden(mod)) sawForbiddenImport = true;
			}
			return;
		}

		if (node.type === 'CallExpression') {
			const call = node;

			if (call.callee.type === 'Identifier' && NETWORK_CALLEE_NAMES.has(call.callee.name)) {
				sawNetwork = true;
			}
			if (
				call.callee.type === 'MemberExpression' &&
				!call.callee.computed &&
				call.callee.property.type === 'Identifier' &&
				EACH_ITEM_DISALLOWED_INPUT_METHODS.has(call.callee.property.name) &&
				call.callee.object.type === 'Identifier' &&
				call.callee.object.name === '$input' &&
				disallowedInputMethod === undefined
			) {
				disallowedInputMethod = call.callee.property.name;
			}

			const required = moduleSpecifierFromCall(call);
			if (required) {
				if (HTTP_MODULES.has(required)) sawNetwork = true;
				if (moduleIsForbidden(required)) sawForbiddenImport = true;
			}
		}

		if (
			node.type === 'NewExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === 'XMLHttpRequest'
		) {
			sawNetwork = true;
		}
	});

	if (sawNetwork) {
		issues.push(
			lintIssue({
				code: 'CODE_NODE_NETWORK_CALL',
				message:
					`${namePrefix}Code node calls fetch/axios/XMLHttpRequest or requires an HTTP module. ` +
					'Code nodes have no network access at runtime — make the HTTP/API call with an HTTP Request node ' +
					'and transform its output in the Code node instead.',
				lintTarget: 'jsCode',
				nodeName: options.nodeName,
				parameterPath: 'jsCode',
			}),
		);
	}

	if (sawForbiddenImport) {
		issues.push(
			lintIssue({
				code: 'CODE_NODE_FORBIDDEN_IMPORT',
				message:
					`${namePrefix}Code node imports a module unavailable in the sandbox (luxon, openai, langchain, …). ` +
					'Use JavaScript `Date`/`Intl`, `$now`/`$today`, existing workflow data, or dedicated AI nodes instead.',
				lintTarget: 'jsCode',
				nodeName: options.nodeName,
				parameterPath: 'jsCode',
			}),
		);
	}

	if (options.mode === 'runOnceForEachItem' && disallowedInputMethod !== undefined) {
		issues.push(
			lintIssue({
				code: 'CODE_MODE_API_MISUSE',
				message:
					`${namePrefix}uses mode: 'runOnceForEachItem' but calls $input.${disallowedInputMethod}(). ` +
					`$input.${disallowedInputMethod}() is only available in runOnceForAllItems (the default). ` +
					'Switch mode to runOnceForAllItems, or use $input.item / $json for per-item work.',
				lintTarget: 'jsCode',
				nodeName: options.nodeName,
				parameterPath: 'jsCode',
			}),
		);
	}

	if (hasNestedTemplateLiteral(ast)) {
		issues.push(
			lintIssue({
				code: 'CODE_NESTED_TEMPLATE_LITERAL',
				message:
					`${namePrefix}Code node uses nested template literals, which often break after save. ` +
					'Build multi-line strings with arrays joined by a runtime separator, e.g. ' +
					'`const LF = String.fromCharCode(10); return lines.join(LF);`.',
				lintTarget: 'jsCode',
				nodeName: options.nodeName,
				parameterPath: 'jsCode',
			}),
		);
	}

	return issues;
}

/** @deprecated Use lintJsCode — nested templates are detected via AST there. */
export function hasNestedTemplateLiterals(jsCode: string): boolean {
	const ast = parseJs(jsCode);
	return ast ? hasNestedTemplateLiteral(ast) : false;
}
