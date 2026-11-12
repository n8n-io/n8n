import type { BuiltTool } from '@n8n/agents';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

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
	])('blocks %s that it cannot route', async (_label, partial) => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({ testChatId: 't', world });
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

	it('blocks MCP tools and refuses every MCP connection', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({
			testChatId: 't',
			world,
		});
		const handler = vi.fn();
		const tool: BuiltTool = {
			name: 'linear_create_issue',
			description: '',
			mcpTool: true,
			mcpServerName: 'linear',
			handler,
		};

		await expect(runTool(session, tool)).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
		await expect(
			session.instrumentation().mcpFetch!('https://mcp.linear.app/mcp', { method: 'POST' }),
		).rejects.toThrow(SimulationBlockedError);
		expect(world.handleRequest).not.toHaveBeenCalled();
	});

	it('gives each session its own runtime cache key', () => {
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world: makeWorld({ outcome: 'unsupported' }),
		});
		const replacement = new SimulationSession({
			testChatId: 'chat-1',
			world: makeWorld({ outcome: 'unsupported' }),
		});

		expect(session.runtimeCacheKey).toMatch(/^simulation:chat-1:/);
		expect(replacement.runtimeCacheKey).not.toBe(session.runtimeCacheKey);
	});

	it('blocks workflow tools in queue mode, where the hooks do not reach the worker', async () => {
		const world = makeWorld({ outcome: 'served', source: 'made_up', status: 200, body: {} });
		const session = new SimulationSession({ testChatId: 't', world, queueMode: true });
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
		expect(session.takeDecision('tc-1')).toMatchObject({ reason: 'not_simulatable' });
	});
});
