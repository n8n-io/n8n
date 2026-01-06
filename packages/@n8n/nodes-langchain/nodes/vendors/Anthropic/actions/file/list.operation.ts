import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { File } from '../../helpers/interfaces';
import { getBaseUrl } from '../../helpers/utils';
import { apiRequest } from '../../transport';

interface FileListResponse {
	data: File[];
	first_id: string;
	last_id: string;
	has_more: boolean;
}

export const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
	},
];

const displayOptions = {
	show: {
		operation: ['list'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', i, false);
	const limit = this.getNodeParameter('limit', i, 50);
	const baseUrl = await getBaseUrl.call(this);
	if (returnAll) {
		return await getAllFiles.call(this, baseUrl, i);
	} else {
		return await getFiles.call(this, baseUrl, i, limit);
	}
}

async function getAllFiles(this: IExecuteFunctions, baseUrl: string, i: number) {
	let hasMore = true;
	let lastId: string | undefined = undefined;
	const files: File[] = [];
	while (hasMore) {
		const response = (await apiRequest.call(this, 'GET', '/v1/files', {
			qs: {
				limit: 1000,
				after_id: lastId,
			},
		})) as FileListResponse;

		hasMore = response.has_more;
		lastId = response.last_id;
		files.push(...response.data);
	}

	return files.map((file) => ({
		json: { ...file, url: `${baseUrl}/v1/files/${file.id}` },
		pairedItem: { item: i },
	}));
}

async function getFiles(this: IExecuteFunctions, baseUrl: string, i: number, limit: number) {
	const response = (await apiRequest.call(this, 'GET', '/v1/files', {
		qs: {
			limit,
		},
	})) as FileListResponse;

	return response.data.map((file) => ({
		json: { ...file, url: `${baseUrl}/v1/files/${file.id}` },
		pairedItem: { item: i },
	}));
}
