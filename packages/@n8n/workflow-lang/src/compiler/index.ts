import ts from 'typescript';

import {
	findNodeDefinition,
	findWorkflowDefinition,
	getProperty,
	skipOuter,
	stringLiteralValue,
} from './analysis.ts';
import { httpHeadersUnread, httpResultUnread, triggerHeadersUnread } from './headers.ts';
import type { Hasher, ModuleData } from './module.ts';
import { encodeModule, toHex } from './module.ts';
import { EffectKind } from './opcodes.ts';
import { Linker, type FunctionSourceMap } from './lower.ts';
import { triggerPaths } from './paths.ts';
import { createWorkflowProgram, WORKFLOW_FILE } from './program.ts';
import { project, type Canvas } from './projection.ts';
import { sha256 } from './sha256.ts';
import type { Diagnostic } from './validate.ts';
import { makeDiagnostic, validateFile } from './validate.ts';
import { checkLibraryCalls } from '../library/check.ts';
import { isKnownTimezone, scheduleMeta, validateTriggers } from './triggers.ts';

export const COMPILER_VERSION = '0.1.0';

export interface CompileOptions {
	fileName?: string;
	/** SHA-256 implementation. The default is a pure TypeScript one. */
	hasher?: Hasher;
	prelude?: Record<string, string>;
	nodes?: Record<string, string>;
	/** Allows implicit `any`, for legacy JavaScript expressions. */
	looseTypes?: boolean;
	/** Writes arrow callbacks of `map`, `filter` and the like as loops. Default true. */
	inlineCallbacks?: boolean;
}

export interface Manifest {
	name: string;
	moduleHash: string;
	sourceHash: string;
	native: boolean;
	durability: string;
	triggers: unknown[];
	credentials: Array<{ slot: string; type: unknown }>;
	nodeTypes: Array<{ type: string; version: number | null; library: boolean }>;
	steps: Array<{ index: number; id: string; name: string; kind: string; nodeType: string | null }>;
}

export interface SourceMap {
	version: 1;
	source: string;
	functions: FunctionSourceMap[];
}

export interface CompileResult {
	ok: boolean;
	diagnostics: Diagnostic[];
	module?: Uint8Array;
	data?: ModuleData;
	canvas?: Canvas;
	sourceMap?: SourceMap;
	manifest?: Manifest;
	/** Problems that do not stop the compile, for example a library node call that falls back (WL061). */
	warnings?: Diagnostic[];
}

/** Converts a literal expression to JSON. Other expressions become their source text. */
export function literalJson(expr: ts.Expression): unknown {
	const e = skipOuter(expr);
	if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
	if (ts.isNumericLiteral(e)) return Number(e.text);
	if (
		ts.isPrefixUnaryExpression(e) &&
		e.operator === ts.SyntaxKind.MinusToken &&
		ts.isNumericLiteral(e.operand)
	) {
		return -Number(e.operand.text);
	}
	if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
	if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
	if (e.kind === ts.SyntaxKind.NullKeyword) return null;
	if (ts.isArrayLiteralExpression(e)) return e.elements.map((x) => literalJson(x));
	if (ts.isObjectLiteralExpression(e)) {
		const out: Record<string, unknown> = {};
		for (const p of e.properties) {
			if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
				out[p.name.text] = literalJson(p.initializer);
			} else if (ts.isShorthandPropertyAssignment(p)) {
				out[p.name.text] = `={{ ${p.name.text} }}`;
			}
		}
		return out;
	}
	if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'webhook') {
		const opts = e.arguments[0];
		return { kind: 'webhook', ...(opts ? asRecord(literalJson(opts)) : {}) };
	}
	if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'schedule') {
		return scheduleMeta(e.arguments[0]);
	}
	return `={{ ${e.getText().replace(/\s+/g, ' ')} }}`;
}

function asRecord(v: unknown): Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v) ? { ...v } : {};
}

function tsDiagnostics(program: ts.Program, files: ts.SourceFile[]): Diagnostic[] {
	const out: Diagnostic[] = [];
	for (const sf of files) {
		for (const d of [
			...program.getSyntacticDiagnostics(sf),
			...program.getSemanticDiagnostics(sf),
		]) {
			if (d.category !== ts.DiagnosticCategory.Error) continue;
			const start = d.start ?? 0;
			const pos = sf.getLineAndCharacterOfPosition(start);
			out.push({
				code: `TS${d.code}`,
				message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
				file: sf.fileName,
				start,
				end: start + (d.length ?? 0),
				line: pos.line + 1,
				column: pos.character + 1,
				suggestion: '',
			});
		}
	}
	return out;
}

