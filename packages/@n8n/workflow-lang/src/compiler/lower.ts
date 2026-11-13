import ts from 'typescript';

import {
	ctxCallMethod,
	findNodeDefinition,
	getProperty,
	isAsyncFunction,
	isCtxSymbol,
	isEffectCall,
	isPromiseAll,
	literalBoolean,
	literalNumber,
	promiseAllMap,
	propertyName,
	skipOuter,
	stringLiteralValue,
} from './analysis.ts';
import type { Label, Region } from './emitter.ts';
import { FunctionBuilder, liveRegisters } from './emitter.ts';
import { liveOut } from './liveness.ts';
import type { FunctionEntry, StepEntry, SuspendEntry } from './module.ts';
import {
	DATE_SETTERS,
	LOCALE_METHODS,
	dateMethodCall,
	dateStatic,
	dateUse,
	isDateConstructor,
	isDateish,
} from './dates.ts';
import { ConstPool } from './module.ts';
import { CONSTANTS, EffectKind, LIBRARY_FUNCTIONS, Op, PRELUDE_METHODS } from './opcodes.ts';
import type { WorkflowProgram } from './program.ts';
import { ScopeInfo, isAssignmentOperator } from './scope.ts';
import type { Diagnostic } from './validate.ts';
import { makeDiagnostic } from './validate.ts';

/** Capture key of the hidden step parameter of a library node. */
const STEP_KEY: unique symbol = Symbol('step');
type CaptureKey = ts.Symbol | typeof STEP_KEY;

type Binding =
	| { kind: 'reg'; reg: number; cell: boolean }
	| { kind: 'cap'; index: number; cell: boolean }
	| { kind: 'static'; decl: ts.FunctionDeclaration }
	| { kind: 'inline'; init: ts.Expression }
	| { kind: 'ctx' }
	| { kind: 'global'; name: string };

interface CompiledFunction {
	index: number;
	captures: CaptureKey[];
}

export interface SourceMapEntry {
	pc: number;
	start: number;
	end: number;
}

export interface FunctionSourceMap {
	name: string;
	file: string;
	entries: SourceMapEntry[];
}

export interface StepSite {
	index: number;
	call: ts.CallExpression;
	method: string;
	libraryType: string | null;
}

export interface LoweredModule {
	pool: ConstPool;
	functions: FunctionEntry[];
	steps: StepEntry[];
	stepSites: StepSite[];
	suspends: SuspendEntry[];
	sourceMaps: FunctionSourceMap[];
	libraryTypes: Map<string, { version: number }>;
	diagnostics: Diagnostic[];
}

class LowerError extends Error {
	readonly node: ts.Node;

	constructor(node: ts.Node, message: string) {
		super(message);
		this.node = node;
	}
}

const NEWERR_KINDS: Record<string, number> = { Error: 0, TypeError: 1, RangeError: 2 };

/** The size limit, in syntax nodes, of a helper function that the compiler inlines. */
const INLINE_STATIC_NODES = 160;

/**
 * Prelude methods whose arrow callback the compiler writes as a loop in the
 * caller, with no closure and no call for each element.
 */
const INLINE_METHODS: ReadonlySet<string> = new Set([
	'map',
	'filter',
	'forEach',
	'some',
	'every',
	'find',
	'findIndex',
	'flatMap',
]);

const BINARY_OPS: Partial<Record<ts.SyntaxKind, number>> = {
	[ts.SyntaxKind.PlusToken]: Op.ADD,
	[ts.SyntaxKind.MinusToken]: Op.SUB,
	[ts.SyntaxKind.AsteriskToken]: Op.MUL,
	[ts.SyntaxKind.SlashToken]: Op.DIV,
	[ts.SyntaxKind.PercentToken]: Op.MOD,
	[ts.SyntaxKind.AsteriskAsteriskToken]: Op.POW,
	[ts.SyntaxKind.AmpersandToken]: Op.BAND,
	[ts.SyntaxKind.BarToken]: Op.BOR,
	[ts.SyntaxKind.CaretToken]: Op.BXOR,
	[ts.SyntaxKind.LessThanLessThanToken]: Op.SHL,
	[ts.SyntaxKind.GreaterThanGreaterThanToken]: Op.SHR,
	[ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken]: Op.USHR,
	[ts.SyntaxKind.EqualsEqualsEqualsToken]: Op.SEQ,
	[ts.SyntaxKind.ExclamationEqualsEqualsToken]: Op.SNE,
	[ts.SyntaxKind.LessThanToken]: Op.LT,
	[ts.SyntaxKind.LessThanEqualsToken]: Op.LE,
	[ts.SyntaxKind.GreaterThanToken]: Op.GT,
	[ts.SyntaxKind.GreaterThanEqualsToken]: Op.GE,
};

const COMPOUND_OPS: Partial<Record<ts.SyntaxKind, number>> = {
	[ts.SyntaxKind.PlusEqualsToken]: Op.ADD,
	[ts.SyntaxKind.MinusEqualsToken]: Op.SUB,
	[ts.SyntaxKind.AsteriskEqualsToken]: Op.MUL,
	[ts.SyntaxKind.SlashEqualsToken]: Op.DIV,
	[ts.SyntaxKind.PercentEqualsToken]: Op.MOD,
	[ts.SyntaxKind.AsteriskAsteriskEqualsToken]: Op.POW,
	[ts.SyntaxKind.AmpersandEqualsToken]: Op.BAND,
	[ts.SyntaxKind.BarEqualsToken]: Op.BOR,
	[ts.SyntaxKind.CaretEqualsToken]: Op.BXOR,
	[ts.SyntaxKind.LessThanLessThanEqualsToken]: Op.SHL,
	[ts.SyntaxKind.GreaterThanGreaterThanEqualsToken]: Op.SHR,
	[ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken]: Op.USHR,
};

const GLOBAL_FUNCTIONS: ReadonlySet<string> = new Set([
	'Number',
	'String',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'btoa',
	'atob',
	'encodeURI',
	'encodeURIComponent',
	'decodeURIComponent',
	'escape',
	'unescape',
]);

function isInt32(n: number): boolean {
	return Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff && !Object.is(n, -0);
}

/** Lowers a checked and validated program to bytecode functions. */
export class Linker {
	readonly pool = new ConstPool();

	readonly functions: Array<FunctionEntry | null> = [null];

	readonly sourceMaps: Array<FunctionSourceMap | null> = [null];

	readonly suspends: SuspendEntry[] = [];

	readonly steps: StepEntry[] = [];

	readonly stepSites: StepSite[] = [];

	readonly stepIndex = new Map<ts.Node, number>();

	readonly diagnostics: Diagnostic[] = [];

	readonly libraryTypes = new Map<string, { version: number }>();

	readonly scope: ScopeInfo;

	readonly checker: ts.TypeChecker;

	private readonly memo = new Map<ts.Node, CompiledFunction>();

	private readonly libraryNodes = new Map<
		string,
		{ run: ts.FunctionLikeDeclaration; version: number }
	>();

	private readonly prelude = new Map<string, ts.FunctionDeclaration>();

	private readonly staticFiles = new Set<ts.SourceFile>();

	readonly wp: WorkflowProgram;

	readonly run: ts.FunctionLikeDeclaration;

	/** `ctx.node` calls that run in the fallback host, not the library (src/library/check.ts). */
	private readonly unlinked: ReadonlySet<ts.Node>;

	/** Writes the callbacks of `map` and the like as loops (`inlinePrelude`), and inlines small helpers. */
	readonly inlineCallbacks: boolean;

	private readonly helperSize = new Map<ts.FunctionDeclaration, boolean>();

	/**
	 * True for a helper that the compiler may inline: at most
	 * INLINE_STATIC_NODES syntax nodes, not async or a generator, no rest
	 * parameter, and no nested function or reference to itself.
	 */
	smallHelper(decl: ts.FunctionDeclaration, sym: ts.Symbol): boolean {
		const known = this.helperSize.get(decl);
		if (known !== undefined) return known;
		let ok =
			!decl.asteriskToken &&
			!decl.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
			!decl.parameters.some((p) => p.dotDotDotToken);
		let nodes = 0;
		const visit = (n: ts.Node) => {
			if (!ok) return;
			nodes++;
			if (
				nodes > INLINE_STATIC_NODES ||
				isBoundaryNode(n) ||
				n.kind === ts.SyntaxKind.ThisKeyword
			) {
				ok = false;
				return;
			}
			if (
				ts.isIdentifier(n) &&
				n.text === sym.name &&
				this.checker.getSymbolAtLocation(n) === sym
			) {
				ok = false;
				return;
			}
			ts.forEachChild(n, visit);
		};
		if (decl.body) ts.forEachChild(decl.body, visit);
		for (const p of decl.parameters) visit(p);
		this.helperSize.set(decl, ok);
		return ok;
	}

	constructor(
		wp: WorkflowProgram,
		run: ts.FunctionLikeDeclaration,
		unlinked: ReadonlySet<ts.Node> = new Set(),
		inlineCallbacks = true,
	) {
		this.unlinked = unlinked;
		this.inlineCallbacks = inlineCallbacks;
		this.wp = wp;
		this.run = run;
		this.checker = wp.checker;
		for (const sf of wp.nodeFiles) {
			this.staticFiles.add(sf);
			const def = findNodeDefinition(sf);
			const type = def ? stringLiteralValue(getProperty(def.options, 'type')?.initializer) : null;
			if (def && type) {
				const version = literalNumber(getProperty(def.options, 'version')?.initializer) ?? 1;
				this.libraryNodes.set(type, { run: def.run, version });
			}
		}
		for (const sf of wp.preludeFiles) {
			this.staticFiles.add(sf);
			for (const st of sf.statements) {
				if (ts.isFunctionDeclaration(st) && st.name) this.prelude.set(st.name.text, st);
			}
		}
		this.scope = new ScopeInfo(wp.checker, new Map([[wp.workflowFile, run]]), [
			wp.workflowFile,
			...wp.preludeFiles,
			...wp.nodeFiles,
		]);
		this.collectSteps(wp.workflowFile);
	}

	isLibraryType(type: string): boolean {
		return this.libraryNodes.has(type);
	}

	/** True when the `ctx.node` call links to the library node of `type`. */
	linksLibrary(call: ts.Node, type: string): boolean {
		return this.libraryNodes.has(type) && !this.unlinked.has(call);
	}

	private collectSteps(sf: ts.SourceFile) {
		const visit = (node: ts.Node) => {
			if (isEffectCall(this.checker, node)) {
				const method = ctxCallMethod(this.checker, node) ?? 'node';
				const opts = node.arguments[0] ? skipOuter(node.arguments[0]) : undefined;
				if (opts && ts.isObjectLiteralExpression(opts)) this.addStep(node, method, opts);
			}
			ts.forEachChild(node, visit);
		};
		visit(sf);
	}

	private addStep(call: ts.CallExpression, method: string, opts: ts.ObjectLiteralExpression) {
		const name =
			stringLiteralValue(getProperty(opts, 'name')?.initializer) ?? `step${this.steps.length}`;
		const id = stringLiteralValue(getProperty(opts, 'id')?.initializer) ?? name;
		const nodeType =
			method === 'node' ? stringLiteralValue(getProperty(opts, 'type')?.initializer) : null;
		const retry = getProperty(opts, 'retry')?.initializer;
		const retryObj =
			retry && ts.isObjectLiteralExpression(skipOuter(retry)) ? skipOuter(retry) : null;
		const retryMax =
			retryObj && ts.isObjectLiteralExpression(retryObj)
				? (literalNumber(getProperty(retryObj, 'max')?.initializer) ?? 0)
				: 0;
		const retryDelay =
			retryObj && ts.isObjectLiteralExpression(retryObj)
				? (literalNumber(getProperty(retryObj, 'delayMs')?.initializer) ?? 0)
				: 0;
		let idempotent = literalBoolean(getProperty(opts, 'idempotent')?.initializer);
		if (idempotent === null) {
			const m = stringLiteralValue(getProperty(opts, 'method')?.initializer);
			idempotent = method === 'wait' || (method === 'http' && (m === 'GET' || m === 'HEAD'));
		}
		const kind = effectKind(method);
		const index = this.steps.length;
		this.steps.push({
			id,
			name,
			nodeType: method === 'node' ? nodeType : nodeTypeForKind(method),
			kind,
			idempotent,
			retryMax,
			retryDelayMs: retryDelay,
			srcStart: call.getStart(),
			srcEnd: call.getEnd(),
		});
		this.stepIndex.set(call, index);
		this.stepSites.push({
			index,
			call,
			method,
			libraryType:
				method === 'node' && nodeType && this.linksLibrary(call, nodeType) ? nodeType : null,
		});
		this.pool.str(id);
		this.pool.str(name);
		if (this.steps[index].nodeType) this.pool.str(this.steps[index].nodeType ?? '');
	}

