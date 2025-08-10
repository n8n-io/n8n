import type { Change } from '@/types/utils';
import type { ISourceData, ITaskData } from 'n8n-workflow';

export function renameNode(task: ITaskData, change: Change<string>): ITaskData {
	let sources: (ISourceData | null)[] = [];
	let hasUpdate = false;

	for (const source of task.source) {
		if (source?.previousNode === change.old) {
			sources.push({ ...source, previousNode: change.new });
			hasUpdate = true;
		} else {
			sources.push(source);
		}
	}

	return hasUpdate ? { ...task, source: sources } : task;
}
