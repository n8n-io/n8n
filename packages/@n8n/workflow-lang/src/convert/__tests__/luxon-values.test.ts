/**
 * An expression whose value is a Luxon DateTime, against v1. In a field of a Set node the
 * value is the ISO text of the DateTime (v1's `getNodeParameter` turns a DateTime inside a
 * collection parameter into text). A text template writes the DateTime as its text. A
 * dateTime condition compares the DateTime as it is. The nodes must not run in the fallback
 * host.
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const AT = "DateTime.fromISO('2024-01-02T03:04:05Z')";
const ITEM = { when: '2024-01-05T00:00:00.000Z', early: '2023-12-31T10:00:00+02:00', flag: true };

const trigger = {
	name: 'T',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function setWorkflow(type: string, value: string, version = 3.4) {
	const parameters =
		version >= 3.3
			? { assignments: { assignments: [{ id: 'f', name: 'f', type, value }] }, options: {} }
			: version >= 3
				? {
						fields: { values: [{ name: 'f', type: `${type}Value`, [`${type}Value`]: value }] },
						options: {},
					}
				: { values: { [type]: [{ name: 'f', value }] }, options: {} };
	return {
		name: 'Luxon values',
		nodes: [
			trigger,
			{
				name: 'S',
				type: 'n8n-nodes-base.set',
				typeVersion: version,
				position: [200, 0],
				parameters,
			},
			{
				name: 'After',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: 'g', name: 'kind', type: 'string', value: '={{ typeof $json.f }}' },
							{ id: 'h', name: 'text', type: 'string', value: '=at {{ $json.f }}' },
						],
					},
					includeOtherFields: true,
					options: {},
				},
			},
		],
		connections: {
			T: { main: [[{ node: 'S', type: 'main', index: 0 }]] },
			S: { main: [[{ node: 'After', type: 'main', index: 0 }]] },
		},
	};
}

function ifWorkflow(left: string, operation: string, right: string) {
	return {
		name: 'Luxon conditions',
		nodes: [
			trigger,
			{
				name: 'Check',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [200, 0],
				parameters: {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
						conditions: [
							{
								id: 'c',
								leftValue: left,
								rightValue: right,
								operator: { type: 'dateTime', operation },
							},
						],
						combinator: 'and',
					},
					options: {},
				},
			},
		],
		connections: { T: { main: [[{ node: 'Check', type: 'main', index: 0 }]] } },
	};
}

async function both(wf: { nodes: Array<{ name: string; type: string }>; connections: unknown }) {
	const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(converted.fallbackNodes).toEqual([]);
	const out = await runReference(converted.source, {
		trigger: { body: ITEM },
		now: 0,
		seed: 1,
		effects: {},
		trace: true,
	});
	const traced = (step: string) => (out.trace ?? []).find((t) => t.step === step)?.items;
	return { v1, out, traced };
}

const SET_VALUES: Array<[string, string, number]> = [
	['string', `={{ ${AT} }}`, 3.4],
	['string', `={{ ${AT}.plus({ days: 30 }).startOf('day') }}`, 3.4],
	['string', `={{ ${AT}.setZone('Europe/Berlin') }}`, 3.4],
	['string', `={{ ${AT}.toUTC() }}`, 3.4],
	['string', `={{ $json.missing || ${AT} }}`, 3.4],
	['string', `={{ $json.when ?? ${AT} }}`, 3.4],
	['string', `={{ $json.flag ? ${AT}.minus({ hours: 5 }) : ${AT} }}`, 3.4],
	['string', `={{ ($json.flag && ${AT}) }}`, 3.4],
	['string', `={{ DateTime.fromISO($json.when) }}`, 3.4],
	['string', `={{ DateTime.fromISO('not a date') }}`, 3.4],
	['string', `=at {{ ${AT} }} and {{ ${AT}.endOf('month') }}`, 3.4],
	['string', `={{ ${AT} }}`, 3.2],
	['string', `={{ ${AT} }}`, 2],
	['string', `={{ ${AT} }}`, 1],
];

/** Formats with the tokens that Luxon makes for the locale en-US, the ISO week, and text that is no token. */
const FORMATS = [
	'D',
	'DD',
	'DDD',
	'DDDD',
	't',
	'tt',
	'T',
	'TT',
	'f',
	'ff',
	'F',
	'FF',
	"kkkk-'W'WW",
	'kk W',
	'u uu uuu',
	'YYYY-MM-DD',
	'dd.MM.yyyy HH:mm:ss.SSS',
];
const FORMAT_DATES = [
	'2024-03-07T15:04:05.678Z',
	'2021-01-03T00:00:00.007Z',
	'2020-12-31T23:59:59.990Z',
	'2024-12-30T12:00:00.000Z',
	'1999-01-05T00:04:05.008Z',
	'2026-01-01T05:00:00.000Z',
];
for (const format of FORMATS) {
	const parts = FORMAT_DATES.map(
		(date) =>
			`{{ DateTime.fromISO('${date}', { zone: 'Europe/Berlin' }).toFormat(${JSON.stringify(format)}) }}`,
	);
	SET_VALUES.push(['string', `=${parts.join(' | ')}`, 3.4]);
}

const SET_FAILURES: Array<[string, string, number]> = [
	['number', `={{ ${AT} }}`, 3.4],
	['boolean', `={{ ${AT} }}`, 3.4],
	['array', `={{ ${AT} }}`, 3.4],
	['object', `={{ ${AT} }}`, 3.4],
];

const CONDITIONS: Array<[string, string, string]> = [
	['={{ $json.when }}', 'after', `={{ ${AT} }}`],
	['={{ $json.when }}', 'before', `={{ ${AT} }}`],
	['={{ $json.early }}', 'before', `={{ ${AT}.minus({ days: 1 }) }}`],
	['={{ $json.early }}', 'afterOrEquals', `={{ ${AT}.minus({ days: 2 }) }}`],
	[`={{ ${AT} }}`, 'equals', '2024-01-02T03:04:05Z'],
	[`={{ ${AT}.startOf('day') }}`, 'beforeOrEquals', '={{ $json.when }}'],
	[`={{ DateTime.fromISO($json.when) }}`, 'notEquals', `={{ ${AT} }}`],
	[`={{ $json.missing || ${AT} }}`, 'after', '={{ $json.early }}'],
];

describe('expressions that give a DateTime', () => {
	it.each(SET_VALUES)('Set %s field %s (version %s)', async (type, value, version) => {
		const { v1, out, traced } = await both(setWorkflow(type, value, version));
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(traced('S')).toEqual(v1.nodes.S?.[0]);
		expect(traced('After')).toEqual(v1.nodes.After?.[0]);
	});

	it.each(SET_FAILURES)('Set %s field %s fails as v1', async (type, value, version) => {
		const { v1, out, traced } = await both(setWorkflow(type, value, version));
		expect(v1.error).not.toBeNull();
		expect(out.status).toBe('error');
		const failure = traced('S') as { $error?: { message?: string } } | undefined;
		expect(v1.error).toContain(failure?.$error?.message);
	});

	it.each(CONDITIONS)('dateTime condition %s %s %s', async (left, operation, right) => {
		const { v1, out, traced } = await both(ifWorkflow(left, operation, right));
		expect(v1.error).toBeNull();
		expect(out.status).toBe('ok');
		expect(traced('Check')).toEqual(v1.nodes.Check);
	});
});
