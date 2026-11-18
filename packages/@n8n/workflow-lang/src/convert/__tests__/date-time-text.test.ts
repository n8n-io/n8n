/**
 * Date & Time version 2 with a date that is text or a number (`parseDate` of v1), against
 * v1. Each case runs the workflow in n8n's engine and the converted workflow on the
 * reference runner. The rule for each value: the converted workflow gives the items or the
 * error of v1, or it hands the node over to the fallback host (a step of the host form).
 * The values come from a fixed list and from a generator with a fixed seed.
 */
import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import { jsonCopy, runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { convertWorkflow } from '../index.ts';
import { setTargetNode, targetNode } from '../node-identity.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

// moment.js reads text without an offset as local time of the n8n process.
process.env.TZ = 'UTC';

const HOST_STEP = 'D (fallback host)';

function workflow(
	parameters: Record<string, unknown>,
	settings: Record<string, unknown> = {},
	node: Record<string, unknown> = {},
) {
	return {
		name: 'Date and time',
		settings,
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'D',
				type: 'n8n-nodes-base.dateTime',
				typeVersion: 2,
				position: [200, 0],
				parameters,
				...node,
			},
		],
		connections: { T: { main: [[{ node: 'D', type: 'main', index: 0 }]] } },
	};
}

/** Dates in the forms that moment.js, `new Date` and the number rule of v1 read. */
const DATES: unknown[] = [
	'2024-03-09T07:05:00.000Z',
	'2024-03-09T07:05:00Z',
	'2024-03-09T07:05:00.5Z',
	'2024-03-09T07:05:00.123456789Z',
	'2024-03-09T07:05:00,250Z',
	'2024-03-09T07:05:00+05:30',
	'2024-03-09T07:05:00+0530',
	'2024-03-09T07:05:00+05',
	'2024-03-09T07:05:00+14:00',
	'2024-03-09T07:05:00+15:00',
	'2024-03-09T07:05:00+00:00',
	'2024-03-09T07:05:00-05:00',
	'2024-03-09T07:05:00-0800',
	'2024-03-09T07:05:00.000+01:00',
	'2024-03-09T07:05',
	'2024-03-09T07',
	'2024-03-09 07:05:00',
	'2024-03-09 07:05:00.123',
	'2024-03-09 07:05:00 +02:00',
	'2024-03-09',
	'2024-03',
	'2024-3-9',
	'2024-02-29',
	'2023-02-29',
	'2024-13-01',
	'2024-00-10',
	'2024-04-31',
	'2024-03-09T24:00:00',
	'2024-03-09T24:00:01',
	'2024-03-09T25:00:00',
	'2024-03-09t07:05:00z',
	'20240309T070500Z',
	'20240309T0705',
	'20240309',
	'2024-W10-6',
	'2024W106',
	'2024-069',
	'2024-11-03T01:30:00',
	'2024-03-10T02:30:00',
	'2024-03-31T02:30:00',
	'2024-10-27T02:30:00',
	'1969-12-31T23:59:59Z',
	'1900-01-01T00:00:00Z',
	'1850-06-15T12:00:00Z',
	'1600-02-29',
	'0100-01-01',
	'0001-01-01T00:00:00Z',
	'9999-12-31T23:59:59Z',
	'+010000-01-01T00:00:00Z',
	'-000001-01-01T00:00:00Z',
	' 2024-03-09T07:05:00Z',
	'2024-03-09T07:05:00Z ',
	'2024-03-09T07:05:00 Z',
	'2024-03-09T07:05:00+',
	'2024-03-09T07:05:00+5',
	'2024-03-09T07:05:00+ab',
	'2024-03-09T07:05:00+-5',
	'a+b',
	'a+1',
	'+',
	'1+1',
	'Sat, 09 Mar 2024 07:05:00 GMT',
	'Sat, 09 Mar 2024 07:05:00 +0100',
	'09 Mar 2024 07:05:00 +0100',
	'March 9, 2024',
	'Mar 9, 2024',
	'Mar 9, 2024 07:05',
	'9 March 2024',
	'03/09/2024',
	'3/9/2024',
	'09/03/2024 07:05',
	'2024/03/09',
	'2024/03/09 07:05:00',
	'2024.03.09',
	'09.03.2024',
	'09-03-2024',
	'Saturday',
	'tomorrow',
	'now',
	'garbage',
	'abc 5',
	'',
	' ',
	'\t',
	'0',
	'-0',
	'1',
	'-1',
	'2024',
	'20240',
	'1e3',
	'1E3',
	'0x10',
	'0b11',
	'.5',
	'5.',
	'+5',
	'Infinity',
	'-Infinity',
	'NaN',
	'1700000000',
	'-1700000000',
	'1700000000.5',
	'1700000000.123',
	'1700000000.1234',
	'99999999999',
	'100000000000',
	'1700000000000',
	'-1700000000000',
	'1700000000000.5',
	'100000000000000',
	'1000000000000000',
	'99999999999999999999',
	'1.5',
	0,
	-0,
	1,
	1.5,
	0.1234,
	1700000000,
	-1700000000,
	1700000000.5,
	1700000000.1234,
	99999999999,
	100000000000,
	1700000000000,
	1700000000123.4,
	253402300799,
	253402300800,
	-62135596800,
	1e14,
	1e15,
	1e21,
	true,
	false,
	null,
	{},
	{ year: 2024 },
	[],
	[2024, 2, 9],
	['2024-03-09'],
];

