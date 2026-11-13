import { FORMAT_VERSION, HEADER_SIZE, MAGIC, NO_INDEX, Section } from './opcodes.ts';
import { sha256 } from './sha256.ts';

export interface Instr {
	op: number;
	x: number;
	a: number;
	b: number;
	c: number;
}

export interface TryEntry {
	start: number;
	end: number;
	handler: number;
	catchReg: number;
}

export interface FunctionEntry {
	name: string;
	nparams: number;
	nregs: number;
	ncaps: number;
	async: boolean;
	code: Instr[];
	tries: TryEntry[];
}

export interface StepEntry {
	id: string;
	name: string;
	nodeType: string | null;
	kind: number;
	idempotent: boolean;
	retryMax: number;
	retryDelayMs: number;
	srcStart: number;
	srcEnd: number;
	/** The step's code never reads `headers` of its HTTP results (`headers.ts`). */
	resultHeadersUnread?: boolean;
	/** The step's code never reads `body` of its HTTP results (`headers.ts`). */
	resultBodyUnread?: boolean;
}

/** Step flags (the byte after `retryMax`). */
export const STEP_FLAG_RESULT_HEADERS_UNREAD = 1;
export const STEP_FLAG_RESULT_BODY_UNREAD = 2;

export interface LiveRegister {
	reg: number;
	name: string;
	type: string;
}

export interface SuspendEntry {
	func: number;
	pc: number;
	/** Step index, or null when the step comes from a register at run time. */
	step: number | null;
	live: LiveRegister[];
}

/** The decoded or not yet encoded content of a `.wfm` module. */
export interface ModuleData {
	native: boolean;
	strings: string[];
	numbers: number[];
	functions: FunctionEntry[];
	steps: StepEntry[];
	suspends: SuspendEntry[];
	paths: string[];
	meta: string;
}

/** Deduplicated string and number constants of one module. */
export class ConstPool {
	readonly strings: string[] = [];

	readonly numbers: number[] = [];

	private readonly stringIndex = new Map<string, number>();

	private readonly numberIndex = new Map<string, number>();

	str(value: string): number {
		const found = this.stringIndex.get(value);
		if (found !== undefined) return found;
		const index = this.strings.length;
		this.strings.push(value);
		this.stringIndex.set(value, index);
		return index;
	}

	num(value: number): number {
		const key = Object.is(value, -0) ? '-0' : String(value);
		const found = this.numberIndex.get(key);
		if (found !== undefined) return found;
		const index = this.numbers.length;
		this.numbers.push(value);
		this.numberIndex.set(key, index);
		return index;
	}
}

export type Hasher = (bytes: Uint8Array) => Uint8Array;

class ByteWriter {
	private buffer = new Uint8Array(1024);

	private view = new DataView(this.buffer.buffer);

	length = 0;

	private ensure(extra: number) {
		if (this.length + extra <= this.buffer.length) return;
		let size = this.buffer.length * 2;
		while (size < this.length + extra) size *= 2;
		const next = new Uint8Array(size);
		next.set(this.buffer.subarray(0, this.length));
		this.buffer = next;
		this.view = new DataView(next.buffer);
	}

	u8(value: number) {
		this.ensure(1);
		this.view.setUint8(this.length, value);
		this.length += 1;
	}

	u16(value: number) {
		this.ensure(2);
		this.view.setUint16(this.length, value, true);
		this.length += 2;
	}

	u32(value: number) {
		this.ensure(4);
		this.view.setUint32(this.length, value >>> 0, true);
		this.length += 4;
	}

	f64(value: number) {
		this.ensure(8);
		this.view.setFloat64(this.length, value, true);
		this.length += 8;
	}

	bytes(data: Uint8Array) {
		this.ensure(data.length);
		this.buffer.set(data, this.length);
		this.length += data.length;
	}

	align(n: number) {
		while (this.length % n !== 0) this.u8(0);
	}

	patchU32(offset: number, value: number) {
		this.view.setUint32(offset, value >>> 0, true);
	}

	result(): Uint8Array {
		return this.buffer.slice(0, this.length);
	}
}

function encodeStrings(w: ByteWriter, strings: string[]) {
	const encoder = new TextEncoder();
	const encoded = strings.map((s) => encoder.encode(s));
	w.u32(strings.length);
	let offset = 0;
	for (const bytes of encoded) {
		w.u32(offset);
		offset += bytes.length;
	}
	w.u32(offset);
	for (const bytes of encoded) w.bytes(bytes);
}

function assertRange(value: number, max: number, what: string) {
	if (!Number.isInteger(value) || value < 0 || value > max) {
		throw new RangeError(`${what} out of range: ${value}`);
	}
}

