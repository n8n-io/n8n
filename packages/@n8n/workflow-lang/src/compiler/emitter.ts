import type { Instr, LiveRegister, TryEntry } from './module.ts';
import { JUMP_OPS } from './opcodes.ts';

export type Label = number;

export interface RegisterInfo {
	name: string;
	type: string;
}

interface PendingRegion {
	start: number;
	end: number;
	handler: Label;
	catchReg: number;
	depth: number;
}

/** A try region that can be closed and reopened around inlined finally code. */
export interface Region {
	handler: Label;
	catchReg: number;
	depth: number;
	segStart: number | null;
}

export interface SuspendSite {
	pc: number;
	step: number | null;
	registers: Map<number, RegisterInfo>;
}

/**
 * Builds the code of one function: instructions, labels, registers, try
 * regions and suspend sites.
 *
 * Locals get fixed registers. Temporaries are allocated as a stack above the
 * locals, so call arguments can take consecutive registers.
 */
export class FunctionBuilder {
	readonly code: Instr[] = [];

	/** Source range for each instruction. */
	readonly ranges: Array<[number, number]> = [];

	private readonly labels: Array<number | undefined> = [];

	private readonly fixups: Array<{ pc: number; label: Label }> = [];

	private readonly regions: PendingRegion[] = [];

	readonly suspends: SuspendSite[] = [];

	readonly localInfo = new Map<number, RegisterInfo>();

	private readonly tempInfo = new Map<number, RegisterInfo>();

	private nlocals = 0;

	private tempTop = 0;

	maxRegs = 0;

	range: [number, number] = [0, 0];

	addLocal(info: RegisterInfo): number {
		if (this.tempTop > this.nlocals) throw new Error('locals must be allocated before temporaries');
		const reg = this.nlocals++;
		this.tempTop = this.nlocals;
		this.maxRegs = Math.max(this.maxRegs, this.nlocals);
		this.localInfo.set(reg, info);
		return reg;
	}

	temp(info?: RegisterInfo): number {
		const reg = this.tempTop++;
		this.maxRegs = Math.max(this.maxRegs, this.tempTop);
		this.tempInfo.set(reg, info ?? { name: `$t${reg}`, type: 'unknown' });
		return reg;
	}

	temps(n: number): number {
		const base = this.tempTop;
		for (let i = 0; i < n; i++) this.temp();
		return base;
	}

	isTemp(reg: number): boolean {
		return reg >= this.nlocals;
	}

	setTempInfo(reg: number, info: RegisterInfo) {
		if (this.isTemp(reg)) this.tempInfo.set(reg, info);
	}

	mark(): number {
		return this.tempTop;
	}

	release(mark: number) {
		for (let r = mark; r < this.tempTop; r++) this.tempInfo.delete(r);
		this.tempTop = mark;
	}

	get pc(): number {
		return this.code.length;
	}

	emit(op: number, a = 0, b = 0, c = 0, x = 0): number {
		this.code.push({ op, x, a, b, c });
		this.ranges.push(this.range);
		return this.code.length - 1;
	}

	/** Emits an instruction with a 32-bit `bc` operand. */
	emitBC(op: number, a: number, bc: number, x = 0): number {
		const u = bc >>> 0;
		return this.emit(op, a, u & 0xffff, u >>> 16, x);
	}

	newLabel(): Label {
		this.labels.push(undefined);
		return this.labels.length - 1;
	}

	placeLabel(label: Label) {
		this.labels[label] = this.pc;
	}

	jump(op: number, a: number, label: Label) {
		const pc = this.emit(op, a, 0, 0);
		this.fixups.push({ pc, label });
	}

	openRegion(region: Region) {
		region.segStart = this.pc;
	}

	closeRegion(region: Region) {
		if (region.segStart !== null && this.pc > region.segStart) {
			this.regions.push({
				start: region.segStart,
				end: this.pc,
				handler: region.handler,
				catchReg: region.catchReg,
				depth: region.depth,
			});
		}
		region.segStart = null;
	}

	recordSuspend(pc: number, step: number | null) {
		const registers = new Map<number, RegisterInfo>(this.localInfo);
		for (const [reg, info] of this.tempInfo) {
			if (reg < this.tempTop) registers.set(reg, info);
		}
		this.suspends.push({ pc, step, registers });
	}

	labelPc(label: Label): number {
		const pc = this.labels[label];
		if (pc === undefined) throw new Error(`label ${label} was not placed`);
		return pc;
	}

	/** Resolves jumps and returns the try entries, innermost first. */
	finish(): TryEntry[] {
		for (const { pc, label } of this.fixups) {
			const target = this.labelPc(label);
			const ins = this.code[pc];
			if (!JUMP_OPS.has(ins.op)) throw new Error('fixup on a non-jump');
			ins.b = target & 0xffff;
			ins.c = target >>> 16;
		}
		const sorted = this.regions
			.map((r, i) => ({ r, i }))
			.sort((p, q) => q.r.depth - p.r.depth || p.i - q.i);
		return sorted.map(({ r }) => ({
			start: r.start,
			end: r.end,
			handler: this.labelPc(r.handler),
			catchReg: r.catchReg,
		}));
	}
}

export function liveRegisters(
	site: SuspendSite,
	live: Set<number>,
	resultReg: number,
): LiveRegister[] {
	const out: LiveRegister[] = [];
	for (const reg of [...live].sort((a, b) => a - b)) {
		if (reg === resultReg) continue;
		const info = site.registers.get(reg) ?? { name: `$t${reg}`, type: 'unknown' };
		out.push({ reg, name: info.name, type: info.type });
	}
	return out;
}
