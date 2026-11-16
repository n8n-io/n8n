import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

/**
 * Pins the wire shape of the Agents-runtime transport: which route each
 * thread-tied `N8nClient` call reaches with `assistantRuntime: 'agents'`.
 */

const BASE = 'http://n8n.test';

interface Call {
	path: string;
	method: string;
	body: unknown;
}

type Reply = { json: unknown } | { sse: string } | { status: number; text: string };

function jsonReply(body: unknown) {
	return {
		ok: true,
		status: 200,
		headers: { get: (name: string) => (name === 'set-cookie' ? 'n8n-auth=cookie; Path=/' : null) },
		json: async () => body,
		text: async () => JSON.stringify(body),
	};
}

/** Routes each request to the first matching reply and records it. */
function mockN8n(routes: Array<[method: string, path: string | RegExp, reply: Reply]>) {
	const calls: Call[] = [];
	const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
		const path = String(url).replace(BASE, '');
		const method = init?.method ?? 'GET';
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ path, method, body });
		const route = routes.find(
			([m, p]) => m === method && (typeof p === 'string' ? p === path : p.test(path)),
		);
		if (!route) return jsonReply({ data: {} });
		const reply = route[2];
		if ('sse' in reply) return new Response(reply.sse, { status: 200 });
		if ('status' in reply) {
			return {
				ok: false,
				status: reply.status,
				headers: { get: () => null },
				text: async () => reply.text,
			};
		}
		return jsonReply(reply.json);
	});
	vi.stubGlobal('fetch', fn);
	return calls;
}

function sse(...events: Array<Record<string, unknown>>): string {
	return [':ok', ...events.map((event) => `data: ${JSON.stringify(event)}`)].join('\n\n') + '\n\n';
}

async function agentsClient(): Promise<N8nClient> {
	const client = new N8nClient(BASE, { assistantRuntime: 'agents' });
	await client.login('owner@n8n.test', 'password');
	return client;
}

/** Calls after login. */
function afterLogin(calls: Call[]): Call[] {
	return calls.filter((call) => call.path !== '/rest/login');
}

afterEach(() => vi.unstubAllGlobals());

