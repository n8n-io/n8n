import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IDataObject } from 'n8n-workflow';

export async function generateCodeForPrompt(
	context: IRestApiContext,
	{ prompt, schema }: { prompt: string; schema: IDataObject },
): Promise<{ code: string }> {
	return makeRestApiRequest(context, 'POST', '/ai/generate-code', {
		prompt,
		schema: JSON.stringify(schema),
	} as IDataObject);
}
