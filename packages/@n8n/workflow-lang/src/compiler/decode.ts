import type {
	FunctionEntry,
	Instr,
	ModuleData,
	StepEntry,
	SuspendEntry,
	TryEntry,
} from './module.ts';
import { toHex } from './module.ts';
import {
	EFFECT_KIND_NAMES,
	HEADER_SIZE,
	MAGIC,
	NO_INDEX,
	OP_NAMES,
	Op,
	Section,
} from './opcodes.ts';
import { sha256 } from './sha256.ts';

export interface DecodedModule extends ModuleData {
	version: number;
	hash: string;
	hashValid: boolean;
}

class Reader {
	private readonly view: DataView;

	pos: number;

	constructor(view: DataView, pos: number) {
		this.view = view;
		this.pos = pos;
	}

	u8() {
		const v = this.view.getUint8(this.pos);
		this.pos += 1;
		return v;
	}

	u16() {
		const v = this.view.getUint16(this.pos, true);
		this.pos += 2;
		return v;
	}

	u32() {
		const v = this.view.getUint32(this.pos, true);
		this.pos += 4;
		return v;
	}

	f64() {
		const v = this.view.getFloat64(this.pos, true);
		this.pos += 8;
		return v;
	}
}

/** Decodes a `.wfm` module. It throws on a malformed module. */
export function decodeModule(bytes: Uint8Array): DecodedModule {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (view.getUint32(0, true) !== MAGIC) throw new Error('bad magic');
	const version = view.getUint16(4, true);
	const flags = view.getUint16(6, true);
	const count = view.getUint32(8, true);
	const hash = bytes.subarray(16, 48);
	const actual = sha256(bytes.subarray(HEADER_SIZE));
	const sections = new Map<number, { offset: number; length: number }>();
	for (let i = 0; i < count; i++) {
		const base = HEADER_SIZE + i * 12;
		const id = view.getUint32(base, true);
		const offset = view.getUint32(base + 4, true);
		const length = view.getUint32(base + 8, true);
		if (offset % 8 !== 0) throw new Error(`section ${id} is not 8-aligned`);
		if (offset + length > bytes.length) throw new Error(`section ${id} is out of bounds`);
		sections.set(id, { offset, length });
	}
	const reader = (id: number) => {
		const s = sections.get(id);
		if (!s) throw new Error(`missing section ${id}`);
		return new Reader(view, s.offset);
	};

	const strings: string[] = [];
	{
		const r = reader(Section.STRINGS);
		const n = r.u32();
		const offsets: number[] = [];
		for (let i = 0; i <= n; i++) offsets.push(r.u32());
		const area = r.pos;
		const decoder = new TextDecoder('utf-8', { fatal: true });
		for (let i = 0; i < n; i++) {
			strings.push(decoder.decode(bytes.subarray(area + offsets[i], area + offsets[i + 1])));
		}
	}
	const numbers: number[] = [];
	{
		const r = reader(Section.NUMBERS);
		const n = r.u32();
		r.u32();
		for (let i = 0; i < n; i++) numbers.push(r.f64());
	}
	const code: Instr[] = [];
	{
		const r = reader(Section.CODE);
		const n = r.u32();
		r.u32();
		for (let i = 0; i < n; i++) {
			code.push({ op: r.u8(), x: r.u8(), a: r.u16(), b: r.u16(), c: r.u16() });
		}
	}
	const tries: TryEntry[] = [];
	{
		const r = reader(Section.TRIES);
		const n = r.u32();
		r.u32();
		for (let i = 0; i < n; i++) {
			const t = { start: r.u32(), end: r.u32(), handler: r.u32(), catchReg: r.u16() };
			r.u16();
			tries.push(t);
		}
	}
	const functions: FunctionEntry[] = [];
	{
		const r = reader(Section.FUNCTIONS);
		const n = r.u32();
		r.u32();
		for (let i = 0; i < n; i++) {
			const name = strings[r.u32()];
			const nparams = r.u16();
			const nregs = r.u16();
			const ncaps = r.u16();
			const fnFlags = r.u16();
			const codeStart = r.u32();
			const codeLen = r.u32();
			const tryStart = r.u32();
			const tryCount = r.u32();
			r.u32();
			functions.push({
				name,
				nparams,
				nregs,
				ncaps,
				async: (fnFlags & 1) !== 0,
				code: code.slice(codeStart, codeStart + codeLen),
				tries: tries.slice(tryStart, tryStart + tryCount),
			});
		}
	}
	const steps: StepEntry[] = [];
	{
		const r = reader(Section.STEPS);
		const n = r.u32();
		r.u32();
		for (let i = 0; i < n; i++) {
			const id = strings[r.u32()];
			const name = strings[r.u32()];
			const nt = r.u32();
			const kind = r.u8();
			const idempotent = r.u8() !== 0;
			const retryMax = r.u8();
			const stepFlags = r.u8();
			const retryDelayMs = r.u32();
			const srcStart = r.u32();
			const srcEnd = r.u32();
			r.u32();
			steps.push({
				id,
				name,
				nodeType: nt === NO_INDEX ? null : strings[nt],
				kind,
				idempotent,
				retryMax,
				...((stepFlags & 1) !== 0 ? { resultHeadersUnread: true } : {}),
				...((stepFlags & 2) !== 0 ? { resultBodyUnread: true } : {}),
				retryDelayMs,
				srcStart,
				srcEnd,
			});
		}
	}
	const suspends: SuspendEntry[] = [];
	{
		const r = reader(Section.SUSPENDS);
		const n = r.u32();
		for (let i = 0; i < n; i++) {
			const func = r.u32();
			const pc = r.u32();
			const step = r.u32();
			const liveCount = r.u32();
			const live = [];
			for (let j = 0; j < liveCount; j++) {
				live.push({ reg: r.u32(), name: strings[r.u32()], type: strings[r.u32()] });
			}
			suspends.push({ func, pc, step: step === NO_INDEX ? null : step, live });
		}
	}
	const paths: string[] = [];
	{
		const r = reader(Section.PATHS);
		const n = r.u32();
		for (let i = 0; i < n; i++) paths.push(strings[r.u32()]);
	}
	const meta = strings[reader(Section.META).u32()];
	return {
		version,
		hash: toHex(hash),
		hashValid: toHex(hash) === toHex(actual),
		native: (flags & 1) !== 0,
		strings,
		numbers,
		functions,
		steps,
		suspends,
		paths,
		meta,
	};
}

