import type { IExecuteFunctions } from 'n8n-workflow';

import { apiRequest } from '../../transport';
import type { IAirtopResponseWithFiles } from '../../transport/types';

/**
 * Requests all files from the Airtop API with pagination of 100 files at a time
 * @param this - The execution context
 * @param sessionIds - The session IDs to filter files by
 * @returns A promise that resolves to the response data
 */
export async function requestAllFiles(
	this: IExecuteFunctions,
	sessionIds: string,
): Promise<IAirtopResponseWithFiles> {
	const endpoint = '/files';
	let hasMore = true;
	let currentOffset = 0;
	const limit = 100;
	const files: IAirtopResponseWithFiles['data']['files'] = [];
	let responseData: IAirtopResponseWithFiles;

	while (hasMore) {
		// request files
		responseData = (await apiRequest.call(
			this,
			'GET',
			endpoint,
			{},
			{ offset: currentOffset, limit, sessionIds },
		)) as IAirtopResponseWithFiles;
		// add files to the array
		if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
			files.push(...responseData.data.files);
		}
		// check if there are more files
		hasMore = Boolean(responseData.data?.pagination?.hasMore);
		currentOffset += limit;
	}

	return {
		data: {
			files,
			pagination: {
				hasMore,
			},
		},
	};
}
