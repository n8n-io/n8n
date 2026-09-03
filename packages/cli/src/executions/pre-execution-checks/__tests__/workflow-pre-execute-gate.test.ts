import type { ExecutionsConfig } from '@n8n/config';
import type { IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WorkflowPreExecuteGate } from '../workflow-pre-execute-gate';

import { PreExecuteBlockedError } from '@/errors/pre-execute-blocked.error';
import type { ExternalHooks } from '@/external-hooks';
import type { NodeTypes } from '@/node-types';
import type { WorkflowHookContextService } from '@/workflow-hook-context.service';

describe('WorkflowPreExecuteGate', () => {
	const externalHooks = mock<ExternalHooks>();
	const workflowContext = mock<WorkflowHookContextService>();
	const nodeTypes = mock<NodeTypes>();
	const executionsConfig = mock<ExecutionsConfig>({ preExecuteErrorCreatesExecution: false });
	const gate = new WorkflowPreExecuteGate(
		externalHooks,
		workflowContext,
		nodeTypes,
		executionsConfig,
	);

	const workflowData = mock<IWorkflowBase>({
		id: 'wf-1',
		name: 'Test',
		nodes: [],
		connections: {},
		staticData: {},
		settings: {},
		activeVersionId: 'v1',
		active: true,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		executionsConfig.preExecuteErrorCreatesExecution = false;
		externalHooks.hasHook.mockReturnValue(true);
		externalHooks.run.mockResolvedValue(undefined);
	});

	it('runs workflow.preExecute before a row would be created', async () => {
		await gate.assertCanStart(workflowData, 'webhook', 'user');

		expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
			expect.objectContaining({ id: 'wf-1' }),
			'webhook',
			workflowContext,
			'user',
		]);
	});

	it('does not run the hook when none is registered', async () => {
		externalHooks.hasHook.mockReturnValue(false);

		await gate.assertCanStart(workflowData, 'webhook');

		expect(externalHooks.run).not.toHaveBeenCalled();
	});

	it('wraps a hook throw as PreExecuteBlockedError so callers can tell it from other failures', async () => {
		const blocked = new UserError('execution limit reached');
		externalHooks.run.mockRejectedValue(blocked);

		await expect(gate.assertCanStart(workflowData, 'webhook')).rejects.toSatisfy(
			(error: unknown) => error instanceof PreExecuteBlockedError && error.cause === blocked,
		);
	});

	it('does not wrap errors that happen before the hook runs', async () => {
		externalHooks.hasHook.mockImplementation(() => {
			throw new Error('hook registry failed');
		});

		await expect(gate.assertCanStart(workflowData, 'webhook')).rejects.toSatisfy(
			(error: unknown) =>
				error instanceof Error &&
				!(error instanceof PreExecuteBlockedError) &&
				error.message === 'hook registry failed',
		);
	});

	it('skips the gate when N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION is true', async () => {
		executionsConfig.preExecuteErrorCreatesExecution = true;

		await gate.assertCanStart(workflowData, 'webhook');

		expect(externalHooks.hasHook).not.toHaveBeenCalled();
		expect(externalHooks.run).not.toHaveBeenCalled();
	});
});
