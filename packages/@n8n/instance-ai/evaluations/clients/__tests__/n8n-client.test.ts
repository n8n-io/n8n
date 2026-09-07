import type {
	AgentJsonConfig,
	AgentSkill,
	EvaluationConfigDto,
	InstanceAiEvalSeedAgent,
} from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

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

/** Reads back what the client sent — its request bodies are always JSON strings. */
function sentBody(init: RequestInit | undefined): { timeoutMs?: number } {
	const body = init?.body;
	return typeof body === 'string' ? jsonParse<{ timeoutMs?: number }>(body) : {};
}

/** Stubs `global.fetch` to return `body` for any request, and returns the mock for assertions. */
function stubFetch(body: unknown) {
	const fetchMock = vi.fn(
		async (_url: string | URL, _init?: RequestInit) => await Promise.resolve(jsonResponse(body)),
	);
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

	// undici's own timeouts are disabled process-wide, so an unsignalled request
	// hangs forever against a lane that stops answering.
	describe('request bound', () => {
		it('applies the default floor to a call that passes no budget', async () => {
			const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
			const fetchMock = stubFetch({ data: { id: 'proj-1' } });
			const client = new N8nClient(BASE_URL);

			await client.getPersonalProjectId();

			expect(timeoutSpy).toHaveBeenCalledWith(120_000);
			expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
		});

		it("honours a caller's own budget instead of capping it at the floor", async () => {
			const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
			const fetchMock = stubFetch({ data: { success: true, nodeResults: {}, errors: [] } });
			const client = new N8nClient(BASE_URL);

			await client.executeWithLlmMock('wf-1', undefined, 900_000);

			expect(timeoutSpy).toHaveBeenCalledWith(900_000);
			expect(timeoutSpy).not.toHaveBeenCalledWith(120_000);
			// Server gives up first, so the caller gets an in-band error.
			expect(sentBody(fetchMock.mock.calls[0][1]).timeoutMs).toBe(895_000);
		});

		it('does not truncate a complex case budget when forwarding it', async () => {
			const fetchMock = stubFetch({ data: {} });
			const client = new N8nClient(BASE_URL);

			// 1350s = the 1.5x budget a `complex` case carries.
			await client.executeWithLlmMock('wf-1', undefined, 1_350_000);
			await client.executeAgentWithLlmMock('agent-1', 'proj-1', undefined, 1_350_000);

			for (const call of fetchMock.mock.calls) {
				expect(sentBody(call[1]).timeoutMs).toBe(1_345_000);
			}
		});

		it('gives bulk thread restore its own larger budget', async () => {
			const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
			stubFetch({
				data: { ok: true, threadId: 't-1', restored: 0, workflowIds: [], dataTableIds: [] },
			});
			const client = new N8nClient(BASE_URL);

			await client.restoreThread('t-1', [], []);

			expect(timeoutSpy).toHaveBeenCalledWith(300_000);
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

describe('N8nClient.restoreThread — agent seeding contract', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const AGENT: InstanceAiEvalSeedAgent = {
		id: 'AgEnT12345678901',
		config: {
			name: 'Support Triage',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Triage tickets.',
		} as AgentJsonConfig,
	};

	function restoreBody(over: Record<string, unknown> = {}) {
		return {
			data: {
				ok: true,
				threadId: 'thread-1',
				restored: 1,
				workflowIds: [],
				dataTableIds: [],
				...over,
			},
		};
	}

	it('fails when agents were requested but the response carries none', async () => {
		// `agentIds` defaults to [] for older backends, which would otherwise read as
		// "restored fine, zero agents" — running the case unseeded.
		stubFetch(restoreBody());
		const client = new N8nClient(BASE_URL);

		await expect(client.restoreThread('thread-1', [], [], [], [AGENT])).rejects.toThrow(
			/predates agent seeding/,
		);
	});

	it('fails when fewer agents come back than were requested', async () => {
		stubFetch(restoreBody({ agentIds: ['AgEnT12345678901'] }));
		const client = new N8nClient(BASE_URL);

		await expect(
			client.restoreThread('thread-1', [], [], [], [AGENT, { ...AGENT, id: 'AgEnT99999999999' }]),
		).rejects.toThrow(/asked to seed 2 agent\(s\)/);
	});

	it('passes when every requested agent comes back', async () => {
		stubFetch(restoreBody({ agentIds: ['AgEnT12345678901'] }));
		const client = new N8nClient(BASE_URL);

		await expect(client.restoreThread('thread-1', [], [], [], [AGENT])).resolves.toMatchObject({
			agentIds: ['AgEnT12345678901'],
		});
	});

	it('still accepts a missing agentIds when no agents were requested', async () => {
		// A workflow/data-table-only seed must keep working against any backend.
		stubFetch(restoreBody());
		const client = new N8nClient(BASE_URL);

		await expect(client.restoreThread('thread-1', [], [])).resolves.toMatchObject({ agentIds: [] });
	});
});
