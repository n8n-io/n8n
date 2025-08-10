import type { Change } from '@/types/utils';
import type { IRunData, ITaskData } from 'n8n-workflow';
import * as TaskDataUtils from './taskDataUtils';

export function renameNode(runData: IRunData, change: Change<string>): IRunData {
	let ret = runData;
	let hasUpdate = false;

	if (runData[change.old]) {
		const { [change.old]: renamed, ...restPinData } = ret;

		ret = { ...restPinData, [change.new]: renamed };
		hasUpdate = true;
	}

	const accum: IRunData = {};

	for (const [name, tasks] of Object.entries(ret)) {
		const entries: ITaskData[] = [];

		for (const task of tasks) {
			const updated = TaskDataUtils.renameNode(task, change);

			entries.push(updated);
			hasUpdate = hasUpdate || updated !== task;
		}

		accum[name] = entries;
	}

	return hasUpdate ? accum : runData;
}

export function update(
	runData: IRunData,
	transform: (current: ITaskData[], nodeName: string) => ITaskData[],
): IRunData {
	const ret: IRunData = {};
	let hasUpdate = false;

	for (const [name, tasks] of Object.entries(runData)) {
		const updated = transform(tasks ?? [], name);

		hasUpdate = hasUpdate || updated !== tasks;

		if (updated.length > 0) {
			ret[name] = updated;
		}
	}

	if (!hasUpdate) {
		return runData;
	}

	return ret;
}
