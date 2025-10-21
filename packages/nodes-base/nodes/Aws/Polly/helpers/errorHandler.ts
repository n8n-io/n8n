import type { IDataObject, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export function handlePollyError(
	error: JsonObject,
	itemIndex: number,
	context: { $node: INode; $input: IDataObject },
): void {
	if (error.httpCode) {
		const statusCode = error.httpCode as string;
		const errorBody = error.body as IDataObject;

		throw new NodeApiError(context.$node, error as JsonObject, {
			message: (errorBody?.message as string) || `AWS Polly error: ${statusCode}`,
			description: errorBody?.__type as string,
			httpCode: statusCode,
			itemIndex,
		});
	}

	throw error;
}
