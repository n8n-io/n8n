import type { ChatHubConversationModel } from '@n8n/api-types';
import type { INodeCredentials } from 'n8n-workflow';

export interface ChatPayloadWithCredentials {
	userId: string;
	message: string;
	messageId: string;
	sessionId: string;
	replyId: string;
	model: ChatHubConversationModel;
	credentials: INodeCredentials;
}
