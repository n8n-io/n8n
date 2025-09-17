import type { ITaskData } from 'n8n-workflow';

export function getItemCountByConnectionType(data: ITaskData['data']): Record<string, number[]> {
	const itemCountByConnectionType: Record<string, number[]> = {};

	for (const [connectionType, connectionData] of Object.entries(data ?? {})) {
		if (Array.isArray(connectionData)) {
			itemCountByConnectionType[connectionType] = connectionData.map((d) => (d ? d.length : 0));
		} else {
			itemCountByConnectionType[connectionType] = [0];
		}
	}

	return itemCountByConnectionType;
}
