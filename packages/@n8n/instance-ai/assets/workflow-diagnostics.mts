import childProcess, { type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import type { Node, SourceFile } from 'typescript/unstable/ast';
import {
	API,
	DiagnosticCategory,
	SignatureKind,
	type Checker,
	type Diagnostic,
	type Program,
} from 'typescript/unstable/async';

// ── The tsc process ────────────────────────────────────────────────────────
// The async API starts tsc and stops it only in `close()`. A tsc that is busy when this worker is
// killed (a host timeout) does not stop, so the worker tracks it and kills it when it ends.
const tscProcesses = new Set<ChildProcess>();
childProcess.spawn = new Proxy(childProcess.spawn, {
	apply(target, thisArg, args) {
		const child: ChildProcess = Reflect.apply(target, thisArg, args);
		tscProcesses.add(child);
		child.once('exit', () => tscProcesses.delete(child));
		return child;
	},
});
// The API imports `node:child_process` as an ES module, so it sees the tracked spawn only after this.
syncBuiltinESMExports();

const stopTsc = () => {
	for (const child of tscProcesses) child.kill('SIGKILL');
};
process.on('exit', stopTsc);
for (const [signal, code] of [
	['SIGTERM', 143],
	['SIGINT', 130],
	['SIGHUP', 129],
] as const) {
	process.once(signal, () => process.exit(code));
}
// A host that kills with SIGKILL gives the worker no chance to clean up, so the host can set a
// deadline below its own timeout.
const deadline = Number(process.env.WORKFLOW_DIAGNOSTICS_DEADLINE_MS);
if (deadline > 0) {
	setTimeout(() => {
		process.stderr.write(`Workflow diagnostics passed the ${deadline} ms deadline\n`);
		process.exit(124);
	}, deadline).unref();
}

function formatMessage(diagnostic: Diagnostic, indent = ''): string {
	return [
		indent + diagnostic.text,
		...(diagnostic.messageChain ?? []).map((child) => formatMessage(child, indent + '  ')),
	].join('\n');
}

/** The deepest messages of a diagnostic chain. */
const reasonsOf = (diagnostic: Diagnostic): string[] =>
	diagnostic.messageChain?.length ? diagnostic.messageChain.flatMap(reasonsOf) : [diagnostic.text];

function formatError(source: SourceFile, file: string, pos: number, error: string): string {
	const position = source.getLineAndCharacterOfPosition(pos);
	return `${file}(${position.line + 1},${position.character + 1}): error ${error}`;
}

// ── n8n expressions ─────────────────────────────────────────────────────────
// The host lists the strings that the built workflow keeps as n8n expressions or as Code node
// JavaScript. A literal with such a text, in a field that also takes a lambda, becomes a lambda
// in a shadow copy of its file. TypeScript then types it in place, as it types a lambda: `$json`
// is the item of the node before, `$('Node')` an earlier node, and the result must fit the field.

/** One expression body or Code text inside a replacement. */
interface BodySpan {
	readonly shadowStart: number;
	readonly length: number;
	/** Offset of the body in the literal's text. */
	readonly textStart: number;
}

interface Replacement {
	readonly kind: 'expression' | 'code';
	/** The literal in the source, quotes included. */
	readonly start: number;
	readonly shadowStart: number;
	readonly shadowEnd: number;
	readonly bodies: readonly BodySpan[];
	/** The source offset of each character of the literal's text, when the escapes allow it. */
	readonly offsets?: readonly number[];
	/** The shadow offset of the property name the literal is the value of. */
	readonly propertyName?: number;
}

interface Shadow {
	readonly fileName: string;
	readonly source: SourceFile;
	readonly text: string;
	readonly trailerStart: number;
	readonly replacements: readonly Replacement[];
}

/** Loaded with the expression check only, so the plain type check starts as fast as before. */
type Ast = typeof import('typescript/unstable/ast');

interface Globals {
	readonly item: readonly string[];
	readonly code: readonly string[];
}

const TRAILER = `
import type { CodeScope as __N8nCodeScope, ItemScope as __N8nItemScope } from '@n8n/expression-types';
import type { Dollar as __N8nDollar } from '@n8n/workflow-sdk/next';
declare function __n8nExpression<I, C, T>(item: I, dollar: __N8nDollar<C>, body: (scope: __N8nItemScope<I, C>) => T): T;
declare function __n8nCode<I, C>(item: I, dollar: __N8nDollar<C>, body: (scope: __N8nCodeScope<I, C>) => unknown): never;
`;

const BLOCK = /\{\{([\s\S]*?)\}\}/g;

/** Errors of TypeScript that are bugs in plain JavaScript too. Others are type strictness. */
const CODE_ERRORS = new Set([2304, 2339, 2349, 2448, 2551, 2552, 2588]);

/**
 * A callback parameter over an untyped read, e.g. `$json.list.filter(o => …)` after `node()`.
 * It is `any` in plain JavaScript too, and the expression cannot declare its type.
 */
const IMPLICIT_ANY_ERRORS = new Set([7006, 7031]);

const SANDBOX_RULE = 'n8n';

/** The exit code when the type check ran but the expression check did not. */
const EXPRESSION_CHECK_FAILED = 3;

function listOf(value: unknown, key: string): Set<string> {
	const field: unknown = typeof value === 'object' && value !== null ? Reflect.get(value, key) : [];
	return new Set(
		Array.isArray(field) ? field.filter((entry): entry is string => typeof entry === 'string') : [],
	);
}

/**
 * The source offset of each character of a literal's text. `undefined` for an escape that
 * does not map one to one; errors then point at the literal.
 */
function textOffsets(raw: string, rawStart: number, length: number): number[] | undefined {
	const tokens = [...raw.matchAll(/\\[\s\S]|[\s\S]/g)];
	if (tokens.some(([token]) => /^\\[xu\r]$/.test(token))) return undefined;
	// A backslash before a line break continues the line and adds no character.
	const offsets = tokens.flatMap((match) =>
		match[0] === '\\\n' ? [] : [rawStart + (match.index ?? 0)],
	);
	return offsets.length === length ? offsets : undefined;
}

/** The lambda that replaces a literal, and where each body sits in it. */
function wrapperOf(
	kind: Replacement['kind'],
	text: string,
	globals: Globals,
): { text: string; bodies: Array<{ at: number; length: number; textStart: number }> } {
	const locals = (names: readonly string[]) => `const { ${names.join(', ')} } = __scope;`;
	if (kind === 'code') {
		// A nested function, so the code may declare names like `items` again.
		const head = `((__item, __dollar) => __n8nCode(__item, __dollar, (__scope) => { ${locals(globals.code)} return (async () => {\n`;
		return {
			text: `${head}${text}\n})(); }))`,
			bodies: [{ at: head.length, length: text.length, textStart: 0 }],
		};
	}
	const blocks = [...text.slice(1).matchAll(BLOCK)].map((match) => ({
		body: match[1] ?? '',
		textStart: (match.index ?? 0) + 3,
	}));
	// As @n8n/tournament: one block and no text returns its value, else the parts concatenate.
	const single = blocks.length === 1 && text.slice(1).replace(BLOCK, '') === '';
	const head = `((__item, __dollar) => __n8nExpression(__item, __dollar, (__scope) => { ${locals(globals.item)} return `;
	const start = head.length + (single ? 0 : 1);
	const built = blocks.reduce<{
		text: string;
		bodies: Array<{ at: number; length: number; textStart: number }>;
	}>(
		(acc, { body, textStart }, index) => {
			const separator = index === 0 ? '' : ', ';
			if (body.trim() === '') return { ...acc, text: `${acc.text}${separator}undefined` };
			const at = start + acc.text.length + separator.length + 1;
			return {
				// The newline ends a line comment in the body.
				text: `${acc.text}${separator}(${body}\n)`,
				bodies: [...acc.bodies, { at, length: body.length, textStart }],
			};
		},
		{ text: '', bodies: [] },
	);
	const result = single ? built.text : `[${built.text}].join('')`;
	return { text: `${head}${result}; }))`, bodies: built.bodies };
}

/** A field takes a lambda when its contextual type has a call signature. */
async function takesLambda(ast: Ast, checker: Checker, node: Node): Promise<boolean> {
	if (!ast.isExpression(node)) return false;
	const contextual = await checker.getContextualType(node);
	if (!contextual) return false;
	const parts = contextual.isUnionType() ? await contextual.getTypes() : [contextual];
	const signatures = await Promise.all(
		parts.map(async (part) => await checker.getSignaturesOfType(part, SignatureKind.Call)),
	);
	return signatures.some((list) => list.length > 0);
}

async function shadowOf(
	ast: Ast,
	source: SourceFile,
	checker: Checker,
	lists: { expressions: Set<string>; code: Set<string> },
	globals: Globals,
): Promise<Shadow | undefined> {
	const literals: Array<{ node: Node; text: string; kind: Replacement['kind'] }> = [];
	const visit = (node: Node): void => {
		if (ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node)) {
			const kind = lists.expressions.has(node.text)
				? 'expression'
				: lists.code.has(node.text)
					? 'code'
					: undefined;
			if (kind) literals.push({ node, text: node.text, kind });
		}
		node.forEachChild(visit);
	};
	source.forEachChild(visit);
	const slots = (
		await Promise.all(
			literals.map(async (literal) =>
				(await takesLambda(ast, checker, literal.node)) ? [literal] : [],
			),
		)
	).flat();
	if (slots.length === 0) return undefined;

	const original = source.text;
	const built = slots
		.map((slot) => {
			const { parent } = slot.node;
			const name =
				ast.isPropertyAssignment(parent) && parent.initializer === slot.node
					? parent.name.getStart(source)
					: undefined;
			return { ...slot, start: slot.node.getStart(source), end: slot.node.end, name };
		})
		.sort((a, b) => a.start - b.start)
		.reduce<{ text: string; cursor: number; replacements: Replacement[] }>(
			(acc, slot) => {
				const before = `${acc.text}${original.slice(acc.cursor, slot.start)}`;
				const wrapper = wrapperOf(slot.kind, slot.text, globals);
				const raw = original.slice(slot.start + 1, slot.end - 1);
				return {
					text: `${before}${wrapper.text}`,
					cursor: slot.end,
					replacements: [
						...acc.replacements,
						{
							kind: slot.kind,
							start: slot.start,
							shadowStart: before.length,
							shadowEnd: before.length + wrapper.text.length,
							bodies: wrapper.bodies.map(({ at, length, textStart }) => ({
								shadowStart: before.length + at,
								length,
								textStart,
							})),
							offsets: textOffsets(raw, slot.start + 1, slot.text.length),
							// Only the literal changes, so the name moves as far as the literal.
							...(slot.name === undefined
								? {}
								: { propertyName: slot.name + before.length - slot.start }),
						},
					],
				};
			},
			{ text: '', cursor: 0, replacements: [] },
		);
	const body = `${built.text}${original.slice(built.cursor)}`;
	return {
		fileName: source.fileName,
		source,
		text: `${body}${TRAILER}`,
		trailerStart: body.length,
		replacements: built.replacements,
	};
}

