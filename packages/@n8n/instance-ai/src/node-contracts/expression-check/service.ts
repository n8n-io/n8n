// Vendored from github.com/elsmr/n8n-expression-types@d75330c:
// packages/@n8n/expression-ts-plugin/src/service.ts, plus `RuntimeShape` and `renderShape` from
// packages/@n8n/expression-types/src/contexts.ts. Changes: the lib .d.ts files are in-memory
// strings (./lib.ts), tsserver position mapping (`virtual`) and member docs are removed, and
// casts are guards.
//
// Types and diagnostics for n8n expressions with arbitrary JS inside {{ }}. Drives a TypeScript
// language service over a virtual file: each block body becomes `const __rN = (<body>);` next
// to the context's members declared as globals, and extensions.d.ts.

import type * as TS from '@typescript/typescript6';

import { CONTEXTS_D_TS, EXTENSIONS_D_TS, SHAPES_D_TS } from './lib';

export type ExpressionContext =
	| 'nodeParameter'
	| 'httpPagination'
	| 'routing'
	| 'description'
	| 'credential';

/** Runtime data as type text. */
export type RuntimeShape = {
	context: ExpressionContext;
	/** Holes are `never`, so reaching into them is an error. */
	strict?: boolean;
	inputJson?: string;
	inputBinaryKeys?: readonly string[];
	nodes: Record<string, { json: string; binaryKeys?: readonly string[]; params?: string }>;
	parameters?: string;
	credentials?: string;
	value?: string;
	response?: string;
	responseItem?: string;
	request?: string;
	vars?: readonly string[];
	env?: readonly string[];
};

/** The shape as the `R` type argument for its context interface. */
const renderShape = (s: RuntimeShape): string => {
	const tuple = (keys: readonly string[] | undefined) =>
		keys && keys.length > 0 ? `[${keys.map((k) => JSON.stringify(k)).join(', ')}]` : undefined;
	const object = (props: Array<[string, string | undefined]>) =>
		`{ ${props.flatMap(([k, v]) => (v ? [`${k}: ${v}`] : [])).join('; ')} }`;
	const node = (n: { json: string; binaryKeys?: readonly string[]; params?: string }) =>
		object([
			['json', n.json],
			['binaryKeys', tuple(n.binaryKeys)],
			['params', n.params],
		]);
	return object([
		[
			'input',
			object([
				['json', s.inputJson],
				['binaryKeys', tuple(s.inputBinaryKeys)],
			]),
		],
		['nodes', object(Object.entries(s.nodes).map(([k, n]) => [JSON.stringify(k), node(n)]))],
		['parameters', s.parameters],
		['credentials', s.credentials],
		['value', s.value],
		['response', s.response],
		['responseItem', s.responseItem],
		['request', s.request],
		['vars', tuple(s.vars)],
		['env', tuple(s.env)],
	]);
};

export type BlockAnalysis = {
	body: string;
	/** Offsets of the body inside the expression string. */
	start: number;
	end: number;
	type: string;
	errors: Array<{ message: string; start: number; end: number; code: number }>;
};

/** Diagnostic code for n8n's sandbox rules; TypeScript's own codes are all below this. */
export const SANDBOX_CODE = 90001;

/** n8n's own rules, enforced by the sandbox rather than by types (expression-sandboxing.ts, expression.ts). */
const sandboxViolations = (ts: typeof TS, root: TS.Node) => {
	const out: Array<{ node: TS.Node; message: string }> = [];
	const visit = (n: TS.Node) => {
		const member = ts.isPropertyAccessExpression(n)
			? n.name.text
			: ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)
				? n.argumentExpression.text
				: undefined;
		if (member === 'constructor') {
			out.push({
				node: n,
				message:
					"Expression contains invalid constructor function call. n8n rejects any '.constructor' access.",
			});
		} else if (member === 'prototype' || member === '__proto__') {
			out.push({ node: n, message: 'n8n blocks prototype access in expressions.' });
		} else if (
			ts.isIdentifier(n) &&
			n.text === '$' &&
			!(ts.isCallExpression(n.parent) && n.parent.expression === n) &&
			!(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)
		) {
			out.push({ node: n, message: 'Cannot access "$" without calling it as a function.' });
		} else if (ts.isClassLike(n) && n.heritageClauses?.length) {
			out.push({
				node: n,
				message: 'Cannot use dynamic class extension due to security concerns.',
			});
		}
		ts.forEachChild(n, visit);
	};
	visit(root);
	return out;
};