/** A generator with a fixed seed (mulberry32). */
function random(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Dates of random parts in random ISO forms, some with a change of one character. */
function generated(count: number, seed: number): unknown[] {
	const next = random(seed);
	const int = (from: number, to: number) => from + Math.floor(next() * (to - from + 1));
	const pick = <T>(list: T[]): T => list[int(0, list.length - 1)];
	const pad = (n: number, width = 2) => String(n).padStart(width, '0');
	const out: unknown[] = [];
	for (let k = 0; k < count; k++) {
		const year = pick([int(1971, 2037), int(1971, 2037), int(1900, 2100), int(1, 9999)]);
		const date = `${pad(year, 4)}-${pad(int(1, 12))}-${pad(int(1, pick([28, 28, 31])))}`;
		const time = `${pad(int(0, 23))}:${pad(int(0, 59))}`;
		const seconds = pick(['', `:${pad(int(0, 59))}`, `:${pad(int(0, 59))}.${int(0, 999)}`]);
		const zone = pick([
			'',
			'Z',
			`+${pad(int(0, 14))}:${pick(['00', '30', '45'])}`,
			`-${pad(int(0, 12))}:${pick(['00', '30'])}`,
			`+${pad(int(0, 14))}${pick(['00', '30'])}`,
			`+${pad(int(0, 15))}`,
		]);
		let text = pick([
			date,
			`${date}${pick(['T', ' '])}${time}${seconds}${zone}`,
			`${date}T${time}${seconds}${zone}`,
			`${date.replace(/-/g, '')}T${time.replace(':', '')}${zone}`,
		]);
		if (next() < 0.15) {
			const at = int(0, text.length - 1);
			text = text.slice(0, at) + pick(['+', ' ', 'x', '9', '-', ':', 'T']) + text.slice(at + 1);
		}
		out.push(text);
		if (next() < 0.2) out.push(int(-2_000_000_000, 4_000_000_000));
		if (next() < 0.1) out.push(int(-2_000_000_000_000, 4_000_000_000_000) / pick([1, 1000, 7]));
	}
	return out;
}

interface Outcome {
	host: boolean;
	equal: boolean;
	v1: unknown;
	mine: unknown;
}

/** Runs one item on v1 and on the converted workflow. */
async function outcome(
	wf: ReturnType<typeof workflow>,
	source: string,
	item: Record<string, unknown>,
): Promise<Outcome> {
	const v1 = await runOracle(wf, { start: 'T', item, mode: 'trigger', timeoutMs: 20_000 });
	const out = await runReference(source, {
		trigger: { body: item },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	if (out.effects.some((effect) => effect.step === HOST_STEP)) {
		return { host: true, equal: true, v1: null, mine: null };
	}
	const theirs = v1.error === null ? { items: v1.nodes.D?.[0] } : { error: v1.error };
	// The trace of a node that fails holds its error.
	const traced = (out.trace ?? []).find((t) => t.step === 'D')?.items as
		| { $error?: { message?: string } }
		| undefined;
	const mine =
		out.status === 'ok' ? { items: traced } : { error: traced?.$error?.message ?? out.status };
	let equal = true;
	try {
		// The saved run data is JSON: `-0` is `0` in it.
		expect(jsonCopy(mine)).toEqual(jsonCopy(theirs));
	} catch {
		equal = false;
	}
	return { host: false, equal, v1: theirs, mine };
}

function converted(wf: ReturnType<typeof workflow>): string {
	const out = convertWorkflow(wf, { trace: 'all' });
	expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(out.fallbackNodes).toEqual([]);
	expect(out.source).toContain('fileLimitInHost(error)');
	return out.source;
}

const BERLIN = { timezone: 'Europe/Berlin' };

const CONFIGS: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
	[
		'format, without a zone',
		{
			operation: 'formatDate',
			date: '={{ $json.date }}',
			format: 'custom',
			customFormat: "yyyy-MM-dd'T'HH:mm:ss.SSS ZZ",
		},
		{},
	],
	['format, the default format', { operation: 'formatDate', date: '={{ $json.date }}' }, {}],
	[
		'format, in the workflow zone',
		{
			operation: 'formatDate',
			date: '={{ $json.date }}',
			format: 'custom',
			customFormat: 'yyyy-MM-dd HH:mm:ss ZZ z',
			options: { timezone: true },
		},
		{},
	],
	[
		'format, in the zone of Berlin, with input fields',
		{
			operation: 'formatDate',
			date: "={{ $('T').item.json.date }}",
			format: 'custom',
			customFormat: 'DDDD t, W o q',
			outputFieldName: 'when',
			options: { timezone: true, includeInputFields: true },
		},
		BERLIN,
	],
	['add days', { operation: 'addToDate', magnitude: '={{ $json.date }}', duration: 1 }, BERLIN],
	[
		'add months',
		{ operation: 'addToDate', magnitude: '={{ $json["date"] }}', timeUnit: 'months', duration: 1 },
		{},
	],
	[
		'subtract hours',
		{
			operation: 'subtractFromDate',
			magnitude: '={{ $json.date }}',
			timeUnit: 'hours',
			duration: 30,
		},
		BERLIN,
	],
	[
		'subtract with the defaults, in UTC',
		{ operation: 'subtractFromDate', magnitude: '={{ $json.date }}' },
		{ timezone: 'UTC' },
	],
	[
		'round down to the week',
		{ operation: 'roundDate', date: '={{ $json.date }}', toNearest: 'week' },
		BERLIN,
	],
	['round down with the defaults', { operation: 'roundDate', date: '={{ $json.date }}' }, {}],
	[
		'round up to the month',
		{ operation: 'roundDate', date: '={{ $json.date }}', mode: 'roundUp' },
		BERLIN,
	],
	[
		'extract the hour',
		{ operation: 'extractDate', date: '={{ $json.date }}', part: 'hour' },
		BERLIN,
	],
	['extract with the defaults', { operation: 'extractDate', date: '={{ $json.date }}' }, {}],
];

describe('Date & Time with a date that is text or a number', () => {
	it.each(CONFIGS)(
		'gives the result of v1 or hands over to the host: %s',
		async (_name, parameters, settings) => {
			const wf = workflow(parameters, settings);
			const source = converted(wf);
			const values = [...DATES, ...generated(120, 7)];
			const wrong: unknown[] = [];
			let host = 0;
			for (const date of values) {
				const result = await outcome(wf, source, { date, n: 2 });
				if (result.host) host++;
				else if (!result.equal) wrong.push({ date, v1: result.v1, mine: result.mine });
			}
			expect(wrong).toEqual([]);
			// The common forms have a compiled form: the host gets a small part of the values.
			expect(host).toBeLessThan(values.length * 0.35);
		},
		240_000,
	);

	it.each([
		'2024-03-09T07:05:00.000Z',
		'2024-03-09T07:05:00+05:30',
		'2024-03-09T07:05:00-05:00',
		'2024-03-09 07:05:00',
		'2024-03-09',
		'March 9, 2024',
		'03/09/2024',
		'1700000000',
		1700000000000,
	])('has a compiled form for %j', async (date) => {
		for (const [, parameters, settings] of CONFIGS) {
			const wf = workflow(parameters, settings);
			const result = await outcome(wf, converted(wf), { date });
			expect(result).toMatchObject({ host: false, equal: true });
		}
	});

	it.each(CONFIGS)(
		'runs in bytecode as on the reference runner: %s',
		async (_name, parameters, settings) => {
			const source = converted(workflow(parameters, settings));
			const compiled = compile(source);
			expect(compiled.diagnostics).toEqual([]);
			if (!compiled.module) throw new Error('no module');
			const module = decodeModule(compiled.module);
			for (const date of DATES) {
				const fixture = {
					trigger: { body: { date, n: 2 } },
					now: 0,
					seed: 1,
					effects: {},
					trace: true,
				};
				const reference = await runReference(source, fixture);
				const bytecode = runModule(module, fixture);
				expect({
					date,
					status: bytecode.status,
					trace: bytecode.trace,
					steps: bytecode.effects.map((effect) => effect.step),
				}).toEqual({
					date,
					status: reference.status,
					trace: reference.trace,
					steps: reference.effects.map((effect) => effect.step),
				});
			}
		},
		240_000,
	);

	it('reads an amount that an expression gives, as Luxon does', async () => {
		const wf = workflow(
			{
				operation: 'addToDate',
				magnitude: '={{ $json.date }}',
				timeUnit: 'days',
				duration: '={{ $json.n }}',
			},
			BERLIN,
		);
		const source = converted(wf);
		const wrong: unknown[] = [];
		const amounts = [
			2,
			-3,
			0,
			1.5,
			'4',
			' 4 ',
			'1e1',
			'',
			' ',
			'x',
			null,
			true,
			false,
			{},
			[],
			[1],
		];
		let host = 0;
		for (const n of [...amounts, undefined]) {
			const item =
				n === undefined ? { date: '2024-03-30T10:00:00Z' } : { date: '2024-03-30T10:00:00Z', n };
			const result = await outcome(wf, source, item);
			if (result.host) host++;
			else if (!result.equal) wrong.push({ n, v1: result.v1, mine: result.mine });
		}
		expect(wrong).toEqual([]);
		expect(host).toBeLessThan(amounts.length);
	});

	it.each([
		[
			'fixed text',
			{ operation: 'formatDate', date: '2024-03-09T07:05:00+02:00', format: 'yyyy/MM/dd' },
		],
		['a fixed number', { operation: 'addToDate', magnitude: 1700000000, duration: 1 }],
		[
			'a text template',
			{ operation: 'roundDate', date: '=2024-0{{ $json.n }}-15T10:00:00Z', toNearest: 'day' },
		],
		[
			'a value of a list',
			{ operation: 'extractDate', date: '={{ $json.list[1].when }}', part: 'year' },
		],
		[
			'a field with the name of a member of each list',
			{ operation: 'extractDate', date: '={{ $json.values }}', part: 'year' },
		],
	])('has a compiled form for a date that is %s', async (_name, parameters) => {
		const wf = workflow(parameters);
		const item = { n: 2, list: [{}, { when: '2031-05-06' }], values: '2031-05-06' };
		expect(await outcome(wf, converted(wf), item)).toMatchObject({ host: false, equal: true });
	});

	it.each([
		['a method of the value', { operation: 'formatDate', date: '={{ $json.date.toDateTime() }}' }],
		['a Date', { operation: 'formatDate', date: '={{ new Date($json.date) }}' }],
		['another operator', { operation: 'formatDate', date: '={{ $json.date || $now }}' }],
		['an inherited member', { operation: 'formatDate', date: '={{ $json.constructor }}' }],
		['a member of each list', { operation: 'formatDate', date: '={{ $json.list.at }}' }],
		['a computed key', { operation: 'formatDate', date: '={{ $json[$json.key] }}' }],
		[
			'a format of the text',
			{ operation: 'formatDate', date: '={{ $json.date }}', options: { fromFormat: 'dd/MM/yyyy' } },
		],
		[
			'a format that names the zone',
			{
				operation: 'formatDate',
				date: '={{ $json.date }}',
				format: 'custom',
				customFormat: 'yyyy z',
			},
		],
		[
			'a format from an expression',
			{
				operation: 'formatDate',
				date: '={{ $json.date }}',
				format: 'custom',
				customFormat: '={{ $json.f }}',
			},
		],
		['the week of a date', { operation: 'extractDate', date: '={{ $json.date }}', part: 'week' }],
		[
			'the time between dates',
			{
				operation: 'getTimeBetweenDates',
				startDate: '={{ $json.date }}',
				endDate: '={{ $json.date }}',
			},
		],
	])('leaves the node to the node compiler or the host: %s', (_name, parameters) => {
		const out = convertWorkflow(workflow(parameters));
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual(['D']);
		expect(out.source).not.toContain('dateTimeOfValue');
	});

	it('leaves the node to the host under "continue on fail"', () => {
		const out = convertWorkflow(
			workflow(
				{ operation: 'formatDate', date: '={{ $json.date }}' },
				{},
				{ onError: 'continueRegularOutput' },
			),
		);
		expect(out.fallbackNodes).toEqual(['D']);
	});

	describe('when local time of n8n is not UTC', () => {
		beforeAll(() => setTargetNode({ ...targetNode(), zone: 'Europe/Berlin' }));
		afterAll(() => setTargetNode(undefined));

		it('hands text without an offset over to the host, and reads text with an offset', async () => {
			const wf = workflow(
				{ operation: 'addToDate', magnitude: '={{ $json.date }}', duration: 1 },
				BERLIN,
			);
			const source = converted(wf);
			for (const date of ['2024-03-09', '2024-03-09 07:05:00', 'March 9, 2024', '03/09/2024']) {
				expect(await outcome(wf, source, { date })).toMatchObject({ host: true });
			}
			for (const date of ['2024-03-09T07:05:00Z', '2024-03-09T07:05:00+05:30', '1700000000', 5]) {
				expect(await outcome(wf, source, { date })).toMatchObject({ host: false, equal: true });
			}
		});
	});
});
