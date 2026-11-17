import type { TaskData, TaskResultData } from '@n8n/task-runner';

export function applyTaskResult<T>(
	{ runExecutionData, workflow }: Pick<TaskData, 'runExecutionData' | 'workflow'>,
	result: Pick<TaskResultData, 'customData' | 'staticData'> & { result: T },
): T {
	if (result.customData) {
		Object.assign((runExecutionData.resultData.metadata ??= {}), result.customData);
	}
	if (result.staticData) workflow.overrideStaticData(result.staticData);
	return result.result;
}
