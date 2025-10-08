import type { INodeCredentials } from 'n8n-workflow';

export interface ChatPayloadWithCredentials {
	userId: string;
	message: string;
	messageId: string;
	sessionId: string;
	replyId: string;
	provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi';
	model: string;
	credentials: INodeCredentials;
}
