import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { zoneOffset } from '../../reference/zone-lib.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';
import { bindMoment, MOMENT_HELPERS, momentFormatParts, momentZones } from '../moment.ts';

process.env.TZ = 'UTC';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
type Moment = (...args: unknown[]) => unknown;
interface MomentZone {
	untils: number[];
}
const moment: Moment & {
	tz: Moment & { zone(name: string): MomentZone; names(): string[] };
	utc: Moment;
} = createRequire(join(nodesBase, 'package.json'))('moment-timezone');

const offsets = new Map<string, number>();
Object.defineProperty(Date, 'zoneOffset', {
	configurable: true,
	value: (zone: string, t: number) => {
		const key = `${zone}|${Math.floor(t / 60000)}`;
		let found = offsets.get(key);
		if (found === undefined) {
			found = zoneOffset(zone, t);
			if (offsets.size > 200_000) offsets.clear();
			offsets.set(key, found);
		}
		return found;
	},
});

const printer = ts.createPrinter();
const LIMIT = 'has no compiled form';
const helpers = ts.transpileModule(Object.values(MOMENT_HELPERS).join('\n'), {
	compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function compileExpression(expression: string): string | { error: string } {
	const sf = ts.createSourceFile('e.ts', `(${expression});`, ts.ScriptTarget.ES2022, true);
	const errors: string[] = [];
	const visit = (node: ts.Node): ts.Node => {
		if (ts.isCallExpression(node)) {
			const bound = bindMoment(node, {
				isMoment: (name) => name.text === 'moment',
				visit: (e) => ts.visitNode(e, visit) as ts.Expression,
				helper: (name, ...args) =>
					ts.factory.createCallExpression(ts.factory.createIdentifier(name), undefined, args),
				error: (message) => errors.push(message),
			});
			if (bound) return bound;
		}
		return ts.visitEachChild(node, visit, undefined);
	};
	const out = ts.visitNode(sf.statements[0], visit) as ts.Node;
	if (errors.length > 0) return { error: errors[0] };
	return printer.printNode(ts.EmitHint.Unspecified, out, sf);
}

type Run = (...args: unknown[]) => unknown;

function evaluate(names: string[], body: string): Run {
	const compiled: unknown = compileFunction(body, names);
	if (typeof compiled !== 'function') throw new Error('the code is not a function');
	return (...args) => Reflect.apply(compiled, undefined, args);
}
const compiledRuns = new Map<string, Run | { error: string }>();
const realRuns = new Map<string, Run>();

function compiledRun(expression: string): Run | { error: string } {
	let run = compiledRuns.get(expression);
	if (run === undefined) {
		const code = compileExpression(expression);
		run = typeof code === 'string' ? evaluate(['x', 'y'], `${helpers}\nreturn ${code};`) : code;
		compiledRuns.set(expression, run);
	}
	return run;
}

function realRun(expression: string): Run {
	let run = realRuns.get(expression);
	if (run === undefined) {
		const real = evaluate(['moment', 'x', 'y'], `return (${expression});`);
		run = (x, y) => real(moment, x, y);
		realRuns.set(expression, run);
	}
	return run;
}

function outcome(run: () => unknown): string {
	try {
		const value = run();
		return typeof value === 'number' ? `number ${String(value)}` : JSON.stringify(value);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return message.endsWith(LIMIT) ? LIMIT : `throws ${message}`;
	}
}

function compare(expression: string, x: unknown, y?: unknown): string {
	const run = compiledRun(expression);
	if (typeof run !== 'function') return `no compiled form: ${run.error}`;
	const mine = outcome(() => run(x, y));
	if (mine === LIMIT) return 'limit';
	const theirs = outcome(() => realRun(expression)(x, y));
	return mine === theirs ? 'equal' : `${expression} of ${JSON.stringify(x)}: ${mine} / ${theirs}`;
}

const ZONES = [
	'America/New_York',
	'Europe/London',
	'Europe/Berlin',
	'Asia/Kolkata',
	'Australia/Lord_Howe',
	'Pacific/Apia',
	'America/St_Johns',
	'Asia/Kathmandu',
	'Pacific/Chatham',
	'America/Sao_Paulo',
	'Africa/Cairo',
	'Asia/Tehran',
	'Pacific/Kiritimati',
	'UTC',
];

const SHAPES = (zone: string) => {
	const z = JSON.stringify(zone);
	return [
		'moment(x).format()',
		"moment(x).format('YYYY-MM-DD')",
		"moment(x).format('YYYY-MM-DDTHH:mm:ss')",
		"moment(x).format('MM-DD-YYYY')",
		"moment(x).format('LT')",
		"moment(x).format('dddd, MMMM Do YYYY, h:mm:ss a [at] Q/YY M D d dd ddd H h hh m s S SS SSS A ZZ X x')",
		'moment(x).unix()',
		'moment(x).valueOf()',
		'moment(x).toISOString()',
		'moment(x).isValid()',
		'moment(x).utc().format()',
		"moment(x).utc().format('YYYY-MM-DD HH:mm:ss')",
		'moment.utc(x).format()',
		`moment.tz(x, ${z}).format()`,
		`moment.tz(x, ${z}).utc().format()`,
		`moment.tz(x, ${z}).unix()`,
		`moment.tz(x, ${z}).valueOf()`,
		`moment.tz(x, ${z}).toISOString()`,
		`moment.tz(x, ${z}).format('YYYY-MM-DD HH:mm:ss.SSS Z')`,
		`moment.tz(x, ${z}).format('HH:mm')`,
		`moment(x).tz(${z}).format()`,
		`moment(x).tz(${z}).format('YYYY-MM-D HH:mm:ss')`,
		`moment.utc(x).tz(${z}).format()`,
		`moment.tz(x, ${z}).startOf('day').format()`,
		`moment.tz(x, ${z}).endOf('day').format()`,
		`moment.tz(x, ${z}).startOf('month').valueOf()`,
		`moment.tz(x, ${z}).endOf('year').valueOf()`,
		`moment.tz(x, ${z}).startOf('hour').valueOf()`,
		`moment.tz(x, ${z}).endOf('minute').valueOf()`,
		`moment.tz(x, ${z}).add(1, 'days').format()`,
		`moment.tz(x, ${z}).subtract(1, 'day').format()`,
		`moment.tz(x, ${z}).add(1, 'month').format()`,
		`moment.tz(x, ${z}).subtract(1, 'years').format()`,
		`moment.tz(x, ${z}).add(2, 'weeks').format()`,
		`moment.tz(x, ${z}).add(90, 'minutes').format()`,
		`moment.tz(x, ${z}).add(1, 'day').startOf('day').valueOf()`,
		`moment.tz(x, ${z}).clone().subtract(3, 'h').utc().format()`,
		`moment.tz(x, ${z}).utc(true).format('YYYY-MM-DD')`,
		`moment.tz(x, ${z}).utc(true).format()`,
		`moment.tz(x, ${z}).add(1, 'day').utc(true).valueOf()`,
		'moment(x).utc(true).format()',
		"moment(x).subtract(1, 'day').format('YYYY-MM-DD')",
		"moment(x).add(1.5, 'days').utc().format()",
		"moment(x).add('2', 'M').format()",
		"moment(x).startOf('second').subtract(1, 'seconds').utc().format()",
		"moment(x).endOf('second').add(1, 'Q').utc().format()",
		'moment(x).isBefore(moment(1600000000000))',
		`moment(x).isAfter(moment.tz('2020-06-01T00:00:00', ${z}))`,
		"moment(x).isSame('2020-03-08T02:30:00')",
	];
};

const TEXTS = [
	'2020-01-15',
	'2020-07-15',
	'2020-02-29',
	'2019-02-29',
	'2020-13-01',
	'2020-00-10',
	'2020-04-31',
	'2020-12',
	'2020-12T10:00',
	'2020',
	'202012',
	'20201225',
	'20201225T101500',
	'20201225T1015',
	'20201225T10',
	'20201225T101500.5Z',
	'20201225T101500+0530',
	'2020-01-15T10',
	'2020-01-15T10:30',
	'2020-01-15T10:30:45',
	'2020-01-15 10:30:45',
	'2020-01-15T10:30:45.1',
	'2020-01-15T10:30:45.57',
	'2020-01-15T10:30:45.123',
	'2020-01-15T10:30:45,123',
	'2020-01-15T10:30:45.123456789',
	'2020-01-15T10:30:45.9999',
	'2020-01-15T10:30:45Z',
	'2020-01-15T10:30:45 Z',
	'2020-01-15T10:30:45z',
	'2020-01-15T10:30:45.000Z',
	'2020-01-15T10:30:45+05:30',
	'2020-01-15T10:30:45-0800',
	'2020-01-15T10:30:45+02',
	'2020-01-15T10:30:45+00:00',
	'2020-01-15T10:30:45-00:00',
	'2020-01-15T10:30+01:00',
	'2020-01-15T10+01:00',
	'2020-01-15T24:00:00',
	'2020-12-31T24:00:00',
	'2020-01-15T24:00:01',
	'2020-01-15T25:00:00',
	'2020-01-15T10:60:00',
	'2020-01-15T10:30:60',
	'2020-01-15T10:30:45+5',
	'2020-01-15T10:30:45+05:3',
	'2020-01-15T1:30',
	'2020-1-15',
	'  2020-01-15T10:30:45',
	'2020-01-15T10:30:45 ',
	'2020-01-15T',
	'2020-01-15X10:30',
	'0099-06-01T00:00:00',
	'0000-01-01',
	'9999-12-31T23:59:59.999',
	'1999-12-31T23:59:59',
	'1970-01-01T00:00:00Z',
	'2038-01-19T03:14:08Z',
	'',
	' ',
	'abc',
	'null',
	'1577836800000',
	'1577836800',
	'12',
	'2020/01/15',
	'01/15/2020',
	'January 15, 2020',
	'15 January 2020',
	'2020-01-15T10:30:45.123+05:30 extra',
	'T10:30',
	'10:30',
	'2021-03-14T02:30:00',
	'2021-11-07T01:30:00',
	'2021-03-28T01:30:00',
	'2021-10-31T01:30:00',
	'2021-03-28T02:30:00',
	'2021-10-31T02:30:00',
	'2011-12-30T12:00:00',
	'2021-10-03T02:15:00',
	'2021-04-04T01:45:00',
	'2020-01-15T10:30:45+14:00',
	'2020-01-15T10:30:45+14:01',
	'2020-01-15T10:30:45+1445',
	'2020-01-15T10:30:45+15',
	'2020-01-15T10:30:45-12:00',
	'2020-01-15T10:30:45-12:01',
	'2020-01-15T10:30:45-13',
	'2020-01-15T10:30:45+05:60',
	'2020-01-15T10:30:45+05:99',
	'20200115T1030+1400',
	'20200115T1030+1401',
];

const VALUES: unknown[] = [
	0,
	1,
	1600000000000,
	1615703400000,
	1636263000000,
	1600000000000.7,
	8.64e15,
	8.64e15 + 1,
	Number.NaN,
	null,
];

function transitions(zone: string, from: number, to: number): number[] {
	if (zone === 'UTC') return [];
	return moment.tz
		.zone(zone)
		.untils.filter((until) => Number.isFinite(until) && until >= from && until < to);
}

function isoWall(t: number): string {
	return new Date(t).toISOString().slice(0, 19);
}

describe('moment calls in compiled node code', () => {
	beforeAll(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2024-03-10T06:59:59.500Z'));
	});
	afterAll(() => {
		vi.useRealTimers();
	});

	it('gives the text and the numbers of moment for each call shape, value and zone', () => {
		const differences: string[] = [];
		let equal = 0;
		let limits = 0;
		for (const zone of ZONES) {
			for (const shape of SHAPES(zone)) {
				for (const x of [...TEXTS, ...VALUES]) {
					const result = compare(shape, x);
					if (result === 'equal') equal++;
					else if (result === 'limit') limits++;
					else if (differences.length < 40 && !differences.includes(result))
						differences.push(result);
				}
			}
		}
		expect(differences).toEqual([]);
		expect(limits / (equal + limits)).toBeLessThan(0.05);
	});

	it('reads the clock for a moment without a value', () => {
		for (const shape of [
			'moment().format()',
			'moment().unix()',
			'moment(x).valueOf()',
			'moment.utc().format()',
			"moment.tz('America/New_York').format()",
			"moment.tz('America/New_York').add(1, 'day').startOf('day').valueOf()",
			"moment().subtract(1, 'month').utc().format()",
		])
			expect(compare(shape, undefined)).toBe('equal');
	});

	it('gives the text and the numbers of moment for a run-time zone, or refuses', () => {
		const differences: string[] = [];
		let equal = 0;
		let limits = 0;
		const zones = [
			'America/New_York',
			'Europe/Berlin',
			'Asia/Kolkata',
			'Australia/Lord_Howe',
			'Pacific/Chatham',
			'America/St_Johns',
			'Asia/Kathmandu',
			'Pacific/Apia',
			'America/Sao_Paulo',
			'Africa/Cairo',
			'Asia/Tehran',
			'UTC',
			'default',
			'Mars/Olympus',
			'',
		];
		const values = [
			'2020-01-15T10:30:00',
			'2020-07-15T10:30:00+05:30',
			'2020-01-15T10:30:00Z',
			'2021-03-28T01:30:00',
			'2021-11-07T01:30:00',
			'2020-01-15',
			'2020-07-01',
			'',
		];
		const shapes = [
			'moment.tz(x, y).format()',
			"moment.tz(x, y).format('yyyy-MM-DD')",
			'moment.tz(x, y).utc().format()',
			'moment.tz(x, y).toISOString()',
		];
		for (const shape of shapes) {
			for (const zone of zones) {
				for (const value of values) {
					const result = compare(shape, value, zone);
					if (result === 'equal') equal++;
					else if (result === 'limit') limits++;
					else if (differences.length < 40 && !differences.includes(result))
						differences.push(result);
				}
			}
		}
		expect(differences).toEqual([]);
		expect(equal).toBeGreaterThan(0);
		expect(limits).toBeGreaterThan(0);
	});

	it('agrees with moment around each change of a zone offset from 2000 to 2025', () => {
		const differences: string[] = [];
		const from = Date.UTC(2000, 0, 1);
		const to = Date.UTC(2026, 0, 1);
		const limits = new Map<string, number>();
		let checked = 0;
		for (const zone of ZONES) {
			const z = JSON.stringify(zone);
			const shapes = [
				`moment.tz(x, ${z}).format()`,
				`moment.tz(x, ${z}).add(1, 'day').format()`,
				`moment.tz(x, ${z}).subtract(1, 'month').utc().format()`,
				`moment.tz(x, ${z}).startOf('day').format()`,
				`moment.tz(x, ${z}).endOf('hour').format('YYYY-MM-DDTHH:mm:ssZ')`,
			];
			for (const until of transitions(zone, from, to)) {
				for (const step of [
					-120, -48, -30, -26, -24, -22, -14, -8, -4, -3, -2, -1, 0, 1, 2, 3, 4, 8, 14, 22, 24, 26,
					30, 48, 120,
				]) {
					const instant = until + step * 1_800_000;
					for (const x of [isoWall(instant), instant, isoWall(instant - 86_400_000)]) {
						for (const shape of shapes) {
							const result = compare(shape, x);
							checked++;
							if (result === 'limit') limits.set(zone, (limits.get(zone) ?? 0) + 1);
							else if (result !== 'equal' && differences.length < 40) differences.push(result);
						}
					}
				}
			}
		}
		expect(differences).toEqual([]);
		expect(checked).toBeGreaterThan(50_000);
		expect([...limits.keys()].sort()).toEqual(['Africa/Cairo', 'Asia/Tehran', 'Pacific/Apia']);
		let stopped = 0;
		for (const count of limits.values()) stopped += count;
		expect(stopped / checked).toBeLessThan(0.01);
	}, 120_000);

	it('agrees with moment in each zone that the compiler accepts', () => {
		const differences: string[] = [];
		const known = new Set(moment.tz.names());
		for (const zone of momentZones()) {
			expect(known.has(zone)).toBe(true);
			const z = JSON.stringify(zone);
			for (const x of [
				'2005-01-15T12:00:00',
				'2012-07-15T12:00:00',
				'2021-03-28T02:30:00',
				'2021-11-07T01:30:00',
				'2024-06-30T23:59:59.999',
				1104537600000,
				1700000000000,
			]) {
				for (const shape of [
					`moment.tz(x, ${z}).format()`,
					`moment(x).tz(${z}).format('YYYY-MM-DD HH:mm:ss ZZ')`,
					`moment.tz(x, ${z}).startOf('day').utc().format()`,
				]) {
					const result = compare(shape, x);
					if (result !== 'equal' && differences.length < 40 && !differences.includes(result))
						differences.push(result);
				}
			}
		}
		expect(differences).toEqual([]);
	});

	it('reads zone data in which no offset lasts less than 12 hours from 1970', () => {
		const short: string[] = [];
		for (const zone of momentZones()) {
			const untils = moment.tz.zone(zone).untils.filter((until) => Number.isFinite(until));
			for (let k = 1; k < untils.length; k++) {
				if (untils[k] >= 0 && untils[k] - untils[k - 1] < 43_200_000) short.push(zone);
			}
		}
		expect(short).toEqual([]);
	});

	it('stops with a limit error for a date that it cannot prove equal', () => {
		for (const [shape, x] of [
			["moment.tz(x, 'America/New_York').format()", '1969-07-20T20:17:00'],
			["moment(x).tz('Europe/Berlin').format()", -1],
			['moment(x).format()', '2020-W05-3'],
			['moment(x).format()', '2020-123'],
			['moment(x).format()', '+002020-01-15'],
			['moment(x).format()', 'Mon, 06 Mar 2017 21:22:23 +0000'],
			['moment(x).format()', '/Date(1198908717056)/'],
			['moment(x).format()', { year: 2020 }],
			['moment(x).format()', [2020, 1, 1]],
			['moment(x).format()', true],
			["moment(x).add(y, 'days').format()", 0],
			["moment(x).format('YYYY')", -1e14],
		] as Array<[string, unknown]>)
			expect(compare(shape, x, { days: 1 })).toBe('limit');
	});

	it('reports each call shape that it does not compile', () => {
		for (const shape of [
			'moment(x)',
			"moment(x, 'YYYY-MM-DD').format()",
			'moment(x).format(y)',
			"moment(x).format('YYYYYY')",
			"moment(x).format('z')",
			"moment(x).format('wo')",
			"moment(x).format('llll')",
			'moment(x).fromNow()',
			'moment(x).toDate()',
			'moment(x).diff(moment(y))',
			'moment(x).add({ days: 1 }).format()',
			'moment(x).add(1, y).format()',
			"moment(x).startOf('week').format()",
			'moment(x).utc(y).format()',
			'moment(x).utcOffset(60).format()',
			"moment(x).set('hour', 1).format()",
			'moment.unix(x).format()',
			'moment.duration(x).asSeconds()',
			'String(moment(x).add(1, "day"))',
		]) {
			const code = compileExpression(shape);
			expect(typeof code === 'string' ? code : code.error).toContain(LIMIT);
		}
	});

	it('splits a format as moment does', () => {
		expect(momentFormatParts('YYYY-MM-DD[T]HH:mm:ss[Z]')).toEqual([
			'YYYY',
			"'-",
			'MM',
			"'-",
			'DD',
			"'T",
			'HH',
			"':",
			'mm',
			"':",
			'ss',
			"'Z",
		]);
		expect(momentFormatParts('[on] \\D LT')).toEqual(["'on D ", 'h', "':", 'mm', "' ", 'A']);
		expect(momentFormatParts('hmm')).toBe("the token 'hmm' of a date format");
	});
});

const ENTRY = '/probe/Probe.node.ts';
const NODE_ZONE = 'America/New_York';

function probe(imports: string, expressions: string[]) {
	const source = `${imports}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		const zone = this.getTimezone();
		for (let i = 0; i < items.length; i++) {
			const x = items[i].json.text;
			returnData.push({ json: { r: [${expressions.join(', ')}] } });
		}
		return [returnData];
	}
}`;
	return specialiseNode({
		type: 'n8n-nodes-base.probe',
		version: 1,
		entry: ENTRY,
		readFile: (path) => (path === ENTRY ? source : undefined),
		parameters: {},
		aliases: {},
		instanceId: null,
		timezone: NODE_ZONE,
	});
}

async function runProbe(imports: string, expressions: string[], texts: unknown[], now: number) {
	const result = probe(imports, expressions);
	expect(result.errors).toEqual([]);
	const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'probe' })],
	zones: ${JSON.stringify(result.zones ?? [])},
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.probe',
			typeVersion: 1,
			parameters: {},
			items: ${JSON.stringify(texts.map((text) => ({ text })))},
		});
	},
});
`;
	const fixture = { trigger: { body: {}, headers: {}, query: {} }, now, seed: 1, effects: {} };
	const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
	const compiled = compile(workflow, { nodes });
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(workflow, fixture, { nodes });
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	expect(reference.status).toBe('ok');
	const rows: unknown = reference.result;
	return {
		zones: result.zones,
		rows: Array.isArray(rows) ? rows.map((row: { r: unknown }) => row.r) : [],
	};
}

describe('date packages in a compiled node', () => {
	const NOW = Date.UTC(2024, 2, 10, 6, 59, 59, 500);
	const texts = [
		'2021-03-14T02:30:00',
		'2021-11-07T01:30:00',
		'2020-01-15T10:30:45.123+05:30',
		'2020-07-15',
		'2020-02-30',
		'abc',
		1600000000000,
		null,
	];

	it('runs moment calls as moment does, in the reference runner and in bytecode', async () => {
		const expressions = [
			'moment(x).format()',
			"moment(x).format('YYYY-MM-DD')",
			'moment(x).unix()',
			'moment(x).toISOString()',
			'moment(x).isValid()',
			'moment.tz(x, zone).utc().format()',
			'moment.tz(x, zone).format()',
			'moment.tz(x, this.getTimezone()).valueOf()',
			"moment(x).tz(zone).format('YYYY-MM-D HH:mm:ss')",
			"moment.tz(x, zone).add(1, 'day').startOf('day').format()",
			"moment.tz(x, 'Europe/Berlin').subtract(1, 'months').format('LT [on] dddd, MMMM Do YYYY Z')",
			'moment().utc().format()',
			'moment.tz(zone).format()',
		];
		const out = await runProbe("import moment from 'moment-timezone';", expressions, texts, NOW);
		expect(out.zones).toEqual(['America/New_York', 'Europe/Berlin']);
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(NOW));
		try {
			const expected = texts.map((x) =>
				expressions.map(
					(expression) =>
						evaluate(
							['moment', 'x', 'zone'],
							`return (${expression.replace('this.getTimezone()', 'zone')});`,
						)(moment, x, NODE_ZONE) ?? null,
				),
			);
			expect(JSON.stringify(out.rows)).toBe(JSON.stringify(expected));
		} finally {
			vi.useRealTimers();
		}
	});

	const withParameters = (body: string, parameters: Record<string, unknown>) => {
		const source = `import moment from 'moment-timezone';
