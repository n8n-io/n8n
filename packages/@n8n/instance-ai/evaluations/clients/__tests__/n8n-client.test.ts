import type {
	AgentJsonConfig,
	AgentSkill,
	EvaluationConfigDto,
	InstanceAiEvalSeedAgent,
} from '@n8n/api-types';
import { InstanceAiSendMessageRequest } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import {
	N8nClient,
	type DataTableColumnsResponse,
	type DataTableRowsResponse,
} from '../n8n-client';

const BASE_URL = 'http://localhost:5678';

describe('N8nClient.createCredential', () => {
	afterEach(() => vi.unstubAllGlobals());

	it.each([undefined, null, 'Production reports'])(
		'sends description %s as optional credential metadata',
		async (description) => {
			const fetchMock = stubFetch({ data: { id: 'credential-1' } });
			const data = { accessToken: 'placeholder' };
			await new N8nClient(BASE_URL).createCredential('Account A', 'slackApi', data, description);
			const [url, init] = fetchMock.mock.calls[0];
			expect(url).toBe(`${BASE_URL}/rest/credentials`);
			if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
			expect(jsonParse(init.body)).toEqual({
				name: 'Account A',
				type: 'slackApi',
				data,
				...(description !== undefined ? { description } : {}),
			});
		},
	);
});

describe('N8nClient.sendMessage', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('preserves the Execute target through the REST request schema', async () => {
		const fetchMock = stubFetch({ data: { runId: 'run-1' } });
		const client = new N8nClient(BASE_URL);
		const context = { source: 'setup-panel-execute', workflowId: 'wf-remapped' } as const;
		const attachments = [{ type: 'workflow', id: context.workflowId, name: 'Greeting' }] as const;

		await expect(
			client.sendMessage(
				'thread-1',
				'Run a test.',
				[...attachments],
				'progressive',
				'progressive@1',
				context,
			),
		).resolves.toEqual({ runId: 'run-1' });

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`${BASE_URL}/rest/instance-ai/chat/thread-1`);
		if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
		const body = jsonParse<Record<string, unknown>>(init.body);
		expect(InstanceAiSendMessageRequest.parse(body)).toMatchObject({
			message: 'Run a test.',
			attachments,
			context,
			mode: 'progressive',
			promptVersion: 'progressive@1',
		});
		expect(body).not.toHaveProperty('handoffContext');
	});

	it('sends an Agent attachment through the resource attachment channel', async () => {
		const fetchMock = stubFetch({ data: { runId: 'run-1' } });
		const client = new N8nClient(BASE_URL);
		const attachments = [
			{
				type: 'agent' as const,
				id: 'agent-remapped',
				name: 'Notion research',
				projectId: 'project-1',
			},
		];

		await client.sendMessage('thread-1', 'Inspect this Agent.', attachments);

		const [, init] = fetchMock.mock.calls[0];
		if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
		const body = jsonParse<Record<string, unknown>>(init.body);
		expect(InstanceAiSendMessageRequest.parse(body)).toMatchObject({ attachments });
	});
});

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

describe('N8nClient chat build mode', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('sends an explicit prompt version with the chat message', async () => {
		const fetchMock = stubFetch({ data: { runId: 'run-1' } });
		await new N8nClient(BASE_URL).sendMessage(
			'thread-1',
			'Build it',
			undefined,
			'default',
			'progressive@1',
		);
		expect(fetchMock).toHaveBeenCalledWith(
			`${BASE_URL}/rest/instance-ai/chat/thread-1`,
			expect.objectContaining({
				body: JSON.stringify({
					message: 'Build it',
					mode: 'default',
					promptVersion: 'progressive@1',
				}),
			}),
		);
	});

	it.each([undefined, 'default', 'progressive'] as const)(
		'sends an explicit eval mode when the override is %s',
		async (mode) => {
			const fetchMock = stubFetch({ data: { runId: 'run-1' } });
			const client = new N8nClient(BASE_URL);

			await expect(
				client.sendMessage('thread-1', 'Build a workflow', undefined, mode),
			).resolves.toEqual({ runId: 'run-1' });

			expect(fetchMock).toHaveBeenCalledWith(
				`${BASE_URL}/rest/instance-ai/chat/thread-1`,
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ message: 'Build a workflow', mode: mode ?? 'default' }),
				}),
			);
		},
	);
});

