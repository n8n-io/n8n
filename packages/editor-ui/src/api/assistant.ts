import type { IRestApiContext } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
): Promise<ChatRequest.ResponsePayload> {
	if (payload.type === 'init-error-help') {
		return {
			sessionId: '1234',
			messages: [
				{
					type: 'assistant-message',
					content:
						'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
				},
				{
					type: 'code-diff',
					description: 'Short solution description here that can spill over to two lines',
					codeDiff:
						'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
					suggestionId: 'test',
					quickReplies: [
						{
							type: 'new-suggestion',
							label: 'Give me another solution',
						},
						{
							type: 'resolved',
							label: 'All good',
						},
					],
					solution_count: 1,
				},
			],
		};
	}
	return await makeRestApiRequest(ctx, 'POST', '/ai-proxy/v1/chat', payload);
}

export async function replaceCode(
	ctx: IRestApiContext,
	payload: ReplaceCodeRequest.RequestPayload,
): Promise<ReplaceCodeRequest.ResponsePayload> {
	return await makeRestApiRequest(ctx, 'POST', '/ai-proxy/apply-code-diff', payload);
}
