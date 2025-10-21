import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleKMSError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<never> {
	const errorType = (error.__type || error.code || 'UnknownError') as string;
	const message = (error.message || error.Message || 'An error occurred') as string;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `KMS ${errorType}: ${message}`,
		description: message,
		itemIndex,
	});
}
