import type { Instr, TryEntry } from './module.ts';
import { Op } from './opcodes.ts';

export interface RegisterUse {
	uses: number[];
	defs: number[];
}

const range = (start: number, n: number) => Array.from({ length: n }, (_, i) => start + i);

/** Registers that one instruction reads and writes. */
export function registerUse(ins: Instr, capsOf: (fn: number) => number): RegisterUse {
	const { op, a, b, c, x } = ins;
	switch (op) {
		case Op.NOP:
		case Op.JMP:
			return { uses: [], defs: [] };
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
			return { uses: [], defs: [a] };
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
		case Op.JOIN:
			return { uses: [b], defs: [a] };
		case Op.JT:
		case Op.JF:
		case Op.JNULLISH:
		case Op.RET:
		case Op.THROW:
			return { uses: [a], defs: [] };
		case Op.SETPROP:
			return { uses: [a, c], defs: [] };
		case Op.SETELEM:
			return { uses: [a, b, c], defs: [] };
		case Op.DELPROP:
		case Op.PUSH:
		case Op.SPREADARR:
		case Op.SPREADOBJ:
		case Op.SETCELL:
		case Op.TRACE:
			return { uses: [a, b], defs: [] };
		case Op.CLOSURE:
			return { uses: range(c, capsOf(b)), defs: [a] };
		case Op.CALL:
			return { uses: [b, ...range(c, x)], defs: [a] };
		case Op.CALLM:
			return { uses: range(c, x + 1), defs: [a] };
		case Op.CALLN:
			return { uses: range(c, x), defs: [a] };
		case Op.SUSPEND:
		case Op.FORK:
			return { uses: [b, c], defs: [a] };
		default:
			// Binary operators, comparisons, GETELEM and HASPROP.
			return { uses: [b, c], defs: [a] };
	}
}

function successors(code: Instr[], pc: number): number[] {
	const ins = code[pc];
	const target = (ins.b | (ins.c << 16)) >>> 0;
	switch (ins.op) {
		case Op.JMP:
			return [target];
		case Op.JT:
		case Op.JF:
		case Op.JNULLISH:
			return [pc + 1, target];
		case Op.RET:
		case Op.THROW:
			return [];
		default:
			return pc + 1 < code.length ? [pc + 1] : [];
	}
}

/**
 * Computes the registers that are live after each instruction. Each
 * instruction in a try region also flows to the handler of the innermost
 * region, without the catch register.
 */
export function liveOut(
	code: Instr[],
	tries: TryEntry[],
	capsOf: (fn: number) => number,
): Array<Set<number>> {
	const n = code.length;
	const use = code.map((ins) => registerUse(ins, capsOf));
	const succ = code.map((_, pc) => successors(code, pc));
	const handlerOf: Array<TryEntry | undefined> = code.map((_, pc) =>
		tries.find((t) => pc >= t.start && pc < t.end),
	);
	const liveIn: Array<Set<number>> = code.map(() => new Set());
	const out: Array<Set<number>> = code.map(() => new Set());
	let changed = true;
	while (changed) {
		changed = false;
		for (let pc = n - 1; pc >= 0; pc--) {
			const o = new Set<number>();
			for (const s of succ[pc]) for (const r of liveIn[s] ?? []) o.add(r);
			const t = handlerOf[pc];
			if (t) for (const r of liveIn[t.handler] ?? []) if (r !== t.catchReg) o.add(r);
			const i = new Set(o);
			for (const d of use[pc].defs) i.delete(d);
			for (const u of use[pc].uses) i.add(u);
			if (i.size !== liveIn[pc].size || o.size !== out[pc].size) changed = true;
			else for (const r of i) if (!liveIn[pc].has(r)) changed = true;
			liveIn[pc] = i;
			out[pc] = o;
		}
	}
	return out;
}