/**
 * Compiles a workflow source to a module, a canvas projection, a source map
 * and a manifest. It does no file system access.
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
	const hasher = options.hasher ?? sha256;
	const wp = createWorkflowProgram({
		source,
		fileName: options.fileName ?? WORKFLOW_FILE,
		prelude: options.prelude,
		nodes: options.nodes,
		looseTypes: options.looseTypes,
	});
	const libraryFiles = [...wp.preludeFiles, ...wp.nodeFiles];
	const diagnostics: Diagnostic[] = [
		...validateFile(wp.checker, wp.workflowFile, 'workflow'),
		...libraryFiles.flatMap((sf) => validateFile(wp.checker, sf, 'library')),
	];
	// Library node calls: linked, or run in the fallback host (src/library/check.ts).
	const libraryCalls = checkLibraryCalls(wp);
	diagnostics.push(...libraryCalls.errors);
	diagnostics.push(...tsDiagnostics(wp.program, [wp.workflowFile, ...libraryFiles]));
	const def = findWorkflowDefinition(wp.workflowFile);
	if (def) diagnostics.push(...validateTriggers(wp.checker, def.options));
	if (diagnostics.length > 0 || !def) return { ok: false, diagnostics };

	const linker = new Linker(wp, def.run, libraryCalls.unlinked, options.inlineCallbacks ?? true);
	linker.lowerRun();
	if (linker.diagnostics.length > 0) return { ok: false, diagnostics: linker.diagnostics };
	const lowered = linker.finish();

	const pool = lowered.pool;
	// Steps of library nodes that never read the headers of their HTTP results.
	const nodeFileOf = new Map<string, ts.SourceFile>();
	for (const sf of wp.nodeFiles) {
		const nodeDef = findNodeDefinition(sf);
		const type = nodeDef
			? stringLiteralValue(getProperty(nodeDef.options, 'type')?.initializer)
			: null;
		if (type) nodeFileOf.set(type, sf);
	}
	const headersUnread = new Map<string, boolean>();
	for (const s of lowered.steps) {
		if (!s.nodeType || !lowered.libraryTypes.has(s.nodeType)) continue;
		let unread = headersUnread.get(s.nodeType);
		if (unread === undefined) {
			const sf = nodeFileOf.get(s.nodeType);
			unread = sf !== undefined && httpHeadersUnread(wp.checker, sf);
			headersUnread.set(s.nodeType, unread);
		}
		if (unread) s.resultHeadersUnread = true;
	}
	// Steps of the workflow's own `ctx.http` calls whose results are never
	// read for their headers or body.
	for (const site of lowered.stepSites) {
		if (site.method !== 'http') continue;
		const unread = httpResultUnread(wp.checker, site.call);
		const step = lowered.steps[site.index];
		if (unread.headers) step.resultHeadersUnread = true;
		if (unread.body) step.resultBodyUnread = true;
	}
	const paths = triggerPaths(wp.checker, def.run);
	for (const p of paths) pool.str(p);

	const triggersExpr = getProperty(def.options, 'triggers')?.initializer;
	const triggers = triggersExpr ? literalJson(triggersExpr) : [];
	const credsExpr = getProperty(def.options, 'credentials')?.initializer;
	const credentials = asRecord(credsExpr ? literalJson(credsExpr) : {});
	const durabilityExpr = getProperty(def.options, 'durability')?.initializer;
	const durability = durabilityExpr ? String(literalJson(durabilityExpr)) : 'full';
	// Time zones that code formats dates in: the runtime loads their data (spec 4.5).
	const zonesExpr = getProperty(def.options, 'zones')?.initializer;
	const zonesValue = zonesExpr ? literalJson(zonesExpr) : [];
	const zones = Array.isArray(zonesValue)
		? zonesValue.filter((z): z is string => typeof z === 'string')
		: [];
	const badZone = zones.find((z) => !isKnownTimezone(z));
	if (badZone !== undefined && zonesExpr) {
		return {
			ok: false,
			diagnostics: [
				makeDiagnostic(
					zonesExpr,
					'WL054',
					`The time zone "${badZone}" is not known.`,
					"zones: ['Europe/Berlin']",
				),
			],
		};
	}
	const sourceHash = toHex(hasher(new TextEncoder().encode(source)));
	const meta = JSON.stringify({
		compilerVersion: COMPILER_VERSION,
		sourceHash,
		triggers,
		credentials,
		durability,
		// Only when there are zones, so other modules keep their bytes.
		...(zones.length > 0 ? { zones } : {}),
		// The runtime decodes the webhook trigger without the request headers.
		...(triggerHeadersUnread(wp.checker, def.run) ? { triggerHeaders: false } : {}),
	});
	pool.str(meta);

	const native = lowered.stepSites.every(
		(s) => s.method !== 'code' && (s.method !== 'node' || s.libraryType !== null),
	);
	const data: ModuleData = {
		native,
		strings: pool.strings,
		numbers: pool.numbers,
		functions: lowered.functions,
		steps: lowered.steps,
		suspends: lowered.suspends,
		paths,
		meta,
	};
	const bytes = encodeModule(data, hasher);
	const moduleHash = toHex(bytes.subarray(16, 48));

	const name = (options.fileName ?? 'workflow').replace(/^.*\//, '').replace(/\.ts$/, '');
	const nodeTypes = new Map<string, { type: string; version: number | null; library: boolean }>();
	for (const s of lowered.steps) {
		if (!s.nodeType) continue;
		const lib = lowered.libraryTypes.get(s.nodeType);
		nodeTypes.set(s.nodeType, {
			type: s.nodeType,
			version: lib?.version ?? null,
			library: lib !== undefined,
		});
	}
	const kindNames = Object.keys(EffectKind);
	const manifest: Manifest = {
		name,
		moduleHash,
		sourceHash,
		native,
		durability,
		triggers: Array.isArray(triggers) ? triggers : [triggers],
		credentials: Object.entries(credentials).map(([slot, v]) => ({
			slot,
			type: asRecord(v).type ?? null,
		})),
		nodeTypes: [...nodeTypes.values()],
		steps: lowered.steps.map((s, index) => ({
			index,
			id: s.id,
			name: s.name,
			kind: kindNames[s.kind] ?? 'node',
			nodeType: s.nodeType,
		})),
	};
	const canvas = project(wp.checker, wp.workflowFile, def, lowered);
	return {
		ok: true,
		diagnostics: [],
		warnings: libraryCalls.warnings,
		module: bytes,
		data,
		canvas,
		sourceMap: {
			version: 1,
			source: options.fileName ?? WORKFLOW_FILE,
			functions: lowered.sourceMaps,
		},
		manifest,
	};
}

export { decodeModule, disassemble } from './decode.ts';
export type { Diagnostic } from './validate.ts';
export type { Canvas } from './projection.ts';
