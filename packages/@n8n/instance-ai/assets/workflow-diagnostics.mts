import childProcess, { type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import type { ExpressionSpan, Shadow } from '@n8n/expression-types/check';
import type { Node, SourceFile } from 'typescript/unstable/ast';
import {
	API,
	DiagnosticCategory,
	SignatureKind,
	SymbolFlags,
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
// JavaScript. A literal with such a text, or a call whose one argument is such a literal (e.g.
// `expr('…')`, which adds the `=`), in a field that also takes a lambda or whose type the call
// infers from its value (a `set()` field), becomes a lambda in a shadow copy of its file
// (`@n8n/expression-types/check`, shared with the editor plugin).
// TypeScript then types it in place, as it types a lambda: `$json` is the item of the node
// before, `$('Node')` an earlier node, and the result must fit the field. This worker finds the
// spans and runs the programs; the check package builds the shadow and decides what counts.

type ContextualType = NonNullable<Awaited<ReturnType<Checker['getContextualType']>>>;

/** Loaded with the expression check only, so the plain type check starts as fast as before. */
type Ast = typeof import('typescript/unstable/ast');
type Check = typeof import('@n8n/expression-types/check');

interface FileShadow extends Shadow {
	readonly fileName: string;
	readonly source: SourceFile;
}

/** What an expression and Code see in a typed flow. The only place that names the flow SDK. */
const TRAILER = `
import type { CodeScope as __N8nCodeScope, ItemScope as __N8nItemScope } from '@n8n/expression-types';
import type { Dollar as __N8nDollar } from '@n8n/workflow-sdk/next';
declare function __n8nExpression<I, C, T>(args: [item: I, dollar: __N8nDollar<C>], body: (scope: __N8nItemScope<I, C>) => T): T;
declare function __n8nCode<I, C>(args: [item: I, dollar: __N8nDollar<C>], body: (scope: __N8nCodeScope<I, C>) => unknown): never;
`;

/** The exit code when the type check ran but the expression check did not. */
const EXPRESSION_CHECK_FAILED = 3;

function listOf(value: unknown, key: string): Set<string> {
	const field: unknown = typeof value === 'object' && value !== null ? Reflect.get(value, key) : [];
	return new Set(
		Array.isArray(field) ? field.filter((entry): entry is string => typeof entry === 'string') : [],
	);
}

/**
 * A field takes a lambda when its contextual type has a call signature. A field whose type the
 * call infers from its value, e.g. a `set()` field, has the type of the value there: its brand,
 * or for a plain string the type of an object that the call infers from its own literal.
 */
async function takesLambda(ast: Ast, check: Check, checker: Checker, node: Node): Promise<boolean> {
	if (!ast.isExpression(node)) return false;
	const contextual = await checker.getContextualType(node);
	if (!contextual) return false;
	if (await hasCallSignature(checker, contextual)) return true;
	if (ast.isCallExpression(node)) {
		return (await checker.getPropertyOfType(contextual, check.EXPRESSION_BRAND)) !== undefined;
	}
	return await isInferredField(ast, checker, node);
}

/** A contextual type with a call signature: the value can be a lambda. */
async function hasCallSignature(checker: Checker, contextual: ContextualType): Promise<boolean> {
	const parts = contextual.isUnionType() ? await contextual.getTypes() : [contextual];
	const signatures = await Promise.all(
		parts.map(async (part) => await checker.getSignaturesOfType(part, SignatureKind.Call)),
	);
	return signatures.some((list) => list.length > 0);
}

/**
 * The nearest object or array literal that takes a lambda around a value that sits in it through
 * object and array literals only, e.g. two levels deep in an open JSON value. n8n resolves an
 * expression at any depth of a parameter, so the expression reads the item of that lambda.
 */
async function lambdaScopeOf(ast: Ast, checker: Checker, node: Node): Promise<Node | undefined> {
	const { parent } = node;
	const container =
		ast.isPropertyAssignment(parent) && parent.initializer === node
			? parent.parent
			: ast.isArrayLiteralExpression(parent)
				? parent
				: undefined;
	if (
		!container ||
		!(ast.isObjectLiteralExpression(container) || ast.isArrayLiteralExpression(container))
	) {
		return undefined;
	}
	const contextual = await checker.getContextualType(container);
	return contextual && (await hasCallSignature(checker, contextual))
		? container
		: await lambdaScopeOf(ast, checker, container);
}

/** A property value of an object literal whose contextual type the call infers from that literal. */
async function isInferredField(ast: Ast, checker: Checker, node: Node): Promise<boolean> {
	const { parent } = node;
	if (!ast.isPropertyAssignment(parent) || !ast.isObjectLiteralExpression(parent.parent)) {
		return false;
	}
	const objectType = await checker.getContextualType(parent.parent);
	const symbol = await objectType?.getSymbol();
	return symbol !== undefined && (symbol.flags & SymbolFlags.ObjectLiteral) !== 0;
}

/** The listed expressions and Code texts of a file that sit in a field that takes a lambda. */
async function spansOf(
	ast: Ast,
	check: Check,
	source: SourceFile,
	checker: Checker,
	lists: { expressions: Set<string>; code: Set<string> },
): Promise<ExpressionSpan[]> {
	const candidates: Array<{
		node: Node;
		literal: Node & { readonly text: string };
		kind: 'expression' | 'code';
	}> = [];
	const isLiteral = (node: Node) =>
		ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node);
	const visit = (node: Node): void => {
		const [argument] = ast.isCallExpression(node) ? node.arguments : [];
		if (
			ast.isCallExpression(node) &&
			node.arguments.length === 1 &&
			argument &&
			(ast.isStringLiteral(argument) || ast.isNoSubstitutionTemplateLiteral(argument)) &&
			lists.expressions.has(argument.text.startsWith('=') ? argument.text : `=${argument.text}`)
		) {
			candidates.push({ node, literal: argument, kind: 'expression' });
		}
		if (ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node)) {
			const kind = lists.expressions.has(node.text)
				? 'expression'
				: lists.code.has(node.text)
					? 'code'
					: undefined;
			if (kind) candidates.push({ node, literal: node, kind });
		}
		node.forEachChild(visit);
	};
	source.forEachChild(visit);
	const slots = (
		await Promise.all(
			candidates.map(async (candidate) =>
				(await takesLambda(ast, check, checker, candidate.node)) ? [candidate] : [],
			),
		)
	).flat();
	const slotted = new Set(slots.map((slot) => slot.node));
	const scoped = (
		await Promise.all(
			candidates.map(async (candidate) => {
				if (candidate.kind !== 'expression' || slotted.has(candidate.node)) return [];
				const scope = await lambdaScopeOf(ast, checker, candidate.node);
				return scope ? [{ ...candidate, scope }] : [];
			}),
		)
	).flat();
	// A literal whose call is a slot or in a scope is part of that call.
	const calls = new Set(
		[...slots, ...scoped].filter((slot) => !isLiteral(slot.node)).map((slot) => slot.literal),
	);
	const spanOf = ({ node, literal, kind }: (typeof candidates)[number]) => ({
		kind,
		start: node.getStart(source),
		end: node.end,
		literalStart: literal.getStart(source),
		literalEnd: literal.end,
		text: literal.text,
	});
	return [
		...slots
			.filter((slot) => !(isLiteral(slot.node) && calls.has(slot.literal)))
			.map((slot) => {
				const { parent } = slot.node;
				const named = ast.isPropertyAssignment(parent) && parent.initializer === slot.node;
				return {
					...spanOf(slot),
					...(named ? { propertyName: parent.name.getStart(source) } : {}),
				};
			}),
		// No field types the result in a scope, so it has no property name to compare.
		...scoped
			.filter((slot) => !(isLiteral(slot.node) && calls.has(slot.literal)))
			.map((slot) => ({
				...spanOf(slot),
				scope: { start: slot.scope.getStart(source), end: slot.scope.end },
			})),
	];
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
	const check = await import('@n8n/expression-types/check');
	const scope = { globals: { item: itemScopeGlobals, code: codeScopeGlobals }, trailer: TRAILER };
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
			sources.map(async (source): Promise<FileShadow[]> => {
				const spans = await spansOf(ast, check, source, checker, lists);
				if (spans.length === 0) return [];
				const shadow = check.shadowOf(source.text, spans, scope);
				return [{ ...shadow, fileName: source.fileName, source }];
			}),
		)
	).flat();
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
			const addedReads = check.addedFieldReads<Node>(ast, shadowSource, shadowSource.text);
			const file = path.relative(cwd, shadow.fileName);
			const typeErrors = diagnostics.flatMap((diagnostic) => {
				const found = check.findingOf(shadow, diagnostic, addedReads);
				if (!found) return [];
				// The first lines compare the lambda that stands in for the string; the last say why.
				const message = found.inBody
					? formatMessage(diagnostic)
					: check.resultMismatchMessage(reasonsOf(diagnostic));
				return [formatError(shadow.source, file, found.start, `TS${diagnostic.code}: ${message}`)];
			});
			const ruleErrors = check
				.sandboxRuleIssues<Node>(ast, shadowSource, shadow)
				.map(({ start, message }) =>
					formatError(shadow.source, file, start, `${check.SANDBOX_RULE}: ${message}`),
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
