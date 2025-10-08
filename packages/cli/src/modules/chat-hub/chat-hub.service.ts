import { Logger } from '@n8n/backend-common';
import { ChatConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OpenAiChatAgent } from '@n8n/chat-hub';
import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatHubConversationModel,
	type ChatModelsResponse,
} from '@n8n/api-types';
import { CredentialsHelper } from '@/credentials-helper';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import { getBase } from '@/workflow-execute-additional-data';

import { type ChatPayload } from './chat-hub.types';

@Service()
export class ChatHubService {
	private agent: OpenAiChatAgent;

	constructor(
		private readonly logger: Logger,
		private readonly chatConfig: ChatConfig,
		private readonly credentialsHelper: CredentialsHelper,
	) {
		this.agent = new OpenAiChatAgent({
			logger: this.logger,
			apiKey: this.chatConfig.openAiApiKey,
		});
	}

	async getModels(
		userId: string,
		credentialIds: Record<ChatHubProvider, string | null>,
	): Promise<ChatModelsResponse> {
		const models: ChatHubConversationModel[] = [];
		const additionalData = await getBase(userId);

		for (const [providerKey, credentialId] of Object.entries(credentialIds)) {
			if (!credentialId) {
				continue;
			}

			// Type assertion is safe here because credentialIds type guarantees valid keys
			const provider = providerKey as ChatHubProvider;
			const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

			try {
				// Get the decrypted credential data
				const nodeCredentials: INodeCredentialsDetails = {
					id: credentialId,
					name: credentialType,
				};

				const credentials = await this.credentialsHelper.getDecrypted(
					additionalData,
					nodeCredentials,
					credentialType,
					'internal',
					undefined,
					true,
				);

				// Extract API key from credentials based on provider
				const apiKey = this.extractApiKey(provider, credentials);
				if (!apiKey) {
					continue;
				}

				// Fetch models dynamically from the provider
				const providerModels = await this.fetchModelsForProvider(provider, apiKey);
				models.push(...providerModels);
			} catch (error) {
				this.logger.debug(`Failed to get models for ${provider}: ${error}`);
			}
		}

		return models;
	}

	private async fetchModelsForProvider(
		provider: ChatHubProvider,
		apiKey: string,
	): Promise<ChatHubConversationModel[]> {
		switch (provider) {
			case 'openai':
				return await this.fetchOpenAiModels(apiKey);
			case 'anthropic':
				return await this.fetchAnthropicModels(apiKey);
			case 'google':
				return await this.fetchGoogleModels(apiKey);
		}
	}

	private async fetchOpenAiModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		try {
			const response = await fetch('https://api.openai.com/v1/models', {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
			}

			const data = await response.json();
			const models: ChatHubConversationModel[] = [];

			// Filter for chat models only (GPT models)
			const chatModels = data.data.filter(
				(model: { id: string }) =>
					model.id.includes('gpt') && !model.id.includes('instruct') && !model.id.includes('audio'),
			);

			for (const model of chatModels) {
				models.push({
					provider: 'openai',
					model: model.id,
				});
			}

			return models;
		} catch (error) {
			this.logger.debug(`Failed to fetch OpenAI models: ${error}`);
			return [];
		}
	}

	private async fetchAnthropicModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		// Anthropic doesn't have a public models list endpoint, so we'll use a curated list
		// but validate the API key first
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 1,
					messages: [{ role: 'user', content: 'test' }],
				}),
			});

			// If authentication fails, don't return models
			if (response.status === 401 || response.status === 403) {
				return [];
			}

			// Return known Anthropic models
			return [
				{
					provider: 'anthropic',
					model: 'claude-3-5-sonnet-20241022',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-opus-20240229',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-sonnet-20240229',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-haiku-20240307',
				},
			];
		} catch (error) {
			this.logger.debug(`Failed to validate Anthropic API key: ${error}`);
			return [];
		}
	}

	private async fetchGoogleModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		try {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
				{
					method: 'GET',
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch Google models: ${response.statusText}`);
			}

			const data = await response.json();
			const models: ChatHubConversationModel[] = [];

			// Filter for Gemini chat models
			const chatModels = data.models?.filter(
				(model: { name: string; supportedGenerationMethods?: string[] }) =>
					model.name.includes('gemini') &&
					model.supportedGenerationMethods?.includes('generateContent'),
			);

			for (const model of chatModels || []) {
				// Extract model ID from the full name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
				const modelId = model.name.split('/').pop();
				models.push({
					provider: 'google',
					model: modelId,
				});
			}

			return models;
		} catch (error) {
			this.logger.debug(`Failed to fetch Google models: ${error}`);
			return [];
		}
	}

	private extractApiKey(provider: ChatHubProvider, credentials: unknown): string | undefined {
		if (typeof credentials !== 'object' || credentials === null) {
			return undefined;
		}

		const creds = credentials as Record<string, unknown>;

		switch (provider) {
			case 'openai':
			case 'anthropic':
			case 'google':
				// All providers use 'apiKey' field
				return typeof creds.apiKey === 'string' ? creds.apiKey : undefined;
		}
	}

	async *ask(payload: ChatPayload, abortSignal?: AbortSignal) {
		yield* this.agent.ask(payload, abortSignal);
	}
}
