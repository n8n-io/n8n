import type { InstanceAiEvent } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { scriptedDecisions } from '../../__tests__/scripted-decisions';
import type { InstanceAiContext, OrchestrationContext } from '../../types';
import { renderReply, runFastPath } from '../fast-path';

const workflowHandler = vi.fn();
const agentHandler = vi.fn();

vi.mock('../../tools/workflows/compile-workflow.tool', () => ({
	createCompileWorkflowTool: () => ({ name: 'build-workflow', handler: workflowHandler }),
	selectDecisionService: () => ({
		kind: 'none',
		decide: async () => ({ ok: false, reason: 'unavailable', message: 'none', latencyMs: 0 }),
	}),
}));
vi.mock('../../tools/orchestration/build-agent.tool', () => ({
	createBuildAgentTool: () => ({ name: 'build-agent', handler: agentHandler }),
}));

interface Harness {
	context: InstanceAiContext;
	orchestrationContext: OrchestrationContext;
	events: InstanceAiEvent[];
	metadata: Record<string, unknown>;
}

function harness(initialMetadata: Record<string, unknown> = {}): Harness {
	const events: InstanceAiEvent[] = [];
	const metadata: Record<string, unknown> = { ...initialMetadata };
	const context = mockDeep<InstanceAiContext>();
	Object.assign(context, {
		threadId: 'thread-1',
		currentUserAttachments: undefined,
		agentBuilderTarget: undefined,
		threadMemory: {
			getThread: async () => ({ id: 'thread-1', title: 't', metadata }),
			patchThread: async ({
				update,
			}: {
				update: (current: { id: string; title: string; metadata: Record<string, unknown> }) =>
					| { metadata?: Record<string, unknown> }
					| null
					| undefined;
			}) => {
				const patch = update({ id: 'thread-1', title: 't', metadata: { ...metadata } });
				if (patch?.metadata) Object.assign(metadata, patch.metadata);
				return { id: 'thread-1', title: 't', metadata };
			},
		},
	});
	const orchestrationContext = mockDeep<OrchestrationContext>();
	Object.assign(orchestrationContext, {
		threadId: 'thread-1',
		runId: 'run-1',
		orchestratorAgentId: 'orchestrator-run-1',
		abortSignal: undefined,
		eventBus: {
			publish: (_thread: string, event: InstanceAiEvent) => events.push(event),
			subscribe: () => () => undefined,
		},
	});
	return { context, orchestrationContext, events, metadata };
}