/** The source offset of a shadow offset inside a body, else the literal's start. */
function sourceOffset(replacement: Replacement, shadowPos: number): number {
	const body = replacement.bodies.find(
		(span) => shadowPos >= span.shadowStart && shadowPos <= span.shadowStart + span.length,
	);
	if (!body || !replacement.offsets) return replacement.start;
	const index = body.textStart + (shadowPos - body.shadowStart);
	return replacement.offsets[Math.min(index, replacement.offsets.length - 1)] ?? replacement.start;
}

const inBody = (replacement: Replacement, pos: number) =>
	replacement.bodies.some(
		(span) => pos >= span.shadowStart && pos <= span.shadowStart + span.length,
	);

/** n8n's own expression rules, which its sandbox enforces rather than types (expression-sandboxing.ts). */
function sandboxRuleIssues(
	ast: Ast,
	shadowSource: SourceFile,
	replacements: readonly Replacement[],
): Array<{ pos: number; replacement: Replacement; message: string }> {
	const issues: Array<{ pos: number; replacement: Replacement; message: string }> = [];
	const visit = (node: Node): void => {
		const pos = node.getStart(shadowSource);
		const replacement = replacements.find(
			(each) => each.kind === 'expression' && inBody(each, pos),
		);
		if (replacement) {
			const member = ast.isPropertyAccessExpression(node)
				? node.name.text
				: ast.isElementAccessExpression(node) && ast.isStringLiteral(node.argumentExpression)
					? node.argumentExpression.text
					: undefined;
			const memberPos = ast.isPropertyAccessExpression(node)
				? node.name.getStart(shadowSource)
				: pos;
			if (member === 'constructor') {
				issues.push({
					pos: memberPos,
					replacement,
					message:
						"Expression contains invalid constructor function call. n8n rejects any '.constructor' access.",
				});
			} else if (member === 'prototype' || member === '__proto__') {
				issues.push({
					pos: memberPos,
					replacement,
					message: 'n8n blocks prototype access in expressions.',
				});
			} else if (
				ast.isIdentifier(node) &&
				node.text === '$' &&
				!(ast.isCallExpression(node.parent) && node.parent.expression === node) &&
				!(ast.isPropertyAccessExpression(node.parent) && node.parent.name === node)
			) {
				issues.push({
					pos,
					replacement,
					message: 'Cannot access "$" without calling it as a function.',
				});
			} else if (
				(ast.isClassDeclaration(node) || ast.isClassExpression(node)) &&
				(node.heritageClauses?.length ?? 0) > 0
			) {
				issues.push({
					pos,
					replacement,
					message: 'Cannot use dynamic class extension due to security concerns.',
				});
			}
		}
		node.forEachChild(visit);
	};
	shadowSource.forEachChild(visit);
	return issues;
}

