import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { scriptedDecisions } from '../../../__tests__/scripted-decisions';
import type { InstanceAiContext } from '../../../types';
import { createCompileWorkflowTool } from '../compile-workflow.tool';

const persistHandler = vi.fn();

vi.mock('../build-workflow.tool', () => ({
	confirmationSuspendSchema: { parse: (value: unknown) => value },
	createBuildWorkflowTool: () => ({ name: 'persist-workflow', handler: persistHandler }),
}));

const scripted = scriptedDecisions();

const REQUEST =
	'Create an API workflow. POST /customers. Upsert the customer in HubSpot. If they are new, send a message to #sales. Respond with the HubSpot contact ID.';

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	const context = mockDeep<InstanceAiContext>();
	context.nodeService.getDescription.mockRejectedValue(new Error('no live descriptions in tests'));
	Object.assign(context, {
		decisionService: scripted,
		folderExplorationEnabled: false,
		workspace: undefined,
		threadMemory: undefined,
		threadId: undefined,
		modelId: undefined,
		...overrides,
	});
	return context;
}

type Handler = (input: unknown, ctx: Record<string, unknown>) => Promise<Record<string, unknown>>;

function handlerOf(tool: ReturnType<typeof createCompileWorkflowTool>): Handler {
	const handler = tool.handler;
	if (!handler) throw new Error('tool has no handler');
	return handler as Handler;
}

describe('build-workflow tool', () => {
	beforeEach(() => {
		persistHandler.mockReset();
		persistHandler.mockResolvedValue({
			success: true,
			workflowId: 'wf-saved',
			workflowName: 'Customers API',
			filePath: 'x',
		});
	});

	it('compiles a create request and hands the JSON to the persistence step', async () => {
		const context = makeContext();
		const tool = createCompileWorkflowTool(context);
		const output = await handlerOf(tool)(
			{ action: 'create', request: REQUEST },
			{ toolCallId: 'call-1' },
		);

		expect(output).toMatchObject({ success: true, status: 'compiled', workflowId: 'wf-saved' });
		expect(output.verification).toMatchObject({
			structural: 'pass',
			expressions: 'pass',
			fixtureTests: 'not_run',
		});
		expect(Array.isArray(output.executionPaths)).toBe(true);
		expect(persistHandler).toHaveBeenCalledTimes(1);
		const [persistInput, persistCtx] = persistHandler.mock.calls[0];
		expect(persistInput.filePath).toMatch(
			/^src\/workflows\/customers-api-gen-[a-z0-9-]+\.workflow\.json$/,
		);
		expect(persistInput.workflowId).toBeUndefined();
		const workflow = JSON.parse(persistInput.sourceCode) as WorkflowJSON;
		expect(workflow.nodes.map((node) => node.type)).toContain('n8n-nodes-base.hubspot');
		expect(persistCtx).toMatchObject({ toolCallId: 'call-1' });
	});

	it('returns a clarification and resumes the same session on answer', async () => {
		const context = makeContext();
		const tool = createCompileWorkflowTool(context);
		const first = await handlerOf(tool)(
			{ action: 'create', request: 'When a POST /leads arrives, notify the sales team in Slack' },
			{},
		);
		expect(first).toMatchObject({ success: false, status: 'needs_clarification' });
		expect(first.message).toBe('Which Slack channel should receive the message?');
		expect(persistHandler).not.toHaveBeenCalled();

		const second = await handlerOf(tool)(
			{ action: 'answer', sessionId: first.sessionId, request: '#sales' },
			{},
		);
		expect(second).toMatchObject({ success: true, status: 'compiled', sessionId: first.sessionId });
		expect(persistHandler).toHaveBeenCalledTimes(1);
	});

	it('edits an existing workflow and saves under its id', async () => {
		const context = makeContext();
		const created = await handlerOf(createCompileWorkflowTool(context))(
			{ action: 'create', request: REQUEST },
			{},
		);
		const compiled = JSON.parse(persistHandler.mock.calls[0][0].sourceCode) as WorkflowJSON;
		expect(created.status).toBe('compiled');
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue(compiled);
		persistHandler.mockClear();

		const output = await handlerOf(createCompileWorkflowTool(context))(
			{
				action: 'edit',
				workflowId: 'wf-9',
				request: 'Change the Send Slack Message channel to #ops',
				approvalSummary: 'Change the channel',
			},
			{},
		);
		expect(output).toMatchObject({
			success: true,
			status: 'compiled',
			changedNodeNames: ['Send Slack Message'],
		});
		const [persistInput] = persistHandler.mock.calls[0];
		expect(persistInput).toMatchObject({
			workflowId: 'wf-9',
			filePath: 'src/workflows/wf-9.workflow.json',
			approvalSummary: 'Change the channel',
		});
		const patched = JSON.parse(persistInput.sourceCode) as WorkflowJSON;
		expect(
			patched.nodes.find((node) => node.name === 'Send Slack Message')?.parameters,
		).toMatchObject({ channelId: { value: '#ops' } });
	});

	it('debugs the latest failed execution when no executionId is given', async () => {
		const context = makeContext();
		await handlerOf(createCompileWorkflowTool(context))({ action: 'create', request: REQUEST }, {});
		const compiled = JSON.parse(persistHandler.mock.calls[0][0].sourceCode) as WorkflowJSON;
		vi.mocked(context.workflowService.getAsWorkflowJSON).mockResolvedValue(compiled);
		vi.mocked(context.executionService.list).mockResolvedValue([
			{
				id: 'exec-7',
				workflowId: 'wf-9',
				workflowName: 'x',
				status: 'error',
				startedAt: '',
				mode: 'manual',
			},
		]);
		vi.mocked(context.executionService.getDebugInfo).mockResolvedValue({
			executionId: 'exec-7',
			status: 'error',
			failedNode: {
				name: 'Upsert Contact',
				type: 'n8n-nodes-base.hubspot',
				error: '503 Service Unavailable',
			},
			nodeTrace: [],
		});
		persistHandler.mockClear();

		const output = await handlerOf(createCompileWorkflowTool(context))(
			{ action: 'debug', workflowId: 'wf-9' },
			{},
		);
		expect(context.executionService.list).toHaveBeenCalledWith({
			workflowId: 'wf-9',
			status: 'error',
			limit: 1,
		});
		expect(output).toMatchObject({ success: true, status: 'compiled' });
		expect(String(output.summary)).toContain('Diagnosis: transient');
		const patched = JSON.parse(persistHandler.mock.calls[0][0].sourceCode) as WorkflowJSON;
		expect(patched.nodes.find((node) => node.name === 'Upsert Contact')).toMatchObject({
			retryOnFail: true,
		});
	});

	it('reports a denied save as denied and a missing workflow as failed', async () => {
		const context = makeContext();
		persistHandler.mockResolvedValue({
			success: false,
			denied: true,
			errors: ['User denied the action'],
		});
		const denied = await handlerOf(createCompileWorkflowTool(context))(
			{ action: 'create', request: REQUEST },
			{},
		);
		expect(denied).toMatchObject({
			success: false,
			status: 'denied',
			errors: ['User denied the action'],
		});

		vi.mocked(context.workflowService.getAsWorkflowJSON).mockRejectedValue(new Error('not found'));
		const missing = await handlerOf(createCompileWorkflowTool(context))(
			{ action: 'edit', workflowId: 'nope', request: 'Remove the Respond step' },
			{},
		);
		expect(missing).toMatchObject({ success: false, status: 'failed' });
		expect(String(missing.errors)).toContain('nope');
	});
});