function fmtNumber(n: number): string {
	return Object.is(n, -0) ? '-0' : String(n);
}

/** Renders one instruction as text. */
export function formatInstr(m: ModuleData, ins: Instr): string {
	const name = OP_NAMES[ins.op] ?? `OP${ins.op}`;
	const bc = (ins.b | (ins.c << 16)) >>> 0;
	const r = (n: number) => `r${n}`;
	const s = (n: number) => JSON.stringify(m.strings[n]);
	switch (ins.op) {
		case Op.NOP:
			return name;
		case Op.LOADK:
			return `${name} ${r(ins.a)}, ${fmtNumber(m.numbers[bc])}`;
		case Op.LOADS:
			return `${name} ${r(ins.a)}, ${s(bc)}`;
		case Op.LOADI:
			return `${name} ${r(ins.a)}, ${bc | 0}`;
		case Op.LOADUNDEF:
		case Op.LOADNULL:
		case Op.NEWOBJ:
		case Op.NEWARR:
		case Op.NOW:
		case Op.RANDOM:
		case Op.EXEC:
		case Op.VARS:
		case Op.RET:
		case Op.THROW:
			return `${name} ${r(ins.a)}`;
		case Op.LOADBOOL:
			return `${name} ${r(ins.a)}, ${ins.x !== 0}`;
		case Op.JMP:
			return `${name} @${bc}`;
		case Op.JT:
		case Op.JF:
		case Op.JNULLISH:
			return `${name} ${r(ins.a)}, @${bc}`;
		case Op.GETPROP:
			return `${name} ${r(ins.a)}, ${r(ins.b)}, ${s(ins.c)}`;
		case Op.SETPROP:
			return `${name} ${r(ins.a)}, ${s(ins.b)}, ${r(ins.c)}`;
		case Op.CLOSURE:
			return `${name} ${r(ins.a)}, fn${ins.b} <${m.functions[ins.b]?.name ?? '?'}>, ${r(ins.c)}`;
		case Op.GETCAP:
			return `${name} ${r(ins.a)}, cap${ins.b}`;
		case Op.CALL:
			return `${name} ${r(ins.a)}, ${r(ins.b)}, ${r(ins.c)}..+${ins.x}`;
		case Op.CALLM:
		case Op.CALLN:
			return `${name} ${r(ins.a)}, ${s(ins.b)}, ${r(ins.c)}..+${ins.x}`;
		case Op.NEWERR:
			return `${name} ${r(ins.a)}, ${['Error', 'TypeError', 'RangeError'][ins.x]}, ${r(ins.b)}`;
		case Op.SUSPEND:
			return `${name} ${r(ins.a)}, ${EFFECT_KIND_NAMES[ins.x]}, step ${r(ins.b)}, args ${r(ins.c)}`;
		case Op.FORK:
			return `${name} ${r(ins.a)}, ${r(ins.b)}, ${r(ins.c)}`;
		case Op.JOIN:
		case Op.MOV:
		case Op.NEG:
		case Op.TONUM:
		case Op.BNOT:
		case Op.NOT:
		case Op.TYPEOF:
		case Op.TOSTR:
		case Op.ISNULLISH:
		case Op.NEWCELL:
		case Op.GETCELL:
		case Op.SETCELL:
		case Op.PUSH:
		case Op.SPREADARR:
		case Op.SPREADOBJ:
		case Op.TRACE:
			return `${name} ${r(ins.a)}, ${r(ins.b)}`;
		case Op.DELPROP:
			return `${name} ${r(ins.a)}, ${r(ins.b)}`;
		default:
			return `${name} ${r(ins.a)}, ${r(ins.b)}, ${r(ins.c)}`;
	}
}

