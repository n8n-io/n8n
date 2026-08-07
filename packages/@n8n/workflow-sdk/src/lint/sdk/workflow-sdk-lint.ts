/**
 * Source-level lint for workflow SDK TypeScript (builder code only).
 *
 * Does not inspect jsCode / pythonCode embedded in Code node configs — those
 * are linted separately by code-node/js and code-node/python.
 */

import type { CallExpression, MemberExpression, Node, Program, Property } from 'estree';

import {
	FORBIDDEN_NODE_TYPES,
	DANGEROUS_GLOBALS,
	getSafeJSONMethod,
	parseSDKCode,
} from '../../ast-interpreter';
import { dedupeSourceLintIssues, walkAst } from '../ast-walk';
import { isEmbeddedCodePropertyValue } from '../code-node/extract-snippets';
import { lintIssue, type SourceLintIssue } from '../types';

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

/** An `as const` occurrence in prepared source (1-based line, 0-based column). */
export interface AsConstMatch {
	line: number;
	column: number;
}

/**
 * Strip imports and common TS-only syntax so acorn can parse agent source.
 * Replacements preserve line count (and roughly column positions) so AST
 * `loc` values still match the original file.
 *
 * `as const` matches are collected after the strips above run, so their
 * coordinates share the AST's coordinate space — this lets callers tell a
 * real assertion apart from text inside a string/template (jsCode, sticky).
 */
export function prepareSourceForLint(source: string): {
	code: string;
	asConstMatches: AsConstMatch[];
} {
	let code = source;
	const blankSameLines = (match: string): string => '\n'.repeat((match.match(/\n/g) ?? []).length);
	const spaces = (match: string): string => ' '.repeat(match.length);

	code = code.replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, blankSameLines);
	code = code.replace(/^\s*import\s+type\s[\s\S]*?;?\s*$/gm, blankSameLines);
	// Narrower than a blanket `: Type` strip — avoids mangling ternaries (`a ? b : c`).
	// These two are the only non-length-preserving strips; everything below them
	// shares coordinates with the collected matches and the parsed AST.
	code = code.replace(
		/\b((?:const|let|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$.|<>[\]\s,&?]*(?=\s*=)/g,
		'$1',
	);
	code = code.replace(
		/([,(]\s*[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$.|<>[\]\s,&?]*(?=\s*[,)=])/g,
		'$1',
	);

	const asConstMatches: AsConstMatch[] = [];
	const asConstPattern = /\bas\s+const\b/g;
	const lines = code.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		asConstPattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = asConstPattern.exec(lines[i] ?? '')) !== null) {
			asConstMatches.push({ line: i + 1, column: match.index });
		}
	}

	code = code.replace(/\bas\s+const\b/g, spaces);
	code = code.replace(/\bas\s+[A-Za-z_$][\w$.<>,\s|&[\]?]*/g, spaces);
	code = code.replace(/\bsatisfies\s+[A-Za-z_$][\w$.|<>[\]\s,&?]*/g, spaces);

	return { code, asConstMatches };
}

