import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { CodeExecutionMode, IDataObject } from 'n8n-workflow';

export async function generateCodeForPrompt(
	context: IRestApiContext,
	{ prompt, schema, model }: { prompt: string; schema: IDataObject; model: string },
): Promise<{ code: string; mode: CodeExecutionMode }> {
	return makeRestApiRequest(context, 'POST', '/ai/generate-code', {
		prompt,
		schema: JSON.stringify(schema),
		model,
	} as IDataObject);
}
