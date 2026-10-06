import { wrapUntrustedData } from '@n8n/agents';
import { mockHttp, runAction } from '@n8n/node-sdk/testing';
import { actionOfNode } from '@n8n/nodes-integrations';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';

import type { NodeOutputResult } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { declaredShapeNote, declaredVariants, shapeWarningsBlock } from '../declared-shapes';
import {
	firstPageOmissions,
	fixtureOriginsOf,
	liveReadNodeNames,
	sampledReadIssues,
	splitLiveReadFixtures,
	synthesizedFixtures,
} from '../next-workflow-build';

const GET = '@n8n/nodes-core.httpRequestGet';

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
		node('Keep', '@n8n/nodes-core.itemsSet', { fields: { title: '={{ $json.total }}' } }),
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
			'$json.total: missing',
			'$json.total: must be integer, got null',
		]) {
			expect(block).toContain(issue);
		}
		expect(block).not.toContain('state');
		expect(block).toContain('Fix the `schema` to match the real output, or fix the reads');
	});

	it('does not warn for fields that the response has and the declared schema leaves out', async () => {
		const workflow = workflowOf({
			fullResponse: true,
			schema: {
				type: 'object',
				properties: {
					metrics: { type: 'object', properties: { employees: { type: 'number' } } },
					organization: {
						anyOf: [{ type: 'object', properties: { name: { type: 'string' } } }, { type: 'null' }],
					},
				},
			},
		});
		const body = {
			metrics: { employees: 120, employeesRange: '100-250' },
			organization: { name: 'Acme', domain: 'acme.com' },
			logo: null,
		};
		expect(await warningsFor(workflow, [{ body, headers: {}, statusCode: 200 }])).toBeUndefined();
	});

	it('names the fields of an object that misses a declared field', async () => {
		const block = await warningsFor(declared, [{ userIds: [1], total: 1 }]);
		expect(block).toContain(
			'Fetch: the output does not match its declared schema: $json.issues: missing; $json: unknown field(s) userIds. Allowed: issues, total',
		);
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

	it('skips a full response with a status outside 2xx: the schema describes the success body', async () => {
		const fullResponse = workflowOf({ schema: issuesSchema, fullResponse: true, neverError: true });
		const notFound = { statusCode: 404, headers: {}, body: { error: 'not found' } };
		expect(await warningsFor(fullResponse, [notFound])).toBeUndefined();
	});

	it('names at most 10 issues for a node', async () => {
		const properties = Object.fromEntries(
			Array.from({ length: 12 }, (_, index) => [`field${index}`, { type: 'string' }]),
		);
		const block = await warningsFor(workflowOf({ schema: { type: 'object', properties } }), [{}]);
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

describe('liveReadNodeNames', () => {
	it('reads a GET with a declared schema live', () => {
		expect(liveReadNodeNames(declared)).toEqual(['Fetch']);
	});

	it('pins a GET with a sample, the opt-out for a GET that changes state', () => {
		expect(liveReadNodeNames(declared, { Fetch: [{ issues: [] }] })).toEqual([]);
	});

	it('pins a GET that declares no schema', () => {
		expect(liveReadNodeNames(workflowOf({}))).toEqual([]);
	});

	it('reads the first page of a GET that follows pages: it runs without pages', () => {
		const paged = workflowOf({
			schema: issuesSchema,
			items: '={{ $response.body.issues }}',
			pages: { style: 'link', maxPages: 5 },
		});
		expect(liveReadNodeNames(paged)).toEqual(['Fetch']);
		expect(firstPageOmissions(paged, ['Fetch'])).toEqual([
			{ nodeName: 'Fetch', parameter: 'pages' },
		]);
		expect(firstPageOmissions(paged, [])).toEqual([]);
	});

	it('reads a GET with items and no pages live: one request', () => {
		const listed = workflowOf({
			schema: issuesSchema,
			items: '={{ $response.body.issues }}',
		});
		expect(liveReadNodeNames(listed)).toEqual(['Fetch']);
		expect(firstPageOmissions(listed, ['Fetch'])).toEqual([]);
	});

	it('pins a write with a declared schema', () => {
		const send: WorkflowJSON = {
			...declared,
			nodes: declared.nodes.map((entry) =>
				entry.name === 'Fetch'
					? {
							...entry,
							type: '@n8n/nodes-core.httpRequestSend',
							parameters: {
								url: 'https://api.example.com/issues',
								method: 'POST',
								schema: issuesSchema,
							},
						}
					: entry,
			),
		};
		expect(liveReadNodeNames(send)).toEqual([]);
	});
});

describe('first page of a paged live read', () => {
	it('reads one page of a link-paged GET without its page inputs, and checks its items', async () => {
		const paged = workflowOf({
			schema: {
				type: 'array',
				items: { type: 'object', properties: { title: { type: 'string' } } },
			},
			pages: { style: 'link' },
		});
		const fetch = mockHttp([
			{ path: '/issues', query: { page: '2' }, reply: { json: [{ title: 'Second page' }] } },
			{
				path: '/issues',
				reply: {
					json: [{ id: 1, name: 'Bug' }],
					headers: { link: '</issues?page=2>; rel="next"' },
				},
			},
		]);
		const live = liveReadNodeNames(paged);
		const omitted = new Set(firstPageOmissions(paged, live).map(({ parameter }) => parameter));
		const fetchNode = paged.nodes.find(({ name }) => name === 'Fetch');
		const action = fetchNode && actionOfNode(fetchNode);
		if (!fetchNode || !action) throw new Error('no Fetch action');
		const input = Object.fromEntries(
			Object.entries(fetchNode.parameters ?? {}).filter(([key]) => !omitted.has(key)),
		);

		const result = await runAction(action, { input, fetch });

		expect(live).toEqual(['Fetch']);
		expect(fetch.calls).toHaveLength(1);
		const items = result.ok ? result.items : [];
		expect(items).toEqual([{ id: 1, name: 'Bug' }]);
		expect(await warningsFor(paged, items)).toContain('$json.title: missing');
	});
});

describe('sampledReadIssues', () => {
	const sample = { Fetch: [{ issues: [] }] };

	it('tells a GET with a sample and no schema to declare the schema', () => {
		expect(sampledReadIssues(workflowOf({}), sample)).toEqual([
			{
				code: 'SAMPLE_PINS_READ',
				nodeName: 'Fetch',
				severity: 'informational',
				message:
					'"Fetch" has a `sample` and no `schema`, so verification pins the sample and does not read the API. Replace the sample with `schema`, the JSON Schema from the API docs: verification then reads it live and checks the response. Keep a sample only to skip the live read.',
			},
		]);
	});

	it('says nothing without a sample or with a schema', () => {
		expect(sampledReadIssues(workflowOf({}))).toEqual([]);
		expect(sampledReadIssues(declared, sample)).toEqual([]);
	});

	it('tells a GET that follows pages too, as verification reads its first page', () => {
		const paged = workflowOf({ pages: { style: 'link', maxPages: 5 } });
		expect(sampledReadIssues(paged, sample).map(({ nodeName }) => nodeName)).toEqual(['Fetch']);
	});

	it('says nothing for a write with a sample', () => {
		const send: WorkflowJSON = {
			...declared,
			nodes: declared.nodes.map((entry) =>
				entry.name === 'Fetch'
					? {
							...entry,
							type: '@n8n/nodes-core.httpRequestSend',
							parameters: { url: 'https://api.example.com/issues', method: 'POST' },
						}
					: entry,
			),
		};
		expect(sampledReadIssues(send, sample)).toEqual([]);
	});
});

describe('splitLiveReadFixtures', () => {
	const fixtures = synthesizedFixtures(declared);

	it('moves the fixture of a live read to the fallbacks', () => {
		expect(splitLiveReadFixtures(fixtures, ['Fetch'])).toEqual({
			pinned: {},
			liveReadFallbacks: { Fetch: fixtures.Fetch },
		});
	});

	it('keeps the fixture pinned when the credential of the node is mocked', () => {
		expect(splitLiveReadFixtures(fixtures, ['Fetch'], ['Fetch'])).toEqual({
			pinned: fixtures,
			liveReadFallbacks: {},
		});
	});
});

describe('declaredVariants', () => {
	const schema = {
		type: 'object',
		properties: {
			owner: {
				oneOf: [{ type: 'object', properties: { login: { type: 'string' } } }, { type: 'string' }],
			},
			issues: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						assignee: {
							anyOf: [
								{ type: 'object', properties: { id: { type: 'integer' } } },
								{ type: 'null' },
							],
						},
					},
				},
			},
		},
	};
	const workflow = workflowOf({ schema });

	it('gives one fixture per union branch that the default does not take, null first', () => {
		const base = {
			owner: { login: 'octo' },
			issues: [{ assignee: { id: 7 } }, { assignee: null }],
		};

		expect(
			declaredVariants(
				workflow,
				() => [base],
				() => true,
			),
		).toEqual([
			{
				nodeName: 'Fetch',
				branch: '$json.issues[].assignee: null',
				items: [{ owner: { login: 'octo' }, issues: [{ assignee: null }, { assignee: null }] }],
			},
			{
				nodeName: 'Fetch',
				branch: '$json.owner: oneOf[1]',
				items: [{ ...base, owner: 'example' }],
			},
		]);
	});

	it('starts from the example of the declared output without a fixture, and skips excluded nodes', () => {
		expect(
			declaredVariants(
				workflow,
				() => undefined,
				() => true,
			)[0]?.items,
		).toEqual([{ owner: { login: 'example' }, issues: [{ assignee: null }] }]);
		expect(
			declaredVariants(
				workflow,
				() => undefined,
				() => false,
			),
		).toEqual([]);
		expect(
			declaredVariants(
				workflowOf({}),
				() => undefined,
				() => true,
			),
		).toEqual([]);
	});
});