	isStaticFile(sf: ts.SourceFile): boolean {
		return this.staticFiles.has(sf);
	}

	/** Compiles `run` as function 0. */
	lowerRun(): void {
		try {
			const fl = new FnLowering(this, this.run, null, 'run');
			fl.compile(0);
		} catch (e) {
			if (e instanceof LowerError) {
				this.diagnostics.push(
					makeDiagnostic(e.node, 'WL090', e.message, 'Rewrite the construct in the subset.'),
				);
			} else {
				throw e;
			}
		}
	}

	/** Compiles a boundary node once and returns its function index and captures. */
	compileFunction(
		node: ts.Node,
		parent: FnLowering | null,
		role: FunctionRole = 'closure',
	): CompiledFunction {
		const found = this.memo.get(node);
		if (found) return found;
		const index = this.functions.length;
		this.functions.push(null);
		this.sourceMaps.push(null);
		const fl = new FnLowering(this, node, parent, role);
		const result = { index, captures: fl.captures };
		this.memo.set(node, result);
		fl.compile(index);
		return result;
	}

	libraryNode(type: string): CompiledFunction {
		const lib = this.libraryNodes.get(type);
		if (!lib) throw new Error(`unknown library node ${type}`);
		this.libraryTypes.set(type, { version: lib.version });
		return this.compileFunction(lib.run, null, 'node');
	}

	preludeFunction(name: string, at: ts.Node): CompiledFunction {
		const decl = this.prelude.get(name);
		if (!decl) throw new LowerError(at, `The prelude has no function ${name}.`);
		return this.compileFunction(decl, null, 'static');
	}

	staticFunction(decl: ts.FunctionDeclaration): CompiledFunction {
		return this.compileFunction(decl, null, 'static');
	}

	finish(): LoweredModule {
		const functions = this.functions.map((f, i) => {
			if (!f) throw new Error(`function ${i} was not compiled`);
			return f;
		});
		const sourceMaps = this.sourceMaps.map(
			(m, i) => m ?? { name: functions[i].name, file: '', entries: [] },
		);
		return {
			pool: this.pool,
			functions,
			steps: this.steps,
			stepSites: this.stepSites,
			suspends: this.suspends.sort((a, b) => a.func - b.func || a.pc - b.pc),
			sourceMaps,
			libraryTypes: this.libraryTypes,
			diagnostics: this.diagnostics,
		};
	}
}

function effectKind(method: string): number {
	switch (method) {
		case 'http':
			return EffectKind.http;
		case 'code':
			return EffectKind.code;
		case 'wait':
			return EffectKind.wait;
		case 'approval':
			return EffectKind.approval;
		case 'respond':
			return EffectKind.respond;
		case 'service':
			return EffectKind.service;
		default:
			return EffectKind.node;
	}
}

function nodeTypeForKind(method: string): string | null {
	switch (method) {
		case 'http':
			return 'n8n-nodes-base.httpRequest';
		case 'code':
			return 'n8n-nodes-base.code';
		case 'wait':
		case 'approval':
			return 'n8n-nodes-base.wait';
		case 'respond':
			return 'n8n-nodes-base.respondToWebhook';
		default:
			return null;
	}
}

type FunctionRole = 'run' | 'node' | 'closure' | 'static' | 'element';

interface Breakable {
	breakLabel: Label;
	continueLabel: Label | null;
	tryDepth: number;
}

interface TryContext {
	finallyBlock: ts.Block | undefined;
	open: Region[];
}

/** Lowers one function. */
class FnLowering {
	readonly fb = new FunctionBuilder();

	readonly captures: CaptureKey[] = [];

	private readonly captureIndex = new Map<CaptureKey, number>();

	private readonly locals = new Map<ts.Symbol, number>();

	/** Variables whose cell the block creates before its hoisted functions (`hoistFunctions`). */
	private readonly precreated = new Set<ts.Symbol>();

	private stepReg: number | null = null;

	private readonly breakables: Breakable[] = [];

	private tryStack: TryContext[] = [];

	/**
	 * Callbacks whose locals `collectLocals` declared here. A callback in a
	 * module-level constant, lowered where it is used, is not in it and
	 * stays a closure.
	 */
	private readonly inlined = new Set<ts.ArrowFunction>();

	/** Helper functions whose locals `collectLocals` declared here (`inlineStatic`). */
	private readonly inlinedDecls = new Set<ts.FunctionDeclaration>();

	/** The helpers being inlined at this point, so that none inlines itself. */
	private readonly inlining = new Set<ts.Node>();

	/** Where a `return` of an inlined callback goes (`inlinePrelude`). */
	private inlineReturn: { dst: number; label: Label; tryDepth: number } | null = null;

	private readonly chainLabels: Label[] = [];

	private readonly checker: ts.TypeChecker;

	private readonly pool: ConstPool;

	private readonly linker: Linker;

	private readonly node: ts.Node;

	private readonly parent: FnLowering | null;

	private readonly role: FunctionRole;

	constructor(linker: Linker, node: ts.Node, parent: FnLowering | null, role: FunctionRole) {
		this.linker = linker;
		this.node = node;
		this.parent = parent;
		this.role = role;
		this.checker = linker.checker;
		this.pool = linker.pool;
	}

	// ---------------------------------------------------------------- setup

	private functionName(): string {
		const n = this.node;
		const sf = n.getSourceFile();
		const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
		if (this.role === 'run') return 'run';
		if (this.role === 'node') {
			const def = findNodeDefinition(sf);
			const type = def ? stringLiteralValue(getProperty(def.options, 'type')?.initializer) : null;
			return `node:${type ?? sf.fileName}`;
		}
		if (this.role === 'element') return `all@${line}`;
		if (ts.isFunctionDeclaration(n) && n.name) {
			return this.role === 'static'
				? `${sf.fileName.replace(/^\/|\.ts$/g, '')}.${n.name.text}`
				: n.name.text;
		}
		const parent = n.parent;
		if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
		if (ts.isMethodDeclaration(n)) {
			const name = propertyName(n.name);
			if (name) return name;
		}
		if (ts.isPropertyAssignment(parent)) {
			const name = propertyName(parent.name);
			if (name) return name;
		}
		return `anon@${line}`;
	}

	private typeString(symbol: ts.Symbol, at: ts.Node): string {
		return this.checker.typeToString(
			this.checker.getTypeOfSymbolAtLocation(symbol, at),
			undefined,
			ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType,
		);
	}

	private addLocalSymbol(symbol: ts.Symbol, at: ts.Node) {
		if (this.locals.has(symbol)) return;
		const reg = this.fb.addLocal({ name: symbol.name, type: this.typeString(symbol, at) });
		this.locals.set(symbol, reg);
	}

	private symbolOf(name: ts.Identifier): ts.Symbol {
		const s = this.checker.getSymbolAtLocation(name);
		if (!s) throw new LowerError(name, `Cannot resolve ${name.text}.`);
		return s;
	}

	private declareBindingName(name: ts.BindingName) {
		if (ts.isIdentifier(name)) {
			this.addLocalSymbol(this.symbolOf(name), name);
			return;
		}
		for (const el of name.elements) {
			if (ts.isOmittedExpression(el)) continue;
			this.declareBindingName(el.name);
		}
	}