function formatOf(withTime: boolean) {
	if (!withTime) return 'yyyy-MM-DD';
	return '';
}
export class Probe {
	async execute(this: any) {
		const items = this.getInputData();
		const returnData: any[] = [];
		for (let i = 0; i < items.length; i++) {
			const entry = this.getNodeParameter('entry', i);
			${body}
		}
		return [returnData];
	}
}`;
		return specialiseNode({
			type: 'n8n-nodes-base.probe',
			version: 1,
			entry: ENTRY,
			readFile: (path) => (path === ENTRY ? source : undefined),
			parameters,
			aliases: {},
			instanceId: null,
			timezone: NODE_ZONE,
		});
	};

	it('takes a zone from the zones in the parameters of the node', () => {
		const body = `const zone = entry.timezone === 'default' ? this.getTimezone() : entry.timezone;
			returnData.push({ json: { r: moment.tz(items[i].json.text, zone).format() } });`;
		const fixed = withParameters(body, {
			entry: { timezone: 'Europe/Berlin', at: '={{ $json.at }}' },
		});
		expect(fixed.errors).toEqual([]);
		expect(fixed.source).toContain(
			'__momentZone(zone, ["America/New_York", "Europe/Berlin", "UTC"])',
		);
		expect(fixed.zones).toEqual(['America/New_York', 'Europe/Berlin']);
		const dynamic = withParameters(body, { entry: { timezone: '={{ $json.zone }}' } });
		expect(dynamic.errors).toEqual([]);
		expect(dynamic.zones).toEqual(['America/New_York']);
	});

	it('takes a format from a function that gives text literals only', () => {
		const body = `const format = formatOf(entry.withTime);
			returnData.push({ json: { r: moment(items[i].json.text).format(format) } });`;
		const result = withParameters(body, { entry: { withTime: '={{ $json.withTime }}' } });
		expect(result.errors).toEqual([]);
		expect(result.source).toContain('__momentFormatOf(');
		expect(result.source).toContain('["yyyy-MM-DD", ["yyyy", "\'-", "MM", "\'-", "DD"]]');
	});

	it('gives a compile error for a zone that is not known at compile time', () => {
		const unknown = probe("import moment from 'moment-timezone';", [
			"moment.tz(x, 'Mars/Olympus').format()",
		]);
		expect(unknown.errors).toEqual([
			"code: the time zone 'Mars/Olympus' of a moment has no compiled form",
		]);
	});

	it('runs Luxon calls in the zone of the workflow', async () => {
		const expressions = [
			'DateTime.fromISO(x).toISO()',
			"DateTime.fromISO(x).toFormat('yyyy-MM-dd HH:mm')",
			'DateTime.fromISO(x).toMillis()',
			'DateTime.now().toISO()',
			'DateTime.now().toISODate()',
			"DateTime.now().plus({ days: 1 }).startOf('day').toISO()",
		];
		const isoTexts = [
			'2021-03-14T02:30:00',
			'2021-11-07T01:30:00',
			'2020-07-15',
			'2020-01-15T10:30:45.123+05:30',
		];
		const out = await runProbe("import { DateTime } from 'luxon';", expressions, isoTexts, NOW);
		expect(out.zones).toEqual(['America/New_York']);
		const luxon: { DateTime: unknown; Settings: { defaultZone: unknown } } = createRequire(
			join(nodesBase, 'package.json'),
		)('luxon');
		const zoneBefore = luxon.Settings.defaultZone;
		luxon.Settings.defaultZone = NODE_ZONE;
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(NOW));
		try {
			const expected = isoTexts.map((x) =>
				expressions.map((expression) =>
					evaluate(['DateTime', 'x'], `return (${expression});`)(luxon.DateTime, x),
				),
			);
			expect(out.rows).toEqual(expected);
		} finally {
			vi.useRealTimers();
			luxon.Settings.defaultZone = zoneBefore;
		}
	});
});
