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
});