describe('runFastPath', () => {
	beforeEach(() => {
		workflowHandler.mockReset();
		agentHandler.mockReset();
	});

	it('runs the workflow compiler directly, publishes tool events and a reply, and binds the workflow', async () => {
		workflowHandler.mockResolvedValue({
			success: true,
			status: 'compiled',
			sessionId: 'gen_1',
			workflowId: 'wf-9',
			workflowName: 'Customers API',
			verification: { structural: 'pass', parameters: 'warn' },
			executionPaths: [{}, {}, {}],
		});
		const { context, orchestrationContext, events, metadata } = harness();
		const outcome = await runFastPath({
			message: 'Build a workflow: POST /customers then upsert in HubSpot',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'workflow.create' }),
		});
		expect(outcome.handled).toBe(true);
		if (!outcome.handled) return;
		expect(outcome.route).toBe('workflow.create');
		expect(workflowHandler).toHaveBeenCalledWith(
			{ action: 'create', request: 'Build a workflow: POST /customers then upsert in HubSpot' },
			expect.objectContaining({ toolName: 'build-workflow', runId: 'run-1' }),
		);
		expect(events.map((event) => event.type)).toEqual(['tool-call', 'tool-result', 'text-delta']);
		expect(outcome.reply).toContain('I built and saved "Customers API"');
		expect(outcome.reply).toContain('3 execution paths');
		expect(metadata.instanceAiFastPath).toMatchObject({
			boundWorkflowId: 'wf-9',
			previousRoute: 'workflow.create',
		});
	});

	it('remembers a pending clarification and routes the next message to answer without a read', async () => {
		workflowHandler.mockResolvedValueOnce({
			success: false,
			status: 'needs_clarification',
			sessionId: 'gen_2',
			message: 'Which Slack channel?',
			questions: [{ fields: ['actions.notify.channel'], question: 'Which Slack channel?' }],
		});
		const { context, orchestrationContext, metadata } = harness();
		const first = await runFastPath({
			message: 'When a POST /leads arrives, notify sales in Slack',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'workflow.create' }),
		});
		expect(first.handled && first.reply).toBe('Which Slack channel?');
		expect(metadata.instanceAiFastPath).toMatchObject({
			pendingSession: { kind: 'workflow', sessionId: 'gen_2', fields: ['actions.notify.channel'] },
		});

		workflowHandler.mockResolvedValueOnce({
			success: true,
			status: 'compiled',
			sessionId: 'gen_2',
			workflowId: 'wf-2',
			workflowName: 'Leads API',
			executionPaths: [],
		});
		const never = scriptedDecisions({ route: 'orchestrator' });
		const second = await runFastPath({
			message: '#sales',
			context,
			orchestrationContext,
			decisions: never,
		});
		expect(second.handled).toBe(true);
		expect(second.decision.source).toBe('pending_session');
		expect(workflowHandler).toHaveBeenLastCalledWith(
			{ action: 'answer', sessionId: 'gen_2', request: '#sales' },
			expect.anything(),
		);
		expect(metadata.instanceAiFastPath).not.toHaveProperty('pendingSession');
	});

	it('hands the turn back when the compiler fails, keeping the tool events on the bus', async () => {
		workflowHandler.mockResolvedValue({
			success: false,
			status: 'failed',
			errors: ['IR validation failed'],
		});
		const { context, orchestrationContext, events } = harness();
		const outcome = await runFastPath({
			message: 'Build a workflow that does something odd',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'workflow.create' }),
		});
		expect(outcome.handled).toBe(false);
		if (outcome.handled) return;
		expect(outcome.toolCallId).toBeDefined();
		expect(outcome.reason).toContain('needs the assistant');
		expect(events.map((event) => event.type)).toEqual(['tool-call', 'tool-result']);
	});

	it('does not run any tool when the router picks the orchestrator', async () => {
		const { context, orchestrationContext, events } = harness();
		const outcome = await runFastPath({
			message: 'What does the Merge node do?',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'workflow.create' }),
		});
		expect(outcome).toMatchObject({ handled: false, route: 'orchestrator' });
		expect(workflowHandler).not.toHaveBeenCalled();
		expect(events).toEqual([]);
	});

	it('creates an agent with a derived name and ref', async () => {
		agentHandler.mockResolvedValue({
			ok: true,
			status: 'compiled',
			sessionId: 'agen_1',
			agentId: 'ag-1',
			agentRef: 'sales-helper',
			summary: 'Compiled agent "Sales Helper" with 1 tool(s), 1 channel(s), 0 task(s).',
			verification: { schema: 'pass' },
		});
		const { context, orchestrationContext, metadata } = harness();
		const outcome = await runFastPath({
			message: 'Create a Slack bot called "Sales Helper" that answers pricing questions',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'agent.create' }),
		});
		expect(outcome.handled).toBe(true);
		expect(agentHandler).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'create', name: 'Sales Helper', agentRef: 'sales-helper' }),
			expect.anything(),
		);
		expect(metadata.instanceAiFastPath).toMatchObject({ lastAgentSessionId: 'agen_1' });
	});

	it('hands back edits without a bound target', async () => {
		const { context, orchestrationContext } = harness();
		const outcome = await runFastPath({
			message: 'Change the channel to #ops in the workflow',
			context,
			orchestrationContext,
			decisions: scriptedDecisions({ route: 'workflow.edit' }),
		});
		expect(outcome).toMatchObject({ handled: false, route: 'orchestrator' });
		expect(workflowHandler).not.toHaveBeenCalled();
	});
});

describe('renderReply', () => {
	it('returns undefined for results the orchestrator must handle', () => {
		expect(renderReply('build-workflow', { status: 'failed' })).toBeUndefined();
		expect(
			renderReply('build-agent', { status: 'needs_artifacts', message: 'Build X first' }),
		).toBeUndefined();
		expect(renderReply('build-workflow', { status: 'denied' })).toBeUndefined();
	});
});
