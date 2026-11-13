import {
	CodeExecutionBackend,
	type CodeExecutionBackendStatus,
	type CodeTaskRequest,
} from '@n8n/backend-services';
import { Service } from '@n8n/di';
import type { Result } from '@n8n/utils/result';

import { TaskRequester } from '@/task-runners/task-managers/task-requester';

/** Runs code tasks on task runners. */
@Service()
export class TaskRunnerCodeExecutionBackend extends CodeExecutionBackend {
	constructor(private readonly taskRequester: TaskRequester) {
		super();
	}

	async runTask<T, E = unknown>(request: CodeTaskRequest): Promise<Result<T, E>> {
		return await this.taskRequester.startTask<T, E>(
			request.additionalData,
			request.taskType,
			request.settings,
			request.executeFunctions,
			request.inputData,
			request.node,
			request.workflow,
			request.runExecutionData,
			request.runIndex,
			request.itemIndex,
			request.activeNodeName,
			request.connectionInputData,
			request.siblingParameters,
			request.mode,
			request.envProviderState,
			request.executeData,
		);
	}

	getStatus(taskType: string): CodeExecutionBackendStatus {
		return this.taskRequester.getRunnerStatus(taskType);
	}
}
