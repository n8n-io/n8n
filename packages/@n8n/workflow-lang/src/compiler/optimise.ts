import { registerUse } from './liveness.ts';
import type { Instr, TryEntry } from './module.ts';
import { Op } from './opcodes.ts';

/**
 * Makes the code of one function shorter. The instruction set and the module
 * format stay the same.
 *
 * Rules that every pass obeys:
 * - SUSPEND, FORK and JOIN stay as they are: no pass removes one, or changes
 *   an operand of one. No copy and no "is undefined" fact crosses one, so the
 *   registers that are live at a resume point stay the same.
 * - A removed instruction never throws, so a try region keeps its instructions
 *   that can throw. Jump targets, try regions and suspend sites move with the
 *   instructions.
 * - An instruction that throws does not write its result. The handler gets
 *   the facts that hold before and after each instruction of its region.
 */

export type PassName = 'jumps' | 'coalesce' | 'numbers' | 'copies' | 'dead' | 'undefined';

export const ALL_PASSES: readonly PassName[] = [
	'jumps',
	'coalesce',
	'numbers',
	'copies',
	'dead',
	'undefined',
];

export interface FunctionCode {
	code: Instr[];
	/** Source range of each instruction. */
	ranges: Array<[number, number]>;
	tries: TryEntry[];
	/** The pc of each suspend site. */
	suspendPcs: number[];
}

export interface OptimiseOptions {
	nparams: number;
	nregs: number;
	capsOf: (fn: number) => number;
	passes?: ReadonlySet<PassName>;
}

const MAX_ROUNDS = 12;
const MAX_JUMP_HOPS = 16;

const SUSPEND_OPS: ReadonlySet<number> = new Set([Op.SUSPEND, Op.FORK, Op.JOIN]);

/** Instructions that read a window of registers. */
const WINDOW_OPS: ReadonlySet<number> = new Set([Op.CALL, Op.CALLM, Op.CALLN, Op.CLOSURE]);

/** Instructions that only write their result: they never throw and have no other effect. */
const PURE_OPS: ReadonlySet<number> = new Set([
	Op.LOADK,
	Op.LOADS,
	Op.LOADI,
	Op.LOADUNDEF,
	Op.LOADNULL,
	Op.LOADBOOL,
	Op.MOV,
	Op.GETCAP,
	Op.NOT,
	Op.ISNULLISH,
	Op.SEQ,
	Op.SNE,
]);

/** Instructions whose result is always a number. */
const NUMBER_OPS: ReadonlySet<number> = new Set([
	Op.LOADI,
	Op.LOADK,
	Op.SUB,
	Op.MUL,
	Op.DIV,
	Op.MOD,
	Op.POW,
	Op.BAND,
	Op.BOR,
	Op.BXOR,
	Op.SHL,
	Op.SHR,
	Op.USHR,
	Op.NEG,
	Op.TONUM,
	Op.BNOT,
]);

type Field = 'a' | 'b' | 'c';

const NO_FIELDS: readonly Field[] = [];
const FIELD_A: readonly Field[] = ['a'];
const FIELD_B: readonly Field[] = ['b'];
const FIELDS_AB: readonly Field[] = ['a', 'b'];
const FIELDS_AC: readonly Field[] = ['a', 'c'];
const FIELDS_BC: readonly Field[] = ['b', 'c'];
const FIELDS_ABC: readonly Field[] = ['a', 'b', 'c'];

/**
 * The operands that name one register that the instruction reads. A register
 * window is not in the list: its registers must stay consecutive. This agrees
 * with `registerUse`.
 */
