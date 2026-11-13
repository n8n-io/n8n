/**
 * Luxon in parameter expressions: the converted workflow gives the same value
 * as n8n's expression evaluator, with the same clock and time zone.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { compile } from '../../../compiler/index.ts';
import { runReference } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { convertWorkflow } from '../../index.ts';
import { rewriteLuxon } from '../luxon-expression.ts';

interface V1Workflow {
	expression: {
		getParameterValue(
			value: string,
			runExecutionData: null,
			runIndex: number,
			itemIndex: number,
			nodeName: string,
			items: Array<{ json: unknown }>,
			mode: string,
			additionalKeys: Record<string, unknown>,
		): unknown;
	};
}

const v1 = createRequire(import.meta.url)('n8n-workflow') as {
	Workflow: new (p: Record<string, unknown>) => V1Workflow;
};

const nodeTypes = {
	getByName: () => ({ description: { properties: [] } }),
	getByNameAndVersion: () => ({ description: { properties: [] } }),
	getKnownTypes: () => ({}),
};

/** The value of `expression` in n8n's evaluator at time `now`. */
function v1Value(expression: string, timezone: string, now: number, json: unknown): unknown {
	const realNow = Date.now;
	Date.now = () => now;
	try {
		const wf = new v1.Workflow({
			nodes: [
				{ id: '1', name: 'Set', type: 'x.y', typeVersion: 1, position: [0, 0], parameters: {} },
			],
			connections: {},
			active: false,
			nodeTypes,
			settings: { timezone },
		});
		return wf.expression.getParameterValue(expression, null, 0, 0, 'Set', [{ json }], 'manual', {});
	} finally {
		Date.now = realNow;
	}
}

type Case = [expression: string, type: 'string' | 'number' | 'boolean'];

const CASES: Case[] = [
	['={{ $now.toISO() }}', 'string'],
	["={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}", 'string'],
	["={{ $now.minus({ days: 7 }).toFormat('yyyy-MM-dd') }}", 'string'],
	['={{ $now.plus({ days: 1, hours: 3 }).toISO() }}', 'string'],
	["={{ $now.startOf('day').toISO() }}", 'string'],
	["={{ $now.endOf('month').toISO() }}", 'string'],
	['={{ $today.toISO() }}', 'string'],
	["={{ $today.minus({ months: 1 }).toFormat('dd/MM/yyyy') }}", 'string'],
	["={{ $now.setZone('Europe/Berlin').toFormat('HH:mm ZZ cccc') }}", 'string'],
	["={{ $now.setZone('UTC').toISO() }}", 'string'],
	['={{ $now.toUTC().toISO() }}', 'string'],
	['={{ $now.toLocal().toISODate() }}', 'string'],
	['={{ $now.toMillis() }}', 'number'],
	['={{ $now.toSeconds() }}', 'number'],
	["={{ $now.diff($today, 'hours').hours }}", 'number'],
	["={{ $now.diff($today).as('minutes') }}", 'number'],
	["={{ Math.floor(DateTime.fromISO($json.body.d).diff($now, 'days').days) }}", 'number'],
	["={{ $now.diff(DateTime.fromISO($json.body.d), ['months', 'days']).months }}", 'number'],
	["={{ DateTime.fromISO($json.body.d).diff($now, ['weeks', 'hours']).as('days') }}", 'number'],
	['={{ $now.weekday }}', 'number'],
	['={{ $now.hour }}', 'number'],
	['={{ $now.zoneName }}', 'string'],
	['={{ $now.offset }}', 'number'],
	['={{ DateTime.now().toISODate() }}', 'string'],
	['={{ DateTime.fromISO($json.body.d).toISO() }}', 'string'],
	["={{ DateTime.fromISO($json.body.d, { zone: 'utc' }).toFormat('yyyy LLL d') }}", 'string'],
	['={{ DateTime.fromMillis($json.body.ms).toISO() }}', 'string'],
	['={{ DateTime.fromISO($json.body.d) < $now.minus({ days: 30 }).toMillis() }}', 'boolean'],
	["=Report {{ $now.toFormat('MMMM yyyy') }} for {{ $json.body.d }}", 'string'],
	['={{ $now.toString() }}', 'string'],
	["={{ $today.format('MM/dd/yyyy') }}", 'string'],
];

/** Times around the DST changes of New York and Berlin, and a plain day. */
const TIMES = [Date.UTC(2026, 2, 8, 6, 30), Date.UTC(2026, 9, 25, 0, 15), 1_789_000_123_456];
const ZONES: Array<{ settings?: string; option?: string; v1: string }> = [
	{ settings: 'America/New_York', v1: 'America/New_York' },
	{ settings: 'Asia/Kolkata', v1: 'Asia/Kolkata' },
	{ settings: 'UTC', v1: 'UTC' },
	{ option: 'Australia/Sydney', v1: 'Australia/Sydney' },
	{ v1: 'America/New_York' },
];
const BODY = { d: '2025-12-31T22:45:00', ms: 1_767_000_000_000 };

function workflow(timezone: string | undefined) {
	return {
		name: 'Luxon expressions',
		settings: timezone === undefined ? {} : { timezone },
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'a' },
			},
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [200, 0],
				parameters: {
					assignments: {
						assignments: CASES.map(([value, type], k) => ({
							id: String(k),
							name: `v${k}`,
							type,
							value,
						})),
					},
					options: {},
				},
			},
		],
		connections: { Hook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
	};
}

describe('Luxon in expressions', () => {
	it.each(ZONES)('gives the values of n8n (zone $v1)', async (zone) => {
		const out = convertWorkflow(workflow(zone.settings), {
			trace: 'all',
			timezone: zone.option,
		});
		expect(out.ok).toBe(true);
		expect(out.fallbackNodes).toEqual([]);
		const compiled = compile(out.source, { fileName: '/workflow.ts' });
		expect(compiled.ok).toBe(true);
		for (const now of TIMES) {
			const expected: Record<string, unknown> = {};
			CASES.forEach(([value], k) => {
				const v = v1Value(value, zone.v1, now, { body: BODY });
				expected[`v${k}`] = v;
			});
			const fixture = { trigger: { body: BODY }, now, seed: 1, effects: {}, trace: true };
			const ref = await runReference(out.source, fixture);
			expect((ref.trace ?? []).find((t) => t.step === 'Set')?.items).toEqual([expected]);
			if (!compiled.data) throw new Error('no module');
			const vm = runModule(compiled.data, fixture);
			expect((vm.trace ?? []).find((t) => t.step === 'Set')?.items).toEqual([expected]);
		}
	});

	it.each([
		['$now.toFormat(fmt)', 'Luxon toFormat'],
		["$now.toFormat('DDDD')", 'Luxon toFormat'],
		['$now.setZone(zone)', 'Luxon zone'],
		['$now', 'Luxon value'],
		['String($now)', 'Luxon value'],
		['$now.toRelative()', 'Luxon toRelative'],
		["DateTime.fromFormat('1/2', 'M/d').toISO()", 'Luxon DateTime'],
		["$now.diff($today, 'fortnights').days", 'Luxon diff'],
		['$now?.toISO()', 'optional chain'],
	])('keeps %s in the host', (code, feature) => {
		const r = rewriteLuxon(code, 'America/New_York');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.feature).toBe(feature);
	});
});
