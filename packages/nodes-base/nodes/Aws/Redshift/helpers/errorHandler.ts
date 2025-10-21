import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleRedshiftError(
	this: IExecuteFunctions,
	error: IDataObject,
	itemIndex: number,
): Promise<never> {
	const errorType = (error.Error?.Code || error.code || 'UnknownError') as string;
	const message = (error.Error?.Message || error.message || 'An error occurred') as string;

	throw new NodeApiError(this.getNode(), error as any, {
		message: `Redshift ${errorType}: ${message}`,
		description: message,
		itemIndex,
	});
}
