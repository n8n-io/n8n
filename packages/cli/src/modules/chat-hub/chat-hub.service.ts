import { Logger } from '@n8n/backend-common';
import { ChatConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OpenAiChatAgent } from '@n8n/n8n-chat';
import { type IUser } from 'n8n-workflow';

import { type ChatPayload } from './chat-hub.types';

@Service()
export class ChatHubService {
	private agent: OpenAiChatAgent;

	constructor(
		private readonly logger: Logger,
		private readonly chatConfig: ChatConfig,
	) {
		this.agent = new OpenAiChatAgent({
			logger: this.logger,
			apiKey: this.chatConfig.openAiApiKey,
		});
	}

	async getModels() {
		return await Promise.resolve(['gpt-3.5-turbo', 'gpt-4']);
	}

	async *ask(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		yield* this.agent.ask(payload, user.id, abortSignal);
	}
}
