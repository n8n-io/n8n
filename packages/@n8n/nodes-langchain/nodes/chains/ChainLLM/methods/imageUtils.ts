import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';
import { NodeOperationError, NodeConnectionTypes, OperationalError } from 'n8n-workflow';

import type { MessageTemplate } from './types';

export class UnsupportedMimeTypeError extends OperationalError {}

/**
 * Converts binary image data to a data URI
 */
export function dataUriFromImageData(binaryData: IBinaryData, bufferData: Buffer): string {
	if (!binaryData.mimeType?.startsWith('image/')) {
		throw new UnsupportedMimeTypeError(
			`${binaryData.mimeType} is not a supported type of binary data. Only images are supported.`,
		);
	}
	return `data:${binaryData.mimeType};base64,${bufferData.toString('base64')}`;
}

/**
 * Creates a human message with image content from either binary data or URL
 */
export async function createImageMessage({
	context,
	itemIndex,
	message,
}: {
	context: IExecuteFunctions;
	itemIndex: number;
	message: MessageTemplate;
}): Promise<HumanMessage> {
	// Validate message type
	if (message.messageType !== 'imageBinary' && message.messageType !== 'imageUrl') {
		throw new NodeOperationError(
			context.getNode(),
			'Invalid message type. Only imageBinary and imageUrl are supported',
		);
	}

	const detail = message.imageDetail === 'auto' ? undefined : message.imageDetail;

	// Handle image URL case
	if (message.messageType === 'imageUrl' && message.imageUrl) {
		return new HumanMessage({
			content: [
				{
					type: 'image_url',
					image_url: {
						url: message.imageUrl,
						detail,
					},
				},
			],
		});
	}

	// Handle binary image case
	const binaryDataKey = message.binaryImageDataKey ?? 'data';
	const inputData = context.getInputData()[itemIndex];
	const binaryData = inputData.binary?.[binaryDataKey] as IBinaryData;

	if (!binaryData) {
		throw new NodeOperationError(context.getNode(), 'No binary data set.');
	}

	const bufferData = await context.helpers.getBinaryDataBuffer(itemIndex, binaryDataKey);
	const model = (await context.getInputConnectionData(
		NodeConnectionTypes.AiLanguageModel,
		0,
	)) as BaseLanguageModel;

	try {
		// Create data URI from binary data
		const dataURI = dataUriFromImageData(binaryData, bufferData);

		// Some models need different image URL formats
		const directUriModels = [ChatGoogleGenerativeAI, ChatOllama];
		const imageUrl = directUriModels.some((i) => model instanceof i)
			? dataURI
			: { url: dataURI, detail };

		return new HumanMessage({
			content: [
				{
					type: 'image_url',
					image_url: imageUrl,
				},
			],
		});
	} catch (error) {
		if (error instanceof UnsupportedMimeTypeError)
			throw new NodeOperationError(context.getNode(), error.message);
		throw error;
	}
}
