/**
 * Date & Time version 2 as code (`date-time.ts`), against v1: "Get Current Date", and the
 * operations on a date that an expression gives as a Luxon DateTime. Each case runs the
 * workflow in n8n's engine and the converted workflow on the reference runner. A date that
 * is text or a number has its own cases (`date-time-text.test.ts`).
 */
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { runOracle } from './behaviour/oracle-engine.ts';

const AT = "DateTime.fromISO('2024-01-31T10:20:30.400', { zone: 'Europe/Berlin' })";
const ITEM = { id: 7, n: 3, date: '2024-03-09T07:05:00.000Z' };

function workflow(parameters: Record<string, unknown>, settings: Record<string, unknown> = {}) {
	return {
		name: 'Date and time',
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
				...settings,
			},
		],
		connections: { T: { main: [[{ node: 'D', type: 'main', index: 0 }]] } },
	};
}

const CASES: Array<[string, Record<string, unknown>]> = [
	[
		'add days',
		{ operation: 'addToDate', magnitude: `={{ ${AT} }}`, timeUnit: 'days', duration: 1 },
	],
	[
		'add months over the end of a month',
		{ operation: 'addToDate', magnitude: `={{ ${AT} }}`, timeUnit: 'months', duration: 1 },
	],
	['add with the defaults', { operation: 'addToDate', magnitude: `={{ ${AT} }}` }],
	[
		'add an amount from the item',
		{
			operation: 'addToDate',
			magnitude: `={{ ${AT} }}`,
			timeUnit: 'hours',
			duration: '={{ $json.n * 2 }}',
		},
	],
	[
		'add quarters',
		{
			operation: 'addToDate',
			magnitude: `={{ ${AT} }}`,
			timeUnit: 'quarters',
			duration: 2,
			outputFieldName: 'later',
		},
	],
	[
		'subtract weeks',
		{ operation: 'subtractFromDate', magnitude: `={{ ${AT} }}`, timeUnit: 'weeks', duration: 6 },
	],
	[
		'subtract milliseconds, with the input fields',
		{
			operation: 'subtractFromDate',
			magnitude: `={{ ${AT}.setZone('Asia/Tokyo') }}`,
			timeUnit: 'milliseconds',
			duration: 500,
			options: { includeInputFields: true },
		},
	],
	['format with the default format', { operation: 'formatDate', date: `={{ ${AT} }}` }],
	['format yyyy-MM-dd', { operation: 'formatDate', date: `={{ ${AT} }}`, format: 'yyyy-MM-dd' }],
	['format as a Unix timestamp', { operation: 'formatDate', date: `={{ ${AT} }}`, format: 'X' }],
	['format as milliseconds', { operation: 'formatDate', date: `={{ ${AT} }}`, format: 'x' }],
	[
		'format MMMM dd yyyy',
		{ operation: 'formatDate', date: `={{ ${AT} }}`, format: 'MMMM dd yyyy' },
	],
	[
		'a custom format',
		{
			operation: 'formatDate',
			date: `={{ ${AT}.plus({ days: 3 }) }}`,
			format: 'custom',
			customFormat: "EEE, d LLL yyyy 'at' HH:mm ZZ",
			outputFieldName: 'text',
			options: { includeInputFields: true },
		},
	],
	[
		'a custom format with the option timezone',
		{
			operation: 'formatDate',
			date: `={{ ${AT} }}`,
			format: 'custom',
			customFormat: 'yyyy-MM-dd HH:mm',
			options: { timezone: true },
		},
	],
	['round down to the month', { operation: 'roundDate', date: `={{ ${AT} }}` }],
	[
		'round down to the week',
		{ operation: 'roundDate', date: `={{ ${AT} }}`, mode: 'roundDown', toNearest: 'week' },
	],
	[
		'round down to the hour',
		{ operation: 'roundDate', date: `={{ ${AT} }}`, mode: 'roundDown', toNearest: 'hour' },
	],
	[
		'round up to the end of the month',
		{ operation: 'roundDate', date: `={{ ${AT} }}`, mode: 'roundUp' },
	],
	['extract the month', { operation: 'extractDate', date: `={{ ${AT} }}` }],
	['extract the year', { operation: 'extractDate', date: `={{ ${AT} }}`, part: 'year' }],
	[
		'extract the hour',
		{
			operation: 'extractDate',
			date: `={{ ${AT} }}`,
			part: 'hour',
			options: { includeInputFields: true },
		},
	],
];

async function both(parameters: Record<string, unknown>, now = 0) {
	const wf = workflow(parameters);
	const v1 = await runOracle(wf, { start: 'T', item: ITEM, mode: 'trigger', timeoutMs: 20_000 });
	const converted = convertWorkflow(wf, { trace: 'all' });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	expect(converted.fallbackNodes).toEqual([]);
	expect(converted.source).not.toContain("type: 'n8n-nodes-base.dateTime'");
	const out = await runReference(converted.source, {
		trigger: { body: ITEM },
		now,
		seed: 1,
		effects: {},
		trace: true,
	});
	expect(v1.error).toBeNull();
	expect(out.status).toBe('ok');
	return { v1: v1.nodes.D?.[0], traced: (out.trace ?? []).find((t) => t.step === 'D')?.items };
}

describe('Date & Time as code', () => {
	it.each(CASES)('%s', async (_name, parameters) => {
		const { v1, traced } = await both(parameters);
		expect(traced).toEqual(v1);
	});

	it.each([
		['the current date', {}, 'currentDate', '2024-03-09T02:05:00.000-05:00'],
		[
			'the current date without the time',
			{ includeTime: false },
			'currentDate',
			'2024-03-09T00:00:00.000-05:00',
		],
		[
			'the current date in another time zone',
			{ options: { timezone: 'Asia/Tokyo', includeInputFields: true }, outputFieldName: 'now' },
			'now',
			'2024-03-09T16:05:00.000+09:00',
		],
	])('%s', async (_name, parameters, field, expected) => {
		const { v1, traced } = await both(
			{ operation: 'getCurrentDate', ...parameters },
			Date.parse('2024-03-09T07:05:00.000Z'),
		);
		const mine = (traced as Array<Record<string, unknown>>)[0];
		const theirs = (v1 as Array<Record<string, unknown>>)[0];
		expect(mine[field]).toBe(expected);
		// v1 reads the clock: the fields are the same, and the value has the same form and offset.
		expect(Object.keys(mine)).toEqual(Object.keys(theirs));
		const theirValue = String(theirs[field]);
		expect(theirValue).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}[+-]\d\d:\d\d$/);
		if (field === 'now') expect(theirValue.slice(-6)).toBe(expected.slice(-6));
		if ('includeTime' in parameters) expect(theirValue.slice(10, 23)).toBe('T00:00:00.000');
	});

	it.each([
		[
			'a format from an expression',
			{
				operation: 'formatDate',
				date: `={{ ${AT} }}`,
				format: 'custom',
				customFormat: '={{ $json.f }}',
			},
			{},
		],
		['the week of a date', { operation: 'extractDate', date: `={{ ${AT} }}`, part: 'week' }, {}],
		[
			'the time between dates',
			{ operation: 'getTimeBetweenDates', startDate: `={{ ${AT} }}`, endDate: `={{ ${AT} }}` },
			{},
		],
		['continue on fail', { operation: 'getCurrentDate' }, { onError: 'continueRegularOutput' }],
	])('leaves the node to the node compiler or the host: %s', (_name, parameters, settings) => {
		const converted = convertWorkflow(workflow(parameters, settings));
		expect(converted.ok).toBe(true);
		expect(converted.fallbackNodes).toEqual(['D']);
	});
});
