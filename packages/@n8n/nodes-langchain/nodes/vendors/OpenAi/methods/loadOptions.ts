import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function getFiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { data } = await apiRequest.call(this, 'GET', '/files', { qs: { purpose: 'assistants' } });

	const returnData: INodePropertyOptions[] = [];

	for (const file of data || []) {
		returnData.push({
			name: file.filename as string,
			value: file.id as string,
		});
	}

	return returnData;
}
