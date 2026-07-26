/**
 * Source-level lint for workflow SDK TypeScript (builder code only).
 *
 * Does not inspect jsCode / pythonCode embedded in Code node configs — those
 * are linted separately by code-node-js-lint and code-node-python-lint.
 */

import type { CallExpression, Expression, MemberExpression, Node, Program } from 'estree';

import { FORBIDDEN_NODE_TYPES, DANGEROUS_GLOBALS, parseSDKCode } from '../ast-interpreter';
import { isEmbeddedCodePropertyValue } from './extract-code-snippets';
import type { SourceLintIssue } from './types';

const NATIVE_ARRAY_METHODS = new Set([
	'map',
	'join',
	'filter',
	'reduce',
	'forEach',
	'flatMap',
	'find',
	'some',
	'every',
]);

const SDK_FLUENT_METHODS = new Set([
	'to',
	'add',
	'onTrue',
	'onFalse',
	'onCase',
	'onDone',
	'onEachBatch',
	'onError',
	'input',
	'output',
	'settings',
	'update',
	'then',
	'group',
]);

/** Strip imports and common TS-only syntax so acorn can parse agent source. */
export function prepareSourceForLint(source: string): {
	code: string;
	asConstLines: number[];
} {
	const asConstLines: number[] = [];
	const lines = source.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		if (/\bas\s+const\b/.test(lines[i] ?? '')) {
			asConstLines.push(i + 1);
		}
	}

	let code = source;
	code = code.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
	code = code.replace(/^\s*import\s+type\s[\s\S]*?;?\s*$/gm, '');
	code = code.replace(/\bas\s+const\b/g, '');
	code = code.replace(/\bas\s+[A-Za-z_$][\w$.<>,\s|&[\]?]*/g, '');
	code = code.replace(/(\w)\s*:\s*[A-Za-z_$][\w$.|<>[\]\s,&?]*(?=\s*[=,;)\]}])/g, '$1');
	code = code.replace(/\bsatisfies\s+[A-Za-z_$][\w$.|<>[\]\s,&?]*/g, '');

	return { code, asConstLines };
}

function lineOf(node: Node): number | undefined {
	return node.loc?.start.line;
}

function isPlaceholderCall(node: CallExpression): boolean {
	return node.callee.type === 'Identifier' && node.callee.name === 'placeholder';
}

function isExprCall(node: CallExpression): boolean {
	return node.callee.type === 'Identifier' && node.callee.name === 'expr';
}

function walk(node: Node, visit: (n: Node, parent: Node | undefined) => void, parent?: Node): void {
	visit(node, parent);
	if (isEmbeddedCodePropertyValue(node, parent)) return;

	for (const key of Object.keys(node) as Array<keyof Node>) {
		if (key === 'loc' || key === 'range') continue;
		const value = node[key];
		if (!value || typeof value !== 'object') continue;
		if (Array.isArray(value)) {
			for (const entry of value) {
				if (entry && typeof entry === 'object' && 'type' in entry) {
					walk(entry as unknown as Node, visit, node);
				}
			}
		} else if ('type' in value) {
			walk(value as unknown as Node, visit, node);
		}
	}
}

function rootIdentifierName(member: MemberExpression): string | undefined {
	let current: Expression | Node = member;
	while (current.type === 'MemberExpression') {
		current = current.object;
	}
	if (current.type === 'CallExpression' && current.callee.type === 'MemberExpression') {
		return rootIdentifierName(current.callee);
	}
	if (current.type === 'CallExpression' && current.callee.type === 'Identifier') {
		return current.callee.name;
	}
	if (current.type === 'Identifier') return current.name;
	return undefined;
}