/** 1-based line/column from an ESTree loc (Acorn columns are 0-based). */
function locationOf(node: Node): { line?: number; column?: number } {
	if (!node.loc) return {};
	return { line: node.loc.start.line, column: node.loc.start.column + 1 };
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

interface SourceRange {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}

/**
 * Ranges covered by string literals and template literals. An `as const`
 * match inside one is string content (jsCode snippets, sticky text), not the
 * TS assertion SDK_AS_CONST targets.
 */
function stringContentRanges(ast: Program): SourceRange[] {
	const ranges: SourceRange[] = [];
	walkAst(ast, (node) => {
		const isString =
			node.type === 'TemplateLiteral' ||
			(node.type === 'Literal' && typeof node.value === 'string');
		if (!isString || !node.loc) return;
		ranges.push({
			startLine: node.loc.start.line,
			startColumn: node.loc.start.column,
			endLine: node.loc.end.line,
			endColumn: node.loc.end.column,
		});
	});
	return ranges;
}

function rangeContains(range: SourceRange, line: number, column: number): boolean {
	if (line < range.startLine || line > range.endLine) return false;
	if (line === range.startLine && column < range.startColumn) return false;
	if (line === range.endLine && column >= range.endColumn) return false;
	return true;
}

function propertyName(prop: Property): string | undefined {
	// `[someVar]: ...` is a runtime key, not the literal name of the identifier.
	if (prop.key.type === 'Identifier') return prop.computed ? undefined : prop.key.name;
	if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
	return undefined;
}

/** Object literal whose only property is `json` — a runtime item envelope. */
function isJsonEnvelopeObject(node: Node | null): boolean {
	if (!node || node.type !== 'ObjectExpression') return false;
	if (node.properties.length !== 1) return false;
	const prop = node.properties[0];
	return prop?.type === 'Property' && propertyName(prop) === 'json';
}

/** Factories whose config object carries the mock `output` field. */
const NODE_FACTORY_NAMES = new Set([
	'node',
	'trigger',
	'ifElse',
	'merge',
	'switchCase',
	'splitInBatches',
	'languageModel',
	'memory',
	'tool',
	'outputParser',
	'embedding',
	'embeddings',
	'vectorStore',
	'retriever',
	'documentLoader',
	'textSplitter',
]);

/**
 * `output: [{ json: {...} }]` — SDK mocks are raw `$json` objects; wrapping
 * every item in a `json` envelope makes downstream expressions read
 * `$json.json.*` and expression-path validation fail. Only the top-level
 * `output` key of a node-factory config counts: a nested parameter that
 * happens to be named `output` is legitimate payload, not a mock.
 */
function checkMockOutputEnvelope(call: CallExpression, issues: SourceLintIssue[]): void {
	if (call.callee.type !== 'Identifier' || !NODE_FACTORY_NAMES.has(call.callee.name)) return;
	const config = call.arguments[0];
	if (!config || config.type !== 'ObjectExpression') return;

	const prop = config.properties.find(
		(entry): entry is Property => entry.type === 'Property' && propertyName(entry) === 'output',
	);
	if (!prop) return;
	if (prop.value.type !== 'ArrayExpression' || prop.value.elements.length === 0) return;

	const allEnveloped = prop.value.elements.every((el) => isJsonEnvelopeObject(el));
	if (!allEnveloped) return;

	issues.push(
		lintIssue({
			code: 'SDK_MOCK_OUTPUT_JSON_ENVELOPE',
			message:
				'Mock `output` items are raw $json objects — do not wrap them in `{ json: {...} }` runtime envelopes. ' +
				'Use `output: [{ field: value }]` unless downstream expressions intentionally read `$json.json.*`.',
			...locationOf(prop),
			lintTarget: 'sdk',
		}),
	);
}

/**
 * `credentials: { slackApi: { id: '...', name: '...' } }` — raw credential
 * objects in SDK source bypass credential resolution semantics; the build
 * silently mocks unknown ids. `newCredential()` is the supported form.
 */
function checkRawCredentialObjects(prop: Property, issues: SourceLintIssue[]): void {
	if (propertyName(prop) !== 'credentials') return;
	if (prop.value.type !== 'ObjectExpression') return;

	for (const entry of prop.value.properties) {
		if (entry.type !== 'Property' || entry.value.type !== 'ObjectExpression') continue;
		const keys = entry.value.properties
			.filter((p): p is Property => p.type === 'Property')
			.map((p) => propertyName(p));
		if (!keys.includes('id') && !keys.includes('name')) continue;

		issues.push(
			lintIssue({
				code: 'SDK_RAW_CREDENTIAL_OBJECT',
				message:
					"Raw credential objects like `{ id: '...', name: '...' }` are not supported in SDK code. " +
					"Use `newCredential('Name', 'credential-id')` for a stored credential or `newCredential('Suggested Name')` to defer to setup.",
				...locationOf(entry),
				lintTarget: 'sdk',
			}),
		);
	}
}

const FAKE_VALUE_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
	{
		pattern: /@example\.(?:com|org|net)\b/i,
		hint: 'an example.com email address',
	},
	{
		pattern: /\bYOUR_[A-Z][A-Z0-9_]{2,}\b/,
		hint: 'a YOUR_* stand-in value',
	},
];

