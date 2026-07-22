import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { WorkflowRunner } from '@/workflow-runner';

import { executeWorkflow, type WorkflowToolContext } from '../workflow-tool-factory';

const triggerNode: INode = {
	id: 'trigger-1',
	name: 'Manual Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const workflow = {
	id: 'wf-1',
	name: 'Lookup workflow',
	nodes: [triggerNode],
	connections: {},
} as unknown as WorkflowEntity;

function buildContext(run: ReturnType<typeof vi.fn>, extras: Partial<WorkflowToolContext> = {}) {
	return {
		workflowRepository: {} as never,
		workflowRunner: { run } as unknown as WorkflowRunner,
		activeExecutions: { has: vi.fn().mockReturnValue(false) } as unknown as ActiveExecutions,
		projectId: 'p1',
		...extras,
	} satisfies WorkflowToolContext;
}

describe('executeWorkflow → eval instrumentation', () => {
	beforeEach(() => {
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
	});

	afterEach(() => {
		Container.reset();
	});

	it('sets configureAdditionalData on the run data when instrumented', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');
		const instrumentToolAdditionalData = vi.fn();

		await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{ input: 'hello' },
			buildContext(run, { instrumentToolAdditionalData }),
			false,
			'Lookup_workflow',
		);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeDefined();

		const additionalData = {};
		void runData.configureAdditionalData!(additionalData as never);
		expect(instrumentToolAdditionalData).toHaveBeenCalledWith(additionalData, {
			toolName: 'Lookup_workflow',
			toolKind: 'workflow',
		});
	});

	it('leaves the run data untouched when not instrumented', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');

		await executeWorkflow(workflow, triggerNode, 'manual', {}, buildContext(run), false);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeUndefined();
	});

	it('leaves the run data untouched when instrumented but no tool name is bound', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');

		await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{},
			buildContext(run, { instrumentToolAdditionalData: vi.fn() }),
			false,
		);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeUndefined();
	});
});
