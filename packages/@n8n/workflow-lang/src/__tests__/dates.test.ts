import { compile } from '../compiler/index.ts';
import { decodeModule, disassemble } from '../compiler/decode.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const wrap = (body: string, top = '') => `import { webhook, workflow } from '@n8n/workflow-lang';
${top}
export default workflow({
	triggers: [webhook<{ ms: number; s: string; o: { d: Date }; list: number[] }>({ path: 'p' })],
	async run(ctx, trigger) {
${body}
	},
});
`;

function diagnostics(source: string): string[] {
	return compile(source).diagnostics.map((d) => `${d.code} ${d.message}`);
}

async function both(body: string, top = '') {
	const source = wrap(body, top);
	const result = compile(source);
	expect(result.diagnostics).toEqual([]);
	const fixture = {
		trigger: { body: { ms: 1_700_000_000_123, s: '2024-02-29T12:00:00Z', list: [0, 1] } },
		now: 1_794_441_600_000,
		seed: 1,
		effects: { Send: [{ status: 200 }] },
	};
	const compiled = runModule(decodeModule(result.module ?? new Uint8Array()), fixture);
	const reference = await runReference(source, fixture);
	expect(compiled).toEqual(reference);
	return { output: reference, text: disassemble(decodeModule(result.module ?? new Uint8Array())) };
}

describe('Date lowering', () => {
	it('lowers new Date() and Date.now() to the batch clock', async () => {
		const { output, text } = await both('return [new Date().getTime(), Date.now()];');
		expect(output.result).toEqual([1_794_441_600_000, 1_794_441_600_000]);
		expect(text).toContain('NOW');
		expect(text).not.toContain('Date.now');
	});

	it('lowers methods to library calls with the receiver first', async () => {
		const { output, text } = await both(
			'const d = new Date(trigger.body.s);\nreturn [d.getUTCDay(), d.toISOString(), Date.UTC(2000, 1, 29), Date.parse("2000")];',
		);
		expect(output.result).toEqual([4, '2024-02-29T12:00:00.000Z', 951782400000, 946684800000]);
		expect(text).toContain('Date.prototype.getUTCDay');
		expect(text).toContain('Date.fromValue');
	});

	it('converts a Date in JSON places with toJSON and in string places with toString', async () => {
		const { output, text } = await both(
			`const d = new Date(0);
const bad = new Date('x');
await ctx.http({ name: 'Send', method: 'POST', url: 'https://x', body: { d, list: [d, bad] } });
return { d, t: \`\${d}\`, p: 'at ' + d, s: String(d), j: JSON.stringify({ bad }), n: Number(d) };`,
		);
		expect(output.effects[0].args).toMatchObject({
			body: { d: '1970-01-01T00:00:00.000Z', list: ['1970-01-01T00:00:00.000Z', null] },
		});
		expect(output.result).toMatchObject({
			d: '1970-01-01T00:00:00.000Z',
			t: 'Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)',
			j: '{"bad":null}',
			n: 0,
		});
		expect(text).toContain('Date.json');
		expect(text).toContain('Date.text');
	});

	it('stores the result of a setter in the variable, also through a closure', async () => {
		const { output } = await both(
			`const d = new Date(trigger.body.ms);
const read = () => d.getUTCDate();
const r = d.setUTCDate(1);
const before = read();
d.setUTCHours(0, 0, 0, 0);
return [r, before, d.getTime(), read()];`,
		);
		expect(output.result).toEqual([1698876800123, 1, 1698796800000, 1]);
	});

	it('keeps a Date a number through local functions', async () => {
		const { output } = await both(
			`function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400000); }
const maybe: Date | undefined = trigger.body.list.length > 5 ? new Date(0) : undefined;
return { next: addDays(new Date(0), 2).toISOString(), maybe: maybe?.getTime(), text: \`\${maybe}\`, before: new Date(0) < new Date(1) };`,
		);
		expect(output.result).toEqual({
			next: '1970-01-03T00:00:00.000Z',
			text: 'undefined',
			before: true,
		});
	});

	it('throws RangeError from toISOString on an invalid date', async () => {
		const { output } = await both("return new Date('nope').toISOString();");
		expect(output).toMatchObject({
			status: 'error',
			result: { name: 'RangeError', message: 'Invalid time value' },
		});
	});
});

describe('Date rejections (WL013)', () => {
	it.each([
		['identity comparison', 'const d = new Date();\nreturn d === new Date();', 'identity'],
		['condition', 'const d = new Date();\nif (d) return 1;\nreturn 0;', 'condition'],
		['negation', 'const d = new Date();\nreturn !d;', 'condition'],
		['typeof', 'const d = new Date();\nreturn typeof d;', 'typeof'],
		['property read', 'return trigger.body.o.d.getTime();', 'object or array'],
		['element read', 'const ds = [new Date()];\nreturn ds[0].getTime();', 'object or array'],
		['callback parameter', 'const ds = [new Date()];\nreturn ds.map((d) => d.getTime());', 'array'],
		['for...of', 'for (const d of [new Date()]) return d.getTime();\nreturn 0;', 'array'],
		[
			'locale options',
			"return new Date().toLocaleDateString('en-US', { weekday: 'long' });",
			'en-US',
		],
		['other locale', "return new Date().toLocaleString('de-DE');", 'en-US'],
		[
			'alias of a changed Date',
			'const d = new Date();\nconst e = d;\nd.setHours(1);\nreturn e;',
			'copied',
		],
		[
			'store of a changed Date',
			'const d = new Date();\nconst o = { d };\nd.setHours(1);\nreturn o;',
			'stored',
		],
		[
			'setter on a parameter',
			'function f(d: Date) { return d.setHours(1); }\nreturn f(new Date());',
			'local variable',
		],
		[
			'setter on a copy',
			'const a = new Date();\nconst d = a;\nd.setHours(1);\nreturn 1;',
			'new Date',
		],
		['Date as a value', 'const D = Date;\nreturn 1;', '`Date` can only'],
		['Date in Object.keys', 'return Object.keys(new Date());', 'Object.keys'],
		['any as a Date', "const d: Date = JSON.parse('1');\nreturn d.getTime();", 'type any'],
		['method without a call', 'const d = new Date();\nreturn d.getTime;', 'only be called'],
		['join of Dates', 'return [new Date()].join();', 'ISO strings'],
		[
			'reduce accumulator',
			'return trigger.body.list.reduce((a, x) => new Date(x), new Date());',
			'reduce',
		],
		[
			'Date or string',
			"const d = trigger.body.ms > 0 ? new Date() : 'x';\nreturn d;",
			'another type',
		],
		['switch', 'const d = new Date();\nswitch (d) { default: return 1; }', 'switch'],
	])('rejects %s', (_name, body, text) => {
		const found = diagnostics(wrap(body)).filter((d) => d.startsWith('WL013'));
		expect(found.length).toBeGreaterThan(0);
		expect(found.join('\n')).toContain(text);
	});

	it('allows Date methods, statics and escapes', () => {
		expect(
			diagnostics(
				wrap(
					`const d = new Date(trigger.body.s);
d.setUTCDate(1);
return { d, s: \`\${d}\`, n: Date.UTC(2020, 0), p: Date.parse('2020'), l: d.toLocaleString('en-US') };`,
				),
			),
		).toEqual([]);
	});
});