describe('N8nClient — TRUST-229 artifact fetch methods', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getAgentConfig', () => {
		it('requests the agent config route and returns the config from the response', async () => {
			const config = { instructions: 'Be a helpful assistant.' } as AgentJsonConfig;
			const fetchMock = stubFetch({ data: { config, configHash: 'config-hash' } });
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

describe('N8nClient.restoreThread — folder seeding contract', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const FOLDER = { id: 'odwFolder0001', name: 'ODW' };

	function restoreBody(over: Record<string, unknown> = {}) {
		return {
			data: {
				ok: true,
				threadId: 'thread-1',
				restored: 0,
				workflowIds: [],
				dataTableIds: [],
				agentIds: [],
				...over,
			},
		};
	}

	it('fails when folders were requested but the response carries none', async () => {
		// `folderIds` defaults to [] for older backends, which would otherwise read as
		// "restored fine, zero folders" — grading the agent on a folder that does not exist.
		stubFetch(restoreBody());
		const client = new N8nClient(BASE_URL);

		await expect(
			client.restoreThread('thread-1', [], [], [], [], { folders: [FOLDER] }),
		).rejects.toThrow(/predates folder seeding/);
	});

	it('passes when every requested folder comes back, and sends the folders in the body', async () => {
		const fetchMock = stubFetch(restoreBody({ folderIds: ['real-odw'] }));
		const client = new N8nClient(BASE_URL);

		await expect(
			client.restoreThread('thread-1', [], [], [], [], { folders: [FOLDER] }),
		).resolves.toMatchObject({ folderIds: ['real-odw'] });

		const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
		expect(JSON.parse(init.body)).toMatchObject({ folders: [FOLDER] });
	});

	it('still accepts a missing folderIds when no folders were requested', async () => {
		stubFetch(restoreBody());
		const client = new N8nClient(BASE_URL);

		await expect(client.restoreThread('thread-1', [], [])).resolves.toMatchObject({
			folderIds: [],
		});
	});
});

describe('N8nClient.deleteWorkflow', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('still deletes a workflow whose archive step answers 400 (already archived)', async () => {
		// A folder delete archives the workflows it held, so a leftover from a
		// crashed folder case arrives here archived. The archive 400 must not stop
		// the delete, or the leftover survives every eviction and cleanup. Keyed on
		// the status, not the message text, so a reworded server error cannot
		// reintroduce it.
		const fetchMock = vi.fn(async (url: string | URL) => {
			if (String(url).endsWith('/archive')) {
				return new Response(JSON.stringify({ code: 400, message: 'reworded by the server' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return jsonResponse({ data: true });
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new N8nClient(BASE_URL);

		await expect(client.deleteWorkflow('wf-1')).resolves.toBeUndefined();

		const calls = fetchMock.mock.calls.map(([url]) => String(url));
		expect(calls).toEqual([
			`${BASE_URL}/rest/workflows/wf-1/archive`,
			`${BASE_URL}/rest/workflows/wf-1`,
		]);
	});

	it('propagates any other archive failure without deleting', async () => {
		const fetchMock = vi.fn(
			async () => new Response('nope', { status: 500, headers: { 'Content-Type': 'text/plain' } }),
		);
		vi.stubGlobal('fetch', fetchMock);
		const client = new N8nClient(BASE_URL);

		await expect(client.deleteWorkflow('wf-1')).rejects.toThrow(/500/);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('N8nClient.deleteFolderTree', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('deletes every workflow in the subtree, then the folder, and reports the count', async () => {
		const calls: string[] = [];
		const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
			const path = String(url).replace(BASE_URL, '');
			calls.push(`${init?.method ?? 'GET'} ${path.split('?')[0]}`);
			if (path.startsWith('/rest/projects/project-1/folders?')) {
				// The whole project, flat: `stale-odw` holds `archive-1`; `other` is
				// unrelated and must survive.
				return jsonResponse({
					count: 3,
					data: [
						{ id: 'stale-odw', name: 'ODW', parentFolder: null },
						{ id: 'archive-1', name: 'Archive', parentFolder: { id: 'stale-odw' } },
						{ id: 'other', name: 'Finance', parentFolder: null },
					],
				});
			}
			if (path === '/rest/workflows') {
				return jsonResponse({
					data: [
						{
							id: 'wf-in-root',
							name: 'A',
							active: false,
							nodes: [],
							parentFolder: { id: 'stale-odw' },
						},
						{
							id: 'wf-in-child',
							name: 'B',
							active: false,
							nodes: [],
							parentFolder: { id: 'archive-1' },
						},
						{ id: 'wf-elsewhere', name: 'C', active: false, nodes: [], parentFolder: null },
					],
				});
			}
			return jsonResponse({ data: true });
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new N8nClient(BASE_URL);

		await expect(client.deleteFolderTree('project-1', 'stale-odw')).resolves.toBe(2);

		expect(calls).toEqual([
			'GET /rest/projects/project-1/folders',
			'GET /rest/workflows',
			'POST /rest/workflows/wf-in-root/archive',
			'DELETE /rest/workflows/wf-in-root',
			'POST /rest/workflows/wf-in-child/archive',
			'DELETE /rest/workflows/wf-in-child',
			'DELETE /rest/projects/project-1/folders/stale-odw',
		]);
	});
});

describe('N8nClient.getPersonalProjectId', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('fetches the personal project once per client and reuses it', async () => {
		const fetchMock = stubFetch({ data: { id: 'project-1' } });
		const client = new N8nClient(BASE_URL);

		await expect(client.getPersonalProjectId()).resolves.toBe('project-1');
		await expect(client.getPersonalProjectId()).resolves.toBe('project-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries after a failed lookup instead of caching the failure', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response('down', { status: 503, headers: { 'Content-Type': 'text/plain' } }),
			)
			.mockResolvedValueOnce(jsonResponse({ data: { id: 'project-1' } }));
		vi.stubGlobal('fetch', fetchMock);
		const client = new N8nClient(BASE_URL);

		await expect(client.getPersonalProjectId()).rejects.toThrow(/503/);
		await expect(client.getPersonalProjectId()).resolves.toBe('project-1');
	});
});

describe('N8nClient.listFolders', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('pages through the whole project, so a folder past the first page is still seen', async () => {
		const first = Array.from({ length: 250 }, (_, i) => ({
			id: `f${String(i)}`,
			name: `Folder ${String(i)}`,
			parentFolder: null,
		}));
		const fetchMock = vi.fn(async (url: string | URL) => {
			const skip = new URL(String(url)).searchParams.get('skip');
			return jsonResponse(
				skip === '0'
					? { count: 251, data: first }
					: { count: 251, data: [{ id: 'late', name: 'ODW', parentFolder: { id: 'f0' } }] },
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const client = new N8nClient(BASE_URL);

		const folders = await client.listFolders('project-1');

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(folders).toHaveLength(251);
		expect(folders.at(-1)).toEqual({ id: 'late', name: 'ODW', parentFolderId: 'f0' });
	});
});
