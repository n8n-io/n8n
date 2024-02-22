import { BINARY_ENCODING, type IDataObject, type IExecuteResponsePromiseData } from 'n8n-workflow';

export function decodeWebhookResponse(
	response: IExecuteResponsePromiseData,
): IExecuteResponsePromiseData {
	if (
		typeof response === 'object' &&
		typeof response.body === 'object' &&
		(response.body as IDataObject)['__@N8nEncodedBuffer@__']
	) {
		response.body = Buffer.from(
			(response.body as IDataObject)['__@N8nEncodedBuffer@__'] as string,
			BINARY_ENCODING,
		);
	}

	return response;
}