	/** Collects the locals of a body, without entering nested boundaries. */
	private collectLocals(root: ts.Node) {
		const visit = (n: ts.Node) => {
			if (ts.isVariableDeclaration(n)) this.declareBindingName(n.name);
			if (ts.isFunctionDeclaration(n) && n.name && n !== this.node) {
				this.addLocalSymbol(this.symbolOf(n.name), n.name);
				return;
			}
			if (ts.isCatchClause(n) && n.variableDeclaration) {
				this.declareBindingName(n.variableDeclaration.name);
			}
			if (n !== this.node && isBoundaryNode(n)) {
				// An inlined callback runs in this function: its parameters
				// and locals are locals here.
				if (ts.isArrowFunction(n) && this.isInlinedCallback(n)) {
					this.inlined.add(n);
					for (const p of n.parameters) this.declareBindingName(p.name);
					visit(n.body);
				}
				return;
			}
			if (ts.isCallExpression(n)) {
				const decl = this.inlinableStatic(n);
				if (decl?.body) {
					this.inlinedDecls.add(decl);
					for (const p of decl.parameters) this.declareBindingName(p.name);
					this.inlining.add(decl);
					visit(decl.body);
					this.inlining.delete(decl);
				}
			}
			if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isTypeNode(n)) return;
			ts.forEachChild(n, visit);
		};
		visit(root);
	}

	compile(index: number) {
		const fb = this.fb;
		const n = this.node;
		let nparams = 0;
		const prologue: Array<() => void> = [];
		// Names bound by parameter patterns. They get registers after all parameters.
		const patternNames: ts.BindingName[] = [];
		const isFn =
			ts.isFunctionDeclaration(n) ||
			ts.isFunctionExpression(n) ||
			ts.isArrowFunction(n) ||
			ts.isMethodDeclaration(n);
		if (isFn) {
			let params = [...n.parameters];
			if (this.role === 'run' || this.role === 'node') params = params.slice(1);
			if (this.role === 'run') {
				// Register 0 is the trigger value, even when run does not declare it.
				const p = params[0];
				if (p && ts.isIdentifier(p.name)) {
					this.addLocalSymbol(this.symbolOf(p.name), p.name);
				} else {
					const reg = fb.addLocal({ name: 'trigger', type: 'unknown' });
					if (p) {
						patternNames.push(p.name);
						prologue.push(() => this.bindPattern(p.name, reg, true));
					}
				}
				nparams = 1;
			} else {
				for (const p of params) {
					if (ts.isIdentifier(p.name)) {
						const sym = this.symbolOf(p.name);
						this.addLocalSymbol(sym, p.name);
						if (p.initializer) {
							const reg = this.locals.get(sym) ?? 0;
							const init = p.initializer;
							prologue.push(() => this.defaultValue(reg, init));
						}
					} else {
						const reg = fb.addLocal({ name: `$arg${nparams}`, type: 'unknown' });
						const name = p.name;
						const init = p.initializer;
						patternNames.push(name);
						prologue.push(() => {
							if (init) this.defaultValue(reg, init);
							this.bindPattern(name, reg, true);
						});
					}
					nparams++;
				}
				if (this.role === 'node') {
					// Pad the declared parameters to (parameters, items, credential).
					while (nparams < 3) {
						fb.addLocal({ name: `$arg${nparams}`, type: 'unknown' });
						nparams++;
					}
					this.stepReg = fb.addLocal({ name: '$step', type: 'number' });
					nparams++;
				}
			}
		}
		for (const name of patternNames) this.declareBindingName(name);
		// Parameters that need cells.
		for (const [sym, reg] of this.locals) {
			if (this.linker.scope.needsCell(sym)) {
				prologue.unshift(() => fb.emit(Op.NEWCELL, reg, reg));
			}
		}
		if (this.role === 'run') {
			for (const st of this.linker.wp.workflowFile.statements) {
				if (ts.isVariableStatement(st) || ts.isFunctionDeclaration(st)) this.collectLocals(st);
			}
		}
		if (isFn && n.body) this.collectLocals(n.body);
		if (this.role === 'element') this.collectLocals(n);

		fb.range = [n.getStart(), n.getEnd()];
		for (const p of prologue) p();
		if (this.role === 'run') {
			const moduleStatements = this.linker.wp.workflowFile.statements.filter(
				(st) => ts.isVariableStatement(st) || ts.isFunctionDeclaration(st),
			);
			this.hoistFunctions(moduleStatements);
			for (const st of moduleStatements) this.statement(st);
		}
		if (this.role === 'element') {
			if (!ts.isExpression(n))
				throw new LowerError(n, 'A Promise.all element must be an expression.');
			const r = this.expr(n);
			fb.emit(Op.RET, r);
		} else if (isFn && n.body) {
			if (ts.isBlock(n.body)) {
				this.hoistFunctions(n.body.statements);
				for (const st of n.body.statements) this.statement(st);
				const t = fb.temp();
				fb.range = [n.end - 1, n.end];
				fb.emit(Op.LOADUNDEF, t);
				fb.emit(Op.RET, t);
			} else {
				const r = this.expr(n.body);
				fb.emit(Op.RET, r);
			}
		}

		const tries = fb.finish();
		const entry: FunctionEntry = {
			name: this.functionName(),
			nparams,
			nregs: Math.max(fb.maxRegs, 1),
			ncaps: this.captures.length,
			async:
				this.role === 'run' ||
				this.role === 'node' ||
				this.role === 'element' ||
				isAsyncFunction(n),
			code: fb.code,
			tries,
		};
		this.pool.str(entry.name);
		this.linker.functions[index] = entry;

		// Resume signatures.
		if (fb.suspends.length > 0) {
			const capsOf = (fi: number) => this.linker.functions[fi]?.ncaps ?? 0;
			const live = liveOut(fb.code, tries, capsOf);
			for (const site of fb.suspends) {
				const resultReg = fb.code[site.pc].a;
				const regs = liveRegisters(site, live[site.pc], resultReg);
				for (const r of regs) {
					this.pool.str(r.name);
					this.pool.str(r.type);
				}
				this.linker.suspends.push({ func: index, pc: site.pc, step: site.step, live: regs });
			}
		}
		// Source map.
		const entries: Array<{ pc: number; start: number; end: number }> = [];
		fb.ranges.forEach(([start, end], pc) => {
			const last = entries[entries.length - 1];
			if (!last || last.start !== start || last.end !== end) entries.push({ pc, start, end });
		});
		this.linker.sourceMaps[index] = { name: entry.name, file: n.getSourceFile().fileName, entries };
	}

	// ------------------------------------------------------------ bindings

	private resolveKey(key: CaptureKey, at: ts.Node): Binding {
		if (key === STEP_KEY) {
			if (this.stepReg !== null) return { kind: 'reg', reg: this.stepReg, cell: false };
			if (!this.parent)
				throw new LowerError(at, 'ctx.http is allowed only inside the run function of a node.');
			return { kind: 'cap', index: this.captureOf(key), cell: false };
		}
		return this.resolve(key, at);
	}

	private captureOf(key: CaptureKey): number {
		let i = this.captureIndex.get(key);
		if (i === undefined) {
			i = this.captures.length;
			this.captures.push(key);
			this.captureIndex.set(key, i);
		}
		return i;
	}

	private resolve(symbol: ts.Symbol, at: ts.Node): Binding {
		const local = this.locals.get(symbol);
		if (local !== undefined)
			return { kind: 'reg', reg: local, cell: this.linker.scope.needsCell(symbol) };
		const decl = symbol.valueDeclaration;
		if (!decl) throw new LowerError(at, `\`${symbol.name}\` has no value.`);
		if (isCtxSymbol(this.checker, symbol)) return { kind: 'ctx' };
		const sf = decl.getSourceFile();
		if (this.linker.isStaticFile(sf) && isModuleLevel(decl)) {
			if (ts.isFunctionDeclaration(decl)) return { kind: 'static', decl };
			if (ts.isVariableDeclaration(decl) && decl.initializer)
				return { kind: 'inline', init: decl.initializer };
		}
		if (sf.fileName.endsWith('.d.ts')) return { kind: 'global', name: symbol.name };
		if (!this.parent) throw new LowerError(at, `\`${symbol.name}\` is not visible here.`);
		return {
			kind: 'cap',
			index: this.captureOf(symbol),
			cell: this.linker.scope.needsCell(symbol),
		};
	}

	/** Loads a variable. It can return the register of the variable itself. */
	private loadBinding(b: Binding, at: ts.Node, dst?: number): number {
		const fb = this.fb;
		switch (b.kind) {
			case 'reg':
				if (b.cell) {
					const d = dst ?? fb.temp();
					fb.emit(Op.GETCELL, d, b.reg);
					return d;
				}
				if (dst !== undefined && dst !== b.reg) fb.emit(Op.MOV, dst, b.reg);
				return dst ?? b.reg;
			case 'cap': {
				const d = dst ?? fb.temp();
				fb.emit(Op.GETCAP, d, b.index);
				if (b.cell) fb.emit(Op.GETCELL, d, d);
				return d;
			}
			case 'static': {
				const d = dst ?? fb.temp();
				const f = this.linker.staticFunction(b.decl);
				fb.emit(Op.CLOSURE, d, f.index, 0);
				return d;
			}
			case 'inline':
				return this.expr(b.init, dst);
			case 'ctx': {
				const d = dst ?? fb.temp();
				fb.emit(Op.LOADUNDEF, d);
				return d;
			}
			case 'global':
				return this.loadGlobal(b.name, at, dst);
			default:
				throw new LowerError(at, 'unknown binding');
		}
	}

	private loadGlobal(name: string, at: ts.Node, dst?: number): number {
		const d = dst ?? this.fb.temp();
		if (name === 'undefined') this.fb.emit(Op.LOADUNDEF, d);
		else if (CONSTANTS.has(name)) this.loadNumber(CONSTANTS.get(name) ?? 0, d);
		else throw new LowerError(at, `\`${name}\` cannot be used as a value.`);
		return d;
	}

	private storeSymbol(symbol: ts.Symbol, value: number, declare: boolean, at: ts.Node) {
		const b = this.resolve(symbol, at);
		const fb = this.fb;
		if (b.kind === 'reg') {
			if (b.cell) {
				if (declare) fb.emit(Op.NEWCELL, b.reg, value);
				else fb.emit(Op.SETCELL, b.reg, value);
			} else if (b.reg !== value) {
				fb.emit(Op.MOV, b.reg, value);
			}
			return;
		}
		if (b.kind === 'cap' && b.cell) {
			const t = fb.temp();
			fb.emit(Op.GETCAP, t, b.index);
			fb.emit(Op.SETCELL, t, value);
			return;
		}
		throw new LowerError(at, `\`${symbol.name}\` cannot be assigned here.`);
	}

	// ------------------------------------------------------------ helpers

	private str(s: string, at: ts.Node): number {
		const i = this.pool.str(s);
		if (i > 0xffff) throw new LowerError(at, 'Too many string constants.');
		return i;
	}

	private loadNumber(n: number, dst: number) {
		if (isInt32(n)) this.fb.emitBC(Op.LOADI, dst, n);
		else this.fb.emitBC(Op.LOADK, dst, this.pool.num(n));
	}

	private withRange<T>(node: ts.Node, f: () => T): T {
		const saved = this.fb.range;
		this.fb.range = [node.getStart(), node.getEnd()];
		try {
			return f();
		} finally {
			this.fb.range = saved;
		}
	}

	/** Evaluates `node` into a fresh temporary, never into a variable register. */
	private exprTemp(node: ts.Expression): number {
		const t = this.fb.temp();
		this.expr(node, t);
		return t;
	}

	private defaultValue(reg: number, init: ts.Expression) {
		const fb = this.fb;
		const skip = fb.newLabel();
		const u = fb.temp();
		fb.emit(Op.LOADUNDEF, u);
		fb.emit(Op.SNE, u, reg, u);
		fb.jump(Op.JT, u, skip);
		this.expr(init, reg);
		fb.placeLabel(skip);
	}

	private hoistFunctions(statements: readonly ts.Statement[]) {
		const decls = statements.filter(
			(s): s is ts.FunctionDeclaration =>
				ts.isFunctionDeclaration(s) && s.name !== undefined && s.body !== undefined,
		);
		if (decls.length === 0) return;
		const fb = this.fb;
		// A hoisted function can capture a `let` or `const` of the block before the declaration
		// runs. The cell must exist when the closure is made, so the block makes it first.
		for (const st of statements) {
			if (!ts.isVariableStatement(st)) continue;
			for (const d of st.declarationList.declarations) {
				for (const sym of bindingSymbols(d.name, this.checker)) {
					const b = this.resolve(sym, d);
					if (b.kind !== 'reg' || !b.cell) continue;
					const u = fb.temp();
					fb.emit(Op.LOADUNDEF, u);
					fb.emit(Op.NEWCELL, b.reg, u);
					this.precreated.add(sym);
				}
			}
		}
		const named = decls.flatMap((d) => (d.name ? [{ d, sym: this.symbolOf(d.name) }] : []));
		// Cells first, so that functions can capture each other.
		for (const { d, sym } of named) {
			const b = this.resolve(sym, d);
			if (b.kind === 'reg' && b.cell) {
				const u = fb.temp();
				fb.emit(Op.LOADUNDEF, u);
				fb.emit(Op.NEWCELL, b.reg, u);
			}
		}
		for (const { d, sym } of named) {
			this.withRange(d, () => {
				const mark = fb.mark();
				const t = this.closure(d);
				this.storeSymbol(sym, t, false, d);
				fb.release(mark);
			});
		}
	}

	/** Creates a closure for a boundary node and returns its register. */
	private closure(node: ts.Node, dst?: number, role: FunctionRole = 'closure'): number {
		const fb = this.fb;
		const f = this.linker.compileFunction(node, this, role);
		const d = dst ?? fb.temp();
		const base = fb.temps(f.captures.length);
		f.captures.forEach((key, i) => {
			const b = this.resolveKey(key, node);
			if (b.kind === 'reg') fb.emit(Op.MOV, base + i, b.reg);
			else if (b.kind === 'cap') fb.emit(Op.GETCAP, base + i, b.index);
			else this.loadBinding(b, node, base + i);
		});
		fb.emit(Op.CLOSURE, d, f.index, f.captures.length > 0 ? base : 0);
		return d;
	}

	// ---------------------------------------------------------- statements

	private statement(st: ts.Statement) {
		const fb = this.fb;
		const mark = fb.mark();
		const saved = fb.range;
		if (!ts.isBlock(st) && !ts.isTryStatement(st)) fb.range = [st.getStart(), st.getEnd()];
		try {
			this.statementInner(st);
		} finally {
			fb.range = saved;
			fb.release(mark);
		}
	}

	private block(statements: readonly ts.Statement[]) {
		this.hoistFunctions(statements);
		for (const s of statements) this.statement(s);
	}

	private statementInner(st: ts.Statement) {
		const fb = this.fb;
		if (ts.isBlock(st)) {
			this.block(st.statements);
		} else if (ts.isVariableStatement(st)) {
			this.variableList(st.declarationList);
		} else if (ts.isFunctionDeclaration(st) || ts.isEmptyStatement(st)) {
			// Hoisted, or nothing to do.
		} else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) {
			// Types only.
		} else if (ts.isExpressionStatement(st)) {
			this.expr(st.expression);
		} else if (ts.isIfStatement(st)) {
			const elseLabel = fb.newLabel();
			const end = fb.newLabel();
			const m = fb.mark();
			const c = this.expr(st.expression);
			fb.jump(Op.JF, c, st.elseStatement ? elseLabel : end);
			fb.release(m);
			this.statement(st.thenStatement);
			if (st.elseStatement) {
				fb.jump(Op.JMP, 0, end);
				fb.placeLabel(elseLabel);
				this.statement(st.elseStatement);
			}
			fb.placeLabel(end);
		} else if (ts.isWhileStatement(st)) {
			const top = fb.newLabel();
			const end = fb.newLabel();
			fb.placeLabel(top);
			const m = fb.mark();
			fb.jump(Op.JF, this.expr(st.expression), end);
			fb.release(m);
			this.loopBody(st.statement, end, top);
			fb.jump(Op.JMP, 0, top);
			fb.placeLabel(end);
		} else if (ts.isDoStatement(st)) {
			const top = fb.newLabel();
			const cont = fb.newLabel();
			const end = fb.newLabel();
			fb.placeLabel(top);
			this.loopBody(st.statement, end, cont);
			fb.placeLabel(cont);
			const m = fb.mark();
			fb.jump(Op.JT, this.expr(st.expression), top);
			fb.release(m);
			fb.placeLabel(end);
		} else if (ts.isForStatement(st)) {
			this.forStatement(st);
		} else if (ts.isForOfStatement(st)) {
			this.forOfStatement(st);
		} else if (ts.isSwitchStatement(st)) {
			this.switchStatement(st);
		} else if (ts.isBreakStatement(st) || ts.isContinueStatement(st)) {
			if (st.label) throw new LowerError(st, 'Labels are not allowed.');
			const isBreak = ts.isBreakStatement(st);
			let target: Breakable | undefined;
			for (let i = this.breakables.length - 1; i >= 0; i--) {
				const b = this.breakables[i];
				if (isBreak || b.continueLabel !== null) {
					target = b;
					break;
				}
			}
			if (!target) throw new LowerError(st, 'break or continue outside a loop.');
			const label = isBreak ? target.breakLabel : (target.continueLabel ?? target.breakLabel);
			this.exitThrough(target.tryDepth, () => fb.jump(Op.JMP, 0, label));
		} else if (ts.isReturnStatement(st) && this.inlineReturn) {
			const target = this.inlineReturn;
			if (st.expression) this.expr(st.expression, target.dst);
			else fb.emit(Op.LOADUNDEF, target.dst);
			this.exitThrough(target.tryDepth, () => fb.jump(Op.JMP, 0, target.label));
		} else if (ts.isReturnStatement(st)) {
			let r: number;
			if (st.expression) {
				r = this.expr(st.expression);
				if (!fb.isTemp(r) && this.tryStack.some((t) => t.finallyBlock)) {
					const t = fb.temp();
					fb.emit(Op.MOV, t, r);
					r = t;
				}
			} else {
				r = fb.temp();
				fb.emit(Op.LOADUNDEF, r);
			}
			this.exitThrough(0, () => fb.emit(Op.RET, r));
		} else if (ts.isThrowStatement(st)) {
			fb.emit(Op.THROW, this.expr(st.expression));
		} else if (ts.isTryStatement(st)) {
			this.tryStatement(st);
		} else {
			throw new LowerError(st, `The statement kind ${ts.SyntaxKind[st.kind]} is not supported.`);
		}
	}

	private loopBody(body: ts.Statement, breakLabel: Label, continueLabel: Label) {
		this.breakables.push({ breakLabel, continueLabel, tryDepth: this.tryStack.length });
		this.statement(body);
		this.breakables.pop();
	}

	private variableList(list: ts.VariableDeclarationList) {
		for (const d of list.declarations) {
			this.withRange(d, () => {
				const m = this.fb.mark();
				// Create cells first: a closure in the initializer can capture the variable.
				const u = this.fb.temp();
				this.fb.emit(Op.LOADUNDEF, u);
				for (const sym of bindingSymbols(d.name, this.checker)) {
					const b = this.resolve(sym, d);
					if (b.kind === 'reg' && b.cell && !this.precreated.has(sym)) {
						this.fb.emit(Op.NEWCELL, b.reg, u);
					}
				}
				if (ts.isIdentifier(d.name)) {
					const sym = this.symbolOf(d.name);
					const b = this.resolve(sym, d);
					if (!d.initializer) {
						this.storeSymbol(sym, u, false, d);
					} else if (b.kind === 'reg' && !b.cell && !refersTo(d.initializer, sym, this.checker)) {
						this.expr(d.initializer, b.reg);
					} else {
						this.storeSymbol(sym, this.exprTemp(d.initializer), false, d);
					}
				} else {
					if (!d.initializer) throw new LowerError(d, 'A destructuring declaration needs a value.');
					this.bindPattern(d.name, this.exprTemp(d.initializer), false);
				}
				this.fb.release(m);
			});
		}
	}

	private forStatement(st: ts.ForStatement) {
		const fb = this.fb;
		const top = fb.newLabel();
		const cont = fb.newLabel();
		const end = fb.newLabel();
		const cellVars: number[] = [];
		if (st.initializer) {
			if (ts.isVariableDeclarationList(st.initializer)) {
				this.variableList(st.initializer);
				for (const d of st.initializer.declarations) {
					for (const sym of bindingSymbols(d.name, this.checker)) {
						const b = this.resolve(sym, d);
						if (b.kind === 'reg' && b.cell) cellVars.push(b.reg);
					}
				}
			} else {
				const m = fb.mark();
				this.expr(st.initializer);
				fb.release(m);
			}
		}
		fb.placeLabel(top);
		if (st.condition) {
			const m = fb.mark();
			fb.jump(Op.JF, this.expr(st.condition), end);
			fb.release(m);
		}
		this.loopBody(st.statement, end, cont);
		fb.placeLabel(cont);
		const m = fb.mark();
		// Each iteration gets a fresh binding of a captured loop variable.
		for (const reg of cellVars) {
			const t = fb.temp();
			fb.emit(Op.GETCELL, t, reg);
			fb.emit(Op.NEWCELL, reg, t);
		}
		if (st.incrementor) this.expr(st.incrementor);
		fb.release(m);
		fb.jump(Op.JMP, 0, top);
		fb.placeLabel(end);
	}

	private forOfStatement(st: ts.ForOfStatement) {
		const fb = this.fb;
		if (st.awaitModifier) throw new LowerError(st, '`for await` is not allowed.');
		const arr = fb.temp({ name: '$iter', type: 'unknown' });
		this.expr(st.expression, arr);
		const i = fb.temp({ name: '$index', type: 'number' });
		fb.emitBC(Op.LOADI, i, 0);
		const top = fb.newLabel();
		const cont = fb.newLabel();
		const end = fb.newLabel();
		fb.placeLabel(top);
		{
			const m = fb.mark();
			const len = fb.temp();
			fb.emit(Op.GETPROP, len, arr, this.str('length', st));
			fb.emit(Op.LT, len, i, len);
			fb.jump(Op.JF, len, end);
			const v = fb.temp();
			fb.emit(Op.GETELEM, v, arr, i);
			const init = st.initializer;
			if (ts.isVariableDeclarationList(init)) {
				const d = init.declarations[0];
				if (ts.isIdentifier(d.name)) this.storeSymbol(this.symbolOf(d.name), v, true, d);
				else this.bindPattern(d.name, v, true);
			} else {
				this.assignTo(init, v);
			}
			fb.release(m);
		}
		this.loopBody(st.statement, end, cont);
		fb.placeLabel(cont);
		const m = fb.mark();
		const one = fb.temp();
		fb.emitBC(Op.LOADI, one, 1);
		fb.emit(Op.ADD, i, i, one);
		fb.release(m);
		fb.jump(Op.JMP, 0, top);
		fb.placeLabel(end);
	}

	private switchStatement(st: ts.SwitchStatement) {
		const fb = this.fb;
		const d = fb.temp({ name: '$switch', type: 'unknown' });
		this.expr(st.expression, d);
		const end = fb.newLabel();
		const clauses = st.caseBlock.clauses;
		const labels = clauses.map(() => fb.newLabel());
		let defaultLabel: Label | null = null;
		clauses.forEach((c, i) => {
			if (ts.isDefaultClause(c)) {
				defaultLabel = labels[i];
				return;
			}
			const m = fb.mark();
			const v = this.expr(c.expression);
			const t = fb.temp();
			fb.emit(Op.SEQ, t, d, v);
			fb.jump(Op.JT, t, labels[i]);
			fb.release(m);
		});
		fb.jump(Op.JMP, 0, defaultLabel ?? end);
		this.breakables.push({ breakLabel: end, continueLabel: null, tryDepth: this.tryStack.length });
		this.hoistFunctions(clauses.flatMap((c) => [...c.statements]));
		clauses.forEach((c, i) => {
			fb.placeLabel(labels[i]);
			for (const s of c.statements) this.statement(s);
		});
		this.breakables.pop();
		fb.placeLabel(end);
	}

	/** Runs the finally blocks between here and `depth`, then emits the exit. */
	private exitThrough(depth: number, emitExit: () => void) {
		const fb = this.fb;
		const saved = this.tryStack;
		const reopen: Region[] = [];
		for (let i = saved.length - 1; i >= depth; i--) {
			const tc = saved[i];
			for (const r of tc.open) {
				if (r.segStart !== null) {
					fb.closeRegion(r);
					reopen.push(r);
				}
			}
			if (tc.finallyBlock) {
				this.tryStack = saved.slice(0, i);
				const fin = tc.finallyBlock;
				this.withRange(fin, () => this.block(fin.statements));
			}
		}
		this.tryStack = saved;
		emitExit();
		for (const r of reopen) fb.openRegion(r);
	}

	private tryStatement(st: ts.TryStatement) {
		const fb = this.fb;
		const level = this.tryStack.length;
		const normal = fb.newLabel();
		const tc: TryContext = { finallyBlock: st.finallyBlock, open: [] };
		let finRegion: Region | null = null;
		let excReg = 0;
		if (st.finallyBlock) {
			excReg = fb.temp({ name: '$exception', type: 'unknown' });
			finRegion = { handler: fb.newLabel(), catchReg: excReg, depth: level * 2, segStart: null };
			fb.openRegion(finRegion);
			tc.open.push(finRegion);
		}
		let catchRegion: Region | null = null;
		let catchTarget: { reg: number; pattern: ts.BindingName | null } | null = null;
		if (st.catchClause) {
			const v = st.catchClause.variableDeclaration;
			let reg: number;
			let pattern: ts.BindingName | null = null;
			if (v && ts.isIdentifier(v.name)) {
				const sym = this.symbolOf(v.name);
				const b = this.resolve(sym, v);
				if (b.kind === 'reg' && !b.cell) reg = b.reg;
				else {
					reg = fb.temp({ name: v.name.text, type: 'unknown' });
					pattern = v.name;
				}
			} else {
				reg = fb.temp({ name: '$caught', type: 'unknown' });
				pattern = v ? v.name : null;
			}
			catchTarget = { reg, pattern };
			catchRegion = { handler: fb.newLabel(), catchReg: reg, depth: level * 2 + 1, segStart: null };
			fb.openRegion(catchRegion);
			tc.open.push(catchRegion);
		}
		this.tryStack.push(tc);
		this.withRange(st.tryBlock, () => this.block(st.tryBlock.statements));
		if (catchRegion && catchTarget && st.catchClause) {
			fb.closeRegion(catchRegion);
			tc.open = tc.open.filter((r) => r !== catchRegion);
			fb.jump(Op.JMP, 0, normal);
			fb.placeLabel(catchRegion.handler);
			const target = catchTarget;
			const cc = st.catchClause;
			this.withRange(cc, () => {
				if (target.pattern) this.bindPattern(target.pattern, target.reg, true);
				this.block(cc.block.statements);
			});
		}
		fb.jump(Op.JMP, 0, normal);
		this.tryStack.pop();
		if (finRegion && st.finallyBlock) {
			fb.closeRegion(finRegion);
			fb.placeLabel(finRegion.handler);
			const fin = st.finallyBlock;
			this.withRange(fin, () => this.block(fin.statements));
			fb.emit(Op.THROW, excReg);
		}
		fb.placeLabel(normal);
		if (st.finallyBlock) {
			const fin = st.finallyBlock;
			this.withRange(fin, () => this.block(fin.statements));
		}
	}

	// ------------------------------------------------------------ patterns

	/** Binds a declaration pattern to the value in `value`. */
	private bindPattern(name: ts.BindingName, value: number, declare: boolean) {
		const fb = this.fb;
		if (ts.isIdentifier(name)) {
			this.storeSymbol(this.symbolOf(name), value, declare, name);
			return;
		}
		if (ts.isObjectBindingPattern(name)) {
			const used: string[] = [];
			for (const el of name.elements) {
				const m = fb.mark();
				if (el.dotDotDotToken) {
					const keys = fb.temp();
					fb.emit(Op.NEWARR, keys);
					for (const k of used) {
						const t = fb.temp();
						fb.emitBC(Op.LOADS, t, this.pool.str(k));
						fb.emit(Op.PUSH, keys, t);
					}
					const rest = this.callPrelude('objectRest', [value, keys], el);
					this.bindPattern(el.name, rest, declare);
				} else {
					const v = fb.temp();
					const keyNode = el.propertyName ?? el.name;
					const key =
						ts.isIdentifier(keyNode) || ts.isStringLiteral(keyNode) || ts.isNumericLiteral(keyNode)
							? keyNode.text
							: null;
					if (key !== null) {
						used.push(key);
						fb.emit(Op.GETPROP, v, value, this.str(key, el));
					} else if (ts.isComputedPropertyName(keyNode)) {
						const k = this.expr(keyNode.expression);
						fb.emit(Op.GETELEM, v, value, k);
					} else {
						throw new LowerError(el, 'Unsupported property name in a pattern.');
					}
					if (el.initializer) this.defaultValue(v, el.initializer);
					this.bindPattern(el.name, v, declare);
				}
				fb.release(m);
			}
			return;
		}
		name.elements.forEach((el, i) => {
			if (ts.isOmittedExpression(el)) return;
			const m = fb.mark();
			const v = fb.temp();
			if (el.dotDotDotToken) {
				const base = fb.temps(2);
				fb.emit(Op.MOV, base, value);
				fb.emitBC(Op.LOADI, base + 1, i);
				fb.emit(Op.CALLM, v, this.str('slice', el), base, 1);
			} else {
				const k = fb.temp();
				fb.emitBC(Op.LOADI, k, i);
				fb.emit(Op.GETELEM, v, value, k);
				if (el.initializer) this.defaultValue(v, el.initializer);
			}
			this.bindPattern(el.name, v, declare);
			fb.release(m);
		});
	}

	/** Assigns `value` to an assignment target expression. */
	private assignTo(target: ts.Expression, value: number) {
		const fb = this.fb;
		const t = skipOuter(target);
		if (ts.isIdentifier(t)) {
			this.storeSymbol(this.symbolOf(t), value, false, t);
		} else if (ts.isPropertyAccessExpression(t)) {
			const o = this.expr(t.expression);
			fb.emit(Op.SETPROP, o, this.str(t.name.text, t), value);
		} else if (ts.isElementAccessExpression(t)) {
			const o = this.expr(t.expression);
			const k = this.expr(t.argumentExpression);
			fb.emit(Op.SETELEM, o, k, value);
		} else if (ts.isArrayLiteralExpression(t)) {
			t.elements.forEach((el, i) => {
				if (ts.isOmittedExpression(el)) return;
				const m = fb.mark();
				const v = fb.temp();
				if (ts.isSpreadElement(el)) {
					const base = fb.temps(2);
					fb.emit(Op.MOV, base, value);
					fb.emitBC(Op.LOADI, base + 1, i);
					fb.emit(Op.CALLM, v, this.str('slice', el), base, 1);
					this.assignTo(el.expression, v);
				} else {
					const k = fb.temp();
					fb.emitBC(Op.LOADI, k, i);
					fb.emit(Op.GETELEM, v, value, k);
					this.assignWithDefault(el, v);
				}
				fb.release(m);
			});
		} else if (ts.isObjectLiteralExpression(t)) {
			for (const p of t.properties) {
				const m = fb.mark();
				const v = fb.temp();
				if (ts.isShorthandPropertyAssignment(p)) {
					fb.emit(Op.GETPROP, v, value, this.str(p.name.text, p));
					if (p.objectAssignmentInitializer) this.defaultValue(v, p.objectAssignmentInitializer);
					const sym = this.checker.getShorthandAssignmentValueSymbol(p);
					if (!sym) throw new LowerError(p, 'Cannot resolve the name.');
					this.storeSymbol(sym, v, false, p);
				} else if (ts.isPropertyAssignment(p)) {
					const key = propertyName(p.name);
					if (key === null)
						throw new LowerError(p, 'Computed keys are not allowed in assignment patterns.');
					fb.emit(Op.GETPROP, v, value, this.str(key, p));
					this.assignWithDefault(p.initializer, v);
				} else {
					throw new LowerError(p, 'Unsupported assignment pattern.');
				}
				fb.release(m);
			}
		} else {
			throw new LowerError(t, 'Invalid assignment target.');
		}
	}

	private assignWithDefault(el: ts.Expression, v: number) {
		if (ts.isBinaryExpression(el) && el.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
			this.defaultValue(v, el.right);
			this.assignTo(el.left, v);
		} else {
			this.assignTo(el, v);
		}
	}

	// ---------------------------------------------------------- expressions

	/**
	 * Evaluates an expression. With `dst`, the result goes to `dst`.
	 * Without it, the result can be in a variable register.
	 */
	expr(node: ts.Expression, dst?: number): number {
		const conversion = this.dateConversion(node);
		if (conversion === null) return this.exprInner(node, dst);
		const fb = this.fb;
		const d = dst ?? fb.temp();
		const m = fb.mark();
		const base = fb.temps(1);
		this.exprInner(node, base);
		fb.emit(Op.CALLN, d, this.str(conversion, node), base, 1);
		fb.release(m);
		return d;
	}

	/** The library call that converts a Date at this position, if any (spec section 4.5). */
	private dateConversion(node: ts.Expression): string | null {
		if (!isDateish(this.checker, node)) return null;
		const use = dateUse(this.checker, node);
		if (use.kind === 'reject') throw new LowerError(node, use.message);
		if (use.kind === 'json') return 'Date.json';
		if (use.kind === 'text') return 'Date.text';
		return null;
	}

	private exprInner(node: ts.Expression, dst?: number): number {
		const fb = this.fb;
		const e = skipOuter(node);
		const out = () => dst ?? fb.temp();

		if (ts.isOptionalChain(e) && this.isChainRoot(e)) {
			const d = out();
			const nullLabel = fb.newLabel();
			const end = fb.newLabel();
			this.chainLabels.push(nullLabel);
			this.chainPart(e, d);
			this.chainLabels.pop();
			fb.jump(Op.JMP, 0, end);
			fb.placeLabel(nullLabel);
			fb.emit(Op.LOADUNDEF, d);
			fb.placeLabel(end);
			return d;
		}

		switch (e.kind) {
			case ts.SyntaxKind.NumericLiteral: {
				const d = out();
				this.loadNumber(Number((e as ts.NumericLiteral).text), d);
				return d;
			}
			case ts.SyntaxKind.StringLiteral:
			case ts.SyntaxKind.NoSubstitutionTemplateLiteral: {
				const d = out();
				fb.emitBC(Op.LOADS, d, this.pool.str((e as ts.StringLiteral).text));
				return d;
			}
			case ts.SyntaxKind.TrueKeyword:
			case ts.SyntaxKind.FalseKeyword: {
				const d = out();
				fb.emit(Op.LOADBOOL, d, 0, 0, e.kind === ts.SyntaxKind.TrueKeyword ? 1 : 0);
				return d;
			}
			case ts.SyntaxKind.NullKeyword: {
				const d = out();
				fb.emit(Op.LOADNULL, d);
				return d;
			}
			default:
				break;
		}

		if (ts.isIdentifier(e)) {
			if (e.text === 'undefined') return this.loadGlobal('undefined', e, dst);
			const sym = this.checker.getSymbolAtLocation(e);
			if (!sym) throw new LowerError(e, `Cannot resolve ${e.text}.`);
			return this.loadBinding(this.resolve(sym, e), e, dst);
		}
		if (ts.isTemplateExpression(e)) {
			const d = out();
			const parts: Array<() => number> = [];
			if (e.head.text !== '') {
				parts.push(() => {
					const t = fb.temp();
					fb.emitBC(Op.LOADS, t, this.pool.str(e.head.text));
					return t;
				});
			}
			for (const span of e.templateSpans) {
				parts.push(() => {
					const t = fb.temp();
					fb.emit(Op.TOSTR, t, this.expr(span.expression));
					return t;
				});
				if (span.literal.text !== '') {
					parts.push(() => {
						const t = fb.temp();
						fb.emitBC(Op.LOADS, t, this.pool.str(span.literal.text));
						return t;
					});
				}
			}
			const m = fb.mark();
			const acc = fb.temp();
			fb.emit(Op.MOV, acc, parts[0]());
			for (const p of parts.slice(1)) {
				const pm = fb.mark();
				fb.emit(Op.ADD, acc, acc, p());
				fb.release(pm);
			}
			fb.emit(Op.MOV, d, acc);
			fb.release(m);
			return d;
		}
		if (ts.isObjectLiteralExpression(e)) return this.objectLiteral(e, out());
		if (ts.isArrayLiteralExpression(e)) {
			const d = out();
			fb.emit(Op.NEWARR, d);
			for (const el of e.elements) {
				const m = fb.mark();
				if (ts.isSpreadElement(el)) fb.emit(Op.SPREADARR, d, this.expr(el.expression));
				else if (ts.isOmittedExpression(el))
					throw new LowerError(el, 'Array holes are not allowed.');
				else fb.emit(Op.PUSH, d, this.expr(el));
				fb.release(m);
			}
			return d;
		}
		if (
			ts.isPropertyAccessExpression(e) ||
			ts.isElementAccessExpression(e) ||
			ts.isCallExpression(e)
		) {
			const d = out();
			this.chainPart(e, d);
			return d;
		}
		if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) return this.closure(e, dst);
		if (ts.isAwaitExpression(e)) {
			const inner = skipOuter(e.expression);
			if (isPromiseAll(inner)) {
				const d = out();
				this.promiseAll(inner, d);
				return d;
			}
			return this.expr(inner, dst);
		}
		if (ts.isNewExpression(e) && isDateConstructor(this.checker, e)) {
			const d = out();
			this.newDate(e, d);
			return d;
		}
		if (ts.isNewExpression(e)) {
			if (!ts.isIdentifier(e.expression))
				throw new LowerError(e, '`new` is allowed only for errors.');
			const kind = NEWERR_KINDS[e.expression.text];
			if (kind === undefined) throw new LowerError(e, '`new` is allowed only for errors.');
			const d = out();
			const arg = e.arguments?.[0];
			const m = fb.mark();
			let msg: number;
			if (arg) msg = this.expr(arg);
			else {
				msg = fb.temp();
				fb.emit(Op.LOADUNDEF, msg);
			}
			fb.emit(Op.NEWERR, d, msg, 0, kind);
			fb.release(m);
			return d;
		}
		if (ts.isConditionalExpression(e)) {
			const d = out();
			const elseLabel = fb.newLabel();
			const end = fb.newLabel();
			const m = fb.mark();
			fb.jump(Op.JF, this.expr(e.condition), elseLabel);
			fb.release(m);
			this.expr(e.whenTrue, d);
			fb.jump(Op.JMP, 0, end);
			fb.placeLabel(elseLabel);
			this.expr(e.whenFalse, d);
			fb.placeLabel(end);
			return d;
		}
		if (ts.isPrefixUnaryExpression(e)) return this.prefixUnary(e, dst);
		if (ts.isPostfixUnaryExpression(e)) return this.update(e.operand, e.operator, false, dst);
		if (ts.isTypeOfExpression(e)) {
			const d = out();
			fb.emit(Op.TYPEOF, d, this.expr(e.expression));
			return d;
		}
		if (ts.isVoidExpression(e)) {
			this.expr(e.expression);
			const d = out();
			fb.emit(Op.LOADUNDEF, d);
			return d;
		}
		if (ts.isDeleteExpression(e)) {
			const target = skipOuter(e.expression);
			const m = fb.mark();
			if (ts.isPropertyAccessExpression(target)) {
				const o = this.expr(target.expression);
				const k = fb.temp();
				fb.emitBC(Op.LOADS, k, this.pool.str(target.name.text));
				fb.emit(Op.DELPROP, o, k);
			} else if (ts.isElementAccessExpression(target)) {
				const o = this.expr(target.expression);
				fb.emit(Op.DELPROP, o, this.expr(target.argumentExpression));
			} else {
				throw new LowerError(e, '`delete` needs a property.');
			}
			fb.release(m);
			const d = out();
			fb.emit(Op.LOADBOOL, d, 0, 0, 1);
			return d;
		}
		if (ts.isBinaryExpression(e)) return this.binary(e, dst);
		throw new LowerError(e, `The expression kind ${ts.SyntaxKind[e.kind]} is not supported.`);
	}

	private isChainRoot(e: ts.Node): boolean {
		const p = e.parent;
		if (!p || !ts.isOptionalChain(p)) return true;
		if (
			ts.isPropertyAccessExpression(p) ||
			ts.isElementAccessExpression(p) ||
			ts.isCallExpression(p)
		) {
			return p.expression !== e;
		}
		return true;
	}

	/** Evaluates the object of an access; continues the optional chain. */
	private chainObject(
		owner: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression,
	): number {
		const obj = owner.expression;
		let r: number;
		if (ts.isOptionalChain(obj) && !this.isChainRoot(obj)) {
			r = this.fb.temp();
			this.chainPart(obj, r);
		} else {
			r = this.expr(obj);
		}
		if (owner.questionDotToken) {
			const label = this.chainLabels[this.chainLabels.length - 1];
			if (label === undefined) throw new LowerError(owner, 'Optional chain without a root.');
			this.fb.jump(Op.JNULLISH, r, label);
		}
		return r;
	}

	private chainPart(e: ts.Expression, d: number) {
		const fb = this.fb;
		if (ts.isPropertyAccessExpression(e)) {
			const full = globalMemberName(e, this.checker);
			if (full !== null && CONSTANTS.has(full)) {
				this.loadNumber(CONSTANTS.get(full) ?? 0, d);
				return;
			}
			const m = fb.mark();
			const o = this.chainObject(e);
			fb.emit(Op.GETPROP, d, o, this.str(e.name.text, e));
			fb.release(m);
			return;
		}
		if (ts.isElementAccessExpression(e)) {
			const m = fb.mark();
			const o = this.chainObject(e);
			const arg = skipOuter(e.argumentExpression);
			if (ts.isStringLiteral(arg)) {
				fb.emit(Op.GETPROP, d, o, this.str(arg.text, e));
			} else {
				const k = this.expr(arg);
				fb.emit(Op.GETELEM, d, o, k);
			}
			fb.release(m);
			return;
		}
		if (ts.isCallExpression(e)) {
			const m = fb.mark();
			this.call(e, d);
			fb.release(m);
			return;
		}
		this.expr(e, d);
	}

	private objectLiteral(e: ts.ObjectLiteralExpression, d: number): number {
		const fb = this.fb;
		fb.emit(Op.NEWOBJ, d);
		for (const p of e.properties) {
			const m = fb.mark();
			if (ts.isPropertyAssignment(p)) {
				const key = propertyName(p.name);
				if (key !== null) {
					fb.emit(Op.SETPROP, d, this.str(key, p), this.expr(p.initializer));
				} else if (ts.isComputedPropertyName(p.name)) {
					const k = this.exprTemp(p.name.expression);
					fb.emit(Op.SETELEM, d, k, this.expr(p.initializer));
				} else {
					throw new LowerError(p, 'Unsupported property name.');
				}
			} else if (ts.isShorthandPropertyAssignment(p)) {
				const sym = this.checker.getShorthandAssignmentValueSymbol(p);
				if (!sym) throw new LowerError(p, 'Cannot resolve the name.');
				let v = this.loadBinding(this.resolve(sym, p), p);
				const conversion = this.dateConversion(p.name);
				if (conversion !== null) {
					const base = fb.temps(1);
					fb.emit(Op.MOV, base, v);
					v = fb.temp();
					fb.emit(Op.CALLN, v, this.str(conversion, p), base, 1);
				}
				fb.emit(Op.SETPROP, d, this.str(p.name.text, p), v);
			} else if (ts.isSpreadAssignment(p)) {
				fb.emit(Op.SPREADOBJ, d, this.expr(p.expression));
			} else if (ts.isMethodDeclaration(p)) {
				const key = propertyName(p.name);
				if (key === null) throw new LowerError(p, 'Unsupported method name.');
				fb.emit(Op.SETPROP, d, this.str(key, p), this.closure(p));
			} else {
				throw new LowerError(p, 'Getters and setters are not allowed.');
			}
			fb.release(m);
		}
		return d;
	}

	private prefixUnary(e: ts.PrefixUnaryExpression, dst?: number): number {
		const fb = this.fb;
		if (
			e.operator === ts.SyntaxKind.PlusPlusToken ||
			e.operator === ts.SyntaxKind.MinusMinusToken
		) {
			return this.update(e.operand, e.operator, true, dst);
		}
		const operand = skipOuter(e.operand);
		if (e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(operand)) {
			const d = dst ?? fb.temp();
			this.loadNumber(-Number(operand.text), d);
			return d;
		}
		const d = dst ?? fb.temp();
		const m = fb.mark();
		const v = this.expr(e.operand);
		const op =
			e.operator === ts.SyntaxKind.MinusToken
				? Op.NEG
				: e.operator === ts.SyntaxKind.PlusToken
					? Op.TONUM
					: e.operator === ts.SyntaxKind.ExclamationToken
						? Op.NOT
						: Op.BNOT;
		fb.emit(op, d, v);
		fb.release(m);
		return d;
	}

	/** `++x`, `x++`, `--x`, `x--`. */
	private update(
		operand: ts.Expression,
		operator: ts.SyntaxKind,
		prefix: boolean,
		dst?: number,
	): number {
		const fb = this.fb;
		const op = operator === ts.SyntaxKind.PlusPlusToken ? Op.ADD : Op.SUB;
		const d = dst ?? fb.temp();
		const old = fb.temp();
		const next = fb.temp();
		const one = fb.temp();
		this.readModifyWrite(operand, (cur) => {
			fb.emit(Op.TONUM, old, cur);
			fb.emitBC(Op.LOADI, one, 1);
			fb.emit(op, next, old, one);
			return next;
		});
		fb.emit(Op.MOV, d, prefix ? next : old);
		return d;
	}

	/** Reads a target once, computes a new value, and writes it back. */
	private readModifyWrite(target: ts.Expression, compute: (current: number) => number | null) {
		const fb = this.fb;
		const t = skipOuter(target);
		if (ts.isIdentifier(t)) {
			const sym = this.symbolOf(t);
			const cur = fb.temp();
			this.loadBinding(this.resolve(sym, t), t, cur);
			const v = compute(cur);
			if (v !== null) this.storeSymbol(sym, v, false, t);
		} else if (ts.isPropertyAccessExpression(t)) {
			const o = this.exprTemp(t.expression);
			const key = this.str(t.name.text, t);
			const cur = fb.temp();
			fb.emit(Op.GETPROP, cur, o, key);
			const v = compute(cur);
			if (v !== null) fb.emit(Op.SETPROP, o, key, v);
		} else if (ts.isElementAccessExpression(t)) {
			const o = this.exprTemp(t.expression);
			const k = this.exprTemp(t.argumentExpression);
			const cur = fb.temp();
			fb.emit(Op.GETELEM, cur, o, k);
			const v = compute(cur);
			if (v !== null) fb.emit(Op.SETELEM, o, k, v);
		} else {
			throw new LowerError(t, 'Invalid assignment target.');
		}
	}

	private binary(e: ts.BinaryExpression, dst?: number): number {
		const fb = this.fb;
		const kind = e.operatorToken.kind;
		if (kind === ts.SyntaxKind.EqualsToken) {
			const left = skipOuter(e.left);
			if (ts.isIdentifier(left)) {
				const sym = this.symbolOf(left);
				const b = this.resolve(sym, left);
				if (b.kind === 'reg' && !b.cell && !refersTo(e.right, sym, this.checker)) {
					this.expr(e.right, b.reg);
					if (dst !== undefined) fb.emit(Op.MOV, dst, b.reg);
					return dst ?? b.reg;
				}
			}
			const v = dst ?? fb.temp();
			this.expr(e.right, v);
			const m = fb.mark();
			this.assignTo(e.left, v);
			fb.release(m);
			return v;
		}
		const compound = COMPOUND_OPS[kind];
		if (compound !== undefined) {
			const d = dst ?? fb.temp();
			this.readModifyWrite(e.left, (cur) => {
				const r = this.expr(e.right);
				fb.emit(compound, d, cur, r);
				return d;
			});
			return d;
		}
		if (
			kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
			kind === ts.SyntaxKind.BarBarEqualsToken ||
			kind === ts.SyntaxKind.QuestionQuestionEqualsToken
		) {
			const d = dst ?? fb.temp();
			const end = fb.newLabel();
			this.readModifyWrite(e.left, (cur) => {
				fb.emit(Op.MOV, d, cur);
				const skip = fb.newLabel();
				const doIt = fb.newLabel();
				if (kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken) fb.jump(Op.JF, d, end);
				else if (kind === ts.SyntaxKind.BarBarEqualsToken) fb.jump(Op.JT, d, end);
				else {
					fb.jump(Op.JNULLISH, d, doIt);
					fb.jump(Op.JMP, 0, end);
				}
				fb.placeLabel(doIt);
				this.expr(e.right, d);
				void skip;
				return d;
			});
			fb.placeLabel(end);
			return d;
		}
		if (kind === ts.SyntaxKind.AmpersandAmpersandToken || kind === ts.SyntaxKind.BarBarToken) {
			const d = dst ?? fb.temp();
			const end = fb.newLabel();
			this.expr(e.left, d);
			fb.jump(kind === ts.SyntaxKind.AmpersandAmpersandToken ? Op.JF : Op.JT, d, end);
			this.expr(e.right, d);
			fb.placeLabel(end);
			return d;
		}
		if (kind === ts.SyntaxKind.QuestionQuestionToken) {
			const d = dst ?? fb.temp();
			const right = fb.newLabel();
			const end = fb.newLabel();
			this.expr(e.left, d);
			fb.jump(Op.JNULLISH, d, right);
			fb.jump(Op.JMP, 0, end);
			fb.placeLabel(right);
			this.expr(e.right, d);
			fb.placeLabel(end);
			return d;
		}
		if (kind === ts.SyntaxKind.CommaToken) {
			const m = fb.mark();
			this.expr(e.left);
			fb.release(m);
			return this.expr(e.right, dst);
		}
		if (kind === ts.SyntaxKind.EqualsEqualsToken || kind === ts.SyntaxKind.ExclamationEqualsToken) {
			const d = dst ?? fb.temp();
			const leftNullish = isNullishLiteral(e.left);
			const m = fb.mark();
			const v = this.expr(leftNullish ? e.right : e.left);
			fb.emit(Op.ISNULLISH, d, v);
			if (kind === ts.SyntaxKind.ExclamationEqualsToken) fb.emit(Op.NOT, d, d);
			fb.release(m);
			return d;
		}
		if (kind === ts.SyntaxKind.InKeyword) {
			const d = dst ?? fb.temp();
			const m = fb.mark();
			const k = this.stable(this.expr(e.left), e.right);
			const o = this.expr(e.right);
			fb.emit(Op.HASPROP, d, o, k);
			fb.release(m);
			return d;
		}
		const op = BINARY_OPS[kind];
		if (op === undefined)
			throw new LowerError(e, `The operator ${ts.tokenToString(kind) ?? '?'} is not supported.`);
		const d = dst ?? fb.temp();
		const m = fb.mark();
		const l = this.stable(this.expr(e.left), e.right);
		const r = this.expr(e.right);
		fb.emit(op, d, l, r);
		fb.release(m);
		return d;
	}

	/** Copies a variable register when later code can change the variable. */
	private stable(reg: number, later: ts.Node): number {
		if (this.fb.isTemp(reg) || !hasSideEffects(later)) return reg;
		const t = this.fb.temp();
		this.fb.emit(Op.MOV, t, reg);
		return t;
	}

	// ---------------------------------------------------------------- calls

	private call(e: ts.CallExpression, d: number) {
		const fb = this.fb;
		const method = ctxCallMethod(this.checker, e);
		if (method === 'now' || method === 'random') {
			fb.emit(method === 'now' ? Op.NOW : Op.RANDOM, d);
			return;
		}
		if (method === 'execution' || method === 'vars') {
			fb.emit(method === 'execution' ? Op.EXEC : Op.VARS, d);
			return;
		}
		if (method === 'polled') {
			// Ends the quiet start of a poll run (spec 9.8).
			const m = fb.mark();
			const base = fb.temps(1);
			this.argsInto(e.arguments.slice(0, 1), base);
			if (e.arguments.length === 0) fb.emit(Op.LOADUNDEF, base);
			fb.emit(Op.CALLN, d, this.str('ctx.polled', e), base, 1);
			fb.release(m);
			return;
		}
		if (method === 'staticData') {
			// The runtime's working copy of the workflow static data (spec 9.7).
			const m = fb.mark();
			const base = fb.temps(2);
			this.argsInto(e.arguments.slice(0, 2), base);
			for (let i = e.arguments.length; i < 2; i++) fb.emit(Op.LOADUNDEF, base + i);
			fb.emit(Op.CALLN, d, this.str('ctx.staticData', e), base, 2);
			fb.release(m);
			return;
		}
		if (method === 'trace') {
			// Glue: the runtime copies the items only when tracing is on.
			const m = fb.mark();
			const base = fb.temps(2);
			this.argsInto(e.arguments.slice(0, 2), base);
			for (let i = e.arguments.length; i < 2; i++) fb.emit(Op.LOADUNDEF, base + i);
			fb.emit(Op.TRACE, base, base + 1);
			fb.release(m);
			fb.emit(Op.LOADUNDEF, d);
			return;
		}
		if (method) {
			this.ctxEffect(e, method, d);
			return;
		}
		if (isPromiseAll(e)) {
			this.promiseAll(e, d);
			return;
		}
		for (const a of e.arguments) {
			if (ts.isSpreadElement(a)) throw new LowerError(a, 'Spread arguments are not allowed.');
		}
		if (this.dateCall(e, d)) return;
		const callee = skipOuter(e.expression);
		// Library functions (CALLN).
		const full = ts.isPropertyAccessExpression(callee)
			? globalMemberName(callee, this.checker)
			: ts.isIdentifier(callee) && isGlobalIdentifier(callee, this.checker)
				? callee.text
				: null;
		if (full !== null) {
			if (NEWERR_KINDS[full] !== undefined) {
				const msg = e.arguments[0] ? this.expr(e.arguments[0]) : fb.temp();
				if (!e.arguments[0]) fb.emit(Op.LOADUNDEF, msg);
				fb.emit(Op.NEWERR, d, msg, 0, NEWERR_KINDS[full]);
				return;
			}
			if (!LIBRARY_FUNCTIONS.has(full) && !GLOBAL_FUNCTIONS.has(full)) {
				throw new LowerError(e, `\`${full}\` is not in the workflow library.`);
			}
			const base = fb.temps(e.arguments.length);
			this.argsInto(e.arguments, base);
			fb.emit(Op.CALLN, d, this.str(full, e), base, e.arguments.length);
			return;
		}
		if (ts.isPropertyAccessExpression(callee) && !this.isUserFunctionProperty(callee)) {
			const name = callee.name.text;
			const m = fb.mark();
			const inline = this.inlinableCallback(e);
			if (inline && this.inlined.has(inline)) {
				this.inlinePrelude(e, callee, name, inline, d);
			} else if (PRELUDE_METHODS.has(name) || (name === 'sort' && e.arguments.length > 0)) {
				const recv = this.chainObject(callee);
				const fn = this.linker.preludeFunction(name, e);
				const n = name === 'reduce' ? 4 : 2;
				const base = fb.temps(n);
				fb.emit(Op.MOV, base, recv);
				this.expr(e.arguments[0], base + 1);
				if (name === 'reduce') {
					if (e.arguments[1]) {
						this.expr(e.arguments[1], base + 2);
						fb.emit(Op.LOADBOOL, base + 3, 0, 0, 1);
					} else {
						fb.emit(Op.LOADUNDEF, base + 2);
						fb.emit(Op.LOADBOOL, base + 3, 0, 0, 0);
					}
				}
				const f = fb.temp();
				fb.emit(Op.CLOSURE, f, fn.index, 0);
				fb.emit(Op.CALL, d, f, base, n);
			} else {
				const base = fb.temps(1 + e.arguments.length);
				const recv = this.chainObject(callee);
				fb.emit(Op.MOV, base, recv);
				this.argsInto(e.arguments, base + 1);
				fb.emit(Op.CALLM, d, this.str(name, e), base, e.arguments.length);
			}
			fb.release(m);
			return;
		}
		const helper = this.inlinableStatic(e);
		if (helper && this.inlinedDecls.has(helper)) {
			this.inlineStatic(e, helper, d);
			return;
		}
		// Closure call.
		const m = fb.mark();
		let f: number;
		if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
			f = fb.temp();
			this.chainPart(callee, f);
		} else {
			f = this.stable(this.expr(callee), e);
		}
		if (e.questionDotToken) {
			const label = this.chainLabels[this.chainLabels.length - 1];
			if (label !== undefined) fb.jump(Op.JNULLISH, f, label);
		}
		const base = fb.temps(e.arguments.length);
		this.argsInto(e.arguments, base);
		fb.emit(Op.CALL, d, f, e.arguments.length > 0 ? base : 0, e.arguments.length);
		fb.release(m);
	}

	/** `new Date(...)` (spec section 4.5). */
	private newDate(e: ts.NewExpression, d: number) {
		const fb = this.fb;
		const args = e.arguments ?? [];
		if (args.length === 0) {
			fb.emit(Op.NOW, d);
			return;
		}
		const m = fb.mark();
		const base = fb.temps(args.length);
		this.argsInto(args, base);
		const name = args.length === 1 ? 'Date.fromValue' : 'Date.fromParts';
		fb.emit(Op.CALLN, d, this.str(name, e), base, args.length);
		fb.release(m);
	}

	/** Lowers `Date.now()`, `Date.UTC(...)`, `Date.parse(s)` and Date methods. */
	private dateCall(e: ts.CallExpression, d: number): boolean {
		const fb = this.fb;
		const callee = skipOuter(e.expression);
		const statik = dateStatic(this.checker, callee);
		if (statik === 'now') {
			fb.emit(Op.NOW, d);
			return true;
		}
		if (statik !== null) {
			const base = fb.temps(e.arguments.length);
			this.argsInto(e.arguments, base);
			fb.emit(Op.CALLN, d, this.str(`Date.${statik}`, e), base, e.arguments.length);
			return true;
		}
		const method = dateMethodCall(this.checker, e);
		if (method === null || !ts.isPropertyAccessExpression(callee)) return false;
		// The locale methods take no arguments or 'en-US'; both mean en-US.
		const args = LOCALE_METHODS.has(method) ? [] : e.arguments;
		const m = fb.mark();
		const base = fb.temps(1 + args.length);
		fb.emit(Op.MOV, base, this.chainObject(callee));
		this.argsInto(args, base + 1);
		fb.emit(Op.CALLN, d, this.str(`Date.prototype.${method}`, e), base, 1 + args.length);
		if (DATE_SETTERS.has(method)) {
			// A Date is a number, so a setter stores the new value in the variable.
			const recv = skipOuter(callee.expression);
			if (!ts.isIdentifier(recv)) throw new LowerError(e, `\`${method}\` needs a variable.`);
			this.storeSymbol(this.symbolOf(recv), d, false, recv);
		}
		fb.release(m);
		return true;
	}

	/** Evaluates arguments into the registers that start at `base`. */
	private argsInto(args: readonly ts.Expression[], base: number) {
		args.forEach((a, i) => this.expr(a, base + i));
	}

	/**
	 * The arrow callback of `arr.map(x => ...)` and the like when the
	 * compiler inlines it: a plain arrow, not async, with at most the three
	 * parameters that the prelude passes and no rest parameter.
	 */
	private inlinableCallback(e: ts.CallExpression): ts.ArrowFunction | null {
		if (!this.linker.inlineCallbacks || e.questionDotToken || e.arguments.length !== 1) return null;
		const callee = skipOuter(e.expression);
		if (!ts.isPropertyAccessExpression(callee) || !INLINE_METHODS.has(callee.name.text))
			return null;
		if (this.isUserFunctionProperty(callee)) return null;
		const f = e.arguments[0];
		if (!ts.isArrowFunction(f)) return null;
		if (f.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) return null;
		if (f.parameters.length > 3 || f.parameters.some((p) => p.dotDotDotToken)) return null;
		return f;
	}

	/**
	 * The helper that `f(...)` calls when the compiler inlines it: a small
	 * function declaration at the top level of the same library file, not
	 * async, with no nested function, that does not call itself and is not
	 * being inlined here already.
	 */
	private inlinableStatic(e: ts.CallExpression): ts.FunctionDeclaration | null {
		if (!this.linker.inlineCallbacks || e.questionDotToken) return null;
		const callee = skipOuter(e.expression);
		if (!ts.isIdentifier(callee)) return null;
		const sym = this.checker.getSymbolAtLocation(callee);
		const decl = sym?.valueDeclaration;
		if (!sym || !decl || !ts.isFunctionDeclaration(decl) || !decl.body) return null;
		if (this.locals.has(sym) || this.inlining.has(decl) || decl === this.node) return null;
		const sf = decl.getSourceFile();
		if (sf !== this.node.getSourceFile() || !this.linker.isStaticFile(sf) || !isModuleLevel(decl)) {
			return null;
		}
		return this.linker.smallHelper(decl, sym) ? decl : null;
	}

	/**
	 * `f(args)` for a helper from `inlinableStatic`, as a call would run it:
	 * the arguments in order, the parameters bound (missing ones undefined,
	 * then defaults), the body, and the value of its `return`.
	 */
	private inlineStatic(e: ts.CallExpression, decl: ts.FunctionDeclaration, d: number) {
		const fb = this.fb;
		const body = decl.body;
		if (!body) throw new LowerError(e, 'A helper without a body cannot be inlined.');
		const m = fb.mark();
		const args = e.arguments.map((a) => this.exprTemp(a));
		decl.parameters.forEach((p, k) => {
			const t = fb.temp();
			if (k < args.length) fb.emit(Op.MOV, t, args[k]);
			else fb.emit(Op.LOADUNDEF, t);
			if (p.initializer) this.defaultValue(t, p.initializer);
			this.bindPattern(p.name, t, true);
		});
		const r = fb.temp();
		fb.emit(Op.LOADUNDEF, r);
		const done = fb.newLabel();
		const savedReturn = this.inlineReturn;
		this.inlineReturn = { dst: r, label: done, tryDepth: this.tryStack.length };
		this.inlining.add(decl);
		try {
			this.withRange(body, () => this.block(body.statements));
		} finally {
			this.inlining.delete(decl);
			this.inlineReturn = savedReturn;
		}
		fb.placeLabel(done);
		fb.emit(Op.MOV, d, r);
		fb.release(m);
	}

	private isInlinedCallback(f: ts.ArrowFunction): boolean {
		const call = f.parent;
		return (
			ts.isCallExpression(call) && call.arguments[0] === f && this.inlinableCallback(call) === f
		);
	}

	/**
	 * `arr.map(f)` and the other INLINE_METHODS as a loop in this function,
	 * with the semantics of the prelude function (src/prelude/array.ts): the
	 * same TypeError for a value that is not an array, `length` read before
	 * each element, and the callback's parameters bound to (value, index,
	 * array) for each element.
	 */
	private inlinePrelude(
		e: ts.CallExpression,
		callee: ts.PropertyAccessExpression,
		name: string,
		f: ts.ArrowFunction,
		d: number,
	) {
		const fb = this.fb;
		const recv = this.chainObject(callee);
		// arr, a temp for Array.isArray, the result, the index, one.
		const arr = fb.temp();
		fb.emit(Op.MOV, arr, recv);
		const result = fb.temp();
		const i = fb.temp();
		const one = fb.temp();
		const ok = fb.newLabel();
		const top = fb.newLabel();
		const next = fb.newLabel();
		const end = fb.newLabel();
		// Not an array: the prelude's notArray error.
		{
			const m = fb.mark();
			const t = fb.temp();
			fb.emit(Op.CALLN, t, this.str('Array.isArray', e), arr, 1);
			fb.jump(Op.JT, t, ok);
			const nullish = fb.newLabel();
			const thrown = fb.newLabel();
			const msg = fb.temp();
			fb.jump(Op.JNULLISH, arr, nullish);
			fb.emitBC(Op.LOADS, msg, this.str(`${name} is not a function`, e));
			fb.jump(Op.JMP, 0, thrown);
			fb.placeLabel(nullish);
			const isNull = fb.newLabel();
			fb.emit(Op.LOADNULL, t);
			fb.emit(Op.SEQ, t, arr, t);
			fb.jump(Op.JT, t, isNull);
			fb.emitBC(
				Op.LOADS,
				msg,
				this.str(`Cannot read properties of undefined (reading '${name}')`, e),
			);
			fb.jump(Op.JMP, 0, thrown);
			fb.placeLabel(isNull);
			fb.emitBC(Op.LOADS, msg, this.str(`Cannot read properties of null (reading '${name}')`, e));
			fb.placeLabel(thrown);
			fb.emit(Op.NEWERR, t, msg, 0, NEWERR_KINDS.TypeError);
			fb.emit(Op.THROW, t);
			fb.release(m);
		}
		fb.placeLabel(ok);
		switch (name) {
			case 'map':
			case 'filter':
			case 'flatMap':
				fb.emit(Op.NEWARR, result);
				break;
			case 'some':
			case 'find':
				fb.emit(name === 'some' ? Op.LOADBOOL : Op.LOADUNDEF, result, 0, 0, 0);
				break;
			case 'every':
				fb.emit(Op.LOADBOOL, result, 0, 0, 1);
				break;
			case 'findIndex':
				fb.emitBC(Op.LOADI, result, -1);
				break;
			default:
				fb.emit(Op.LOADUNDEF, result);
		}
		fb.emitBC(Op.LOADI, i, 0);
		fb.emitBC(Op.LOADI, one, 1);
		fb.placeLabel(top);
		const m = fb.mark();
		const len = fb.temp();
		fb.emit(Op.GETPROP, len, arr, this.str('length', e));
		fb.emit(Op.LT, len, i, len);
		fb.jump(Op.JF, len, end);
		const value = fb.temp();
		fb.emit(Op.GETELEM, value, arr, i);
		// Bind the parameters as a call would: value, index, array, then undefined.
		const args = [value, i, arr];
		f.parameters.forEach((p, k) => {
			const t = fb.temp();
			if (k < args.length) fb.emit(Op.MOV, t, args[k]);
			else fb.emit(Op.LOADUNDEF, t);
			if (p.initializer) this.defaultValue(t, p.initializer);
			this.bindPattern(p.name, t, true);
		});
		// The callback's value.
		const r = fb.temp();
		const savedReturn = this.inlineReturn;
		if (ts.isBlock(f.body)) {
			const done = fb.newLabel();
			this.inlineReturn = { dst: r, label: done, tryDepth: this.tryStack.length };
			fb.emit(Op.LOADUNDEF, r);
			const body = f.body;
			this.withRange(body, () => this.block(body.statements));
			fb.placeLabel(done);
		} else {
			this.inlineReturn = null;
			this.expr(f.body, r);
		}
		this.inlineReturn = savedReturn;
		switch (name) {
			case 'map':
				fb.emit(Op.PUSH, result, r);
				break;
			case 'filter':
				fb.jump(Op.JF, r, next);
				fb.emit(Op.PUSH, result, value);
				break;
			case 'flatMap': {
				const single = fb.newLabel();
				const t = fb.temp();
				fb.emit(Op.CALLN, t, this.str('Array.isArray', e), r, 1);
				fb.jump(Op.JF, t, single);
				fb.emit(Op.SPREADARR, result, r);
				fb.jump(Op.JMP, 0, next);
				fb.placeLabel(single);
				fb.emit(Op.PUSH, result, r);
				break;
			}
			case 'some':
				fb.jump(Op.JF, r, next);
				fb.emit(Op.LOADBOOL, result, 0, 0, 1);
				fb.jump(Op.JMP, 0, end);
				break;
			case 'every':
				fb.jump(Op.JT, r, next);
				fb.emit(Op.LOADBOOL, result, 0, 0, 0);
				fb.jump(Op.JMP, 0, end);
				break;
			case 'find':
				fb.jump(Op.JF, r, next);
				fb.emit(Op.MOV, result, value);
				fb.jump(Op.JMP, 0, end);
				break;
			case 'findIndex':
				fb.jump(Op.JF, r, next);
				fb.emit(Op.MOV, result, i);
				fb.jump(Op.JMP, 0, end);
				break;
			default:
				break;
		}
		fb.release(m);
		fb.placeLabel(next);
		fb.emit(Op.ADD, i, i, one);
		fb.jump(Op.JMP, 0, top);
		fb.placeLabel(end);
		fb.emit(Op.MOV, d, result);
	}

	private isUserFunctionProperty(callee: ts.PropertyAccessExpression): boolean {
		const sym = this.checker.getSymbolAtLocation(callee.name);
		const decls = sym?.declarations ?? [];
		return (
			decls.length > 0 && decls.every((dcl) => !dcl.getSourceFile().fileName.endsWith('.d.ts'))
		);
	}

	private callPrelude(name: string, regs: number[], at: ts.Node): number {
		const fb = this.fb;
		const fn = this.linker.preludeFunction(name, at);
		const base = fb.temps(regs.length);
		regs.forEach((r, i) => fb.emit(Op.MOV, base + i, r));
		const f = fb.temp();
		fb.emit(Op.CLOSURE, f, fn.index, 0);
		const d = fb.temp();
		fb.emit(Op.CALL, d, f, base, regs.length);
		return d;
	}

	private ctxEffect(e: ts.CallExpression, method: string, d: number) {
		const fb = this.fb;
		const arg = e.arguments[0];
		if (!arg) throw new LowerError(e, `ctx.${method} needs an argument.`);
		const opts = fb.temp({ name: '$args', type: 'unknown' });
		this.expr(arg, opts);
		const step = fb.temp({ name: '$step', type: 'number' });
		if (this.role === 'node' || this.isInsideLibrary()) {
			const b = this.resolveKey(STEP_KEY, e);
			this.loadBinding(b, e, step);
			const pc = fb.emit(Op.SUSPEND, d, step, opts, effectKind(method));
			fb.recordSuspend(pc, null);
			return;
		}
		const index = this.linker.stepIndex.get(e);
		if (index === undefined) throw new LowerError(e, 'The step has no valid name.');
		fb.emitBC(Op.LOADI, step, index);
		if (method === 'node') {
			const optsNode = skipOuter(arg);
			const type = ts.isObjectLiteralExpression(optsNode)
				? stringLiteralValue(getProperty(optsNode, 'type')?.initializer)
				: null;
			if (type && this.linker.linksLibrary(e, type)) {
				const lib = this.linker.libraryNode(type);
				const base = fb.temps(4);
				fb.emit(Op.GETPROP, base, opts, this.str('parameters', e));
				fb.emit(Op.GETPROP, base + 1, opts, this.str('items', e));
				fb.emit(Op.GETPROP, base + 2, opts, this.str('credential', e));
				fb.emit(Op.MOV, base + 3, step);
				const f = fb.temp();
				fb.emit(Op.CLOSURE, f, lib.index, 0);
				fb.emit(Op.CALL, d, f, base, 4);
				return;
			}
		}
		const pc = fb.emit(Op.SUSPEND, d, step, opts, effectKind(method));
		fb.recordSuspend(pc, index);
	}

	private isInsideLibrary(): boolean {
		return this.linker.isStaticFile(this.node.getSourceFile());
	}

	private promiseAll(e: ts.CallExpression, d: number) {
		const fb = this.fb;
		const m = fb.mark();
		const ids = fb.temp({ name: '$fibres', type: 'number[]' });
		fb.emit(Op.NEWARR, ids);
		const undef = fb.temp();
		fb.emit(Op.LOADUNDEF, undef);
		const arg = e.arguments[0];
		const mapForm = promiseAllMap(e);
		if (arg && ts.isArrayLiteralExpression(arg)) {
			for (const el of arg.elements) {
				const em = fb.mark();
				const g = this.closure(el, undefined, 'element');
				const id = fb.temp();
				fb.emit(Op.FORK, id, g, undef);
				fb.emit(Op.PUSH, ids, id);
				fb.release(em);
			}
		} else if (mapForm) {
			const arr = fb.temp({ name: '$items', type: 'unknown' });
			this.expr(mapForm.array, arr);
			const f = fb.temp();
			this.closure(mapForm.mapper, f);
			const i = fb.temp({ name: '$index', type: 'number' });
			fb.emitBC(Op.LOADI, i, 0);
			const top = fb.newLabel();
			const end = fb.newLabel();
			fb.placeLabel(top);
			const t = fb.temp();
			fb.emit(Op.GETPROP, t, arr, this.str('length', e));
			fb.emit(Op.LT, t, i, t);
			fb.jump(Op.JF, t, end);
			fb.emit(Op.GETELEM, t, arr, i);
			fb.emit(Op.FORK, t, f, t);
			fb.emit(Op.PUSH, ids, t);
			fb.emitBC(Op.LOADI, t, 1);
			fb.emit(Op.ADD, i, i, t);
			fb.jump(Op.JMP, 0, top);
			fb.placeLabel(end);
		} else {
			throw new LowerError(e, 'Unsupported Promise.all form.');
		}
		fb.emit(Op.JOIN, d, ids);
		fb.release(m);
	}
}

