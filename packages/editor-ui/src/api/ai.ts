import type { IRestApiContext, Schema } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IDataObject } from 'n8n-workflow';

type Usage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
};

export async function generateCodeForPrompt(
	ctx: IRestApiContext,
	{
		question,
		context,
		model,
		n8nVersion,
		sessionId,
		instanceId,
	}: {
		question: string;
		context: {
			schema: Array<{ nodeName: string; schema: Schema }>;
			inputSchema: { nodeName: string; schema: Schema };
		};
		model: string;
		n8nVersion: string;
		sessionId: string;
		instanceId: string;
	},
): Promise<{ code: string; usage: Usage }> {
	return makeRestApiRequest(ctx, 'POST', '/ask-ai', {
		question,
		context,
		model,
		n8nVersion,
		sessionId,
		instanceId,
	} as IDataObject);
}
