import { Logger } from '@n8n/backend-common';
import { ChatConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OpenAiChatAgent } from '@n8n/chat-hub';
import type { ChatHubConversationModel } from '@n8n/api-types';

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

	async getModels(): Promise<ChatHubConversationModel[]> {
		return await Promise.resolve([
			{
				provider: 'openai',
				providerDisplayName: 'OpenAI',
				model: 'gpt-4',
				displayName: 'GPT-4',
				credentialType: 'openAiApi',
			},
			{
				provider: 'openai',
				providerDisplayName: 'OpenAI',
				model: 'gpt-4-turbo',
				displayName: 'GPT-4 Turbo',
				credentialType: 'openAiApi',
			},
			{
				provider: 'openai',
				providerDisplayName: 'OpenAI',
				model: 'gpt-3.5-turbo',
				displayName: 'GPT-3.5 Turbo',
				credentialType: 'openAiApi',
			},
			{
				provider: 'anthropic',
				providerDisplayName: 'Anthropic',
				model: 'claude-3-5-sonnet-20241022',
				displayName: 'Claude 3.5 Sonnet',
				credentialType: 'anthropicApi',
			},
			{
				provider: 'anthropic',
				providerDisplayName: 'Anthropic',
				model: 'claude-3-opus-20240229',
				displayName: 'Claude 3 Opus',
				credentialType: 'anthropicApi',
			},
			{
				provider: 'anthropic',
				providerDisplayName: 'Anthropic',
				model: 'claude-3-haiku-20240307',
				displayName: 'Claude 3 Haiku',
				credentialType: 'anthropicApi',
			},
			{
				provider: 'google',
				providerDisplayName: 'Google',
				model: 'gemini-1.5-pro',
				displayName: 'Gemini 1.5 Pro',
				credentialType: 'googlePalmApi',
			},
			{
				provider: 'google',
				providerDisplayName: 'Google',
				model: 'gemini-1.5-flash',
				displayName: 'Gemini 1.5 Flash',
				credentialType: 'googlePalmApi',
			},
		]);
	}

	async *ask(payload: ChatPayload, abortSignal?: AbortSignal) {
		yield* this.agent.ask(payload, abortSignal);
	}
}
