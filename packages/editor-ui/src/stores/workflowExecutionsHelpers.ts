import { IExecutionResponse, IExecutionResponseCached, IRunDataCached, ITaskDataCached } from "@/Interface";
import { getPairedItemId } from "@/pairedItemUtils";
import { INodeExecutionData, IRunData, ITaskData } from "n8n-workflow";

export function clearExecutionsCache() {
	sessionStorage.clear();
}

export function cacheExecutionsResponse(response: IExecutionResponse | null): void {
	if (!response) {
		return;
	}

	const runData = response.data?.resultData?.runData;
	if (!runData) {
		return;
	}

	cacheRunData(runData);
}

function cacheRunData(runData: IRunData) {
	Object.keys(runData).forEach((nodeName) => {
		cacheNodeRun(nodeName, runData[nodeName]);
	});
}

function cacheNodeRun(nodeName: string, tasks: ITaskData[]) {
	tasks.forEach((task, i) => {
		cacheNodeRunTask(nodeName, i, task);
	});
}

function cacheNodeRunTask(nodeName: string, run: number, task: ITaskData) {
	const data = task.data?.main;
	if (!data) {
		return;
	}

	data.forEach((output, i) => output && cacheNodeRunTaskOutput(nodeName, run, i, output));
}

function cacheNodeRunTaskOutput(nodeName: string, run: number, output: number, items: INodeExecutionData[]) {
	items.forEach((item, i) => {
		cacheItem(nodeName, run, output, i, item);
	});
}

function cacheItem(nodeName: string, run: number, output: number, itemIndex: number, item: INodeExecutionData) {
	const itemId = getPairedItemId(nodeName, run, output, itemIndex);

	sessionStorage.setItem(itemId, JSON.stringify(item));
}

export function getCachedExecutionResponse(response: IExecutionResponse | null): IExecutionResponseCached | null {
	if (!response) {
		return response;
	}

	const { data, ...restOfResponse } = response;

	if (!data) {
		return restOfResponse;
	}

	const resultData = data.resultData || {};
	const runData = resultData.runData || {};
	const runDataCached: IRunDataCached = {};

	Object.keys(runData).forEach((key: string) => {
		runDataCached[key] = getCachedTaskData(runData[key]);
	});

	return {
		...restOfResponse,
		data: {
			resultData: {
				...resultData,
				runData: runDataCached,
			},
		},
	};
}

function getCachedTaskData(tasks: ITaskData[]): ITaskDataCached[] {
	return tasks.map((task: ITaskData) => {
		const { data, ...restOfTask } = task;

		if (!data) {
			return restOfTask;
		}

		const dataCached: ITaskDataCached["data"] = {};
		Object.keys(data).forEach((output: string) => { // main
			dataCached[output] = data[output].map((output) => {
				return {
					total: output?.length ?? 0,
				};
			});
		});

		return {
			...restOfTask,
			data: dataCached,
		};
	});
}