export type Analysis = {
	type: string;
	blocks: BlockAnalysis[];
	/** Set when `expected` was given and the expression's type is not assignable to it. */
	slotError?: string;
};

type Block = { body: string; start: number; end: number; fileStart: number };

const BLOCK = /\{\{([\s\S]*?)\}\}/g;

// Mirrors @n8n/tournament ExpressionBuilder: one text-less block returns its value,
// anything else concatenates to a string.
const compile = (expression: string) => {
	const blocks: Block[] = [];
	if (!expression.startsWith('=')) return { blocks, source: '', hasText: true };
	const body = expression.slice(1);
	const lines: string[] = [];
	for (const m of body.matchAll(BLOCK)) {
		const i = blocks.length;
		const prefix = `const __r${i} = (`;
		const fileStart = lines.join('\n').length + (i > 0 ? 1 : 0) + prefix.length;
		const start = m.index + 1 + 2;
		blocks.push({ body: m[1], start, end: start + m[1].length, fileStart });
		lines.push(`${prefix}${m[1]});`);
	}
	const hasText = body.replace(BLOCK, '').length > 0;
	return { blocks, source: lines.join('\n'), hasText };
};

/** `root` is a real directory: `luxon` types resolve from its node_modules ancestors. */
export const createExpressionService = ({ ts, root }: { ts: typeof TS; root: string }) => {
	const GLOBALS_FILE = `${root}/__expr__/globals.d.ts`;
	const EXPR_FILE = `${root}/__expr__/expr.ts`;
	const LIB_FILES: Array<[string, string]> = [
		[`${root}/__expr__/shapes.d.ts`, SHAPES_D_TS],
		[`${root}/__expr__/extensions.d.ts`, EXTENSIONS_D_TS],
		[`${root}/__expr__/contexts.d.ts`, CONTEXTS_D_TS],
	];

	const files = new Map<string, string>(LIB_FILES);
	const versions = new Map<string, number>();
	const set = (name: string, text: string) => {
		if (files.get(name) === text) return;
		files.set(name, text);
		versions.set(name, (versions.get(name) ?? 0) + 1);
	};

	// noImplicitAny off: with loose runtime data, `$json.items.map((i) => ...)` must not fail on `i`.
	const options: TS.CompilerOptions = {
		strict: true,
		noImplicitAny: false,
		target: ts.ScriptTarget.ESNext,
		lib: ['lib.es2023.d.ts'],
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		types: [],
		noEmit: true,
	};

	const host: TS.LanguageServiceHost = {
		getCompilationSettings: () => options,
		getScriptFileNames: () => [...files.keys()],
		getScriptVersion: (f) => String(versions.get(f) ?? 0),
		getScriptSnapshot: (f) => {
			const text = files.get(f) ?? ts.sys.readFile(f);
			return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
		},
		getCurrentDirectory: () => root,
		getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
		fileExists: (f) => files.has(f) || ts.sys.fileExists(f),
		readFile: (f) => files.get(f) ?? ts.sys.readFile(f),
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		readDirectory: ts.sys.readDirectory,
	};

	const service = ts.createLanguageService(host, ts.createDocumentRegistry());

	const programAndFile = (fileName: string) => {
		const program = service.getProgram();
		const sourceFile = program?.getSourceFile(fileName);
		if (!program || !sourceFile) throw new Error(`Expression service has no ${fileName}`);
		return { checker: program.getTypeChecker(), sf: sourceFile };
	};

	const contextType = (context: ExpressionContext, shape?: RuntimeShape) =>
		`N8nExpressionContexts<${shape ? renderShape(shape) : '{}'}, ${shape?.strict ? 'never' : 'N8nLooseJson'}>[${JSON.stringify(context)}]`;

	// The interface's members, read once per context through the checker: the list of names
	// is what `declare const` needs and the type system cannot hand over.
	const members = new Map<ExpressionContext, string[]>();
	const membersOf = (context: ExpressionContext) => {
		const hit = members.get(context);
		if (hit) return hit;
		set(GLOBALS_FILE, `declare const __probe: ${contextType(context)};\nexport {};\n`);
		const { checker, sf } = programAndFile(GLOBALS_FILE);
		const probe = sf.statements.find(ts.isVariableStatement);
		const list = probe
			? checker
					.getPropertiesOfType(
						checker.getTypeAtLocation(probe.declarationList.declarations[0].name),
					)
					.map((p) => p.name)
			: [];
		members.set(context, list);
		return list;
	};

	const globals = (shape: RuntimeShape) => {
		const decls = membersOf(shape.context)
			.map((name) => `const ${name}: __G[${JSON.stringify(name)}];`)
			.join('\n');
		return `type __G = ${contextType(shape.context, shape)};\ndeclare global {\n${decls}\n}\nexport {};\n`;
	};

	// `expected` adds a final assignment so the checker reports slot mismatches.
	const load = (expression: string, shape: RuntimeShape, expected?: string) => {
		set(GLOBALS_FILE, globals(shape));
		const compiled = compile(expression);
		const single = !compiled.hasText && compiled.blocks.length === 1;
		const check = expected
			? `\nconst __expected: ${expected} = ${single ? '__r0' : "'' as string"};`
			: '';
		set(EXPR_FILE, compiled.source + check);
		return compiled;
	};

	// Pure in its inputs, and each run builds a fresh inner program: memoised by content.
	const MEMO_LIMIT = 10_000;
	const analyses = new Map<string, Analysis>();
	const analyze = (expression: string, shape: RuntimeShape, expected?: string): Analysis => {
		const key = JSON.stringify([
			shape.context,
			shape.strict,
			renderShape(shape),
			expected,
			expression,
		]);
		const hit = analyses.get(key);
		if (hit) return hit;
		if (analyses.size >= MEMO_LIMIT) analyses.clear();
		const result = check(expression, shape, expected);
		analyses.set(key, result);
		return result;
	};

	const check = (expression: string, shape: RuntimeShape, expected?: string): Analysis => {
		const { blocks, hasText } = load(expression, shape, expected);
		if (blocks.length === 0) return { type: JSON.stringify(expression), blocks: [] };

		const { checker, sf } = programAndFile(EXPR_FILE);
		const diags = [
			...service.getSyntacticDiagnostics(EXPR_FILE),
			...service.getSemanticDiagnostics(EXPR_FILE),
		].flatMap((d) => (d.start === undefined ? [] : [{ ...d, start: d.start }]));

		// Find each block's statement by name: a body that is not a single expression would
		// otherwise shift every later block onto the wrong statement.
		const declaration = (name: string) =>
			sf.statements.find(
				(st): st is TS.VariableStatement =>
					ts.isVariableStatement(st) &&
					st.declarationList.declarations[0]?.name.getText(sf) === name,
			);
		const diagsIn = (stmt: TS.Statement) =>
			diags.filter((d) => d.start >= stmt.getStart(sf) && d.start <= stmt.getEnd());
		const typed = blocks.map((b, i): BlockAnalysis => {
			const stmt = declaration(`__r${i}`);
			const toExpr = (fileOffset: number) =>
				Math.min(Math.max(fileOffset - b.fileStart, 0), b.body.length) + b.start;
			if (!stmt) {
				return {
					body: b.body,
					start: b.start,
					end: b.end,
					type: 'unknown',
					errors: [
						{
							message: 'A block must contain a single expression.',
							start: b.start,
							end: b.end,
							code: 1109,
						},
					],
				};
			}
			const decl = stmt.declarationList.declarations[0];
			const type = checker.typeToString(
				checker.getTypeAtLocation(decl.name),
				undefined,
				ts.TypeFormatFlags.NoTruncation,
			);
			const errors = diagsIn(stmt).map((d) => ({
				message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
				start: toExpr(d.start),
				end: toExpr(d.start + (d.length ?? 1)),
				code: d.code,
			}));
			const sandbox = sandboxViolations(ts, stmt).map(({ node, message }) => ({
				message,
				start: toExpr(node.getStart(sf)),
				end: toExpr(node.getEnd()),
				code: SANDBOX_CODE,
			}));
			return { body: b.body, start: b.start, end: b.end, type, errors: [...errors, ...sandbox] };
		});
		const type = !hasText && typed.length === 1 ? typed[0].type : 'string';
		const checkStmt = expected ? declaration('__expected') : undefined;
		const slotError =
			checkStmt && diagsIn(checkStmt).length > 0
				? `Expression yields ${type}, slot expects ${expected}.`
				: undefined;
		return { type, blocks: typed, ...(slotError ? { slotError } : {}) };
	};

	return { analyze };
};

export type ExpressionService = ReturnType<typeof createExpressionService>;
