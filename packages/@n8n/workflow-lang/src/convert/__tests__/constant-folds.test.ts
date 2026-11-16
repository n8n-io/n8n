/**
 * The converter computes the values that are the same in each run: the keys of a
 * constant path, the value of constant JSON text and the time of a constant instant.
 */
import { describe, expect, it } from 'vitest';

import { runReference } from '../../reference/runner.ts';
import { isoInstant } from '../conditions.ts';
import { constantText, jsonLiteral } from '../expression.ts';
import { helperSources } from '../helpers.ts';
import { convertWorkflow } from '../index.ts';
import { connect, node } from './workflows.ts';

const webhook = node('Webhook', 'webhook', 2, [0, 0], {
	httpMethod: 'POST',
	path: 'hook',
	responseMode: 'responseNode',
	options: {},
});

function sourceOf(nodes: unknown[], pairs: Array<[string, number, string, number]>): string {
	const converted = convertWorkflow({ name: 'Folds', nodes, connections: connect(pairs) });
	expect(converted.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	return converted.source;
}

async function run(source: string, body: unknown) {
	const out = await runReference(source, {
		trigger: { body, headers: {}, query: {} },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	expect(out.status, JSON.stringify(out.result)).toBe('ok');
	return out;
}

describe('constant text', () => {
	it('is the text of a value without an expression part', () => {
		expect(constantText('={ "a": 1 }')).toBe('{ "a": 1 }');
		expect(constantText('={ "a": {{ $json.a }} }')).toBeNull();
		expect(constantText('{ "a": 1 }')).toBeNull();
		expect(constantText(1)).toBeNull();
	});

	it('gives no literal for JSON that an object literal reads in a different way', () => {
		expect(jsonLiteral('{ "a": [1, "x", null] }')).not.toBeNull();
		expect(jsonLiteral('{ "1": 1, "a": 2 }')).toBeNull();
		expect(jsonLiteral('{ "__proto__": 1 }')).toBeNull();
		expect(jsonLiteral('{ "a": 1e999 }')).toBeNull();
		expect(jsonLiteral('{ a: 1 }')).toBeNull();
	});
});

describe('constant JSON of a node', () => {
	it('is an object literal in the response of Respond to Webhook', async () => {
		const source = sourceOf(
			[
				webhook,
				node('Respond', 'respondToWebhook', 1.1, [200, 0], {
					respondWith: 'json',
					responseBody: '={\n  "ok": true,\n  "list": [1, 2]\n}',
					options: {},
				}),
			],
			[['Webhook', 0, 'Respond', 0]],
		);
		expect(source).not.toContain('jsonValue(');
		expect(source).not.toContain('JSON.parse');
		const out = await run(source, {});
		expect(out.effects[0].args).toMatchObject({ body: { ok: true, list: [1, 2] } });
	});

	it('is an object literal in the raw output of Set', async () => {
		const source = sourceOf(
			[
				webhook,
				node('Set', 'set', 3.4, [200, 0], {
					mode: 'raw',
					jsonOutput: '={\n  "a": { "b": "c" },\n  "n": 2\n}',
					options: {},
				}),
			],
			[['Webhook', 0, 'Set', 0]],
		);
		expect(source).not.toContain('parseRawJson(');
		const out = await run(source, {});
		expect(out.result).toEqual({ Set: [{ a: { b: 'c' }, n: 2 }] });
	});

	it('stays text that the run parses when it has an expression', () => {
		const source = sourceOf(
			[
				webhook,
				node('Set', 'set', 3.4, [200, 0], {
					mode: 'raw',
					jsonOutput: '={ "a": {{ $json.body.n }} }',
					options: {},
				}),
			],
			[['Webhook', 0, 'Set', 0]],
		);
		expect(source).toContain('parseRawJson(');
	});
});

describe('constant instant of a dateTime condition', () => {
	const INSTANTS = [
		'2024-01-01T00:00:00.000Z',
		'2024-02-29T23:59:59Z',
		'1999-12-31T12:30:00.123+05:30',
		'2030-06-15T08:00:00-04:00',
	];
	const NOT_INSTANTS = [
		'2024-01-01',
		'2024-01-01T00:00:00',
		'2023-02-29T00:00:00Z',
		'2024-01-01T24:00:00Z',
		'2024-13-01T00:00:00Z',
		' 2024-01-01T00:00:00Z',
		'2024-01-01 00:00:00Z',
		'2024-01-01T00:00:00+05:20',
		1704067200000,
	];

	it('is null for text that is not a whole instant', () => {
		for (const value of NOT_INSTANTS) expect(isoInstant(value), String(value)).toBeNull();
	});

	it('is the number that the helper filterDate gives, in each zone', async () => {
		const source = `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook<Json>({ path: 'dates' })],
	zones: ['America/New_York', 'Asia/Kolkata'],
	async run(ctx, trigger) {
		const texts: string[] = trigger.body.texts;
		return [
			texts.map((t) => filterDate(t, 'America/New_York', false, 0)),
			texts.map((t) => filterDate(t, 'Asia/Kolkata', true, 0)),
		];
	},
});

${helperSources(['filterDate']).join('\n\n')}
`;
		const out = await run(source, { texts: INSTANTS });
		const expected = INSTANTS.map(isoInstant);
		expect(expected.every((time) => typeof time === 'number')).toBe(true);
		expect(out.result).toEqual([expected, expected]);
	});

	it('is a number in the code of a Filter node', () => {
		const source = sourceOf(
			[
				webhook,
				node('Recent', 'filter', 2.2, [200, 0], {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
						conditions: [
							{
								id: 'a',
								leftValue: '={{ $json.body.date }}',
								rightValue: '2024-01-01T00:00:00.000Z',
								operator: { type: 'dateTime', operation: 'after' },
							},
						],
						combinator: 'and',
					},
					options: {},
				}),
			],
			[['Webhook', 0, 'Recent', 0]],
		);
		expect(source).toContain(', 1704067200000)');
	});
});