function readFields(op: number): readonly Field[] {
	switch (op) {
		case Op.NOP:
		case Op.JMP:
		case Op.LOADK:
		case Op.LOADS:
		case Op.LOADI:
		case Op.LOADUNDEF:
		case Op.LOADNULL:
		case Op.LOADBOOL:
		case Op.NEWOBJ:
		case Op.NEWARR:
		case Op.NOW:
		case Op.RANDOM:
		case Op.EXEC:
		case Op.VARS:
		case Op.GETCAP:
		case Op.CLOSURE:
		case Op.CALLM:
		case Op.CALLN:
		case Op.SUSPEND:
		case Op.FORK:
		case Op.JOIN:
			return NO_FIELDS;
		case Op.MOV:
		case Op.NEG:
		case Op.TONUM:
		case Op.BNOT:
		case Op.NOT:
		case Op.TYPEOF:
		case Op.TOSTR:
		case Op.ISNULLISH:
		case Op.GETCELL:
		case Op.NEWCELL:
		case Op.GETPROP:
		case Op.NEWERR:
		case Op.CALL:
			return FIELD_B;
		case Op.JT:
		case Op.JF:
		case Op.JNULLISH:
		case Op.RET:
		case Op.THROW:
			return FIELD_A;
		case Op.SETPROP:
			return FIELDS_AC;
		case Op.SETELEM:
			return FIELDS_ABC;
		case Op.DELPROP:
		case Op.PUSH:
		case Op.SPREADARR:
		case Op.SPREADOBJ:
		case Op.SETCELL:
		case Op.TRACE:
			return FIELDS_AB;
		default:
			return FIELDS_BC;
	}
}

const isJump = (op: number) => op === Op.JMP || op === Op.JT || op === Op.JF || op === Op.JNULLISH;

const targetOf = (ins: Instr) => (ins.b | (ins.c << 16)) >>> 0;

function setTarget(ins: Instr, target: number) {
	ins.b = target & 0xffff;
	ins.c = target >>> 16;
}

/** The facts of a forward analysis: one number for each register, 0 for "not known". */
type Facts = Int32Array;

class Optimiser {
	private code: Instr[];

	private ranges: Array<[number, number]>;

	private tries: TryEntry[];

	private dead: Uint8Array;

	private uses: number[][] = [];

	private defs: Int32Array = new Int32Array(0);

	/** The try entries that cover each pc. Empty when the function has no try. */
	private cover: number[][] = [];

	private readonly words: number;

	private readonly options: OptimiseOptions;

	constructor(fn: FunctionCode, options: OptimiseOptions) {
		this.options = options;
		this.code = fn.code;
		this.ranges = fn.ranges;
		this.tries = fn.tries;
		this.dead = new Uint8Array(this.code.length);
		this.words = Math.max(1, Math.ceil(options.nregs / 32));
		this.index();
	}

	result(): Omit<FunctionCode, 'suspendPcs'> {
		return { code: this.code, ranges: this.ranges, tries: this.tries };
	}

	run() {
		const on = (name: PassName) => this.options.passes?.has(name) ?? true;
		for (let round = 0; round < MAX_ROUNDS; round++) {
			let changed = false;
			if (on('jumps')) changed = this.jumps() || changed;
			if (on('coalesce')) changed = this.coalesce() || changed;
			if (on('numbers')) changed = this.numbers() || changed;
			if (on('copies')) changed = this.copies() || changed;
			if (on('dead')) changed = this.deadStores() || changed;
			if (on('undefined')) changed = this.undefinedLoads() || changed;
			if (!changed) break;
		}
	}

	// ------------------------------------------------------------- structure

	private index() {
		const { code, tries } = this;
		const capsOf = this.options.capsOf;
		this.uses = code.map((ins) =>
			// A closure with no capture window names register 0 as its base.
			ins.op === Op.CLOSURE && ins.c === 0 ? [] : registerUse(ins, capsOf).uses,
		);
		this.defs = Int32Array.from(code, (ins) => registerUse(ins, capsOf).defs[0] ?? -1);
		this.cover = code.map(() => []);
		tries.forEach((t, i) => {
			for (let pc = t.start; pc < t.end; pc++) this.cover[pc].push(i);
		});
	}

	private successors(pc: number): number[] {
		const ins = this.code[pc];
		switch (ins.op) {
			case Op.JMP:
				return [targetOf(ins)];
			case Op.JT:
			case Op.JF:
			case Op.JNULLISH:
				return [pc + 1, targetOf(ins)];
			case Op.RET:
			case Op.THROW:
				return [];
			default:
				return pc + 1 < this.code.length ? [pc + 1] : [];
		}
	}

