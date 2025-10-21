import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleError(
	this: IExecuteFunctions,
	itemIndex: number,
	error: IDataObject,
): Promise<IDataObject[]> {
	if (error.message || error.__type) {
		const errorType = (error.__type || 'UnknownError') as string;
		const message = (error.message || 'An error occurred') as string;
		throw new NodeApiError(this.getNode(), error as any, {
			message: `${errorType}: ${message}`,
			description: message,
		});
	}
	return [error];
}