function dedupeIssues(issues: SourceLintIssue[]): SourceLintIssue[] {
	const seen = new Set<string>();
	const out: SourceLintIssue[] = [];
	for (const issue of issues) {
		const key = `${issue.lintTarget}|${issue.code}|${issue.line ?? ''}|${issue.message}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(issue);
	}
	return out;
}

/**
 * Lint workflow SDK builder source. Skips jsCode / pythonCode property values.
 */
export function lintWorkflowSdkSource(source: string): SourceLintIssue[] {
	const issues: SourceLintIssue[] = [];
	const { code, asConstLines } = prepareSourceForLint(source);

	for (const line of asConstLines) {
		issues.push({
			code: 'SDK_AS_CONST',
			message:
				'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
			line,
			severity: 'warning',
			lintTarget: 'sdk',
		});
	}

	let ast: Program;
	try {
		ast = parseSDKCode(code);
	} catch {
		return dedupeIssues(issues);
	}

	const exportIndex = ast.body.findIndex((stmt) => stmt.type === 'ExportDefaultDeclaration');
	if (exportIndex >= 0) {
		for (let i = exportIndex + 1; i < ast.body.length; i++) {
			const stmt = ast.body[i];
			if (!stmt || stmt.type === 'EmptyStatement') continue;
			issues.push({
				code: 'SDK_CODE_AFTER_EXPORT_DEFAULT',
				message:
					'Statement after `export default workflow(...)` never reaches the builder — nodes/wiring here are dropped. ' +
					'Compose all `.to()` / `.onTrue()` / `.onFalse()` / `.onCase()` inside the export default chain.',
				line: lineOf(stmt),
				severity: 'warning',
				lintTarget: 'sdk',
			});
		}
	}

	const branchCounts = new Map<string, { count: number; line?: number }>();

	walk(ast, (node, parent) => {
		if (node.type === 'ImportDeclaration') return;

		const forbidden = FORBIDDEN_NODE_TYPES[node.type];
		if (forbidden) {
			issues.push({
				code: 'SDK_FORBIDDEN_CONSTRUCT',
				message: forbidden,
				line: lineOf(node),
				severity: 'warning',
				lintTarget: 'sdk',
			});
		}

		if (node.type === 'Identifier' && DANGEROUS_GLOBALS.has(node.name)) {
			const isPropertyName =
				parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
			const isObjectKey = parent?.type === 'Property' && parent.key === node;
			if (!isPropertyName && !isObjectKey) {
				issues.push({
					code: 'SDK_FORBIDDEN_CONSTRUCT',
					message: `Global '${node.name}' is unavailable in SDK builder code. Move runtime logic to a Code node or expr().`,
					line: lineOf(node),
					severity: 'warning',
					lintTarget: 'sdk',
				});
			}
		}

		if (node.type !== 'CallExpression') return;
		const call = node;

		if (call.callee.type === 'Identifier' && call.callee.name === 'sticky') {
			issues.push({
				code: 'SDK_UNSOLICITED_STICKY',
				message:
					'Do not add sticky() / stickyNote nodes unless the user explicitly asked for canvas notes. ' +
					'Put explanations in the chat reply instead.',
				line: lineOf(call),
				severity: 'warning',
				lintTarget: 'sdk',
			});
		}

		if (
			call.callee.type === 'MemberExpression' &&
			!call.callee.computed &&
			call.callee.property.type === 'Identifier'
		) {
			const method = call.callee.property.name;

			if (method === 'onTrue' || method === 'onFalse') {
				const root = rootIdentifierName(call.callee);
				if (root) {
					const key = `${root}.${method}`;
					const prev = branchCounts.get(key);
					if (prev) {
						prev.count += 1;
					} else {
						branchCounts.set(key, { count: 1, line: lineOf(call) });
					}
				}
			}

			if (!SDK_FLUENT_METHODS.has(method) && NATIVE_ARRAY_METHODS.has(method)) {
				issues.push({
					code: 'SDK_FORBIDDEN_CONSTRUCT',
					message:
						`'.${method}()' is not available on SDK builder objects. Build strings with template ` +
						'literals, or do transforms in a Code node / expr().',
					line: lineOf(call),
					severity: 'warning',
					lintTarget: 'sdk',
				});
			}
		}

		if (isExprCall(call)) {
			for (const arg of call.arguments) {
				if (arg.type === 'SpreadElement') continue;
				if (arg.type === 'CallExpression' && isPlaceholderCall(arg)) {
					issues.push({
						code: 'SDK_PLACEHOLDER_WRAPPED',
						message:
							"Do not wrap placeholder() in expr(). Use placeholder('hint') directly as the parameter value.",
						line: lineOf(call),
						severity: 'warning',
						lintTarget: 'sdk',
					});
				}
				if (arg.type === 'TemplateLiteral') {
					for (const expr of arg.expressions) {
						if (expr.type === 'CallExpression' && isPlaceholderCall(expr)) {
							issues.push({
								code: 'SDK_PLACEHOLDER_WRAPPED',
								message:
									'Do not embed placeholder() inside expr()/template strings. Use placeholder() as the direct parameter value.',
								line: lineOf(call),
								severity: 'warning',
								lintTarget: 'sdk',
							});
						}
					}
				}
				if (arg.type === 'ArrayExpression') {
					for (const el of arg.elements) {
						if (el && el.type === 'CallExpression' && isPlaceholderCall(el)) {
							issues.push({
								code: 'SDK_PLACEHOLDER_WRAPPED',
								message:
									'Do not wrap placeholder() in an array unless the node definition expects an array and placeholder is a direct element value with no expr() wrapper.',
								line: lineOf(call),
								severity: 'warning',
								lintTarget: 'sdk',
							});
						}
					}
				}
			}
		}
	});

	for (const [key, info] of branchCounts) {
		if (info.count < 2) continue;
		const [, method] = key.split('.');
		issues.push({
			code: 'SDK_REPEATED_BRANCH_WIRING',
			message:
				`Repeated \`.${method}()\` (${info.count} times) — each call overwrites the previous target. ` +
				'Wire once on the workflow builder chain.',
			line: info.line,
			severity: 'warning',
			lintTarget: 'sdk',
		});
	}

	return dedupeIssues(issues);
}
