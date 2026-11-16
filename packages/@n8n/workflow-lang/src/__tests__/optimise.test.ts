/**
 * The bytecode optimiser (`compiler/optimise.ts`): the code gets shorter, the
 * result stays the same, and suspend sites, try regions and jump targets move
 * with their instructions.
 */
import { decodeModule } from '../compiler/decode.ts';
import { compile } from '../compiler/index.ts';
import type { Instr, ModuleData } from '../compiler/module.ts';
import { Op } from '../compiler/opcodes.ts';
import { optimise } from '../compiler/optimise.ts';
import type { Fixture } from '../reference/runner.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';
import { corpusCases } from './helpers.ts';

const source = (body: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook<{ list: number[]; none: null | { p: number } }>({ path: 'x', method: 'POST' })],
	async run(ctx, trigger) {
${body}
	},
});
`;

const fixture: Fixture = {
	trigger: { body: { list: [3, 4, 5], none: null } },
	now: 0,
	seed: 1,
	effects: { Get: [{ status: 200, headers: {}, body: { n: 7 } }] },
};

function build(text: string, optimised: boolean): ModuleData {
	const result = compile(text, { fileName: 'workflow.ts', optimise: optimised });
	expect(result.diagnostics).toEqual([]);
	if (!result.module) throw new Error('no module');
	return decodeModule(result.module);
}

const size = (m: ModuleData) => m.functions.reduce((n, f) => n + f.code.length, 0);

const ins = (op: number, a = 0, b = 0, c = 0, x = 0): Instr => ({ op, x, a, b, c });

const jump = (op: number, a: number, target: number) => ins(op, a, target & 0xffff, target >>> 16);

const names = (code: Instr[]) =>
	code.map((i) => Object.entries(Op).find(([, value]) => value === i.op)?.[0]);

function run(code: Instr[], extra: Partial<Parameters<typeof optimise>[0]> = {}, nparams = 1) {
	return optimise(
		{ code, ranges: code.map((_, pc) => [pc, pc + 1]), tries: [], suspendPcs: [], ...extra },
		{ nparams, nregs: 8, capsOf: () => 0 },
	);
}

describe('bytecode optimiser', () => {
	describe.each(corpusCases())('corpus $name', ({ source: text, fixture: corpusFixture }) => {
		it('gives the same output with fewer instructions', () => {
			const plain = build(text, false);
			const short = build(text, true);
			expect(JSON.stringify(runModule(short, corpusFixture))).toBe(
				JSON.stringify(runModule(plain, corpusFixture)),
			);
			expect(size(short)).toBeLessThanOrEqual(size(plain));
		});

		it('keeps each suspend site, its step and its live registers', () => {
			const plain = build(text, false);
			const short = build(text, true);
			const view = (m: ModuleData) =>
				m.suspends.map((s) => ({
					func: s.func,
					step: s.step,
					op: m.functions[s.func].code[s.pc].op,
					kind: m.functions[s.func].code[s.pc].x,
					live: s.live.filter((r) => !r.name.startsWith('$t')),
				}));
			expect(view(short)).toEqual(view(plain));
		});
	});

	it.each([
		[
			'a variable without a value that a loop declares',
			`const seen: Array<number | null> = [];
for (let i = 0; i < 3; i++) {
	let x: number | undefined;
	seen.push(x === undefined ? null : x);
	x = i;
}
return seen;`,
		],
		[
			'a variable that a try block assigns from an expression that throws',
			`let x = 1;
try {
	x = trigger.body.none!.p;
} catch {
	return x;
}
return -1;`,
		],
		[
			'a variable that changes after a copy of it',
			`let a = 1;
const b = a;
a = 2;
const c = a;
return [a, b, c];`,
		],
		[
			'counters before and after an effect',
			`let n = 0;