	/** True for each pc that a jump or a try handler names. */
	private targets(): Uint8Array {
		const out = new Uint8Array(this.code.length + 1);
		for (const ins of this.code) if (isJump(ins.op)) out[targetOf(ins)] = 1;
		for (const t of this.tries) out[t.handler] = 1;
		return out;
	}

	/** Removes the instructions marked dead and moves every pc that names one. */
	private compact(): boolean {
		const { code, dead } = this;
		const n = code.length;
		const map = new Int32Array(n + 1);
		let kept = 0;
		for (let pc = 0; pc < n; pc++) {
			map[pc] = kept;
			if (!dead[pc]) kept++;
		}
		map[n] = kept;
		if (kept === n) return false;
		for (let pc = 0; pc < n; pc++) {
			const ins = code[pc];
			if (dead[pc]) {
				if (SUSPEND_OPS.has(ins.op)) throw new Error('the optimiser removed a suspend site');
				continue;
			}
			if (isJump(ins.op)) setTarget(ins, map[targetOf(ins)]);
		}
		this.code = code.filter((_, pc) => !dead[pc]);
		this.ranges = this.ranges.filter((_, pc) => !dead[pc]);
		this.tries = this.tries
			.map((t) => ({
				start: map[t.start],
				end: map[t.end],
				handler: map[t.handler],
				catchReg: t.catchReg,
			}))
			.filter((t) => t.end > t.start);
		this.dead = new Uint8Array(kept);
		this.index();
		return true;
	}

	// ------------------------------------------------------------------ jumps

	/**
	 * Sends a jump to the end of a chain of JMP. Removes a jump to the next
	 * instruction. Writes `JF x, @a; JMP @b; a:` as `JT x, @b`.
	 */
	private jumps(): boolean {
		const { code, dead } = this;
		let changed = false;
		code.forEach((ins, pc) => {
			if (!isJump(ins.op)) return;
			let target = targetOf(ins);
			for (let hops = 0; hops < MAX_JUMP_HOPS; hops++) {
				const next = code[target];
				if (next.op !== Op.JMP || target === pc || targetOf(next) === target) break;
				target = targetOf(next);
			}
			if (target !== targetOf(ins)) {
				setTarget(ins, target);
				changed = true;
			}
		});
		const isTarget = this.targets();
		for (let pc = 0; pc < code.length; pc++) {
			const ins = code[pc];
			if (dead[pc] || !isJump(ins.op)) continue;
			const next = code[pc + 1];
			if (
				(ins.op === Op.JT || ins.op === Op.JF) &&
				next?.op === Op.JMP &&
				targetOf(ins) === pc + 2 &&
				!isTarget[pc + 1]
			) {
				ins.op = ins.op === Op.JT ? Op.JF : Op.JT;
				setTarget(ins, targetOf(next));
				dead[pc + 1] = 1;
			} else if (targetOf(ins) === pc + 1) {
				dead[pc] = 1;
			}
		}
		return this.compact() || changed;
	}

	// --------------------------------------------------------------- liveness

	/**
	 * The registers that are live before each instruction, as bit sets. An
	 * instruction in a try region can throw before it writes its result, so
	 * the registers that the handler reads are live before it too.
	 */
	private liveIn(): Uint32Array {
		const { code, tries, uses, defs, cover, words } = this;
		const n = code.length;
		const live = new Uint32Array((n + 1) * words);
		const next = new Uint32Array(words);
		const succ = code.map((_, pc) => this.successors(pc));
		let changed = true;
		while (changed) {
			changed = false;
			for (let pc = n - 1; pc >= 0; pc--) {
				next.fill(0);
				for (const s of succ[pc]) {
					const at = s * words;
					for (let w = 0; w < words; w++) next[w] |= live[at + w];
				}
				const d = defs[pc];
				if (d >= 0) next[d >>> 5] &= ~(1 << (d & 31));
				for (const u of uses[pc]) next[u >>> 5] |= 1 << (u & 31);
				for (const ti of cover[pc]) {
					const t = tries[ti];
					const at = t.handler * words;
					const cw = t.catchReg >>> 5;
					const cbit = 1 << (t.catchReg & 31);
					for (let w = 0; w < words; w++) {
						next[w] |= w === cw ? live[at + w] & ~cbit : live[at + w];
					}
				}
				const at = pc * words;
				for (let w = 0; w < words; w++) {
					if (live[at + w] !== next[w]) {
						live[at + w] = next[w];
						changed = true;
					}
				}
			}
		}
		return live;
	}

