import type {
	FrontendBuilderMessageRequestDto,
	FrontendBuilderMessageResponse,
	FrontendBuilderStateResponse,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IDataObject } from 'n8n-workflow';

export async function getFrontendBuilderState(
	context: IRestApiContext,
	workflowId: string,
): Promise<FrontendBuilderStateResponse> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/frontend`);
}

export async function sendFrontendBuilderMessage(
	context: IRestApiContext,
	workflowId: string,
	body: FrontendBuilderMessageRequestDto,
): Promise<FrontendBuilderMessageResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/workflows/${workflowId}/frontend/messages`,
		body as unknown as IDataObject,
	);
}