/**
 * In JavaScript, `object.field = value` adds a field, so code that adds a field may read it.
 * The access `object.field` at a name position, when the code also assigns it.
 */
function addedFieldReads(ast: Ast, shadowSource: SourceFile): Set<number> {
	const accesses: Array<{ pos: number; key: string }> = [];
	const added = new Set<string>();
	const keyOf = (node: Node & { expression: Node; name: Node & { text: string } }) =>
		`${shadowSource.text.slice(node.expression.getStart(shadowSource), node.expression.end)}.${node.name.text}`;
	const visit = (node: Node): void => {
		if (ast.isPropertyAccessExpression(node)) {
			accesses.push({ pos: node.name.getStart(shadowSource), key: keyOf(node) });
		}
		if (
			ast.isBinaryExpression(node) &&
			node.operatorToken.kind === ast.SyntaxKind.EqualsToken &&
			ast.isPropertyAccessExpression(node.left)
		) {
			added.add(keyOf(node.left));
		}
		node.forEachChild(visit);
	};
	shadowSource.forEachChild(visit);
	return new Set(accesses.filter(({ key }) => added.has(key)).map(({ pos }) => pos));
}

async function diagnosticsOf(program: Program, file: string): Promise<readonly Diagnostic[]> {
	return [
		...(await program.getSyntacticDiagnostics(file)),
		...(await program.getSemanticDiagnostics(file)),
	];
}

