import type { IDataObject, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
export function handleDetectiveError(error: JsonObject, itemIndex: number, context: { $node: INode; $input: IDataObject }): void {
	if (error.httpCode) {
		throw new NodeApiError(context.$node, error as JsonObject, {
			message: ((error.body as IDataObject)?.message as string) || `AWS Detective error: ${error.httpCode}`,
			httpCode: error.httpCode as string,
			itemIndex,
		});
	}
	throw error;
}