describe('N8nClient on the Agents runtime', () => {
	it('defaults to instance-ai and has no Agents transport', () => {
		const client = new N8nClient(BASE);
		expect(client.assistantRuntime).toBe('instance-ai');
		expect(client.assistantAgents()).toBeUndefined();
	});

	it('creates and deletes threads through the eval thread routes, with the thread provenance', async () => {
		const calls = mockN8n([
			[
				'POST',
				'/rest/assistant/eval/threads',
				{ json: { data: { threadId: 't-1', projectId: 'p-1' } } },
			],
			['DELETE', '/rest/assistant/eval/threads/t-1', { json: { data: { ok: true } } }],
		]);
		const client = await agentsClient();

		await client.ensureThread('t-1', 'p-1', { evalCase: 'slack-digest', evalIteration: 1 });
		await client.deleteThread('t-1');

		expect(afterLogin(calls)).toEqual([
			{
				path: '/rest/assistant/eval/threads',
				method: 'POST',
				body: {
					threadId: 't-1',
					projectId: 'p-1',
					source: 'evals',
					sourceContext: { evalCase: 'slack-digest', evalIteration: 1 },
				},
			},
			{ path: '/rest/assistant/eval/threads/t-1', method: 'DELETE', body: undefined },
		]);
	});

	it('sends the thread source without a source context when the case has none', async () => {
		const calls = mockN8n([]);
		const client = await agentsClient();

		await client.ensureThread('t-1', 'p-1');

		expect(afterLogin(calls)).toEqual([
			{
				path: '/rest/assistant/eval/threads',
				method: 'POST',
				body: { threadId: 't-1', projectId: 'p-1', source: 'evals' },
			},
		]);
	});

	it('sets the overrides once per thread, then sends with the project and client context', async () => {
		const calls = mockN8n([
			[
				'POST',
				/^\/rest\/agents\/system\/assistant\/chat\?/,
				{ sse: sse({ type: 'message-queued', queueId: 'q-1' }) },
			],
		]);
		const client = await agentsClient();
		await client.ensureThread('t-1', 'p-1');
		const attachments = [{ type: 'workflow' as const, id: 'wf-1' }];

		await client.sendMessage('t-1', 'Build it', attachments, 'v7', undefined, 1000);
		await client.sendMessage('t-1', 'Rename it', undefined, 'v7', undefined, 1000);

		const sent = afterLogin(calls).slice(1);
		expect(sent).toEqual([
			{
				path: '/rest/assistant/eval/threads/t-1/overrides',
				method: 'PUT',
				// The Assistant agent has no observer threshold override.
				body: { promptVersion: 'v7' },
			},
			{
				path: '/rest/agents/system/assistant/chat?projectId=p-1',
				method: 'POST',
				body: { message: 'Build it', sessionId: 't-1', clientContext: { attachments } },
			},
			{
				path: '/rest/agents/system/assistant/chat?projectId=p-1',
				method: 'POST',
				body: { message: 'Rename it', sessionId: 't-1', clientContext: {} },
			},
		]);
	});

	it('throws when the chat stream starts with an error event', async () => {
		mockN8n([
			[
				'POST',
				/^\/rest\/agents\/system\/assistant\/chat/,
				{ sse: sse({ type: 'error', message: 'No model configured' }) },
			],
		]);
		const client = await agentsClient();

		await expect(client.sendMessage('t-1', 'hi')).rejects.toThrow(
			'Assistant chat failed: No model configured',
		);
	});

	it('throws when the chat stream ends before the message is queued', async () => {
		mockN8n([
			['POST', /^\/rest\/agents\/system\/assistant\/chat/, { sse: sse({ type: 'heartbeat' }) }],
		]);
		const client = await agentsClient();

		await expect(client.sendMessage('t-1', 'hi')).rejects.toThrow(
			'Assistant chat failed: the response ended before any event',
		);
	});

	it('throws when the resume stream ends before any event', async () => {
		mockN8n([['POST', '/rest/agents/system/assistant/chat/resume', { sse: '' }]]);
		const client = await agentsClient();

		await expect(
			client.assistantAgents()?.resume('run-1', 'call-1', { kind: 'approval', approved: true }),
		).rejects.toThrow('Assistant resume failed: the response ended before any event');
	});

	it('skips stream events until the message is queued', async () => {
		mockN8n([
			[
				'POST',
				/^\/rest\/agents\/system\/assistant\/chat/,
				{
					sse: sse(
						{ type: 'heartbeat' },
						{ type: 'message-queued' },
						{ type: 'error', message: 'later' },
					),
				},
			],
		]);
		const client = await agentsClient();

		await expect(client.sendMessage('t-1', 'hi')).resolves.toEqual({ runId: '' });
	});

	it('resumes a card and returns on the first stream event', async () => {
		const calls = mockN8n([
			[
				'POST',
				'/rest/agents/system/assistant/chat/resume',
				{ sse: sse({ type: 'execution-started', executionId: 'exec-2' }) },
			],
		]);
		const client = await agentsClient();

		await client.assistantAgents()?.resume('run-1', 'call-1', { kind: 'approval', approved: true });

		expect(afterLogin(calls)).toEqual([
			{
				path: '/rest/agents/system/assistant/chat/resume',
				method: 'POST',
				body: {
					runId: 'run-1',
					toolCallId: 'call-1',
					resumeData: { kind: 'approval', approved: true },
				},
			},
		]);
	});

	it('reads history and usage, and unwraps the REST envelope', async () => {
		const history = {
			messages: [
				{
					id: 'exec-1:assistant',
					role: 'assistant',
					executionId: 'exec-1',
					executionStatus: 'success',
					content: [{ type: 'text', text: 'Done.' }],
				},
			],
			openSuspensions: [
				{ toolCallId: 'call-1', runId: 'run-1', suspendPayload: { requestId: 'r' } },
			],
			activeExecutionId: null,
		};
		const total = {
			promptTokens: 10,
			completionTokens: 2,
			totalTokens: 12,
			cacheReadTokens: null,
			cacheWriteTokens: null,
			cost: null,
		};
		const usage = { executions: [], total };
		mockN8n([
			['GET', '/rest/agents/system/assistant/chat/t-1/messages', { json: { data: history } }],
			['GET', '/rest/agents/system/assistant/chat/t-1/usage', { json: { data: usage } }],
		]);
		const client = await agentsClient();

		await expect(client.assistantAgents()?.getHistory('t-1')).resolves.toEqual(history);
		await expect(client.assistantAgents()?.getUsage('t-1')).resolves.toEqual(usage);
	});

	it('cancels the active execution, and does nothing when no turn runs', async () => {
		const calls = mockN8n([
			[
				'GET',
				'/rest/agents/system/assistant/chat/t-1/messages',
				{ json: { data: { messages: [], openSuspensions: [], activeExecutionId: 'exec-9' } } },
			],
			[
				'GET',
				'/rest/agents/system/assistant/chat/t-2/messages',
				{ json: { data: { messages: [], openSuspensions: [], activeExecutionId: null } } },
			],
		]);
		const client = await agentsClient();

		await client.cancelRun('t-1');
		await client.cancelRun('t-2');

		expect(afterLogin(calls).map((call) => `${call.method} ${call.path}`)).toEqual([
			'GET /rest/agents/system/assistant/chat/t-1/messages',
			'DELETE /rest/agents/system/assistant/chat/t-1/executions/exec-9',
			'GET /rest/agents/system/assistant/chat/t-2/messages',
		]);
	});

	it('sends the thread eval routes to the Assistant eval prefix', async () => {
		const calls = mockN8n([
			[
				'POST',
				'/rest/assistant/eval/restore-execution',
				{ json: { data: { ok: true, executionId: 'e-1' } } },
			],
		]);
		const client = await agentsClient();

		await client.setThreadCredentialAllowlist('t-1', ['c-1']);
		await client.setThreadCredentialTestTarget('t-1', {
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in',
			urlField: 'url',
		});
		await client.seedDataTableRows('t-1', 'dt-1', [{ name: 'a' }]);
		await client.restoreExecution('t-1', 'wf-1', {} as never);

		expect(afterLogin(calls).map((call) => `${call.method} ${call.path}`)).toEqual([
			'POST /rest/assistant/eval/thread-credential-allowlist',
			'POST /rest/assistant/eval/thread-credential-test-target',
			'POST /rest/assistant/eval/seed-data-table-rows',
			'POST /rest/assistant/eval/restore-execution',
		]);
	});

	it('keeps the mock-execution routes on the Instance AI prefix', async () => {
		const calls = mockN8n([
			[
				'POST',
				'/rest/instance-ai/eval/execute-with-llm-mock/wf-1',
				{ json: { data: { success: true, nodeResults: {} } } },
			],
		]);
		const client = await agentsClient();

		await client.executeWithLlmMock('wf-1');

		expect(afterLogin(calls)[0].path).toBe('/rest/instance-ai/eval/execute-with-llm-mock/wf-1');
	});

	it('fails loudly on Instance AI-only routes', async () => {
		mockN8n([]);
		const client = await agentsClient();

		await expect(client.getThreadStatus('t-1')).rejects.toThrow(
			'N8nClient.getThreadStatus is not available on the Agents runtime',
		);
		await expect(client.confirmAction('r-1', { kind: 'approval', approved: true })).rejects.toThrow(
			/not available on the Agents runtime/,
		);
		await expect(client.getThreadMemory('t-1')).rejects.toThrow(
			'N8nClient.getThreadMemory is not available on the Agents runtime',
		);
		await expect(client.getThreadMessages('t-1')).resolves.toEqual({
			threadId: 't-1',
			messages: [],
			nextEventId: 0,
		});
	});

	describe('assertEnabled', () => {
		it('passes when the instance serves the Assistant agent', async () => {
			mockN8n([
				[
					'GET',
					'/rest/module-settings',
					{ json: { data: { 'instance-ai': { assistantAgentEnabled: true } } } },
				],
			]);
			const client = await agentsClient();

			await expect(client.assistantAgents()?.assertEnabled()).resolves.toBeUndefined();
		});

		it.each([
			['disabled', { 'instance-ai': { assistantAgentEnabled: false } }],
			['missing', {}],
		])('fails fast when the flag is %s', async (_label, settings) => {
			mockN8n([['GET', '/rest/module-settings', { json: { data: settings } }]]);
			const client = await agentsClient();

			await expect(client.assistantAgents()?.assertEnabled()).rejects.toThrow(
				/assistantAgentEnabled/,
			);
		});
	});
});