function isBoundaryNode(n: ts.Node): boolean {
	if (
		ts.isFunctionDeclaration(n) ||
		ts.isFunctionExpression(n) ||
		ts.isArrowFunction(n) ||
		ts.isMethodDeclaration(n)
	) {
		return true;
	}
	const p = n.parent;
	return (
		p !== undefined &&
		ts.isArrayLiteralExpression(p) &&
		p.parent !== undefined &&
		isPromiseAll(p.parent)
	);
}

function isModuleLevel(decl: ts.Declaration): boolean {
	let p: ts.Node = decl;
	while (ts.isVariableDeclaration(p) || ts.isVariableDeclarationList(p) || ts.isBindingElement(p))
		p = p.parent;
	return ts.isSourceFile(p.parent) || ts.isSourceFile(p);
}

function isNullishLiteral(e: ts.Expression): boolean {
	const s = skipOuter(e);
	return s.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(s) && s.text === 'undefined');
}

function isGlobalIdentifier(id: ts.Identifier, checker: ts.TypeChecker): boolean {
	const sym = checker.getSymbolAtLocation(id);
	if (!sym) return false;
	return (sym.declarations ?? []).every((d) => d.getSourceFile().fileName.endsWith('.d.ts'));
}

/** `Math.floor` and the like, when the base is the global namespace. */
function globalMemberName(pa: ts.PropertyAccessExpression, checker: ts.TypeChecker): string | null {
	if (!ts.isIdentifier(pa.expression)) return null;
	if (
		![
			'Math',
			'JSON',
			'Object',
			'Array',
			'Number',
			'String',
			'RegExp',
			'XML',
			'Ascii',
			'Base64',
		].includes(pa.expression.text)
	)
		return null;
	if (!isGlobalIdentifier(pa.expression, checker)) return null;
	return `${pa.expression.text}.${pa.name.text}`;
}

