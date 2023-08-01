import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { CodeExecutionMode, IDataObject } from 'n8n-workflow';

export async function generateCodeForPrompt(
	ctx: IRestApiContext,
	{
		question,
		context,
		model,
		n8nVersion,
	}: { question: string; context: { schema: IDataObject }; model: string; n8nVersion: string },
): Promise<{ code: string; mode: CodeExecutionMode }> {
	return makeRestApiRequest(ctx, 'POST', '/ask-ai', {
		question,
		context,
		model,
		n8nVersion,
	} as IDataObject);
}