/**
 * Hardcoded fake values (`user@example.com`, `YOUR_API_KEY`) self-verify green
 * and then fail on the user's first real run. `placeholder('hint')` is the
 * supported way to defer a user-provided value, so hint text inside a
 * `placeholder()` call is exempt.
 */
function checkFakeLiteralValues(
	node: Node,
	parent: Node | undefined,
	issues: SourceLintIssue[],
): void {
	// Embedded jsCode/pythonCode strings are linted by the code-node rules.
	if (isEmbeddedCodePropertyValue(node, parent)) return;

	let value: string | undefined;
	if (node.type === 'Literal' && typeof node.value === 'string') {
		value = node.value;
	} else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
		// Backticks without interpolation are just another string quote style.
		value = node.quasis[0]?.value.cooked ?? undefined;
	}
	if (value === undefined) return;
	if (parent?.type === 'CallExpression' && isPlaceholderCall(parent)) return;

	for (const { pattern, hint } of FAKE_VALUE_PATTERNS) {
		if (!pattern.test(value)) continue;
		issues.push(
			lintIssue({
				code: 'SDK_FAKE_VALUE',
				message:
					`String looks like ${hint} — a hardcoded fake value. ` +
					"Use placeholder('descriptive hint') so setup collects the real value from the user.",
				...locationOf(node),
				lintTarget: 'sdk',
			}),
		);
		return;
	}
}

