import type {
	AiApplySuggestionRequestDto,
	AiAskRequestDto,
	AiChatRequestDto,
	AiSuggestNodeNamesRequestDto,
	AiNodeNameSuggestion,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { nanoid } from 'nanoid';
import { InstanceSettings } from 'n8n-core';
import { assert, type IUser } from 'n8n-workflow';

import { N8N_VERSION } from '../constants';
import { License } from '../license';

@Service()
export class AiService {
	private client: AiAssistantClient | undefined;

	private initPromise: Promise<void> | undefined;

	constructor(
		private readonly licenseService: License,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async init() {
		const aiAssistantEnabled = this.licenseService.isAiAssistantEnabled();

		if (!aiAssistantEnabled) {
			return;
		}

		const licenseCert = await this.licenseService.loadCertStr();
		const consumerId = this.licenseService.getConsumerId();
		const baseUrl = this.globalConfig.aiAssistant.baseUrl;
		const logLevel = this.globalConfig.logging.level;

		this.client = new AiAssistantClient({
			licenseCert,
			consumerId,
			n8nVersion: N8N_VERSION,
			baseUrl,
			logLevel,
			instanceId: this.instanceSettings.instanceId,
		});

		// Register for license certificate updates
		this.licenseService.onCertRefresh((cert) => {
			this.client?.updateLicenseCert(cert);
		});
	}

	async chat(payload: AiChatRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.chat(payload, { id: user.id });
	}

	async applySuggestion(payload: AiApplySuggestionRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.applySuggestion(payload, { id: user.id });
	}

	async askAi(payload: AiAskRequestDto, user: IUser) {
		const client = await this.getClient();
		return await client.askAi(payload, { id: user.id });
	}

	/** Whether the AI service proxy is enabled (license + base URL configured). */
	isProxyEnabled(): boolean {
		return this.licenseService.isAiAssistantEnabled() && !!this.globalConfig.aiAssistant.baseUrl;
	}

	/** Return the initialized AiAssistantClient. Initializes lazily if needed. */
	async getClient(): Promise<AiAssistantClient> {
		if (!this.client) {
			this.initPromise ??= this.init();
			await this.initPromise;
			if (!this.client) {
				this.initPromise = undefined; // allow retry after license activation
			}
		}
		assert(this.client, 'AI Assistant client not initialized');
		return this.client;
	}

	async suggestNodeNames(
		payload: AiSuggestNodeNamesRequestDto,
		user: IUser,
	): Promise<{ suggestions: AiNodeNameSuggestion[] }> {
		const client = await this.getClient();
		const token = await client.getBuilderApiProxyToken(
			{ id: user.id },
			{ userMessageId: nanoid() },
		);

		const nodeDescriptions = payload.nodes
			.map((n) => {
				let line = `- "${n.currentName}" (type: ${n.displayName})`;
				if (n.parameters) {
					const paramStr = Object.entries(n.parameters)
						.map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
						.join(', ');
					if (paramStr) line += ` [${paramStr}]`;
				}
				return line;
			})
			.join('\n');

		const prompt = [
			'You are an n8n workflow assistant. Review ALL of the following workflow nodes and suggest better, more descriptive names.',
			'',
			'Guidelines:',
			'- Use parameters to understand what each node does (e.g. a Schedule Trigger with interval.field=hours -> "Hourly Trigger", an HTTP Request with url=api.slack.com -> "Call Slack API")',
			'- Suggest renames for nodes with generic/default names (e.g. "HTTP Request", "IF", "Code1", "Schedule Trigger")',
			'- Skip nodes that already have good descriptive custom names',
			'- Keep suggested names short (2-5 words), like a human would name them',
			'- NEVER include raw parameter values, technical details, or parenthetical info in suggested names',
			'- Return a JSON array: [{"currentName": "...", "suggestedName": "...", "reason": "..."}]',
			'- Return an empty array [] if no renames are needed',
			'',
			'Nodes:',
			nodeDescriptions,
		].join('\n');

		const response = await fetch(client.getApiProxyBaseUrl() + '/anthropic/v1/messages', {
			method: 'POST',
			headers: {
				Authorization: `${token.tokenType} ${token.accessToken}`,
				'Content-Type': 'application/json',
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: 'claude-haiku-4-5-20251001',
				max_tokens: 2048,
				messages: [{ role: 'user', content: prompt }],
			}),
		});

		if (!response.ok) {
			return { suggestions: [] };
		}

		try {
			const body = (await response.json()) as { content?: Array<{ text?: string }> };
			const text = body.content?.map((b) => b.text ?? '').join('') ?? '';
			const jsonMatch = text.match(/\[[\s\S]*\]/);
			const suggestions: AiNodeNameSuggestion[] = jsonMatch
				? (JSON.parse(jsonMatch[0]) as AiNodeNameSuggestion[])
				: [];
			return { suggestions };
		} catch {
			return { suggestions: [] };
		}
	}

	async createFreeAiCredits(user: IUser) {
		const client = await this.getClient();
		return await client.generateAiCreditsCredentials(user);
	}
}