const first = n++;
const r = await ctx.http<{ n: number }>({ name: 'Get', method: 'GET', url: 'https://example.com' });
const second = ++n;
for (const v of trigger.body.list) n += v;
return [first, second, n, r.body.n];`,
		],
		[
			'a counter that holds a string',
			`let s: any = '5';
s++;
let t: any = '1';
for (let i = 0; i < 2; i++) t = t + 1;
t++;
return [s, t];`,
		],
		[
			'branches that continue and break',
			`const out: number[] = [];
for (const v of trigger.body.list) {
	if (v === 3) continue;
	if (v === 5) break;
	out.push(v);
}
return out;`,
		],
	])('%s gives what JavaScript gives', async (_name, body) => {
		const text = source(body);
		const expected = await runReference(text, fixture);
		const short = build(text, true);
		expect(JSON.stringify(runModule(short, fixture))).toBe(JSON.stringify(expected));
		expect(size(short)).toBeLessThan(size(build(text, false)));
	});

	it('keeps a variable live at a suspend when a handler reads it after a write that throws', () => {
		const text = source(`const none = trigger.body.none;
let x = 1;
await ctx.http({ name: 'Get', method: 'GET', url: 'https://example.com' });
try {
	x = none!.p;
} catch {
	return x;
}
return -1;`);
		const short = build(text, true);
		const [tryEntry] = short.functions[0].tries;
		const first = short.functions[0].code[tryEntry.start];
		const x = short.suspends[0].live.find((r) => r.name === 'x');
		expect(first.op).toBe(Op.GETPROP);
		expect(first.a).toBe(x?.reg);
		expect(JSON.stringify(runModule(short, fixture))).toBe(
			JSON.stringify(runModule(build(text, false), fixture)),
		);
	});

	it('removes the first LOADUNDEF of a register and keeps the one that a loop needs', () => {
		const out = run([
			ins(Op.LOADUNDEF, 1),
			ins(Op.LOADUNDEF, 2),
			ins(Op.PUSH, 0, 2),
			ins(Op.GETPROP, 2, 0, 0),
			jump(Op.JT, 0, 1),
			ins(Op.RET, 1),
		]);
		expect(names(out.code)).toEqual(['LOADUNDEF', 'PUSH', 'GETPROP', 'JT', 'RET']);
		expect(out.code[0].a).toBe(2);
		expect(out.code[3].b).toBe(0);
	});

	it('keeps a LOADUNDEF of a parameter and one after a call', () => {
		const out = run([
			ins(Op.LOADUNDEF, 0),
			ins(Op.CALL, 3, 0, 4, 0),
			ins(Op.LOADUNDEF, 2),
			ins(Op.PUSH, 3, 2),
			ins(Op.RET, 0),
		]);
		expect(names(out.code)).toEqual(['LOADUNDEF', 'CALL', 'LOADUNDEF', 'PUSH', 'RET']);
	});

	it('reads the source of a copy and removes the copy', () => {
		const out = run([
			ins(Op.MOV, 1, 0),
			ins(Op.MOV, 2, 1),
			ins(Op.GETPROP, 3, 2, 0),
			ins(Op.RET, 3),
		]);
		expect(names(out.code)).toEqual(['GETPROP', 'RET']);
		expect(out.code[0].b).toBe(0);
	});

	it('keeps a copy into a register window', () => {
		const out = run([
			ins(Op.MOV, 4, 0),
			ins(Op.MOV, 5, 0),
			ins(Op.CALLM, 1, 0, 4, 1),
			ins(Op.RET, 1),
		]);
		expect(names(out.code)).toEqual(['MOV', 'MOV', 'CALLM', 'RET']);
	});

	it('writes a result into the register that the next MOV names', () => {
		const out = run([ins(Op.GETPROP, 3, 0, 0), ins(Op.MOV, 1, 3), ins(Op.RET, 1)]);
		expect(names(out.code)).toEqual(['GETPROP', 'RET']);
		expect(out.code[0].a).toBe(1);
	});

	it('does not join a MOV that a jump goes to with the instruction before it', () => {
		const out = run([
			jump(Op.JF, 0, 3),
			ins(Op.GETPROP, 3, 0, 0),
			jump(Op.JMP, 0, 4),
			ins(Op.GETPROP, 3, 0, 1),
			ins(Op.MOV, 1, 3),
			ins(Op.SETPROP, 0, 0, 1),
			ins(Op.SETPROP, 0, 1, 3),
			ins(Op.RET, 1),
		]);
		expect(names(out.code)).toEqual([
			'JF',
			'GETPROP',
			'JMP',
			'GETPROP',
			'SETPROP',
			'SETPROP',
			'RET',
		]);
		expect(out.code.map((i) => [i.a, i.c])).toEqual([
			[0, 0],
			[3, 0],
			[0, 0],
			[3, 1],
			[0, 3],
			[0, 3],
			[3, 0],
		]);
	});

	it('removes a jump to the next instruction, follows a chain and inverts a branch', () => {
		const out = run([
			jump(Op.JF, 0, 2),
			jump(Op.JMP, 0, 4),
			jump(Op.JMP, 0, 3),
			ins(Op.PUSH, 0, 0),
			jump(Op.JMP, 0, 5),
			ins(Op.RET, 0),
		]);
		expect(names(out.code)).toEqual(['JT', 'PUSH', 'RET']);
		expect(out.code[0].b).toBe(2);
	});

	it('keeps TONUM of a value that can be a string and removes TONUM of a number', () => {
		const out = run([
			ins(Op.LOADI, 1, 0),
			ins(Op.TONUM, 2, 1),
			ins(Op.TONUM, 3, 0),
			ins(Op.ADD, 4, 2, 3),
			ins(Op.RET, 4),
		]);
		expect(names(out.code)).toEqual(['LOADI', 'TONUM', 'ADD', 'RET']);
		expect(out.code[1].b).toBe(0);
		expect(out.code[2].b).toBe(1);
	});

	it('does not change a suspend and moves its site, the try region and the handler', () => {
		const suspend = ins(Op.SUSPEND, 3, 2, 1, 1);
		const code = [
			ins(Op.LOADUNDEF, 5),
			ins(Op.MOV, 1, 0),
			ins(Op.LOADI, 4, 0),
			ins(Op.MOV, 2, 4),
			suspend,
			ins(Op.MOV, 6, 1),
			ins(Op.GETPROP, 7, 6, 0),
			ins(Op.RET, 7),
			ins(Op.LOADUNDEF, 6),
			ins(Op.RET, 5),
		];
		const out = run(code, {
			tries: [{ start: 3, end: 8, handler: 8, catchReg: 5 }],
			suspendPcs: [4],
		});
		expect(names(out.code)).toEqual(['MOV', 'LOADI', 'SUSPEND', 'GETPROP', 'RET', 'RET']);
		expect(out.code[2]).toEqual({ op: Op.SUSPEND, x: 1, a: 3, b: 2, c: 1 });
		expect(out.code[3].b).toBe(1);
		expect(out.suspendPcs).toEqual([2]);
		expect(out.tries).toEqual([{ start: 2, end: 5, handler: 5, catchReg: 5 }]);
		expect(out.ranges).toEqual([
			[1, 2],
			[2, 3],
			[4, 5],
			[6, 7],
			[7, 8],
			[9, 10],
		]);
	});

	it('keeps a value that a handler reads when the instruction in the try region throws', () => {
		const out = run(
			[
				ins(Op.LOADI, 1, 1),
				ins(Op.GETPROP, 2, 0, 0),
				ins(Op.MOV, 1, 2),
				ins(Op.RET, 1),
				ins(Op.RET, 1),
			],
			{ tries: [{ start: 1, end: 3, handler: 4, catchReg: 3 }] },
		);
		expect(names(out.code)).toEqual(['LOADI', 'GETPROP', 'RET', 'RET']);
		expect(out.code[1].a).toBe(1);
	});
});
