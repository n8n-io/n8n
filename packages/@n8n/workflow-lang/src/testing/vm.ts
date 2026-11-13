/**
 * A small bytecode interpreter for tests. It runs a decoded module with the
 * fixture semantics of spec section 6, so tests can compare compiled code
 * with the reference runner. It is not the production runtime.
 */
import { xmlContent, xmlParse, xmlSnippet } from '../reference/xml-lib.ts';
import { asciiRange, base64Utf8 } from '../reference/ascii-lib.ts';
import type { ModuleData } from '../compiler/module.ts';
import { EFFECT_KIND_NAMES, OP_NAMES, Op } from '../compiler/opcodes.ts';
import type { EffectRecord, Fixture, ReferenceOutput, TraceRecord } from '../reference/runner.ts';
import { callDate } from '../reference/date-lib.ts';
import { executionInfo, jsonCopy, splitmix64, traceRecord } from '../reference/runner.ts';
import { regexExec } from '../reference/regex-lib.ts';
import { StaticDataDoc } from '../reference/static-data.ts';

/** A function value. JSON drops it, as it drops JS functions. */
class Closure {
	readonly kind = 'closure';

	readonly fn: number;

	readonly caps: unknown[];

	constructor(fn: number, caps: unknown[]) {
		this.fn = fn;
		this.caps = caps;
	}

	toJSON(): undefined {
		return undefined;
	}
}

interface Cell {
	kind: 'cell';
	value: unknown;
}

interface Frame {
	fn: number;
	pc: number;
	regs: unknown[];
	caps: unknown[];
	/** Register of the caller that receives the return value. */
	ret: number;
}

interface Fibre {
	id: number;
	frames: Frame[];
	done: boolean;
	ok: boolean;
	value: unknown;
	/** Value to store in the result register when the fibre resumes. */
	resume: { ok: boolean; value: unknown } | null;
	join: number[] | null;
}

class Abort {
	readonly step: string;

	constructor(step: string) {
		this.step = step;
	}
}

class Limit {}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function isClosure(v: unknown): v is Closure {
	return v instanceof Closure;
}

function isCell(v: unknown): v is Cell {
	return isRecord(v) && v.kind === 'cell' && 'value' in v;
}

const clone = jsonCopy;

function getProp(obj: unknown, key: unknown): unknown {
	if (obj === null || obj === undefined) {
		// The runtime's message, which is V8's (`ops.zig` getProp).
		throw {
			name: 'TypeError',
			message: `Cannot read properties of ${String(obj)} (reading '${String(key)}')`,
		};
	}
	if (typeof obj === 'string') {
		if (key === 'length') return obj.length;
		const i = typeof key === 'number' ? key : Number(key);
		return Number.isInteger(i) ? obj[i] : undefined;
	}
	if (Array.isArray(obj)) {
		if (key === 'length') return obj.length;
		// Only index keys: an element can be null, which `??` would turn into undefined.
		const i = typeof key === 'number' ? key : Number(key);
		return Number.isInteger(i) && i >= 0 ? obj[i] : undefined;
	}
	if (typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, String(key))) {
		return Reflect.get(obj, String(key));
	}
	return undefined;
}

function setProp(obj: unknown, key: unknown, value: unknown) {
	// As the runtime (`ops.zig` setElem): a primitive ignores the store, as in sloppy JavaScript.
	if (obj === null || obj === undefined) {
		throw {
			name: 'TypeError',
			message: `Cannot set properties of ${String(obj)} (setting '${String(key)}')`,
		};
	}
	if (typeof obj !== 'object') return;
	Reflect.set(obj, Array.isArray(obj) && typeof key === 'number' ? key : String(key), value);
}