	private isLive(live: Uint32Array, pc: number, reg: number): boolean {
		return (live[pc * this.words + (reg >>> 5)] & (1 << (reg & 31))) !== 0;
	}

	// --------------------------------------------------------------- coalesce

	/**
	 * Writes `OP t, ...; MOV l, t` as `OP l, ...` when no later instruction
	 * reads `t` and no jump goes to the MOV.
	 */
	private coalesce(): boolean {
		const { code, dead, uses, defs } = this;
		const live = this.liveIn();
		const isTarget = this.targets();
		for (let pc = 0; pc + 2 < code.length; pc++) {
			const ins = code[pc];
			const mov = code[pc + 1];
			const t = defs[pc];
			if (mov.op !== Op.MOV || t < 0 || mov.b !== t || mov.a === t) continue;
			if (SUSPEND_OPS.has(ins.op) || isTarget[pc + 1]) continue;
			if (this.isLive(live, pc + 2, t)) continue;
			const l = mov.a;
			if (WINDOW_OPS.has(ins.op) && uses[pc].includes(l)) continue;
			ins.a = l;
			dead[pc + 1] = 1;
			pc++;
		}
		return this.compact();
	}

	// ----------------------------------------------------------- dead stores

	/** Removes an instruction that only writes a register that no instruction reads. */
	private deadStores(): boolean {
		const { code, dead, defs } = this;
		const live = this.liveIn();
		for (let pc = 0; pc + 1 < code.length; pc++) {
			const ins = code[pc];
			if (!PURE_OPS.has(ins.op)) continue;
			if ((ins.op === Op.MOV && ins.a === ins.b) || !this.isLive(live, pc + 1, defs[pc])) {
				dead[pc] = 1;
			}
		}
		return this.compact();
	}

	// ------------------------------------------------------ forward analyses

	/**
	 * Solves a forward analysis. `facts[pc]` holds what is true before the
	 * instruction on every path; a pc that no path reaches has none. Two paths
	 * keep a fact only when both have the same value for the register.
	 */
	private forward(
		entry: Facts,
		transfer: (facts: Facts, ins: Instr, pc: number) => void,
	): Array<Facts | undefined> {
		const { code, tries, cover } = this;
		const n = code.length;
		const facts: Array<Facts | undefined> = new Array(n).fill(undefined);
		facts[0] = entry;
		const meet = (pc: number, from: Facts, skip = -1): boolean => {
			const into = facts[pc];
			if (!into) {
				const copy = from.slice();
				if (skip >= 0) copy[skip] = 0;
				facts[pc] = copy;
				return true;
			}
			let changed = false;
			for (let r = 0; r < into.length; r++) {
				if (into[r] !== 0 && (r === skip || into[r] !== from[r])) {
					into[r] = 0;
					changed = true;
				}
			}
			return changed;
		};
		const pending = new Uint8Array(n);
		pending[0] = 1;
		let work = true;
		while (work) {
			work = false;
			for (let pc = 0; pc < n; pc++) {
				if (!pending[pc]) continue;
				pending[pc] = 0;
				const before = facts[pc];
				if (!before) continue;
				const after = before.slice();
				transfer(after, code[pc], pc);
				const flow = (to: number, from: Facts, skip = -1) => {
					if (!meet(to, from, skip)) return;
					pending[to] = 1;
					if (to <= pc) work = true;
				};
				for (const s of this.successors(pc)) flow(s, after);
				for (const ti of cover[pc]) {
					const t = tries[ti];
					flow(t.handler, before, t.catchReg);
					flow(t.handler, after, t.catchReg);
				}
			}
		}
		return facts;
	}

