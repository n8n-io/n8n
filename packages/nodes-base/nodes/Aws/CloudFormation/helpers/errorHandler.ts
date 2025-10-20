import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function handleError(
	this: IExecuteFunctions,
	itemIndex: number,
	error: IDataObject,
): Promise<IDataObject[]> {
	if (error.Error || error.error) {
		const errorData = error.Error || error.error;
		const errorType = (errorData as IDataObject).Type || (errorData as IDataObject).Code || 'UnknownError';
		const message = (errorData as IDataObject).Message || 'An error occurred';
		throw new NodeApiError(this.getNode(), error as any, {
			message: `${errorType}: ${message}`,
			description: message as string,
		});
	}
	return [error];
}
