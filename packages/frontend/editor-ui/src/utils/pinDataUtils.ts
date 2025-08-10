import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import * as NodeExecutionDataUtils from './nodeExecutionDataUtils';
import type { Change } from '@/types/utils';

export function renameNode(pinData: IPinData, change: Change<string>): IPinData {
	let ret = pinData;
	let hasUpdate = false;

	if (pinData[change.old]) {
		const { [change.old]: renamed, ...restPinData } = ret;

		ret = { ...restPinData, [change.new]: renamed };
		hasUpdate = true;
	}

	let accum: IPinData = {};

	for (const [name, nodeExecutions] of Object.entries(ret)) {
		const entries: INodeExecutionData[] = [];

		for (const nodeExecution of nodeExecutions) {
			const updated = NodeExecutionDataUtils.renameNode(nodeExecution, change);

			entries.push(updated);
			hasUpdate = hasUpdate || updated !== nodeExecution;
		}

		accum[name] = entries;
	}

	if (!hasUpdate) {
		return pinData;
	}

	return accum;
}