/** Encodes a module to the `.wfm` binary format (spec section 3). */
export function encodeModule(data: ModuleData, hasher: Hasher = sha256): Uint8Array {
	const w = new ByteWriter();
	for (let i = 0; i < HEADER_SIZE; i++) w.u8(0);
	const sectionIds = [
		Section.STRINGS,
		Section.NUMBERS,
		Section.FUNCTIONS,
		Section.CODE,
		Section.TRIES,
		Section.STEPS,
		Section.SUSPENDS,
		Section.PATHS,
		Section.META,
	];
	const tableOffset = w.length;
	for (let i = 0; i < sectionIds.length * 3; i++) w.u32(0);

	const writeSection = (index: number, body: () => void) => {
		w.align(8);
		const start = w.length;
		body();
		const entry = tableOffset + index * 12;
		w.patchU32(entry, sectionIds[index]);
		w.patchU32(entry + 4, start);
		w.patchU32(entry + 8, w.length - start);
	};

	const allCode: Instr[] = [];
	const allTries: TryEntry[] = [];
	const layout = data.functions.map((fn) => {
		const entry = {
			codeStart: allCode.length,
			tryStart: allTries.length,
		};
		// A loop, not a spread: a large function exceeds the argument limit of `push`.
		for (const instr of fn.code) allCode.push(instr);
		for (const t of fn.tries) allTries.push(t);
		return entry;
	});

	writeSection(0, () => encodeStrings(w, data.strings));
	writeSection(1, () => {
		w.u32(data.numbers.length);
		w.u32(0);
		for (const n of data.numbers) w.f64(n);
	});
	writeSection(2, () => {
		w.u32(data.functions.length);
		w.u32(0);
		data.functions.forEach((fn, i) => {
			const nameIndex = data.strings.indexOf(fn.name);
			if (nameIndex < 0) throw new RangeError(`function name not in strings: ${fn.name}`);
			assertRange(fn.nparams, 0xffff, 'nparams');
			assertRange(fn.nregs, 0xffff, 'nregs');
			assertRange(fn.ncaps, 0xffff, 'ncaps');
			w.u32(nameIndex);
			w.u16(fn.nparams);
			w.u16(fn.nregs);
			w.u16(fn.ncaps);
			w.u16(fn.async ? 1 : 0);
			w.u32(layout[i].codeStart);
			w.u32(fn.code.length);
			w.u32(layout[i].tryStart);
			w.u32(fn.tries.length);
			w.u32(0);
		});
	});
	writeSection(3, () => {
		w.u32(allCode.length);
		w.u32(0);
		for (const ins of allCode) {
			assertRange(ins.op, 0xff, 'op');
			assertRange(ins.x, 0xff, 'x');
			assertRange(ins.a, 0xffff, 'a');
			assertRange(ins.b, 0xffff, 'b');
			assertRange(ins.c, 0xffff, 'c');
			w.u8(ins.op);
			w.u8(ins.x);
			w.u16(ins.a);
			w.u16(ins.b);
			w.u16(ins.c);
		}
	});
	writeSection(4, () => {
		w.u32(allTries.length);
		w.u32(0);
		for (const t of allTries) {
			w.u32(t.start);
			w.u32(t.end);
			w.u32(t.handler);
			w.u16(t.catchReg);
			w.u16(0);
		}
	});
	const str = (s: string) => {
		const index = data.strings.indexOf(s);
		if (index < 0) throw new RangeError(`string not in pool: ${s}`);
		return index;
	};
	writeSection(5, () => {
		w.u32(data.steps.length);
		w.u32(0);
		for (const s of data.steps) {
			w.u32(str(s.id));
			w.u32(str(s.name));
			w.u32(s.nodeType === null ? NO_INDEX : str(s.nodeType));
			w.u8(s.kind);
			w.u8(s.idempotent ? 1 : 0);
			w.u8(Math.min(s.retryMax, 255));
			w.u8(
				(s.resultHeadersUnread ? STEP_FLAG_RESULT_HEADERS_UNREAD : 0) |
					(s.resultBodyUnread ? STEP_FLAG_RESULT_BODY_UNREAD : 0),
			);
			w.u32(s.retryDelayMs);
			w.u32(s.srcStart);
			w.u32(s.srcEnd);
			w.u32(0);
		}
	});
	writeSection(6, () => {
		w.u32(data.suspends.length);
		for (const s of data.suspends) {
			w.u32(s.func);
			w.u32(s.pc);
			w.u32(s.step === null ? NO_INDEX : s.step);
			w.u32(s.live.length);
			for (const l of s.live) {
				w.u32(l.reg);
				w.u32(str(l.name));
				w.u32(str(l.type));
			}
		}
	});
	writeSection(7, () => {
		w.u32(data.paths.length);
		for (const p of data.paths) w.u32(str(p));
	});
	writeSection(8, () => {
		w.u32(str(data.meta));
	});

	const bytes = w.result();
	const view = new DataView(bytes.buffer);
	view.setUint32(0, MAGIC, true);
	view.setUint16(4, FORMAT_VERSION, true);
	view.setUint16(6, data.native ? 1 : 0, true);
	view.setUint32(8, sectionIds.length, true);
	view.setUint32(12, 0, true);
	bytes.set(hasher(bytes.subarray(HEADER_SIZE)), 16);
	return bytes;
}

export function toHex(bytes: Uint8Array): string {
	let out = '';
	for (const b of bytes) out += b.toString(16).padStart(2, '0');
	return out;
}