/** Lint a prepared, parsed SDK AST (imports/TS already stripped). */
export function lintWorkflowSdkAst(
	ast: Program,
	asConstMatches: AsConstMatch[] = [],
): SourceLintIssue[] {
	const issues: SourceLintIssue[] = [];

	const stringRanges = stringContentRanges(ast);
	for (const match of asConstMatches) {
		if (stringRanges.some((range) => rangeContains(range, match.line, match.column))) continue;
		issues.push(
			lintIssue({
				code: 'SDK_AS_CONST',
				message:
					'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
				line: match.line,
				column: match.column + 1,
				lintTarget: 'sdk',
			}),
		);
	}

	const exportIndex = ast.body.findIndex((stmt) => stmt.type === 'ExportDefaultDeclaration');
	if (exportIndex >= 0) {
		for (let i = exportIndex + 1; i < ast.body.length; i++) {
			const stmt = ast.body[i];
			if (!stmt || stmt.type === 'EmptyStatement') continue;
			issues.push(
				lintIssue({
					code: 'SDK_CODE_AFTER_EXPORT_DEFAULT',
					message:
						'Statement after `export default workflow(...)` never reaches the builder — nodes/wiring here are dropped. ' +
						'Compose all `.to()` / `.onTrue()` / `.onFalse()` / `.onCase()` inside the export default chain.',
					...locationOf(stmt),
					lintTarget: 'sdk',
				}),
			);
		}
	}

	const branchCounts = new Map<string, { count: number; line?: number; column?: number }>();

	walkAst(
		ast,
		(node, parent) => {
			if (node.type === 'ImportDeclaration') return;

			const forbidden = FORBIDDEN_NODE_TYPES[node.type];
			if (forbidden) {
				issues.push(
					lintIssue({
						code: 'SDK_FORBIDDEN_CONSTRUCT',
						message: forbidden,
						...locationOf(node),
						lintTarget: 'sdk',
					}),
				);
			}

			if (node.type === 'Identifier' && DANGEROUS_GLOBALS.has(node.name)) {
				const isPropertyName =
					parent?.type === 'MemberExpression' && parent.property === node && !parent.computed;
				const isObjectKey = parent?.type === 'Property' && parent.key === node;
				// Mirrors the interpreter: safe global methods (e.g. JSON.stringify) are allowed.
				const isSafeMethodObject =
					parent?.type === 'MemberExpression' &&
					parent.object === node &&
					!parent.computed &&
					parent.property.type === 'Identifier' &&
					getSafeJSONMethod(node.name, parent.property.name) !== undefined;
				if (!isPropertyName && !isObjectKey && !isSafeMethodObject) {
					issues.push(
						lintIssue({
							code: 'SDK_FORBIDDEN_CONSTRUCT',
							message: `Global '${node.name}' is unavailable in SDK builder code. Move runtime logic to a Code node or expr().`,
							...locationOf(node),
							lintTarget: 'sdk',
						}),
					);
				}
			}

			if (node.type === 'Property') {
				checkRawCredentialObjects(node, issues);
			}

			checkFakeLiteralValues(node, parent, issues);

			if (node.type !== 'CallExpression') return;
			const call = node;

			checkMockOutputEnvelope(call, issues);

			if (call.callee.type === 'Identifier' && call.callee.name === 'sticky') {
				issues.push(
					lintIssue({
						code: 'SDK_UNSOLICITED_STICKY',
						message:
							'Do not add sticky() / stickyNote nodes unless the user explicitly asked for canvas notes. ' +
							'Put explanations in the chat reply instead.',
						...locationOf(call),
						lintTarget: 'sdk',
					}),
				);
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
							branchCounts.set(key, { count: 1, ...locationOf(call) });
						}
					}
				}

				if (!SDK_FLUENT_METHODS.has(method) && NATIVE_ARRAY_METHODS.has(method)) {
					issues.push(
						lintIssue({
							code: 'SDK_FORBIDDEN_CONSTRUCT',
							message:
								`'.${method}()' is not available on SDK builder objects. Build strings with template ` +
								'literals, or do transforms in a Code node / expr().',
							...locationOf(call),
							lintTarget: 'sdk',
						}),
					);
				}
			}

			if (isExprCall(call)) {
				for (const arg of call.arguments) {
					if (arg.type === 'SpreadElement') continue;
					if (arg.type === 'CallExpression' && isPlaceholderCall(arg)) {
						issues.push(
							lintIssue({
								code: 'SDK_PLACEHOLDER_WRAPPED',
								message:
									"Do not wrap placeholder() in expr(). Use placeholder('hint') directly as the parameter value.",
								...locationOf(call),
								lintTarget: 'sdk',
							}),
						);
					}
					if (arg.type === 'TemplateLiteral') {
						for (const expr of arg.expressions) {
							if (expr.type === 'CallExpression' && isPlaceholderCall(expr)) {
								issues.push(
									lintIssue({
										code: 'SDK_PLACEHOLDER_WRAPPED',
										message:
											'Do not embed placeholder() inside expr()/template strings. Use placeholder() as the direct parameter value.',
										...locationOf(call),
										lintTarget: 'sdk',
									}),
								);
							}
						}
					}
					if (arg.type === 'ArrayExpression') {
						for (const el of arg.elements) {
							if (el && el.type === 'CallExpression' && isPlaceholderCall(el)) {
								issues.push(
									lintIssue({
										code: 'SDK_PLACEHOLDER_WRAPPED',
										message:
											'Do not wrap placeholder() in an array unless the node definition expects an array and placeholder is a direct element value with no expr() wrapper.',
										...locationOf(call),
										lintTarget: 'sdk',
									}),
								);
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
		issues.push(
			lintIssue({
				code: 'SDK_REPEATED_BRANCH_WIRING',
				message:
					`Repeated \`.${method}()\` (${info.count} times) — each call overwrites the previous target. ` +
					'Wire once on the workflow builder chain.',
				line: info.line,
				column: info.column,
				lintTarget: 'sdk',
			}),
		);
	}

	return dedupeSourceLintIssues(issues);
}

/**
 * Lint workflow SDK builder source. Skips jsCode / pythonCode property values.
 */
export function lintWorkflowSdkSource(source: string): SourceLintIssue[] {
	const { code, asConstMatches } = prepareSourceForLint(source);

	let ast: Program;
	try {
		ast = parseSDKCode(code);
	} catch {
		return dedupeSourceLintIssues(
			asConstMatches.map((match) =>
				lintIssue({
					code: 'SDK_AS_CONST',
					message:
						'`as const` is TypeScript-only and the workflow parser cannot interpret it. Remove the assertion.',
					line: match.line,
					column: match.column + 1,
					lintTarget: 'sdk' as const,
				}),
			),
		);
	}

	return lintWorkflowSdkAst(ast, asConstMatches);
}
