import type { Change } from '@/types/utils';
import * as PairedItemUtils from './pairedItemUtils';
import type { INodeExecutionData } from 'n8n-workflow';

export function renameNode(
	nodeExecution: INodeExecutionData,
	change: Change<string>,
): INodeExecutionData {
	if (Array.isArray(nodeExecution.pairedItem)) {
		let hasUpdate = false;
		const items = [];

		for (const item of nodeExecution.pairedItem) {
			let updated = PairedItemUtils.renameNode(item, change);

			items.push(updated);
			hasUpdate = hasUpdate || updated !== item;
		}

		return hasUpdate ? { ...nodeExecution, pairedItem: items } : nodeExecution;
	}

	if (typeof nodeExecution.pairedItem === 'object') {
		let updated = PairedItemUtils.renameNode(nodeExecution.pairedItem, change);

		return updated !== nodeExecution.pairedItem
			? { ...nodeExecution, pairedItem: updated }
			: nodeExecution;
	}

	return nodeExecution;
}
