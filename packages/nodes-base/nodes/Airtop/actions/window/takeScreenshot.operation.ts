import type {
	IExecuteFunctions,
	INodeExecutionData,
	IBinaryData,
	INodeProperties,
} from 'n8n-workflow';

import {
	validateSessionAndWindowId,
	validateAirtopApiResponse,
	convertScreenshotToBinary,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Output Binary Image',
		description: 'Whether to output the image as a binary file instead of a base64 encoded string',
		name: 'outputImageAsBinary',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['window'],
				operation: ['takeScreenshot'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const outputImageAsBinary = this.getNodeParameter('outputImageAsBinary', index, false) as boolean;

	let data: IBinaryData | undefined; // for storing the binary data
	let image = ''; // for storing the base64 encoded image

	const response = await apiRequest.call(
		this,
		'POST',
		`/sessions/${sessionId}/windows/${windowId}/screenshot`,
	);

	// validate response
	validateAirtopApiResponse(this.getNode(), response);

	// process screenshot on success
	if (response.meta?.screenshots?.length) {
		if (outputImageAsBinary) {
			const buffer = convertScreenshotToBinary(response.meta.screenshots[0]);
			data = await this.helpers.prepareBinaryData(buffer, 'screenshot.jpg', 'image/jpeg');
		} else {
			image = response?.meta?.screenshots?.[0].dataUrl;
		}
	}

	return [
		{
			json: {
				sessionId,
				windowId,
				image,
			},
			...(data ? { binary: { data } } : {}),
		},
	];
}
