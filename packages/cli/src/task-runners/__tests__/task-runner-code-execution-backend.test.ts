import type { CodeTaskRequest } from '@n8n/backend-services';
import type {
	EnvProviderState,
	IExecuteData,
	IExecuteFunctions,
	INode,
	IRunExecutionData,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { TaskRequester } from '@/task-runners/task-managers/task-requester';
import { TaskRunnerCodeExecutionBackend } from '@/task-runners/task-runner-code-execution-backend';

describe('TaskRunnerCodeExecutionBackend', () => {
	const taskRequester = mock<TaskRequester>();
	const backend = new TaskRunnerCodeExecutionBackend(taskRequester);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts a task runner task with the fields of the request', async () => {
		taskRequester.startTask.mockResolvedValue({ ok: true, result: [{ json: {} }] });
		const request: CodeTaskRequest = {
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			taskType: 'javascript',
			settings: { code: 'return []' },
			executeFunctions: mock<IExecuteFunctions>(),
			inputData: { main: [] },
			node: mock<INode>(),
			workflow: mock<Workflow>(),
			runExecutionData: mock<IRunExecutionData>(),
			runIndex: 1,
			itemIndex: 2,
			activeNodeName: 'Code',
			connectionInputData: [],
			siblingParameters: {},
			mode: 'manual',
			envProviderState: mock<EnvProviderState>(),
			executeData: mock<IExecuteData>(),
		};

		const result = await backend.runTask(request);

		expect(result).toEqual({ ok: true, result: [{ json: {} }] });
		expect(taskRequester.startTask).toHaveBeenCalledExactlyOnceWith(
			request.additionalData,
			'javascript',
			{ code: 'return []' },
			request.executeFunctions,
			{ main: [] },
			request.node,
			request.workflow,
			request.runExecutionData,
			1,
			2,
			'Code',
			[],
			{},
			'manual',
			request.envProviderState,
			request.executeData,
		);
	});

	it('returns the error result of the task runner task', async () => {
		taskRequester.startTask.mockResolvedValue({ ok: false, error: new Error('boom') });

		const result = await backend.runTask(mock<CodeTaskRequest>());

		expect(result).toEqual({ ok: false, error: new Error('boom') });
	});

	it('returns the runner status of the task type', () => {
		taskRequester.getRunnerStatus.mockReturnValue({ available: false, reason: 'offline' });

		expect(backend.getStatus('python')).toEqual({ available: false, reason: 'offline' });
		expect(taskRequester.getRunnerStatus).toHaveBeenCalledWith('python');
	});
});
