import type { IExecuteFunctions, INodeExecutionData, IBinaryData } from 'n8n-workflow';

import {
	validateSessionAndWindowId,
	validateAirtopApiResponse,
	convertScreenshotToBinary,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	let data: IBinaryData | undefined; // for storing the binary data
	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/screenshot`,
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	// process screenshot on success
	if (response.meta?.screenshots?.length) {
		const buffer = convertScreenshotToBinary(response.meta.screenshots[0]);
		data = await this.helpers.prepareBinaryData(buffer, 'screenshot.jpg', 'image/jpeg');
	}

	return [
		{
			json: {
				sessionId,
				windowId,
				...response,
			},
			...(data ? { binary: { data } } : {}),
		},
	];
}
