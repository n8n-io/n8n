/**
 * A differential test of Dates in parameter expressions. Each expression is a field of a Set
 * node: a Date (or a value that is no Date) goes to a holder, and the expression reads it in
 * several ways. The workflow runs in n8n's engine (v1) and, converted, on the reference
 * runner. The fields must be equal, or the Set node must run in the fallback host.
 *
 * `WF_DATE_CASES` sets the number of expressions (the default is 60). `WF_DATE_SEED` sets the
 * seed.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const ITEM = {
	t: '2024-03-07T10:20:30.000Z',
	bad: 'not a date',
	ms: 1700000000000,
	none: null,
	k: 3,
};

/** A value: a Date, or a value of an item that is no Date. */
const SOURCES = [
	'new Date($json.t)',
	'new Date($json.ms)',
	'new Date($json.bad)',
	'new Date($json.none)',
	'new Date(Date.UTC(2024, 1, $json.k))',
	'$json.t',
	'$json.ms',
	'$json.none',
];

/** A holder: an expression with the value `S` and the use `U` of the name `R`. */
const HOLDERS: Array<[string, string]> = [
	['direct', 'U'],
	['variable', '(() => { const d = S; return V; })()'],
	['member', '(() => { const o = { d: S }; return W; })()'],
	['list', '[S].map((d) => V)[0]'],
	['parameter', '((d) => V)(S)'],
	['or', '(() => { const d = $json.none || S; return V; })()'],
	['ternary', '(() => { const d = $json.k > 1 ? S : null; return V; })()'],
];

const USES = [
	'R.getTime()',
	'R.toISOString()',
	'R.getUTCDay()',
	'R.valueOf()',
	'R.toJSON()',
	'R - 5',
	'+R',
	'R > 1700000000000',
	'JSON.stringify(R)',
	'JSON.stringify({ v: R })',
	'R',
	'[R]',
	'{ v: R }',
	'typeof R',
	'R instanceof Date',
	'R ? 1 : 2',
	'Math.max(R, 5)',
	'isNaN(R)',
	'Number(R)',
	'R === R',
	'`${R}`',
	'String(R)',
];

function generator(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

function makeExpression(next: () => number): { name: string; value: string } {
	const pick = <T>(list: T[]): T => list[Math.floor(next() * list.length)];
	const [holder, shape] = pick(HOLDERS);
	const source = pick(SOURCES);
	const use = pick(USES);
	const text = (r: string) => use.split('R').join(r);
	const body = shape
		.replace('U', text(`(${source})`))
		.replace('V', text('d'))
		.replace('W', text('o.d'))
		.replace('S', source);
	const template = next() < 0.2;
	return {
		name: `${holder} | ${source} | ${use}${template ? ' | template' : ''}`,
		value: template ? `=a {{ ${body} }} b` : `={{ ${body} }}`,
	};
}

function workflow(value: string, type: string, timezone?: string) {
	return {
		name: 'Dates in expressions',
		settings: timezone === undefined ? undefined : { timezone },
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'S',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {
					assignments: { assignments: [{ id: 'f', name: 'f', type, value }] },
					options: { ignoreConversionErrors: true },
				},
			},
		],
		connections: { T: { main: [[{ node: 'S', type: 'main', index: 0 }]] } },
	};
}

type Outcome = 'equal' | 'refused' | 'known' | string;

/**
 * Differences that no Date causes, so this test does not fail on them: v1 writes NaN in a text
 * template as an empty text, and a Set field of the type object reads the text "null" as null.
 */
const KNOWN: Array<[string, string]> = [
	['[{"f":"a NaN b"}]', '[{"f":"a  b"}]'],
	['[{"f":"null"}]', '[{"f":null}]'],
];

async function run(value: string): Promise<Outcome> {
	const wf = workflow(value, value.startsWith('={{') ? 'object' : 'string');
	const converted = convertWorkflow(wf, { trace: 'all' });
	if (!converted.ok || converted.fallbackNodes.includes('S')) return 'refused';
	const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
	const out = await runReference(converted.source, {
		trigger: { body: ITEM },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
		trace: true,
	});
	const native =
		out.status === 'ok'
			? JSON.stringify((out.trace ?? []).find((t) => t.step === 'S')?.items)
			: 'error';
	const host = v1.error === null ? JSON.stringify(v1.nodes.S?.[0]) : 'error';
	if (native === host) return 'equal';
	if (KNOWN.some(([n, h]) => native === n && host === h)) return 'known';
	return `native ${native} host ${host}`;
}

describe('Dates in expressions: the native form against v1', () => {
	it('gives the result of v1, or keeps the node in the fallback host', async () => {
		const cases = Number(process.env.WF_DATE_CASES ?? 60);
		const next = generator(Number(process.env.WF_DATE_SEED ?? 1));
		const wrong: string[] = [];
		let equal = 0;
		let refused = 0;
		let known = 0;
		for (let k = 0; k < cases; k++) {
			const e = makeExpression(next);
			const outcome = await run(e.value);
			if (outcome === 'equal') equal++;
			else if (outcome === 'refused') refused++;
			else if (outcome === 'known') known++;
			else wrong.push(`${e.name}\n    ${e.value}\n    ${outcome}`);
		}
		const report = `cases ${cases}; equal ${equal}; refused ${refused}; known differences without a Date ${known}; wrong ${wrong.length}`;
		if (process.env.WF_DATE_CASES || wrong.length > 0) console.log([report, ...wrong].join('\n'));
		expect(wrong).toEqual([]);
		expect(equal).toBeGreaterThan(0);
	}, 1_800_000);

	it.each([
		'UTC',
		'Etc/UTC',
		'Europe/London',
		'America/New_York',
		'America/St_Johns',
		'Asia/Kolkata',
		'Pacific/Auckland',
	])('gives the day and the offset of v1 for $today and $now in the zone %s', async (zone) => {
		const value =
			"={{ $today.toISO() }} {{ $now.toISO().slice(23) }} {{ $today.toMillis() }} {{ $now.startOf('day').toISO() }} {{ $now.toISODate() }} {{ $today.toFormat('yyyy-MM-dd ZZ z') }} {{ DateTime.now().startOf('month').toISO() }}";
		const wf = workflow(value, 'string', zone);
		const converted = convertWorkflow(wf, { trace: 'all' });
		expect(converted.fallbackNodes).toEqual([]);
		const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
		const out = await runReference(converted.source, {
			trigger: { body: ITEM },
			now: Date.now(),
			seed: 1,
			effects: {},
			trace: true,
		});
		expect(v1.error).toBeNull();
		expect((out.trace ?? []).find((t) => t.step === 'S')?.items).toEqual(v1.nodes.S?.[0]);
	});

	it.each([
		'={{ $json.t.getTime() }}',
		'={{ $json.ms.toISOString() }}',
		'=at {{ $json.t.getUTCDay() }}',
	])('keeps a Date method on a value of an item in the fallback host: %s', (value) => {
		const converted = convertWorkflow(workflow(value, 'string'));
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual(['S']);
	});
});