	/** Writes `TONUM a, b` as `MOV a, b` when `b` always holds a number. */
	private numbers(): boolean {
		const { code, defs } = this;
		if (!code.some((ins) => ins.op === Op.TONUM)) return false;
		const facts = this.forward(new Int32Array(this.options.nregs), (known, ins, pc) => {
			const d = defs[pc];
			if (d < 0) return;
			if (ins.op === Op.MOV) known[d] = known[ins.b];
			else if (ins.op === Op.ADD) known[d] = known[ins.b] & known[ins.c];
			else known[d] = NUMBER_OPS.has(ins.op) ? 1 : 0;
		});
		let changed = false;
		code.forEach((ins, pc) => {
			if (ins.op === Op.TONUM && facts[pc]?.[ins.b]) {
				ins.op = Op.MOV;
				changed = true;
			}
		});
		return changed;
	}

	/**
	 * Copy propagation. After `MOV a, b`, an instruction reads `b` in place of
	 * `a` until one of the two registers changes. The fact for `a` is `b + 1`.
	 */
	private copies(): boolean {
		const { code, defs } = this;
		if (!code.some((ins) => ins.op === Op.MOV)) return false;
		const facts = this.forward(new Int32Array(this.options.nregs), (copyOf, ins, pc) => {
			if (SUSPEND_OPS.has(ins.op)) {
				copyOf.fill(0);
				return;
			}
			const d = defs[pc];
			if (d < 0) return;
			const source = ins.op === Op.MOV ? (copyOf[ins.b] || ins.b + 1) - 1 : -1;
			copyOf[d] = 0;
			for (let r = 0; r < copyOf.length; r++) if (copyOf[r] === d + 1) copyOf[r] = 0;
			if (source >= 0 && source !== d) copyOf[d] = source + 1;
		});
		let changed = false;
		code.forEach((ins, pc) => {
			const copyOf = facts[pc];
			if (!copyOf) return;
			for (const field of readFields(ins.op)) {
				const source = copyOf[ins[field]];
				if (source !== 0) {
					ins[field] = source - 1;
					changed = true;
				}
			}
		});
		if (changed) this.index();
		return changed;
	}

	/**
	 * Removes `LOADUNDEF a` when `a` is undefined already. A new frame has
	 * undefined in every register that is not a parameter (`interp.zig` call
	 * and popFrame; `makeFrame` in the test VM). The analysis forgets
	 * everything at a call and at a suspend, so it does not depend on how a
	 * frame comes back after one.
	 */
	private undefinedLoads(): boolean {
		const { code, dead, defs } = this;
		if (!code.some((ins) => ins.op === Op.LOADUNDEF)) return false;
		const entry = new Int32Array(this.options.nregs);
		entry.fill(1, this.options.nparams);
		const facts = this.forward(entry, (undef, ins, pc) => {
			if (SUSPEND_OPS.has(ins.op) || ins.op === Op.CALL) {
				undef.fill(0);
				return;
			}
			const d = defs[pc];
			if (d < 0) return;
			undef[d] = ins.op === Op.LOADUNDEF ? 1 : ins.op === Op.MOV ? undef[ins.b] : 0;
		});
		code.forEach((ins, pc) => {
			if (ins.op === Op.LOADUNDEF && facts[pc]?.[ins.a]) dead[pc] = 1;
		});
		return this.compact();
	}
}

/** Returns shorter code for one function, with its try regions and suspend sites. */
export function optimise(fn: FunctionCode, options: OptimiseOptions): FunctionCode {
	const sites = fn.suspendPcs.map((pc) => fn.code[pc]);
	const optimiser = new Optimiser(fn, options);
	optimiser.run();
	const out = optimiser.result();
	const at = new Map(out.code.map((ins, pc) => [ins, pc]));
	const suspendPcs = sites.map((ins) => {
		const pc = at.get(ins);
		if (pc === undefined) throw new Error('the optimiser lost a suspend site');
		return pc;
	});
	return { ...out, suspendPcs };
}