/**
 * Expression errors of the project's own files, at their place in the source. The second
 * snapshot reads each file with expressions as its shadow.
 */
async function expressionErrors(
	api: API,
	program: Program,
	checker: Checker,
	configPath: string,
	overlay: Map<string, string>,
	listPath: string,
	cwd: string,
): Promise<string[]> {
	const parsed: unknown = JSON.parse(await readFile(listPath, 'utf8'));
	const lists = { expressions: listOf(parsed, 'expressions'), code: listOf(parsed, 'code') };
	if (lists.expressions.size === 0 && lists.code.size === 0) return [];
	// Loaded here: the type check without an expression list does not need the package.
	const { codeScopeGlobals, itemScopeGlobals } = await import('@n8n/expression-types/globals');
	const globals = { item: itemScopeGlobals, code: codeScopeGlobals };
	const ast = await import('typescript/unstable/ast');

	const names = (await program.getSourceFileNames()).filter((file) => {
		const relative = path.relative(cwd, file);
		return (
			!relative.startsWith('..') &&
			!relative.split(path.sep).some((part) => part === 'node_modules' || part === '.n8n') &&
			/\.tsx?$/.test(file) &&
			!file.endsWith('.d.ts')
		);
	});
	const sources = (
		await Promise.all(names.map(async (file) => await program.getSourceFile(file)))
	).filter((source): source is SourceFile => source !== undefined);
	const shadows = (
		await Promise.all(
			sources.map(async (source) => await shadowOf(ast, source, checker, lists, globals)),
		)
	).filter((shadow): shadow is Shadow => shadow !== undefined);
	if (shadows.length === 0) return [];

	for (const shadow of shadows) overlay.set(shadow.fileName, shadow.text);
	const snapshot = await api.updateSnapshot({
		fileChanges: { changed: shadows.map(({ fileName }) => fileName) },
	});
	const shadowProgram = snapshot.getProject(configPath)?.program;
	if (!shadowProgram) throw new Error('Cannot open the shadow project');

	const perFile = await Promise.all(
		shadows.map(async (shadow) => {
			const diagnostics = await diagnosticsOf(shadowProgram, shadow.fileName);
			const setup = diagnostics.filter((diagnostic) => diagnostic.pos >= shadow.trailerStart);
			if (setup.length > 0) {
				throw new Error(setup.map((diagnostic) => diagnostic.text).join('; '));
			}
			const shadowSource = await shadowProgram.getSourceFile(shadow.fileName);
			if (!shadowSource) throw new Error(`Cannot read the shadow of ${shadow.fileName}`);
			const addedReads = addedFieldReads(ast, shadowSource);
			const file = path.relative(cwd, shadow.fileName);
			const typeErrors = diagnostics.flatMap((diagnostic) => {
				const replacement = shadow.replacements.find(
					(each) =>
						(diagnostic.pos >= each.shadowStart && diagnostic.pos < each.shadowEnd) ||
						// TypeScript reports a value that does not fit a property at its name.
						(diagnostic.pos === each.propertyName && diagnostic.code === 2322),
				);
				if (!replacement) return [];
				const inside = inBody(replacement, diagnostic.pos);
				if (inside && IMPLICIT_ANY_ERRORS.has(diagnostic.code)) return [];
				if (replacement.kind === 'code') {
					const syntax = diagnostic.code < 2000;
					const added =
						(diagnostic.code === 2339 || diagnostic.code === 2551) &&
						addedReads.has(diagnostic.pos);
					if (!inside || added || !(syntax || CODE_ERRORS.has(diagnostic.code))) return [];
				}
				// The first lines compare the lambda that stands in for the string; the last say why.
				const message = inside
					? formatMessage(diagnostic)
					: `The expression result does not fit the field: ${reasonsOf(diagnostic).join(' ')}`;
				return [
					formatError(
						shadow.source,
						file,
						sourceOffset(replacement, diagnostic.pos),
						`TS${diagnostic.code}: ${message}`,
					),
				];
			});
			const ruleErrors = sandboxRuleIssues(ast, shadowSource, shadow.replacements).map(
				({ pos, replacement, message }) =>
					formatError(
						shadow.source,
						file,
						sourceOffset(replacement, pos),
						`${SANDBOX_RULE}: ${message}`,
					),
			);
			return [...typeErrors, ...ruleErrors];
		}),
	);
	return perFile.flat();
}

