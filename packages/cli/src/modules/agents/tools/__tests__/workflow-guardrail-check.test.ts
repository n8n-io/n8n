import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CallableWorkflowLoader } from '@/workflows/callable/callable-workflow-loader.service';

import type { AgentToolGuardrailConfig } from '@n8n/api-types';

import { createWorkflowGuardrailCheck } from '../workflow-guardrail-check';
import { executeWorkflow, type WorkflowToolContext } from '../workflow-tool-factory';

vi.mock('../workflow-tool-factory', () => ({
	executeWorkflow: vi.fn(),
}));

const guardrail = {
	kind: 'workflow',
	id: 'wg1',
	name: 'My check',
	workflowId: 'wf-check',
} as const satisfies Extract<AgentToolGuardrailConfig, { kind: 'workflow' }>;

const triggerNode: INode = {
	id: 't1',
	name: 'When Executed by Another Workflow',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: { inputSource: 'passthrough' },
};

const workflow = {
	id: 'wf-check',
	name: 'Check workflow',
	nodes: [triggerNode],
	connections: {},
} as unknown as WorkflowEntity;

function contextWith(
	loader: CallableWorkflowLoader,
	extras: Partial<WorkflowToolContext> = {},
): WorkflowToolContext {
	return {
		workflowLoader: loader,
		projectId: 'p1',
		executionMode: 'manual',
		...extras,
	} as unknown as WorkflowToolContext;
}

function loaderWith(workflowToLoad: WorkflowEntity | null) {
	const loader = mock<CallableWorkflowLoader>();
	loader.loadWorkflow.mockResolvedValue(workflowToLoad);
	return loader;
}

function executeResult(result: Partial<Awaited<ReturnType<typeof executeWorkflow>>>) {
	vi.mocked(executeWorkflow).mockResolvedValueOnce({
		executionId: 'e1',
		status: 'success',
		...result,
	} as Awaited<ReturnType<typeof executeWorkflow>>);
}

const toolCall = { toolName: 'read_file', input: { note: 'check me' } };

describe('createWorkflowGuardrailCheck', () => {
	beforeEach(() => {
		vi.mocked(executeWorkflow).mockReset();
	});

	it('loads the check workflow by id and runs it with the structured tool call', async () => {
		const loader = loaderWith(workflow);
		executeResult({ data: { 'Decision Node': [{ tripwireTriggered: false }] } });

		const check = createWorkflowGuardrailCheck(guardrail, contextWith(loader));
		const result = await check(toolCall.toolName, toolCall.input);

		expect(loader.loadWorkflow).toHaveBeenCalledWith(
			'p1',
			{ workflowId: 'wf-check', workflowName: 'wf-check' },
			{ usePublishedVersion: false },
		);
		const [workflowArg, triggerArg, inputArg, runContext] =
			vi.mocked(executeWorkflow).mock.calls[0];
		expect(workflowArg.id).toBe('wf-check');
		expect(triggerArg.name).toBe('When Executed by Another Workflow');
		expect(inputArg).toEqual({
			toolName: 'read_file',
			input: { note: 'check me' },
			guardrailName: 'My check',
		});
		expect(runContext.timeoutMs).toBe(30_000);
		expect(result.tripwireTriggered).toBe(false);
		expect(result.executionFailed).toBeUndefined();
	});

	it('marks the check execution with the guarded agent, for the re-entry guard', async () => {
		const loader = loaderWith(workflow);
		executeResult({ data: {} });

		const check = createWorkflowGuardrailCheck(
			guardrail,
			contextWith(loader, { agentId: 'agent-1' }),
		);
		await check(toolCall.toolName, toolCall.input);

		const runContext = vi.mocked(executeWorkflow).mock.calls[0][3];
		expect(runContext.executionMetadata).toEqual({ guardrailCheckFor: 'agent-1' });
	});

	it('does not run the check workflow when the user cannot execute it', async () => {
		const loader = loaderWith(workflow);
		const canExecuteWorkflow = vi.fn().mockResolvedValue(false);

		const check = createWorkflowGuardrailCheck(
			guardrail,
			contextWith(loader, { canExecuteWorkflow }),
		);
		const result = await check(toolCall.toolName, toolCall.input);

		expect(canExecuteWorkflow).toHaveBeenCalledWith('wf-check');
		expect(executeWorkflow).not.toHaveBeenCalled();
		expect(result.executionFailed).toBe(true);
		expect(result.tripwireTriggered).toBe(false);
	});

	it('runs the check workflow when the user can execute it', async () => {
		const loader = loaderWith(workflow);
		executeResult({ data: {} });
		const canExecuteWorkflow = vi.fn().mockResolvedValue(true);

		const check = createWorkflowGuardrailCheck(
			guardrail,
			contextWith(loader, { canExecuteWorkflow }),
		);
		const result = await check(toolCall.toolName, toolCall.input);

		expect(executeWorkflow).toHaveBeenCalledOnce();
		expect(result.executionFailed).toBeUndefined();
	});

	it('resolves the published version for production runtimes', async () => {
		const loader = loaderWith(workflow);
		executeResult({ data: {} });

		const check = createWorkflowGuardrailCheck(
			guardrail,
			contextWith(loader, { usePublishedWorkflowVersion: true }),
		);
		await check(toolCall.toolName, toolCall.input);

		expect(loader.loadWorkflow).toHaveBeenCalledWith(
			'p1',
			{ workflowId: 'wf-check', workflowName: 'wf-check' },
			{ usePublishedVersion: true },
		);
	});

	it('reports a tripwire when any output item sets tripwireTriggered', async () => {
		const loader = loaderWith(workflow);
		executeResult({ data: { 'Decision Node': [{ ok: true }, { tripwireTriggered: true }] } });

		const check = createWorkflowGuardrailCheck(guardrail, contextWith(loader));
		const result = await check(toolCall.toolName, toolCall.input);

		expect(result.tripwireTriggered).toBe(true);
		expect(result.executionFailed).toBeUndefined();
	});

	it('fails closed when the check workflow is missing', async () => {
		const check = createWorkflowGuardrailCheck(guardrail, contextWith(loaderWith(null)));

		const result = await check(toolCall.toolName, toolCall.input);

		expect(result.tripwireTriggered).toBe(false);
		expect(result.executionFailed).toBe(true);
		expect(result.originalException?.message).toContain('not accessible');
		expect(executeWorkflow).not.toHaveBeenCalled();
	});

	it('fails closed when the run reports an error or a non-success status', async () => {
		const loader = loaderWith(workflow);

		const check = createWorkflowGuardrailCheck(guardrail, contextWith(loader));
		executeResult({ status: 'error', error: 'the workflow crashed' });
		const errored = await check(toolCall.toolName, toolCall.input);

		expect(errored.executionFailed).toBe(true);
		expect(errored.originalException?.message).toBe('the workflow crashed');

		executeResult({ status: 'waiting' });
		const waiting = await check(toolCall.toolName, toolCall.input);

		expect(waiting.executionFailed).toBe(true);
		expect(waiting.originalException?.message).toContain('waiting');
	});

	it('fails closed when the run throws, e.g. on the timeout', async () => {
		const loader = loaderWith(workflow);
		vi.mocked(executeWorkflow).mockRejectedValueOnce(
			new Error('Execution timed out after 30000ms and was cancelled'),
		);

		const check = createWorkflowGuardrailCheck(guardrail, contextWith(loader));
		const result = await check(toolCall.toolName, toolCall.input);

		expect(result.executionFailed).toBe(true);
		expect(result.originalException?.message).toContain('timed out');
	});
});
