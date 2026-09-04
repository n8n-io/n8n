import type { ExecutionsConfig } from '@n8n/config';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { WorkflowPreExecute } from '../workflow-pre-execute';

import { PreExecuteBlockedError } from '@/errors/pre-execute-blocked.error';
import type { ExternalHooks } from '@/external-hooks';
import type { NodeTypes } from '@/node-types';
import type { WorkflowHookContextService } from '@/workflow-hook-context.service';

describe('WorkflowPreExecute', () => {
	const externalHooks = mock<ExternalHooks>();
	const workflowContext = mock<WorkflowHookContextService>();
	const nodeTypes = mock<NodeTypes>();
	const executionsConfig = mock<ExecutionsConfig>({ preExecuteErrorCreatesExecution: false });
	const preExecute = new WorkflowPreExecute(
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
		await preExecute.run(workflowData, 'webhook', 'user');

		expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
			expect.objectContaining({ id: 'wf-1' }),
			'webhook',
			workflowContext,
			'user',
		]);
	});

	it('does not run the hook when none is registered', async () => {
		externalHooks.hasHook.mockReturnValue(false);

		await preExecute.run(workflowData, 'webhook');

		expect(externalHooks.run).not.toHaveBeenCalled();
	});

	it('wraps a hook throw as PreExecuteBlockedError so callers can tell it from other failures', async () => {
		const blocked = new UserError('execution limit reached');
		externalHooks.run.mockRejectedValue(blocked);

		await expect(preExecute.run(workflowData, 'webhook')).rejects.toSatisfy(
			(error: unknown) => error instanceof PreExecuteBlockedError && error.cause === blocked,
		);
	});

	it('does not wrap errors that happen before the hook runs', async () => {
		externalHooks.hasHook.mockImplementation(() => {
			throw new Error('hook registry failed');
		});

		await expect(preExecute.run(workflowData, 'webhook')).rejects.toSatisfy(
			(error: unknown) =>
				error instanceof Error &&
				!(error instanceof PreExecuteBlockedError) &&
				error.message === 'hook registry failed',
		);
	});

	it('passes pin data on the Workflow given to the hook and returns that instance', async () => {
		const pinData = { NodeA: [{ json: { a: 1 } }] };

		const workflow = await preExecute.run(workflowData, 'manual', undefined, pinData);

		expect(workflow?.pinData).toEqual(pinData);
		expect(externalHooks.run).toHaveBeenCalledWith('workflow.preExecute', [
			workflow,
			'manual',
			workflowContext,
			undefined,
		]);
	});

	it('writes hook mutations on the Workflow back onto workflowData', async () => {
		externalHooks.run.mockImplementation(async (_name, args) => {
			const workflow = args![0] as Workflow;
			workflow.overrideStaticData({ limit: 1 });
			workflow.settings = { ...workflow.settings, timezone: 'UTC' };
		});

		const data: IWorkflowBase = {
			...workflowData,
			staticData: undefined,
			settings: {},
		};

		await preExecute.run(data, 'webhook');

		expect(data.staticData).toMatchObject({ limit: 1 });
		expect(data.settings).toMatchObject({ timezone: 'UTC' });
	});

	it('skips the hook when N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION is true', async () => {
		executionsConfig.preExecuteErrorCreatesExecution = true;

		await preExecute.run(workflowData, 'webhook');

		expect(externalHooks.hasHook).not.toHaveBeenCalled();
		expect(externalHooks.run).not.toHaveBeenCalled();
	});
});