function bindingSymbols(name: ts.BindingName, checker: ts.TypeChecker): ts.Symbol[] {
	if (ts.isIdentifier(name)) {
		const s = checker.getSymbolAtLocation(name);
		return s ? [s] : [];
	}
	return name.elements.flatMap((el) =>
		ts.isOmittedExpression(el) ? [] : bindingSymbols(el.name, checker),
	);
}

function refersTo(node: ts.Node, symbol: ts.Symbol, checker: ts.TypeChecker): boolean {
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;
		if (ts.isIdentifier(n) && n.text === symbol.name && checker.getSymbolAtLocation(n) === symbol) {
			found = true;
			return;
		}
		if (
			ts.isShorthandPropertyAssignment(n) &&
			checker.getShorthandAssignmentValueSymbol(n) === symbol
		) {
			found = true;
			return;
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}

function hasSideEffects(node: ts.Node): boolean {
	let found = false;
	const visit = (n: ts.Node) => {
		if (found) return;
		if (
			ts.isCallExpression(n) ||
			ts.isAwaitExpression(n) ||
			ts.isPostfixUnaryExpression(n) ||
			(ts.isPrefixUnaryExpression(n) &&
				(n.operator === ts.SyntaxKind.PlusPlusToken ||
					n.operator === ts.SyntaxKind.MinusMinusToken)) ||
			(ts.isBinaryExpression(n) && isAssignmentOperator(n.operatorToken.kind))
		) {
			found = true;
			return;
		}
		if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return;
		ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}
