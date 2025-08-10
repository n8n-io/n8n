import type { IExecutionResponse } from '@/Interface';
import type { IPinData, IRunData, ITaskData } from 'n8n-workflow';
import * as PinDataUtils from './pinDataUtils';
import * as RunDataUtils from './runDataUtils';
import type { Change } from '@/types/utils';

function setRunData(execution: IExecutionResponse, runData: IRunData): IExecutionResponse {
	return runData === execution.data?.resultData.runData
		? execution
		: {
				...execution,
				data: {
					...execution.data,
					resultData: {
						...execution.data?.resultData,
						runData,
					},
				},
			};
}

function setPinData(execution: IExecutionResponse, pinData: IPinData): IExecutionResponse {
	return pinData === execution.data?.resultData.pinData
		? execution
		: {
				...execution,
				data: {
					...execution.data,
					resultData: {
						...(execution.data?.resultData ?? { runData: {} }),
						pinData,
					},
				},
			};
}

export function removeNonSuccessfulTasks(execution: IExecutionResponse): IExecutionResponse {
	if (!execution?.data?.resultData) {
		return execution;
	}

	return setRunData(
		execution,
		RunDataUtils.update(execution.data.resultData.runData, (tasks) =>
			tasks.filter((task) => task.executionStatus === 'success'),
		),
	);
}

export function removeRunDataByNodeName(execution: IExecutionResponse, name: string) {
	if (!execution?.data?.resultData?.runData[name]) {
		return execution;
	}

	const { [name]: _, ...rest } = execution.data.resultData.runData;

	return setRunData(execution, rest);
}

export function upsertRunDataByNodeName(
	execution: IExecutionResponse,
	name: string,
	transform: (current: ITaskData[]) => ITaskData[],
) {
	const runData = execution?.data?.resultData.runData;

	if (!runData?.[name]) {
		return setRunData(execution, { ...runData, [name]: transform([]) });
	}

	const updated = transform(runData[name]);

	return updated === runData[name]
		? execution
		: setRunData(execution, { ...runData, [name]: updated });
}

export function renameNode(
	execution: IExecutionResponse,
	change: Change<string>,
): IExecutionResponse {
	let ret = execution;

	// Update run data
	if (ret?.data?.resultData) {
		ret = setRunData(ret, RunDataUtils.renameNode(ret.data.resultData.runData, change));
	}

	// Update pinned data
	if (ret.data?.resultData.pinData) {
		ret = setPinData(ret, PinDataUtils.renameNode(ret.data.resultData.pinData, change));
	}

	return ret;
}
