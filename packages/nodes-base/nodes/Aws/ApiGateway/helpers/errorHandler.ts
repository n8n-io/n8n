import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleError(
	this: IExecuteFunctions,
	itemIndex: number,
	error: IDataObject,
): Promise<IDataObject[]> {
	if (error.statusCode && error.statusCode >= 400) {
		const message = (error.message || error.__type || 'Unknown error') as string;
		throw new NodeApiError(this.getNode(), error as any, {
			message,
			description: error.message as string,
		});
	}
	return [error];
}
