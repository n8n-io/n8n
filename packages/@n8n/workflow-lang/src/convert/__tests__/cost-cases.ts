/**
 * The cost of a run in bytecode, for the cost record of converted workflows
 * (`cost.generated.ts`): the corpus workflows, the behaviour cases of the converter and
 * one small workflow (webhook, Set of two fields, Respond to Webhook).
 *
 * A behaviour case gets the answers of its HTTP Request nodes only. A case with a step
 * for the fallback host stops at that step; its cost is the cost up to there, which is
 * the same in each run.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { corpusCases } from '../../__tests__/helpers.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import type { Fixture } from '../../reference/runner.ts';
import { allocationsOf, emptyCost, runModule } from '../../testing/vm.ts';
import { convertWorkflow } from '../index.ts';
import type { BehaviourCase } from './behaviour/case.ts';
import { connect, node } from './workflows.ts';

const here = dirname(fileURLToPath(import.meta.url));
const casesDir = join(here, 'behaviour', 'cases');

export type CostRecord = Record<string, [ops: number, allocations: number]>;

/** Webhook, a Set node with a text field and a field at a path, Respond to Webhook. */
export const SMALL_WORKFLOW = {
	name: 'Small',
	nodes: [
		node('Webhook', 'webhook', 2, [0, 0], {
			httpMethod: 'POST',
			path: 'hook',
			responseMode: 'responseNode',
			options: {},
		}),
		node('Set', 'set', 3.4, [200, 0], {
			assignments: {
				assignments: [
					{ id: 'a', name: 'greeting', value: '=Hello {{ $json.body.name }}', type: 'string' },
					{ id: 'b', name: 'meta.count', value: 3, type: 'number' },
				],
			},
			options: {},
		}),
		node('Respond', 'respondToWebhook', 1.1, [400, 0], {
			respondWith: 'allIncomingItems',
			options: {},
		}),
	],
	connections: connect([
		['Webhook', 0, 'Set', 0],
		['Set', 0, 'Respond', 0],
	]),
};

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

function costOf(name: string, source: string, fixture: Fixture): [number, number] {
	const compiled = compile(source, { fileName: 'workflow.ts' });
	if (!compiled.module) {
		const first = compiled.diagnostics[0];
		throw new Error(`${name} does not compile: ${first?.message ?? 'no module'}`);
	}
	const cost = emptyCost();
	runModule(decodeModule(compiled.module), fixture, { cost });
	return [cost.ops, allocationsOf(cost)];
}

function converted(name: string, workflow: unknown): string {
	const result = convertWorkflow(workflow);
	const errors = result.diagnostics.filter((d) => d.severity === 'error');
	if (errors.length > 0) throw new Error(`${name} does not convert: ${errors[0].message}`);
	return result.source;
}

function behaviourFixture(workflow: { nodes: Array<{ type: string }> }, spec: BehaviourCase) {
	const effects: Record<string, unknown[]> = {};
	for (const [step, http] of Object.entries(spec.http ?? {})) {
		effects[step] = http.responses.map((r) =>
			r.error !== undefined
				? { $error: r.error }
				: {
						status: r.status ?? 200,
						headers:
							r.headers ??
							(typeof r.body === 'string' ? {} : { 'content-type': 'application/json' }),
						body: r.body,
					},
		);
	}
	const schedule = workflow.nodes.some((n) => n.type === 'n8n-nodes-base.scheduleTrigger');
	const fixture: Fixture = {
		trigger: schedule
			? { scheduledAt: spec.trigger.scheduledAt }
			: {
					body: spec.trigger.body,
					headers: spec.trigger.headers ?? {},
					query: spec.trigger.query ?? {},
				},
		now: 1_700_000_000_000,
		seed: 1,
		effects,
	};
	return fixture;
}

/** The instructions and the allocations of each case, by case name. */
export function measureCosts(): CostRecord {
	const costs: CostRecord = {};
	for (const c of corpusCases()) {
		costs[`corpus/${c.name}`] = costOf(c.name, c.source, c.fixture);
	}
	costs['convert/small'] = costOf('small', converted('small', SMALL_WORKFLOW), {
		trigger: { body: { name: 'Ann' }, headers: {}, query: {} },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
	});
	for (const name of readdirSync(casesDir).sort()) {
		const workflow = read<{ nodes: Array<{ type: string }> }>(
			join(casesDir, name, 'workflow.json'),
		);
		const spec = read<BehaviourCase>(join(casesDir, name, 'case.json'));
		costs[`convert/${name}`] = costOf(
			name,
			converted(name, workflow),
			behaviourFixture(workflow, spec),
		);
	}
	return costs;
}

/** The sum of the instructions of the cases whose name starts with `prefix`. */
export function totalOps(costs: CostRecord, prefix: string): number {
	let total = 0;
	for (const [name, [ops]] of Object.entries(costs)) if (name.startsWith(prefix)) total += ops;
	return total;
}

/** The text of `cost.generated.ts` for a record. */
export function recordSource(costs: CostRecord): string {
	const lines = Object.keys(costs)
		.sort()
		.map((key) => `\t${JSON.stringify(key)}: [${costs[key].join(', ')}],`);
	return `/**
 * The executed instructions and the allocations of each corpus workflow and of each
 * converted workflow, in bytecode. \`node scripts/convert-cost.ts --write\` writes the file;
 * \`cost.test.ts\` fails when a number rises.
 */
export const CONVERT_COST: Record<string, [ops: number, allocations: number]> = {
${lines.join('\n')}
};
`;
}
