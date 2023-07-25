import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { CodeExecutionMode, IDataObject } from 'n8n-workflow';

export async function generateCodeForPrompt(
	context: IRestApiContext,
	{ prompt, schema }: { prompt: string; schema: IDataObject },
): Promise<{ code: string; mode: CodeExecutionMode }> {
	return makeRestApiRequest(context, 'POST', '/ai/generate-code', {
		prompt,
		schema: JSON.stringify(schema),
	} as IDataObject);
}

export async function generateCurlCommand(
	context: IRestApiContext,
	{ prompt, service }: { prompt: string; service: string },
): Promise<{ curl: string }> {
	return makeRestApiRequest(context, 'POST', '/ai/generate-curl', {
		prompt,
		service,
	} as IDataObject);
}