/** Renders a module as readable text. */
export function disassemble(m: DecodedModule | ModuleData): string {
	const lines: string[] = [];
	if ('hash' in m) lines.push(`; hash ${m.hash}${m.hashValid ? '' : ' (INVALID)'}`);
	lines.push(`; native ${m.native}`);
	lines.push(`; meta ${m.meta}`);
	lines.push('');
	lines.push('steps:');
	m.steps.forEach((s, i) => {
		const extra = [
			s.nodeType ? `type=${s.nodeType}` : '',
			s.idempotent ? 'idempotent' : '',
			s.retryMax ? `retry=${s.retryMax}/${s.retryDelayMs}ms` : '',
		]
			.filter(Boolean)
			.join(' ');
		lines.push(
			`  ${i}: ${EFFECT_KIND_NAMES[s.kind]} ${JSON.stringify(s.name)} id=${JSON.stringify(s.id)} ${extra}`.trimEnd(),
		);
	});
	lines.push('');
	lines.push('paths:');
	for (const p of m.paths) lines.push(`  ${p}`);
	m.functions.forEach((fn, fi) => {
		lines.push('');
		lines.push(
			`fn${fi} ${fn.name} params=${fn.nparams} regs=${fn.nregs} caps=${fn.ncaps}${fn.async ? ' async' : ''}`,
		);
		for (const t of fn.tries) {
			lines.push(`  try [${t.start}, ${t.end}) -> @${t.handler} catch r${t.catchReg}`);
		}
		fn.code.forEach((ins, pc) => {
			lines.push(`  ${String(pc).padStart(4)}  ${formatInstr(m, ins)}`);
			for (const s of m.suspends) {
				if (s.func !== fi || s.pc !== pc) continue;
				const live = s.live.map((l) => `r${l.reg}=${l.name}: ${l.type}`).join(', ');
				lines.push(
					`        ; resume step=${s.step === null ? 'dynamic' : s.step} live { ${live} }`,
				);
			}
		});
	});
	return lines.join('\n') + '\n';
}