function callLibrary(name: string, args: unknown[]): unknown {
	const n = (i: number) => Number(args[i]);
	switch (name) {
		case 'Math.floor':
			return Math.floor(n(0));
		case 'Math.ceil':
			return Math.ceil(n(0));
		case 'Math.round':
			return Math.round(n(0));
		case 'Math.trunc':
			return Math.trunc(n(0));
		case 'Math.abs':
			return Math.abs(n(0));
		case 'Math.min':
			return Math.min(...args.map(Number));
		case 'Math.max':
			return Math.max(...args.map(Number));
		case 'Math.pow':
			return n(0) ** n(1);
		case 'Math.sqrt':
			return Math.sqrt(n(0));
		case 'Math.sign':
			return Math.sign(n(0));
		case 'Math.log':
			return Math.log(n(0));
		case 'Math.exp':
			return Math.exp(n(0));
		case 'JSON.stringify':
			return args[2] === undefined
				? JSON.stringify(args[0])
				: JSON.stringify(args[0], null, toIndent(args[2]));
		case 'JSON.parse':
			return JSON.parse(String(args[0]));
		case 'RegExp.exec':
			return regexExec(args[0], args[1], args[2], args[3]);
		case 'Object.keys':
		case 'Object.values':
		case 'Object.entries':
			if (args[0] === null || args[0] === undefined) {
				throw { name: 'TypeError', message: 'Cannot convert undefined or null to object' };
			}
			if (name === 'Object.values') return Object.values(Object(args[0]));
			if (name === 'Object.entries') return Object.entries(Object(args[0]));
			return Object.keys(Object(args[0]));
		case 'Object.assign': {
			const target = args[0];
			for (const s of args.slice(1))
				if (isRecord(s) || Array.isArray(s) || typeof s === 'string')
					Object.assign(Object(target), s);
			return target;
		}
		case 'Array.isArray':
			return Array.isArray(args[0]);
		case 'Number':
			return args.length === 0 ? 0 : Number(args[0]);
		case 'String':
			return args.length === 0 ? '' : String(args[0]);
		case 'Boolean':
			return Boolean(args[0]);
		case 'parseInt':
			return Number.parseInt(String(args[0]), args[1] === undefined ? undefined : n(1));
		case 'parseFloat':
			return Number.parseFloat(String(args[0]));
		case 'isNaN':
			return Number.isNaN(Number(args[0]));
		case 'Number.isInteger':
			return Number.isInteger(args[0]);
		case 'Number.isFinite':
			return Number.isFinite(args[0]);
		case 'btoa':
		case 'atob':
		case 'encodeURI':
		case 'encodeURIComponent':
		case 'decodeURIComponent':
		case 'escape':
		case 'unescape':
			return textCodec(name, String(args[0]));
		case 'XML.parse':
			return xmlParse(String(args[0]));
		case 'XML.snippet':
			return xmlSnippet(String(args[0]));
		case 'XML.content':
			return xmlContent(args[0]);
		case 'Ascii.is':
			return asciiRange(String(args[0]), 0x00, 0x7f);
		case 'Ascii.isPrintable':
			return asciiRange(String(args[0]), 0x20, 0x7e);
		case 'Base64.encodeUtf8':
			return base64Utf8(args[0]);
		default: {
			const date = callDate(name, args);
			if (date) return date.value;
			throw new Error(`unknown library function ${name}`);
		}
	}
}

/** The text codecs of JavaScript, with their errors as the runtime throws them. */
function textCodec(name: string, text: string): string {
	try {
		if (name === 'btoa') return btoa(text);
		if (name === 'atob') return atob(text);
		if (name === 'encodeURI') return encodeURI(text);
		if (name === 'encodeURIComponent') return encodeURIComponent(text);
		if (name === 'decodeURIComponent') return decodeURIComponent(text);
		// oxlint-disable-next-line typescript/no-deprecated -- spec section 4.3 has the JavaScript escape.
		if (name === 'escape') return escape(text);
		// oxlint-disable-next-line typescript/no-deprecated -- spec section 4.3 has the JavaScript unescape.
		return unescape(text);
	} catch (error) {
		const e = error instanceof Error ? error : new Error(String(error));
		throw { name: e.name, message: e.message };
	}
}

