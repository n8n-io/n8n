import type { BuiltTool } from '@n8n/agents';
import {
	toolCallEvidenceSchema,
	toolCallSimulationSchema,
	type ToolTestCapability,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type {
	ICredentialsHelper,
	IExecuteFunctions,
	INode,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { InstrumentedRunUnsupportedError } from '../../tools/instrumented-run-guard';
import { SimulationBlockedError, SimulationSession } from '../simulation-session';
import type { SimulatedReply, SimulationWorld } from '../tool-simulation.contracts';

function makeWorld(
	reply: SimulatedReply | (() => Promise<SimulatedReply>),
): Mocked<SimulationWorld> {
	return {
		worldId: 'world-1',
		backend: 'llm-mock',
		handleRequest: vi.fn(async () => (typeof reply === 'function' ? await reply() : reply)),
	};
}

const slackCapability: ToolTestCapability = {
	toolName: 'send_slack',
	kind: 'node',
	testability: 'simulated',
};

function nodeTool(name: string, nodeType: string, handler: BuiltTool['handler']): BuiltTool {
	return { name, description: name, metadata: { kind: 'node', nodeType }, handler };
}

const slackNode = mock<INode>({ type: 'n8n-nodes-base.slack', name: 'Slack' });

/** Runs a tool through the session, the way the agent runtime does. */
async function runTool(session: SimulationSession, tool: BuiltTool, toolCallId = 'tc-1') {
	return await session.interceptor(
		{ tool, toolCallId, input: {} },
		async () => await tool.handler!({}, {}),
	);
}

/** A node tool whose handler sends one HTTP request through the instrumented additionalData. */
function slackTool(session: SimulationSession, swallowErrors = false) {
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	session
		.instrumentation()
		.configureToolAdditionalData?.(additionalData, { toolName: 'send_slack', toolKind: 'node' });
	const handler = vi.fn(async () => {
		try {
			return await additionalData.evalLlmMockHandler!(
				{ url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { text: 'hi' } },
				slackNode,
			);
		} catch (error) {
			if (swallowErrors) return { error: 'request failed' };
			throw error;
		}
	});
	return { tool: nodeTool('send_slack', 'n8n-nodes-base.slack', handler), handler, additionalData };
}

describe('SimulationSession', () => {
	it('runs local built-in tools normally and gives them no route', async () => {
		const session = new SimulationSession({
			testChatId: 't',
			world: makeWorld({ outcome: 'unsupported' }),
			capabilities: [],
		});
		const handler = vi.fn(async () => await Promise.resolve('plan saved'));

		await expect(runTool(session, { name: 'create_plan', description: '', handler })).resolves.toBe(
			'plan saved',
		);
		expect(session.takeDecision('tc-1')).toBeUndefined();
	});

	it('marks a call that the LLM mock answered as simulated_made_up', async () => {
		const world = makeWorld({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: { ok: true },
		});
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});
		const { tool } = slackTool(session);

		await expect(runTool(session, tool)).resolves.toEqual({
			body: { ok: true },
			headers: {},
			statusCode: 200,
		});
		expect(world.handleRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				protocol: 'http',
				method: 'POST',
				url: 'https://slack.com/api/chat.postMessage',
			}),
			expect.objectContaining({
				toolCallId: 'tc-1',
				toolName: 'send_slack',
				nodeType: 'n8n-nodes-base.slack',
			}),
		);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated_made_up',
			reason: 'invented_by_llm',
		});
	});

	it('marks a call served from world state as simulated', async () => {
		const world = makeWorld({ outcome: 'served', source: 'world_state', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});

		await runTool(session, slackTool(session).tool);

		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
		});
	});

	it('blocks the call when the simulator does not support the request, even if the tool swallows the error', async () => {
		const world = makeWorld({
			outcome: 'unsupported',
			detail: 'Slack chat.postMessage is not supported',
		});
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});

		await expect(runTool(session, slackTool(session, true).tool)).rejects.toThrow(
			SimulationBlockedError,
		);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'unsupported_by_simulator',
			detail: 'Slack chat.postMessage is not supported',
		});
	});

	it('blocks the call when the simulator throws, and never returns undefined to the HTTP seam', async () => {
		const world = makeWorld(async () => await Promise.reject(new Error('connection refused')));
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});
		const { tool, additionalData } = slackTool(session);

		await expect(runTool(session, tool)).rejects.toThrow(SimulationBlockedError);
		expect(session.takeDecision('tc-1')).toMatchObject({
			route: 'blocked',
			reason: 'simulator_unavailable',
		});
		// Outside a tool call the seam must still throw, never fall through to the network.
		await expect(
			additionalData.evalLlmMockHandler!({ url: 'https://example.com' }, slackNode),
		).rejects.toThrow(SimulationBlockedError);
	});

	it('blocks every simulated tool without running it when no world is open', async () => {
		const session = new SimulationSession({
			testChatId: 't',
			unavailableDetail: 'No simulator is set up on this instance.',
			capabilities: [slackCapability],
		});
		const { tool, handler } = slackTool(session);

		await expect(runTool(session, tool)).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'simulator_unavailable',
			detail: 'No simulator is set up on this instance.',
		});
	});

	it.each([
		['a custom code tool', { name: 'my_code', description: '' }],
		['a chat integration action', { name: 'slack_send_message', description: '' }],
		['a shell command', { name: 'workspace_execute_command', description: '' }],
		['an undispatched call_tool', { name: 'call_tool', description: '' }],
		[
			'a custom tool named like a built-in',
			{ name: 'read_file', description: '', metadata: { customTool: true } },
		],
	])('blocks %s that it cannot route', async (_label, partial) => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({ testChatId: 't', world, capabilities: [] });
		const handler = vi.fn();

		await expect(runTool(session, { ...partial, handler })).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
		expect(session.takeDecision('tc-1')).toMatchObject({
			route: 'blocked',
			reason: 'not_simulatable',
		});
	});

	it('blocks a node tool that does not use HTTP before it runs', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'send_email', kind: 'node', testability: 'simulated' }],
		});
		const handler = vi.fn();

		await expect(
			runTool(session, nodeTool('send_email', 'n8n-nodes-base.emailSend', handler)),
		).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
	});

	it('blocks a non-HTTP node inside a workflow tool', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'notify', kind: 'workflow', testability: 'simulated' }],
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		session
			.instrumentation()
			.configureToolAdditionalData?.(additionalData, { toolName: 'notify', toolKind: 'workflow' });
		const context = mock<IExecuteFunctions>();
		context.getNode.mockReturnValue(
			mock<INode>({ type: 'n8n-nodes-base.postgres', name: 'Insert row' }),
		);
		const tool: BuiltTool = {
			name: 'notify',
			description: '',
			metadata: { kind: 'workflow' },
			handler: async () => await additionalData.evalNodeMockHandler!(context),
		};

		await expect(runTool(session, tool)).rejects.toThrow(SimulationBlockedError);
		expect(session.takeDecision('tc-1')).toMatchObject({
			route: 'blocked',
			reason: 'not_simulatable',
		});
	});

	it('uses the reason the backend gave for a tool it cannot serve', async () => {
		const session = new SimulationSession({
			testChatId: 't',
			world: makeWorld({ outcome: 'unsupported' }),
			capabilities: [
				{
					...slackCapability,
					testability: 'blocked',
					reason: 'unsupported_by_simulator',
					detail: 'No Slack',
				},
			],
		});

		await expect(runTool(session, slackTool(session).tool)).rejects.toThrow(SimulationBlockedError);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'unsupported_by_simulator',
			detail: 'No Slack',
		});
	});

	it('sends MCP traffic to the world by server name and returns its reply as an HTTP response', async () => {
		const world = makeWorld({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: { jsonrpc: '2.0', id: 1, result: { content: [] } },
		});
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'linear', kind: 'mcp', testability: 'simulated' }],
		});
		const mcpFetch = session.instrumentation().mcpFetch!('linear');
		const tool: BuiltTool = {
			name: 'linear_create_issue',
			description: '',
			mcpTool: true,
			mcpServerName: 'linear',
			handler: async () => {
				const response = await mcpFetch('https://mcp.linear.app/mcp', {
					method: 'POST',
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call' }),
				});
				return await response.json();
			},
		};

		await expect(runTool(session, tool)).resolves.toMatchObject({ result: { content: [] } });
		expect(world.handleRequest).toHaveBeenCalledWith(
			{
				protocol: 'mcp',
				server: 'linear',
				method: 'POST',
				headers: {},
				body: expect.objectContaining({ method: 'tools/call' }),
			},
			expect.objectContaining({ toolCallId: 'tc-1' }),
		);
		expect(session.takeDecision('tc-1')).toMatchObject({ route: 'simulated_made_up' });
	});

	it('never sends an MCP server URL, so a key in it stays out, also for two servers on one endpoint', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: ['acct_a', 'acct_b'].map((name) => ({
				toolName: name,
				kind: 'mcp' as const,
				testability: 'simulated' as const,
			})),
		});
		const { mcpFetch } = session.instrumentation();

		await mcpFetch!('acct_a')('https://mcp.example.com/mcp?key=key-a', {
			method: 'POST',
			body: '{}',
		});
		await mcpFetch!('acct_b')(
			new Request('https://mcp.example.com/mcp?key=key-b', { method: 'POST', body: '{}' }),
		);

		const [[first], [second]] = world.handleRequest.mock.calls;
		expect(first).toMatchObject({ protocol: 'mcp', server: 'acct_a' });
		expect(second).toMatchObject({ protocol: 'mcp', server: 'acct_b' });
		expect(JSON.stringify(world.handleRequest.mock.calls)).not.toMatch(/key-a|key-b|mcp\.example/);
	});

	it('leaves out provider tools and serves the fallback web search from the world', async () => {
		const world = makeWorld({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: { results: [{ title: 'n8n', url: 'https://n8n.io', snippet: 'Workflows' }] },
		});
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'web_search', kind: 'web_search', testability: 'simulated' }],
		});
		const instrumentation = session.instrumentation();
		const tool: BuiltTool = {
			name: 'web_search',
			description: '',
			handler: async (input) =>
				await instrumentation.webSearch!(
					input as Parameters<NonNullable<typeof instrumentation.webSearch>>[0],
				),
		};

		const result = await session.interceptor(
			{ tool, toolCallId: 'tc-1', input: { query: 'n8n' } },
			async () => await tool.handler!({ query: 'n8n' }, {}),
		);

		expect(instrumentation.disableProviderTools).toBe(true);
		expect(world.handleRequest).toHaveBeenCalledWith(
			{ protocol: 'web_search', args: { query: 'n8n' } },
			expect.objectContaining({ toolName: 'web_search', toolCallId: 'tc-1' }),
		);
		expect(result).toEqual({
			results: [{ title: 'n8n', url: 'https://n8n.io', snippet: 'Workflows' }],
		});
		expect(session.takeDecision('tc-1')).toMatchObject({ route: 'simulated_made_up' });
	});

	it('gives each session its own runtime cache key', () => {
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world: makeWorld({ outcome: 'unsupported' }),
			capabilities: [],
		});

		expect(session.runtimeCacheKey).toMatch(/^simulation:chat-1:/);
		const replacement = new SimulationSession({
			testChatId: 'chat-1',
			world: makeWorld({ outcome: 'unsupported' }),
			capabilities: [],
		});
		expect(replacement.runtimeCacheKey).not.toBe(session.runtimeCacheKey);
	});

	it('uses a tool list update for later calls', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({ testChatId: 't', world, capabilities: [] });
		const tool = nodeTool(
			'send_slack',
			'n8n-nodes-base.slack',
			async () => await Promise.resolve('ok'),
		);

		await expect(runTool(session, tool, 'tc-before')).rejects.toThrow(SimulationBlockedError);
		session.updateCapabilities([slackCapability]);

		await expect(runTool(session, tool, 'tc-after')).resolves.toBe('ok');
	});

	it('blocks a workflow tool whose run would leave this process or paused', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'notify', kind: 'workflow', testability: 'simulated' }],
		});
		const handler = vi.fn(async () => {
			throw new InstrumentedRunUnsupportedError('This workflow runs on Engine v2.');
		});

		await expect(
			runTool(session, {
				name: 'notify',
				description: '',
				metadata: { kind: 'workflow' },
				handler,
			}),
		).rejects.toThrow(SimulationBlockedError);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'not_simulatable',
			detail: 'This workflow runs on Engine v2.',
		});
	});

	it('hands tools placeholder credentials, so a stored secret never reaches the world', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'send_telegram', kind: 'node', testability: 'simulated' }],
		});
		const realToken = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
		const credentialsHelper = mock<ICredentialsHelper>();
		credentialsHelper.getDecrypted.mockResolvedValue({ accessToken: realToken } as never);
		credentialsHelper.getCredentialsProperties.mockReturnValue([
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
		]);
		const additionalData = Object.assign(mock<IWorkflowExecuteAdditionalData>(), {
			credentialsHelper,
		});
		session.instrumentation().configureToolAdditionalData?.(additionalData, {
			toolName: 'send_telegram',
			toolKind: 'node',
		});
		const credentials = await additionalData.credentialsHelper.getDecrypted(
			additionalData,
			{ id: '1', name: 'Telegram' },
			'telegramApi',
			'manual',
		);
		const tool = nodeTool('send_telegram', 'n8n-nodes-base.telegram', async () => {
			const token = String((credentials as { accessToken: string }).accessToken);
			return await additionalData.evalLlmMockHandler!(
				{ url: `https://api.telegram.org/bot${token}/sendMessage`, method: 'POST' },
				mock<INode>({ type: 'n8n-nodes-base.telegram' }),
			);
		});

		await runTool(session, tool);

		const [request] = vi.mocked(world.handleRequest).mock.calls[0];
		expect(credentialsHelper.getDecrypted).not.toHaveBeenCalled();
		expect(JSON.stringify(request)).not.toContain(realToken);
	});

	it('sends query parameters from `qs` to the world, without secret values', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'search', kind: 'node', testability: 'simulated' }],
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		session
			.instrumentation()
			.configureToolAdditionalData?.(additionalData, { toolName: 'search', toolKind: 'node' });
		const tool = nodeTool(
			'search',
			'n8n-nodes-base.slack',
			async () =>
				await additionalData.evalLlmMockHandler!(
					{
						url: '/search.messages',
						baseURL: 'https://slack.com/api',
						qs: { query: 'release', count: 20, api_key: 'abcdefgh1234' },
					},
					slackNode,
				),
		);

		await runTool(session, tool);

		const [request] = vi.mocked(world.handleRequest).mock.calls[0];
		const url = new URL((request as Extract<typeof request, { protocol: 'http' }>).url);
		expect(url.pathname).toBe('/api/search.messages');
		expect(url.searchParams.get('query')).toBe('release');
		expect(url.searchParams.get('count')).toBe('20');
		expect(url.searchParams.get('api_key')).toBe('[REDACTED]');
	});

	it('blocks a tool whose list entry has the same name but another kind', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'notify', kind: 'node', testability: 'simulated' }],
		});
		const handler = vi.fn();
		const workflowTool: BuiltTool = {
			name: 'notify',
			description: '',
			metadata: { kind: 'workflow' },
			handler,
		};

		await expect(runTool(session, workflowTool)).rejects.toThrow(SimulationBlockedError);
		session.updateCapabilities([{ toolName: 'notify', kind: 'node', testability: 'simulated' }]);
		await expect(runTool(session, workflowTool, 'tc-2')).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
	});

	it('blocks a chat integration tool with the reason the list gives it', async () => {
		const session = new SimulationSession({
			testChatId: 't',
			world: makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} }),
			capabilities: [
				{
					toolName: 'slack_action',
					kind: 'integration',
					testability: 'blocked',
					reason: 'not_simulatable',
					detail: 'Chat integration tools cannot run in a test run yet.',
				},
			],
		});
		const handler = vi.fn();

		await expect(
			runTool(session, {
				name: 'slack_action',
				description: '',
				metadata: { kind: 'integration' },
				handler,
			}),
		).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'not_simulatable',
			detail: 'Chat integration tools cannot run in a test run yet.',
		});
	});

	it('blocks a node tool without a node type, even with a simulated list entry', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});
		const handler = vi.fn();

		await expect(
			runTool(session, {
				name: 'send_slack',
				description: '',
				metadata: { kind: 'node' },
				handler,
			}),
		).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
	});
	it.each([
		['custom', { name: 'my_code', description: '', metadata: { customTool: true } }],
		['integration', { name: 'slack_action', description: '', metadata: { kind: 'integration' } }],
		['other', { name: 'workspace_execute_command', description: '' }],
	] as const)(
		'blocks a %s tool even when the list marks it simulated, because no seam sees it',
		async (kind, partial) => {
			const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
			const toolName = kind === 'other' ? `unknown:${partial.name}` : partial.name;
			const session = new SimulationSession({
				testChatId: 't',
				world,
				capabilities: [{ toolName, kind, testability: 'simulated' }],
			});
			const handler = vi.fn();

			await expect(runTool(session, { ...partial, handler })).rejects.toThrow(
				SimulationBlockedError,
			);
			expect(handler).not.toHaveBeenCalled();
			expect(world.handleRequest).not.toHaveBeenCalled();
			expect(session.takeDecision('tc-1')).toMatchObject({
				route: 'blocked',
				reason: 'not_simulatable',
			});
		},
	);

	it.each([
		['a status Response() rejects', { status: 99 }],
		['a status above 599', { status: 600 }],
		['a non-integer status', { status: 200.5 }],
		['no source', { source: undefined }],
	])('blocks the call as unavailable when the world sends %s', async (_label, override) => {
		const world = makeWorld({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: {},
			...override,
		} as SimulatedReply);
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [slackCapability],
		});
		const { tool } = slackTool(session);

		await expect(runTool(session, tool)).rejects.toThrow(SimulationBlockedError);
		expect(session.takeDecision('tc-1')).toMatchObject({
			route: 'blocked',
			reason: 'simulator_unavailable',
		});
	});

	it.each([204, 205, 304])(
		'returns an HTTP %i reply with a null body so core does not send the real request',
		async (status) => {
			const world = makeWorld({ outcome: 'served', source: 'made_up', status, body: { x: 1 } });
			const session = new SimulationSession({
				testChatId: 't',
				world,
				capabilities: [slackCapability],
			});
			const { tool } = slackTool(session);

			const response = await runTool(session, tool);

			expect(response).toEqual({ body: null, headers: {}, statusCode: status });
		},
	);

	it.each([204, 205, 304])('returns an MCP %i reply with no body', async (status) => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status, body: { x: 1 } });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'linear', kind: 'mcp', testability: 'simulated' }],
		});

		const response = await session.instrumentation().mcpFetch!('linear')('https://x.test/mcp', {
			method: 'POST',
			body: '{}',
		});
		expect(response.status).toBe(status);
		expect(await response.text()).toBe('');
	});

	it('passes the abort signal of the request to the world', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'linear', kind: 'mcp', testability: 'simulated' }],
		});
		const controller = new AbortController();

		await session.instrumentation().mcpFetch!('linear')('https://x.test/mcp', {
			method: 'POST',
			body: '{}',
			signal: controller.signal,
		});
		expect(world.handleRequest).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ signal: controller.signal }),
		);
	});

	it('drops the oldest decision nobody takes, so the map stays bounded', async () => {
		const session = new SimulationSession({ testChatId: 't', capabilities: [] });
		const tool: BuiltTool = { name: 'my_code', description: '', handler: vi.fn() };

		for (let index = 0; index < 501; index++) {
			await expect(runTool(session, tool, `tc-${index}`)).rejects.toThrow(SimulationBlockedError);
		}
		expect(session.takeDecision('tc-0')).toBeUndefined();
		expect(session.takeDecision('tc-1')).toMatchObject({ route: 'blocked' });
		expect(session.takeDecision('tc-500')).toMatchObject({ route: 'blocked' });
	});
	it('passes the run abort signal of a web search to the world', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: [] });
		const session = new SimulationSession({ testChatId: 't', world, capabilities: [] });
		const controller = new AbortController();

		await session.instrumentation().webSearch!({ query: 'n8n' }, { signal: controller.signal });

		expect(world.handleRequest).toHaveBeenCalledWith(
			expect.objectContaining({ protocol: 'web_search' }),
			expect.objectContaining({ signal: controller.signal }),
		);
	});
	it('forwards MCP session headers to the world and never auth headers', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'linear', kind: 'mcp', testability: 'simulated' }],
		});

		await session.instrumentation().mcpFetch!('linear')('https://x.test/mcp', {
			method: 'POST',
			body: '{}',
			headers: { 'Mcp-Session-Id': 'session-1', Authorization: 'Bearer secret-token' },
		});

		const [request] = world.handleRequest.mock.calls[0];
		expect(request).toMatchObject({ headers: { 'mcp-session-id': 'session-1' } });
		expect(JSON.stringify(request)).not.toContain('secret-token');
	});
});

