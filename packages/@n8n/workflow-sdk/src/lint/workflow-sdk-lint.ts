/**
 * Source-level lint for workflow SDK TypeScript (builder code only).
 *
 * Does not inspect jsCode / pythonCode embedded in Code node configs — those
 * are linted separately by code-node-js-lint and code-node-python-lint.
 */

import type { CallExpression, MemberExpression, Node, Program } from 'estree';

import { FORBIDDEN_NODE_TYPES, DANGEROUS_GLOBALS, parseSDKCode } from '../ast-interpreter';
import { dedupeSourceLintIssues, walkAst } from './ast-walk';
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

/**
 * Strip imports and common TS-only syntax so acorn can parse agent source.
 * Replacements preserve line count (and roughly column positions) so AST
 * `loc` values still match the original file.
 */
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
	const blankSameLines = (match: string): string => '\n'.repeat((match.match(/\n/g) ?? []).length);
	const spaces = (match: string): string => ' '.repeat(match.length);

	code = code.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, blankSameLines);
	code = code.replace(/^\s*import\s+type\s[\s\S]*?;?\s*$/gm, blankSameLines);
	code = code.replace(/\bas\s+const\b/g, spaces);
	code = code.replace(/\bas\s+[A-Za-z_$][\w$.<>,\s|&[\]?]*/g, spaces);
	code = code.replace(/\bsatisfies\s+[A-Za-z_$][\w$.|<>[\]\s,&?]*/g, spaces);
	// Narrower than a blanket `: Type` strip — avoids mangling ternaries (`a ? b : c`).
	code = code.replace(
		/\b((?:const|let|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$.|<>[\]\s,&?]*(?=\s*=)/g,
		'$1',
	);
	code = code.replace(
		/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$.|<>[\]\s,&?]*(?=\s*[,)=])/g,
		'$1',
	);

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

/**
 * Direct receiver of a method call when it is a simple identifier
 * (`branch.onTrue(...)`). Fluent chains on `workflow()` are ignored — those
 * do not overwrite a previous branch target on the same IF node.
 */
function directReceiverName(member: MemberExpression): string | undefined {
	if (member.object.type === 'Identifier') {
		return member.object.name;
	}
	return undefined;
}

/** Lint a prepared, parsed SDK AST (imports/TS already stripped). */
export function lintWorkflowSdkAst(ast: Program, asConstLines: number[] = []): SourceLintIssue[] {
	const issues: SourceLintIssue[] = [];

	for (const line of asConstLines) {
		issues.push({
			code: 'SDK_AS_CONST',
			message:
				'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
			line,
			lintTarget: 'sdk',
		});
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
				lintTarget: 'sdk',
			});
		}
	}

	const branchCounts = new Map<string, { count: number; line?: number }>();

	walkAst(
		ast,
		(node, parent) => {
			if (node.type === 'ImportDeclaration') return;

			const forbidden = FORBIDDEN_NODE_TYPES[node.type];
			if (forbidden) {
				issues.push({
					code: 'SDK_FORBIDDEN_CONSTRUCT',
					message: forbidden,
					line: lineOf(node),
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
					// Only count direct `ifNode.onTrue(...)` / `ifNode.onFalse(...)`.
					// Fluent `workflow().to(if1).onTrue(...).to(if2).onTrue(...)` is fine.
					const receiver = directReceiverName(call.callee);
					if (receiver) {
						const key = `${receiver}.${method}`;
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
									lintTarget: 'sdk',
								});
							}
						}
					}
				}
			}
		},
		{ skipChildren: isEmbeddedCodePropertyValue },
	);

	for (const [key, info] of branchCounts) {
		if (info.count < 2) continue;
		const [, method] = key.split('.');
		issues.push({
			code: 'SDK_REPEATED_BRANCH_WIRING',
			message:
				`Repeated \`.${method}()\` (${info.count} times) — each call overwrites the previous target. ` +
				'Wire once on the workflow builder chain.',
			line: info.line,
			lintTarget: 'sdk',
		});
	}

	return dedupeSourceLintIssues(issues);
}

/**
 * Lint workflow SDK builder source. Skips jsCode / pythonCode property values.
 */
export function lintWorkflowSdkSource(source: string): SourceLintIssue[] {
	const { code, asConstLines } = prepareSourceForLint(source);

	let ast: Program;
	try {
		ast = parseSDKCode(code);
	} catch {
		return dedupeSourceLintIssues(
			asConstLines.map((line) => ({
				code: 'SDK_AS_CONST',
				message:
					'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
				line,
				lintTarget: 'sdk' as const,
			})),
		);
	}

	return lintWorkflowSdkAst(ast, asConstLines);
}