function toIndent(v: unknown): number | string {
	return typeof v === 'number' ? v : String(v);
}

function callMethod(recv: unknown, name: string, args: unknown[]): unknown {
	if (recv === null || recv === undefined) {
		throw {
			name: 'TypeError',
			message: `Cannot read properties of ${String(recv)} (reading '${name}')`,
		};
	}
	if (typeof recv === 'string') {
		const s: string = recv;
		const a = (i: number) => args[i];
		switch (name) {
			case 'toUpperCase':
				return s.toUpperCase();
			case 'toLowerCase':
				return s.toLowerCase();
			case 'localeCompare':
				// The CLDR root collation, as the runtime gives it (`collate.zig`).
				return Math.sign(s.localeCompare(String(a(0)), 'und'));
			case 'normalize': {
				const form = a(0) === undefined ? 'NFC' : String(a(0));
				if (!['NFC', 'NFD', 'NFKC', 'NFKD'].includes(form)) {
					throw {
						name: 'RangeError',
						message: 'The normalization form should be one of NFC, NFD, NFKC, NFKD.',
					};
				}
				return s.normalize(form);
			}
			case 'trim':
				return s.trim();
			case 'trimStart':
				return s.trimStart();
			case 'trimEnd':
				return s.trimEnd();
			case 'startsWith':
				return s.startsWith(String(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'endsWith':
				return s.endsWith(String(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'includes':
				return s.includes(String(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'indexOf':
				return s.indexOf(String(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'slice':
				return s.slice(
					a(0) === undefined ? undefined : Number(a(0)),
					a(1) === undefined ? undefined : Number(a(1)),
				);
			case 'substring':
				return s.substring(Number(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'split':
				return s.split(String(a(0)), a(1) === undefined ? undefined : Number(a(1)));
			case 'replace':
				return s.replace(String(a(0)), String(a(1)));
			case 'replaceAll':
				return s.replaceAll(String(a(0)), String(a(1)));
			case 'padStart':
				return s.padStart(Number(a(0)), a(1) === undefined ? undefined : String(a(1)));
			case 'padEnd':
				return s.padEnd(Number(a(0)), a(1) === undefined ? undefined : String(a(1)));
			case 'repeat':
				return s.repeat(Number(a(0)));
			case 'charAt':
				return s.charAt(Number(a(0)));
			case 'charCodeAt':
				return s.charCodeAt(Number(a(0)));
			case 'concat':
				return s.concat(...args.map(String));
			case 'at':
				return s.at(Number(a(0)));
			default:
				break;
		}
	}
	if (Array.isArray(recv)) {
		const arr: unknown[] = recv;
		switch (name) {
			case 'push':
				return arr.push(...args);
			case 'pop':
				return arr.pop();
			case 'shift':
				return arr.shift();
			case 'unshift':
				return arr.unshift(...args);
			case 'slice':
				return arr.slice(
					args[0] === undefined ? undefined : Number(args[0]),
					args[1] === undefined ? undefined : Number(args[1]),
				);
			case 'concat':
				return arr.concat(...args);
			case 'join':
				return arr.join(args[0] === undefined ? undefined : String(args[0]));
			case 'includes':
				return arr.includes(args[0], args[1] === undefined ? undefined : Number(args[1]));
			case 'indexOf':
				return arr.indexOf(args[0], args[1] === undefined ? undefined : Number(args[1]));
			case 'reverse':
				return arr.reverse();
			case 'sort':
				return arr.sort();
			case 'at':
				return arr.at(Number(args[0]));
			case 'flat':
				return arr.flat();
			default:
				break;
		}
	}
	if (typeof recv === 'number') {
		if (name === 'toFixed')
			return recv.toFixed(args[0] === undefined ? undefined : Number(args[0]));
		if (name === 'toString')
			return recv.toString(args[0] === undefined ? undefined : Number(args[0]));
	}
	// The runtime's message (`lib.zig` callMethod).
	throw { name: 'TypeError', message: `value.${name} is not a function` };
}

function binary(op: number, l: unknown, r: unknown): unknown {
	// The test VM borrows JS operators; the runtime implements them natively.
	const ln = l as number;
	const rn = r as number;
	switch (op) {
		case Op.ADD:
			return (l as string) + (r as string);
		case Op.SUB:
			return ln - rn;
		case Op.MUL:
			return ln * rn;
		case Op.DIV:
			return ln / rn;
		case Op.MOD:
			return ln % rn;
		case Op.POW:
			return ln ** rn;
		case Op.BAND:
			return ln & rn;
		case Op.BOR:
			return ln | rn;
		case Op.BXOR:
			return ln ^ rn;
		case Op.SHL:
			return ln << rn;
		case Op.SHR:
			return ln >> rn;
		case Op.USHR:
			return ln >>> rn;
		case Op.SEQ:
			return l === r;
		case Op.SNE:
			return l !== r;
		case Op.LT:
			return ln < rn;
		case Op.LE:
			return ln <= rn;
		case Op.GT:
			return ln > rn;
		case Op.GE:
			return ln >= rn;
		case Op.GETELEM:
			return getProp(l, r);
		case Op.HASPROP:
			return typeof l === 'object' && l !== null && String(r) in l;
		default:
			throw new Error(`bad binary op ${op}`);
	}
}

export interface VmOptions {
	fuel?: number;
	maxDepth?: number;
}

/** Runs a module against a fixture and returns the output of spec section 6. */
/**
 * Profiling for performance work: when set, `runModule` counts the
 * instructions it runs in each function, by function name.
 */
export let opCounts: Map<string, number> | undefined;

export function setOpCounts(counts: Map<string, number> | undefined): void {
	opCounts = counts;
}

export function runModule(
	m: ModuleData,
	fixture: Fixture,
	options: VmOptions = {},
): ReferenceOutput {
	const effects: EffectRecord[] = [];
	const traces: TraceRecord[] = [];
	const consumed = new Map<string, number>();
	const random = splitmix64(fixture.seed);
	const statics = new StaticDataDoc(fixture.staticData);
	let clock = fixture.now;
	let fuel = options.fuel ?? 50_000_000;
	const maxDepth = options.maxDepth ?? 1000;
	const fibres: Fibre[] = [];
	const queue: Fibre[] = [];

	const newFibre = (fn: number, args: unknown[], caps: unknown[]): Fibre => {
		const f: Fibre = {
			id: fibres.length,
			frames: [],
			done: false,
			ok: true,
			value: undefined,
			resume: null,
			join: null,
		};
		f.frames.push(makeFrame(fn, args, caps, 0));
		fibres.push(f);
		return f;
	};

	const makeFrame = (fn: number, args: unknown[], caps: unknown[], ret: number): Frame => {
		const entry = m.functions[fn];
		const regs: unknown[] = new Array(entry.nregs).fill(undefined);
		for (let i = 0; i < entry.nparams; i++) regs[i] = args[i];
		return { fn, pc: 0, regs, caps, ret };
	};

	const inTry = (f: Fibre) =>
		f.frames.some((fr, i) => {
			const pc = i === f.frames.length - 1 ? fr.pc : fr.pc - 1;
			return m.functions[fr.fn].tries.some((t) => pc >= t.start && pc < t.end);
		});

	const nextResult = (step: string): unknown => {
		const list = fixture.effects[step];
		if (!list || list.length === 0) return undefined;
		const n = consumed.get(step) ?? 0;
		consumed.set(step, n + 1);
		return clone(list[n % list.length]);
	};

	/** Throws `value` in the fibre. Returns false when no frame catches it. */
	const throwIn = (f: Fibre, value: unknown): boolean => {
		while (f.frames.length > 0) {
			const fr = f.frames[f.frames.length - 1];
			const pc = fr.pc;
			const t = m.functions[fr.fn].tries.find((e) => pc >= e.start && pc < e.end);
			if (t) {
				fr.regs[t.catchReg] = value;
				fr.pc = t.handler;
				return true;
			}
			f.frames.pop();
			const caller = f.frames[f.frames.length - 1];
			if (caller) caller.pc -= 1;
		}
		f.done = true;
		f.ok = false;
		f.value = value;
		return false;
	};

	const finish = (f: Fibre) => {
		for (const other of fibres) {
			if (other.join && !other.done && other.join.every((id) => fibres[id].done)) {
				const failed = other.join.map((id) => fibres[id]).find((x) => !x.ok);
				other.resume = failed
					? { ok: false, value: failed.value }
					: { ok: true, value: other.join.map((id) => fibres[id].value) };
				other.join = null;
				queue.push(other);
			}
		}
		void f;
	};

	/** Runs one fibre until it parks or ends. */
	const step = (f: Fibre) => {
		if (f.resume) {
			const fr = f.frames[f.frames.length - 1];
			const ins = m.functions[fr.fn].code[fr.pc - 1];
			const r = f.resume;
			f.resume = null;
			if (r.ok) fr.regs[ins.a] = r.value;
			else {
				fr.pc -= 1;
				if (!throwIn(f, r.value)) {
					finish(f);
					return;
				}
			}
		}
		for (;;) {
			if (--fuel < 0) throw new Limit();
			const fr = f.frames[f.frames.length - 1];
			const fn = m.functions[fr.fn];
			const ins = fn.code[fr.pc++];
			if (opCounts) {
				opCounts.set(fn.name, (opCounts.get(fn.name) ?? 0) + 1);
				const key = `op:${OP_NAMES[ins.op]}`;
				if (ins.op === Op.CALLM || ins.op === Op.CALLN || ins.op === Op.GETPROP) {
					const k = `${OP_NAMES[ins.op]}:${m.strings[ins.op === Op.GETPROP ? ins.c : ins.b]}`;
					opCounts.set(k, (opCounts.get(k) ?? 0) + 1);
				}
				if (fr.pc === 1)
					opCounts.set(`enter:${fn.name}`, (opCounts.get(`enter:${fn.name}`) ?? 0) + 1);
				opCounts.set(key, (opCounts.get(key) ?? 0) + 1);
			}
			const R = fr.regs;
			const bc = (ins.b | (ins.c << 16)) >>> 0;
			try {
				switch (ins.op) {
					case Op.NOP:
						break;
					case Op.LOADK:
						R[ins.a] = m.numbers[bc];
						break;
					case Op.LOADS:
						R[ins.a] = m.strings[bc];
						break;
					case Op.LOADI:
						R[ins.a] = bc | 0;
						break;
					case Op.LOADUNDEF:
						R[ins.a] = undefined;
						break;
					case Op.LOADNULL:
						R[ins.a] = null;
						break;
					case Op.LOADBOOL:
						R[ins.a] = ins.x !== 0;
						break;
					case Op.MOV:
						R[ins.a] = R[ins.b];
						break;
					case Op.NEG:
						R[ins.a] = -(R[ins.b] as number);
						break;
					case Op.TONUM:
						R[ins.a] = Number(R[ins.b]);
						break;
					case Op.BNOT:
						R[ins.a] = ~(R[ins.b] as number);
						break;
					case Op.NOT:
						R[ins.a] = !R[ins.b];
						break;
					case Op.TYPEOF: {
						const v = R[ins.b];
						R[ins.a] = isClosure(v) ? 'function' : typeof v;
						break;
					}
					case Op.TOSTR:
						R[ins.a] = String(R[ins.b]);
						break;
					case Op.ISNULLISH:
						R[ins.a] = R[ins.b] === null || R[ins.b] === undefined;
						break;
					case Op.JMP:
						fr.pc = bc;
						break;
					case Op.JT:
						if (R[ins.a]) fr.pc = bc;
						break;
					case Op.JF:
						if (!R[ins.a]) fr.pc = bc;
						break;
					case Op.JNULLISH:
						if (R[ins.a] === null || R[ins.a] === undefined) fr.pc = bc;
						break;
					case Op.NEWOBJ:
						R[ins.a] = {};
						break;
					case Op.NEWARR:
						R[ins.a] = [];
						break;
					case Op.GETPROP:
						R[ins.a] = getProp(R[ins.b], m.strings[ins.c]);
						break;
					case Op.SETPROP:
						setProp(R[ins.a], m.strings[ins.b], R[ins.c]);
						break;
					case Op.SETELEM:
						setProp(R[ins.a], R[ins.b], R[ins.c]);
						break;
					case Op.DELPROP:
						Reflect.deleteProperty(Object(R[ins.a]), String(R[ins.b]));
						break;
					case Op.PUSH:
						(R[ins.a] as unknown[]).push(R[ins.b]);
						break;
					case Op.SPREADARR:
						(R[ins.a] as unknown[]).push(...(R[ins.b] as unknown[]));
						break;
					case Op.SPREADOBJ:
						if (R[ins.b] !== null && R[ins.b] !== undefined)
							Object.assign(Object(R[ins.a]), R[ins.b]);
						break;
					case Op.CLOSURE: {
						const n = m.functions[ins.b].ncaps;
						R[ins.a] = new Closure(ins.b, R.slice(ins.c, ins.c + n));
						break;
					}
					case Op.GETCAP:
						R[ins.a] = fr.caps[ins.b];
						break;
					case Op.NEWCELL:
						R[ins.a] = { kind: 'cell', value: R[ins.b] } satisfies Cell;
						break;
					case Op.GETCELL: {
						const c = R[ins.b];
						if (!isCell(c)) throw new Error('GETCELL on a non-cell');
						R[ins.a] = c.value;
						break;
					}
					case Op.SETCELL: {
						const c = R[ins.a];
						if (!isCell(c)) throw new Error('SETCELL on a non-cell');
						c.value = R[ins.b];
						break;
					}
					case Op.CALL: {
						const callee = R[ins.b];
						if (!isClosure(callee)) throw { name: 'TypeError', message: 'not a function' };
						if (f.frames.length >= maxDepth) throw new Limit();
						f.frames.push(makeFrame(callee.fn, R.slice(ins.c, ins.c + ins.x), callee.caps, ins.a));
						break;
					}
					case Op.CALLM:
						R[ins.a] = callMethod(
							R[ins.c],
							m.strings[ins.b],
							R.slice(ins.c + 1, ins.c + 1 + ins.x),
						);
						break;
					case Op.CALLN:
						R[ins.a] =
							m.strings[ins.b] === 'ctx.staticData'
								? statics.get(R[ins.c], ins.x > 1 ? R[ins.c + 1] : undefined)
								: m.strings[ins.b] === 'ctx.polled'
									? Array.isArray(R[ins.c]) && (R[ins.c] as unknown[]).length > 0
									: callLibrary(m.strings[ins.b], R.slice(ins.c, ins.c + ins.x));
						break;
					case Op.RET: {
						const value = R[ins.a];
						const done = f.frames.pop();
						const caller = f.frames[f.frames.length - 1];
						if (!caller || !done) {
							f.done = true;
							f.value = value;
							finish(f);
							return;
						}
						caller.regs[done.ret] = value;
						break;
					}
					case Op.THROW:
						throw { vmThrow: R[ins.a] };
					case Op.NEWERR: {
						const msg = R[ins.b];
						R[ins.a] = {
							name: ['Error', 'TypeError', 'RangeError'][ins.x],
							message: msg === undefined ? '' : String(msg),
						};
						break;
					}
					case Op.SUSPEND: {
						const stepIndex = Number(R[ins.b]);
						const s = m.steps[stepIndex];
						const kind = EFFECT_KIND_NAMES[ins.x];
						const args = R[ins.c];
						let attempt = 0;
						let result: unknown;
						for (;;) {
							effects.push({ step: s.name, kind, args: clone(args) });
							result = nextResult(s.name);
							const failed = isRecord(result) && '$error' in result;
							if (!failed || attempt >= s.retryMax) break;
							attempt++;
						}
						if (isRecord(result) && '$error' in result) {
							fr.pc -= 1;
							if (!inTry(f)) throw new Abort(s.name);
							fr.pc += 1;
							f.resume = {
								ok: false,
								value: { name: 'NodeError', message: String(result.$error), step: s.name },
							};
						} else {
							if (kind === 'wait' && isRecord(args)) {
								if (typeof args.duration === 'number') clock += args.duration;
								if (typeof args.until === 'number') clock = Math.max(clock, args.until);
							}
							f.resume = {
								ok: true,
								value: kind === 'wait' || kind === 'respond' ? undefined : result,
							};
						}
						queue.push(f);
						return;
					}
					case Op.FORK: {
						const callee = R[ins.b];
						if (!isClosure(callee)) throw new Error('FORK of a non-function');
						const child = newFibre(callee.fn, [R[ins.c]], callee.caps);
						queue.push(child);
						R[ins.a] = child.id;
						break;
					}
					case Op.JOIN: {
						f.join = (R[ins.b] as number[]).slice();
						if (f.join.every((id) => fibres[id].done)) {
							const failed = f.join.map((id) => fibres[id]).find((x) => !x.ok);
							f.resume = failed
								? { ok: false, value: failed.value }
								: { ok: true, value: f.join.map((id) => fibres[id].value) };
							f.join = null;
							queue.push(f);
						}
						return;
					}
					case Op.NOW:
						R[ins.a] = clock;
						break;
					case Op.RANDOM:
						R[ins.a] = random();
						break;
					case Op.EXEC:
						R[ins.a] = executionInfo(fixture);
						break;
					case Op.VARS:
						R[ins.a] = jsonCopy(fixture.vars ?? {});
						break;
					case Op.TRACE:
						if (fixture.trace === true) traces.push(traceRecord(R[ins.a], R[ins.b]));
						break;
					default:
						R[ins.a] = binary(ins.op, R[ins.b], R[ins.c]);
						break;
				}
			} catch (e) {
				if (e instanceof Abort || e instanceof Limit) throw e;
				const value =
					isRecord(e) && 'vmThrow' in e
						? e.vmThrow
						: e instanceof Error
							? { name: e.name, message: e.message }
							: e;
				const top = f.frames[f.frames.length - 1];
				top.pc -= 1;
				if (!throwIn(f, value)) {
					finish(f);
					return;
				}
			}
		}
	};

	const withTrace = (o: ReferenceOutput): ReferenceOutput => {
		const staticData = statics.final(o.status);
		const s =
			staticData === undefined
				? o
				: { ...o, staticData: jsonCopy(staticData) as Record<string, unknown> };
		return fixture.trace === true ? { ...s, trace: traces } : s;
	};
	const main = newFibre(0, [clone(fixture.trigger)], []);
	queue.push(main);
	try {
		while (!main.done) {
			const f = queue.shift();
			if (!f) throw new Error('deadlock');
			step(f);
		}
	} catch (e) {
		if (e instanceof Abort)
			return withTrace({ status: 'needs_attention', result: { step: e.step }, effects });
		if (e instanceof Limit) return withTrace({ status: 'limit', effects });
		throw e;
	}
	const out: ReferenceOutput =
		main.value === undefined
			? { status: main.ok ? 'ok' : 'error', effects }
			: { status: main.ok ? 'ok' : 'error', result: main.value, effects };
	return withTrace(jsonCopy(out) as ReferenceOutput);
}
