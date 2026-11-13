import type { BuiltTool } from '@n8n/agents';
import type { ToolTestCapability } from '@n8n/api-types';
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
		save: vi.fn(() => ({ seed: 'abc' })),
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

	it('sends MCP traffic to the world and returns its reply as an HTTP response', async () => {
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
			mcpServers: [
				{ name: 'linear', url: 'https://mcp.linear.app/mcp' },
				{ name: 'linear-two', url: 'https://mcp.linear.app/mcp-two' },
			],
		});
		const mcpFetch = session.instrumentation().mcpFetch!;
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
			expect.objectContaining({
				protocol: 'mcp',
				body: expect.objectContaining({ method: 'tools/call' }),
			}),
			expect.objectContaining({ mcpServerName: 'linear', toolCallId: 'tc-1' }),
		);
		expect(session.takeDecision('tc-1')).toMatchObject({ route: 'simulated_made_up' });
	});

	it('keeps a key in the MCP server URL away from the world, and still names the server', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const serverUrl = 'https://mcp.example.com/mcp?key=s3cret-mcp-key';
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'docs', kind: 'mcp', testability: 'simulated' }],
			mcpServers: [{ name: 'docs', url: serverUrl }],
		});
		const mcpFetch = session.instrumentation().mcpFetch!;
		const tool: BuiltTool = {
			name: 'docs_search',
			description: '',
			mcpTool: true,
			mcpServerName: 'docs',
			handler: async () =>
				await mcpFetch(serverUrl, {
					method: 'POST',
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, params: { password: 's3cret-mcp-key' } }),
				}),
		};

		await runTool(session, tool);

		const [request, call] = world.handleRequest.mock.calls[0];
		expect(JSON.stringify(request)).not.toContain('s3cret-mcp-key');
		expect(request.url).toBe('https://mcp.example.com/mcp');
		expect(call).toMatchObject({ mcpServerName: 'docs' });
	});

	it('keeps two MCP servers on one endpoint apart, by name and by the URL the world sees', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const servers = [
			{
				name: 'acct_a',
				url: 'https://mcp.example.com/mcp?key=key-a',
				simulatorUrl: 'https://mcp.example.com/mcp?n8n_mcp_server=acct_a',
			},
			{
				name: 'acct_b',
				url: 'https://mcp.example.com/mcp?key=key-b',
				simulatorUrl: 'https://mcp.example.com/mcp?n8n_mcp_server=acct_b',
			},
		];
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: servers.map((server) => ({
				toolName: server.name,
				kind: 'mcp' as const,
				testability: 'simulated' as const,
			})),
			mcpServers: servers,
		});
		const mcpFetch = session.instrumentation().mcpFetch!;
		const call = (server: (typeof servers)[number]): BuiltTool => ({
			name: `${server.name}_search`,
			description: '',
			mcpTool: true,
			mcpServerName: server.name,
			handler: async () => await mcpFetch(server.url, { method: 'POST', body: '{}' }),
		});

		await runTool(session, call(servers[0]), 'tc-a');
		await runTool(session, call(servers[1]), 'tc-b');

		const [[first, firstCall], [second, secondCall]] = world.handleRequest.mock.calls;
		expect(first.url).toBe(servers[0].simulatorUrl);
		expect(second.url).toBe(servers[1].simulatorUrl);
		expect(firstCall).toMatchObject({ mcpServerName: 'acct_a' });
		expect(secondCall).toMatchObject({ mcpServerName: 'acct_b' });
		expect(JSON.stringify(world.handleRequest.mock.calls)).not.toMatch(/key-a|key-b/);
	});

	it('names the server of a Request whose URL the platform normalised', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const servers = [
			{
				name: 'acct_a',
				url: 'https://mcp.example.com?key=key-a',
				simulatorUrl: 'https://mcp.example.com/?n8n_mcp_server=acct_a',
			},
			{
				name: 'acct_b',
				url: 'https://mcp.example.com?key=key-b',
				simulatorUrl: 'https://mcp.example.com/?n8n_mcp_server=acct_b',
			},
		];
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: servers.map((server) => ({
				toolName: server.name,
				kind: 'mcp' as const,
				testability: 'simulated' as const,
			})),
			mcpServers: servers,
		});
		const mcpFetch = session.instrumentation().mcpFetch!;

		await mcpFetch(new Request(servers[1].url, { method: 'POST', body: '{}' }));

		const [[request, call]] = world.handleRequest.mock.calls;
		expect(request.url).toBe(servers[1].simulatorUrl);
		expect(call).toMatchObject({ mcpServerName: 'acct_b' });
	});

	it('routes a call to the server of its tool when two servers share one URL', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const servers = ['acct_a', 'acct_b'].map((name) => ({
			name,
			url: 'https://mcp.example.com/mcp',
			simulatorUrl: `https://mcp.example.com/mcp?n8n_mcp_server=${name}`,
		}));
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: servers.map((server) => ({
				toolName: server.name,
				kind: 'mcp' as const,
				testability: 'simulated' as const,
			})),
			mcpServers: servers,
		});
		const mcpFetch = session.instrumentation().mcpFetch!;

		await runTool(session, {
			name: 'acct_b_search',
			description: '',
			mcpTool: true,
			mcpServerName: 'acct_b',
			handler: async () => await mcpFetch('https://mcp.example.com/mcp', { method: 'POST' }),
		});
		await mcpFetch('https://mcp.example.com/mcp', { method: 'POST' }).catch(() => undefined);

		const [[toolRequest, toolCall], [discovery, discoveryCall]] = world.handleRequest.mock.calls;
		expect(toolRequest.url).toBe('https://mcp.example.com/mcp?n8n_mcp_server=acct_b');
		expect(toolCall).toMatchObject({ mcpServerName: 'acct_b' });
		// Outside a tool call the URL fits both servers, so neither is named.
		expect(discovery.url).toBe('https://mcp.example.com/mcp');
		expect(discoveryCall.mcpServerName).toBeUndefined();
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
			expect.objectContaining({ protocol: 'web_search', body: { query: 'n8n' } }),
			expect.objectContaining({ toolName: 'web_search', toolCallId: 'tc-1' }),
		);
		expect(result).toEqual({
			results: [{ title: 'n8n', url: 'https://n8n.io', snippet: 'Workflows' }],
		});
		expect(session.takeDecision('tc-1')).toMatchObject({ route: 'simulated_made_up' });
	});

	it('keeps the world state for the test chat', () => {
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world: makeWorld({ outcome: 'unsupported' }),
			capabilities: [],
		});

		expect(session.storedWorld()).toEqual({
			backend: 'llm-mock',
			worldId: 'world-1',
			state: { seed: 'abc' },
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

	it('keeps a decrypted credential out of the request the world receives', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			capabilities: [{ toolName: 'send_telegram', kind: 'node', testability: 'simulated' }],
		});
		const credentialsHelper = mock<ICredentialsHelper>();
		credentialsHelper.getDecrypted.mockResolvedValue({
			accessToken: '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
		} as never);
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
		expect(request.url).toBe('https://api.telegram.org/bot[REDACTED]/sendMessage');
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
		const url = new URL(request.url);
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

	it('blocks workflow tools in queue mode even when the list says simulated', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
			queueMode: true,
			capabilities: [{ toolName: 'notify', kind: 'workflow', testability: 'simulated' }],
		});
		const handler = vi.fn();

		await expect(
			runTool(session, {
				name: 'notify',
				description: '',
				metadata: { kind: 'workflow' },
				handler,
			}),
		).rejects.toThrow(SimulationBlockedError);
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
			runTool(session, { name: 'slack_action', description: '', handler }),
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
});