// Check only the requested source and its imports. Do not execute the source.
// Arguments: the source, the base tsconfig (node contracts use a stricter one), and the list of
// n8n expressions to check (node contracts only).
async function main(): Promise<void> {
	const [sourceArg = '', tsconfig = 'tsconfig.json', expressionList] = process.argv.slice(2);
	const cwd = process.cwd();
	const configPath = path.join(cwd, `.workflow-diagnostics-${process.pid}.json`);
	const overlay = new Map([
		[
			configPath,
			JSON.stringify({
				extends: `./${tsconfig}`,
				files: [path.resolve(sourceArg)],
				include: [],
			}),
		],
	]);
	const api = new API({
		cwd,
		fs: {
			fileExists: (file) => (overlay.has(file) ? true : undefined),
			readFile: (file) => overlay.get(file),
		},
	});
	try {
		const snapshot = await api.updateSnapshot({ openProjects: [configPath] });
		const project = snapshot.getProject(configPath);
		if (!project) throw new Error('Cannot open the workflow project');
		const program = project.program;
		const diagnostics = [
			...(await program.getSyntacticDiagnostics()),
			...(await program.getBindDiagnostics()),
			...(await program.getSemanticDiagnostics()),
			...(await program.getProgramDiagnostics()),
			...(await program.getGlobalDiagnostics()),
		];
		const errors: string[] = [];
		for (const diagnostic of diagnostics) {
			if (diagnostic.category !== DiagnosticCategory.Error) continue;
			const message = `error TS${diagnostic.code}: ${formatMessage(diagnostic)}`;
			if (!diagnostic.fileName) {
				errors.push(message);
				continue;
			}
			const file = path.relative(cwd, diagnostic.fileName);
			if (file.startsWith('..' + path.sep) || file.split(path.sep).includes('node_modules'))
				continue;
			const source = await program.getSourceFile(diagnostic.fileName);
			if (!source || source.isDeclarationFile) continue;
			if (diagnostic.pos < 0) {
				errors.push(`${file}: ${message}`);
				continue;
			}
			errors.push(
				formatError(
					source,
					file,
					diagnostic.pos,
					`TS${diagnostic.code}: ${formatMessage(diagnostic)}`,
				),
			);
		}
		if (expressionList) {
			// The expression check adds findings; it never hides the type check. When it cannot run,
			// the exit code tells the host that the check is not complete.
			const found = await expressionErrors(
				api,
				program,
				project.checker,
				configPath,
				overlay,
				path.resolve(expressionList),
				cwd,
			).catch((error: unknown) => {
				process.stderr.write(`Expression check failed: ${String(error)}\n`);
				process.exitCode = EXPRESSION_CHECK_FAILED;
				return [];
			});
			errors.push(...found);
		}
		console.log(JSON.stringify([...new Set(errors)]));
	} finally {
		await api.close();
	}
}

await main();
