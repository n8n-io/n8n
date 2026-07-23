import type { AgentJsonConfig, AgentSkill, EvaluationConfigDto } from '@n8n/api-types';

import {
	N8nClient,
	type DataTableColumnsResponse,
	type DataTableRowsResponse,
} from '../n8n-client';

const BASE_URL = 'http://localhost:5678';

/** Builds a minimal `Response`-shaped object for the client's private `fetch()` to consume. */
function jsonResponse(body: unknown): Response {
	return {
		ok: true,
		status: 200,
		headers: { get: () => null },
		json: async () => await Promise.resolve(body),
		text: async () => await Promise.resolve(JSON.stringify(body)),
	} as unknown as Response;
}

/** Stubs `global.fetch` to return `body` for any request, and returns the mock for assertions. */
function stubFetch(body: unknown) {
	const fetchMock = vi.fn(async () => await Promise.resolve(jsonResponse(body)));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('N8nClient — TRUST-229 artifact fetch methods', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getAgentConfig', () => {
		it('requests the agent config route and unwraps the { data } envelope', async () => {
			const config = { instructions: 'Be a helpful assistant.' } as AgentJsonConfig;
			const fetchMock = stubFetch({ data: config });
			const client = new N8nClient(BASE_URL);

			const result = await client.getAgentConfig('proj-1', 'agent-1');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/projects/proj-1/agents/v2/agent-1/config`,
				expect.objectContaining({ method: 'GET' }),
			);
			expect(result).toEqual(config);
		});
	});

	describe('getAgentSkills', () => {
		it('requests the agent skills route and unwraps the { data } envelope', async () => {
			const skills: Record<string, AgentSkill> = {
				'skill-1': {
					name: 'summarize',
					description: 'Summarizes text',
					instructions: 'Summarize the given input concisely.',
					references: [{ path: 'notes.md', content: 'Keep it under 3 sentences.' }],
				},
			};
			const fetchMock = stubFetch({ data: skills });
			const client = new N8nClient(BASE_URL);

			const result = await client.getAgentSkills('proj-1', 'agent-1');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/projects/proj-1/agents/v2/agent-1/skills`,
				expect.objectContaining({ method: 'GET' }),
			);
			expect(result).toEqual(skills);
		});
	});

	describe('getWorkflowEvaluationConfigs', () => {
		it('requests the workflow evaluation-configs route and unwraps the { data } envelope', async () => {
			const configs = [
				{
					id: 'cfg-1',
					workflowId: 'wf-1',
					name: 'Accuracy check',
					status: 'valid',
					invalidReason: null,
					startNodeName: 'Start',
					endNodeName: 'End',
					metrics: [],
					datasetSource: 'data_table',
					datasetRef: { dataTableId: 'dt-1' },
				},
			] as EvaluationConfigDto[];
			const fetchMock = stubFetch({ data: configs });
			const client = new N8nClient(BASE_URL);

			const result = await client.getWorkflowEvaluationConfigs('wf-1');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/workflows/wf-1/evaluation-configs`,
				expect.objectContaining({ method: 'GET' }),
			);
			expect(result).toEqual(configs);
		});
	});

	describe('getDataTableColumns', () => {
		it('requests the data table columns route and unwraps the { data } envelope', async () => {
			const columns: DataTableColumnsResponse = [
				{
					id: 'col-1',
					dataTableId: 'dt-1',
					name: 'email',
					type: 'string',
					index: 0,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z',
				},
			];
			const fetchMock = stubFetch({ data: columns });
			const client = new N8nClient(BASE_URL);

			const result = await client.getDataTableColumns('proj-1', 'dt-1');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/projects/proj-1/data-tables/dt-1/columns`,
				expect.objectContaining({ method: 'GET' }),
			);
			expect(result).toEqual(columns);
		});
	});

	describe('getDataTableRows', () => {
		it('requests the data table rows route and unwraps the double-nested { data: { count, data } } envelope', async () => {
			const rowsPayload: DataTableRowsResponse = {
				count: 1,
				data: [
					{
						id: 1,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
						email: 'a@example.com',
					},
				],
			};
			// Double-nested: the REST envelope's `data` wraps getDataTableRows' own { count, data } return.
			const fetchMock = stubFetch({ data: rowsPayload });
			const client = new N8nClient(BASE_URL);

			const result = await client.getDataTableRows('proj-1', 'dt-1');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/projects/proj-1/data-tables/dt-1/rows`,
				expect.objectContaining({ method: 'GET' }),
			);
			expect(result).toEqual(rowsPayload);
			expect(result.count).toBe(1);
			expect(result.data).toHaveLength(1);
		});
	});
});
