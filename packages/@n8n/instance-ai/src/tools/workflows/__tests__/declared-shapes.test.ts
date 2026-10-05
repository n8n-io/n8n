import { wrapUntrustedData } from '@n8n/agents';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';

import type { NodeOutputResult } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { declaredShapeNote, shapeWarningsBlock } from '../declared-shapes';
import { fixtureOriginsOf, synthesizedFixtures } from '../next-workflow-build';

const GET = '@n8n/nodes-base-next.httpRequestGet';

const node = (name: string, type: string, parameters: IDataObject) => ({
	id: name,
	name,
	type,
	typeVersion: 3,
	position: [0, 0] as [number, number],
	parameters,
});

const issuesSchema = {
	type: 'object',
	properties: {
		issues: {
			type: 'array',
			items: { type: 'object', properties: { title: { type: 'string' } } },
		},
		total: { type: 'integer' },
	},
};

const workflowOf = (parameters: IDataObject): WorkflowJSON => ({
	name: 'Issues',
	connections: {
		Start: { main: [[{ node: 'Fetch', type: 'main', index: 0 }]] },
		Fetch: { main: [[{ node: 'Keep', type: 'main', index: 0 }]] },
	},
	nodes: [
		node('Start', 'n8n-nodes-base.manualTrigger', {}),
		node('Fetch', GET, { url: 'https://api.example.com/issues', ...parameters }),
		node('Keep', '@n8n/nodes-base-next.itemsSet', { fields: { title: '={{ $json.total }}' } }),
	],
});

const declared = workflowOf({ schema: issuesSchema });

const outputOf = (nodeName: string, items: unknown[]): NodeOutputResult => ({
	nodeName,
	outputs: [
		{
			index: 0,
			totalItems: items.length,
			items: items.map((item, index) =>
				wrapUntrustedData(
					JSON.stringify(item, null, 2),
					'execution-output',
					`node:${nodeName}[0][${index}]`,
				),
			),
		},
	],
	totalItems: items.length,
	returned: { from: 0, to: items.length },
});

const warningsFor = async (workflow: WorkflowJSON, items: unknown[]) =>
	await shapeWarningsBlock({
		workflow,
		readOutput: async (nodeName) => await Promise.resolve(outputOf(nodeName, items)),
	});

describe('shapeWarningsBlock', () => {
	it('names each path where the output differs from the declared schema', async () => {
		const block = await warningsFor(declared, [
			{ issues: [{ title: 5, state: 'open' }], extra: 1 },
			{ issues: [], total: null },
		]);
		expect(block).toMatch(/^<untrusted_data source="verification" label="shape-warnings">\n/);
		expect(block).toContain('Fetch: the output does not match its declared schema:');
		for (const issue of [
			'$json: unknown field(s) extra. Allowed: issues, total',
			'$json.issues[].title: must be string, got 5',
			'$json.issues[]: unknown field(s) state. Allowed: title',
			'$json.total: missing',
			'$json.total: must be integer, got null',
		]) {
			expect(block).toContain(issue);
		}
		expect(block).toContain('Fix the `schema` to match the real output, or fix the reads');
	});

	it('names a repeated issue once', async () => {
		const block = await warningsFor(declared, [{ total: 1 }, { total: 2 }]);
		expect(block?.match(/\$json\.issues: missing/g)).toHaveLength(1);
	});

	it('keeps a field optional when the object lists its required fields', async () => {
		const workflow = workflowOf({ schema: { ...issuesSchema, required: ['total'] } });
		expect(await warningsFor(workflow, [{ total: 1 }])).toBeUndefined();
	});

	it('finds no drift in the fixture made from the declared schema', async () => {
		const fixtures = synthesizedFixtures(declared);
		expect(await warningsFor(declared, fixtures.Fetch ?? [])).toBeUndefined();
	});

	it('skips truncated items and error items', async () => {
		expect(
			await warningsFor(declared, [
				{ _truncatedItem: true, preview: '{', originalLength: 9 },
				{ error: 'Not found' },
			]),
		).toBeUndefined();
	});

	it('names at most 10 issues for a node', async () => {
		const items = Array.from({ length: 12 }, (_, index) => ({ [`extra${index}`]: index }));
		const block = await warningsFor(
			workflowOf({ schema: { type: 'object', properties: {} } }),
			items,
		);
		expect(block).toContain('(2 more)');
	});

	it('reads only the reached nodes that declare a schema', async () => {
		const readOutput = vi.fn(
			async (nodeName: string) => await Promise.resolve(outputOf(nodeName, [])),
		);
		await shapeWarningsBlock({ workflow: workflowOf({}), readOutput });
		await shapeWarningsBlock({ workflow: declared, reached: ['Start'], readOutput });
		expect(readOutput).not.toHaveBeenCalled();
		await shapeWarningsBlock({ workflow: declared, reached: ['Start', 'Fetch'], readOutput });
		expect(readOutput.mock.calls).toEqual([['Fetch']]);
	});

	it('skips a node whose output it cannot read', async () => {
		const block = await shapeWarningsBlock({
			workflow: declared,
			readOutput: async () => await Promise.reject(new Error('Node "Fetch" not found')),
		});
		expect(block).toBeUndefined();
	});
});

describe('declaredShapeNote', () => {
	const outcomeOf = (workflow: WorkflowJSON) => {
		const fixtures = synthesizedFixtures(workflow);
		return {
			nodeSimulationPlan: Object.keys(fixtures).map((nodeName) => ({
				nodeName,
				verdict: 'simulate' as const,
				reason: 'test',
				confidence: 'high' as const,
				source: 'deterministic' as const,
			})),
			simulationFixtures: fixtures,
			fixtureOrigins: fixtureOriginsOf(workflow, fixtures),
		} as WorkflowBuildOutcome;
	};

	it('names the reached nodes that ran on a fixture made from their declared schema', () => {
		expect(fixtureOriginsOf(declared, synthesizedFixtures(declared))).toEqual({
			Fetch: 'declared',
		});
		expect(declaredShapeNote(declared, outcomeOf(declared))).toBe(
			'Verification pinned a fixture made from the declared `schema` of Fetch, so this response shape is unproven. Take the schema from the API docs; a real run of the node reports where the response differs.',
		);
		expect(declaredShapeNote(declared, outcomeOf(declared), ['Start'])).toBeUndefined();
	});

	it('says nothing for a node without a declared schema', () => {
		const plain = workflowOf({});
		expect(fixtureOriginsOf(plain, synthesizedFixtures(plain))).toEqual({ Fetch: 'synthesized' });
		expect(declaredShapeNote(plain, outcomeOf(plain))).toBeUndefined();
	});
});