describe('SimulationSession route evidence', () => {
	const SECRET_TEXT = 'canary-request-text-4711';

	const served = (evidence?: unknown, source: 'world_state' | 'made_up' = 'world_state') =>
		({ outcome: 'served', source, status: 200, body: {}, evidence }) as SimulatedReply;

	/** A world that gives one reply for each request, in order. */
	function worldWithReplies(replies: SimulatedReply[]) {
		const queue = [...replies];
		return makeWorld(
			async () => await Promise.resolve(queue.shift() ?? { outcome: 'unsupported' }),
		);
	}

	/** A node tool whose handler sends `count` HTTP requests in one tool call. */
	function requestTool(session: SimulationSession, count: number, swallowErrors = false) {
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		session
			.instrumentation()
			.configureToolAdditionalData?.(additionalData, { toolName: 'send_slack', toolKind: 'node' });
		return nodeTool('send_slack', 'n8n-nodes-base.slack', async () => {
			for (let index = 0; index < count; index++) {
				try {
					await additionalData.evalLlmMockHandler!(
						{ url: `https://slack.com/api/step-${index}`, method: 'POST', body: SECRET_TEXT },
						slackNode,
					);
				} catch (error) {
					if (!swallowErrors) throw error;
				}
			}
			return 'done';
		});
	}

	const sessionFor = (replies: SimulatedReply[]) =>
		new SimulationSession({
			testChatId: 't',
			world: worldWithReplies(replies),
			capabilities: [slackCapability],
		});

	it('folds the evidence of all requests of one tool call, once each, in a fixed order', async () => {
		const session = sessionFor([
			served(['world_write']),
			served(['world_read', 'real_read']),
			served(),
			served(['world_write', 'world_read']),
		]);

		await runTool(session, requestTool(session, 4));

		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
			evidence: ['real_read', 'world_read', 'world_write'],
		});
	});

	it('keeps the evidence of each tool call apart', async () => {
		const session = sessionFor([served(['world_read']), served(['world_write'])]);

		await runTool(session, requestTool(session, 1), 'tc-1');
		await runTool(session, requestTool(session, 1), 'tc-2');

		expect(session.takeDecision('tc-1')).toMatchObject({ evidence: ['world_read'] });
		expect(session.takeDecision('tc-2')).toMatchObject({ evidence: ['world_write'] });
	});

	it('keeps the evidence when a request of the call was made up', async () => {
		const session = sessionFor([served(['world_read']), served(undefined, 'made_up')]);

		await runTool(session, requestTool(session, 2));

		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated_made_up',
			reason: 'invented_by_llm',
			evidence: ['world_read'],
		});
	});

	it.each([
		['absent', undefined],
		['empty', []],
	])('leaves the evidence key out when the reply evidence is %s', async (_label, evidence) => {
		const session = sessionFor([served(evidence)]);

		await runTool(session, requestTool(session, 1));

		const decision = session.takeDecision('tc-1');
		expect(decision).toEqual({ route: 'simulated', reason: 'served_from_world' });
		expect(Object.keys(decision ?? {})).toEqual(['route', 'reason']);
	});

	it.each([
		['the tool throws', false],
		['the tool swallows the error', true],
	])(
		'gives a blocked call no evidence, also after served requests, when %s',
		async (_label, swallowErrors) => {
			const session = sessionFor([
				served(['world_read', 'world_write']),
				{ outcome: 'unsupported', detail: 'Not supported' },
			]);

			await expect(runTool(session, requestTool(session, 2, swallowErrors))).rejects.toThrow(
				SimulationBlockedError,
			);

			const decision = session.takeDecision('tc-1');
			expect(decision).toEqual({
				route: 'blocked',
				reason: 'unsupported_by_simulator',
				detail: 'Not supported',
			});
			expect(toolCallSimulationSchema.safeParse(decision).success).toBe(true);
		},
	);

	it('never carries request data: only the known values pass', async () => {
		const session = sessionFor([
			served([SECRET_TEXT, 'world_write', { url: `https://slack.com/${SECRET_TEXT}` }, 7, null]),
			served(SECRET_TEXT),
			served({ 0: SECRET_TEXT, length: 1 }),
		]);

		await runTool(session, requestTool(session, 3));

		const decision = session.takeDecision('tc-1');
		expect(decision).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
			evidence: ['world_write'],
		});
		expect(JSON.stringify(decision)).not.toContain(SECRET_TEXT);
		expect(toolCallSimulationSchema.safeParse(decision).success).toBe(true);
	});

	it('reads no more items than the evidence values that exist', async () => {
		const padding = toolCallEvidenceSchema.options.map(() => SECRET_TEXT);
		const session = sessionFor([served([...padding, 'world_write'])]);

		await runTool(session, requestTool(session, 1));

		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
		});
	});

	it('warns when the evidence is not a list', async () => {
		const logger = mockInstance(Logger);
		const session = sessionFor([served('world_write')]);

		await runTool(session, requestTool(session, 1));

		expect(logger.warn).toHaveBeenCalledWith(
			'[SafeTesting] The simulator sent evidence that is not a list',
			{ toolName: 'send_slack' },
		);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
		});
	});
});
