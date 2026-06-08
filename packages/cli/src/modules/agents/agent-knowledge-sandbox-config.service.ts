import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	normalizeSandboxProvider,
	type DaytonaSandboxConfig,
	type SandboxConfig,
} from '@n8n/agents/sandbox';
import { OperationalError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { AiService } from '@/services/ai.service';

export const AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE =
	'n8n-sandbox is currently not supported for agent knowledge base operations.';

export const AGENT_KNOWLEDGE_DAYTONA_VOLUME_ID_REQUIRED_MESSAGE =
	'N8N_AGENTS_AI_SANDBOX_DAYTONA_VOLUME_ID is required to use the agent knowledge base Daytona sandbox.';

export const AGENT_KNOWLEDGE_DAYTONA_API_KEY_REQUIRED_MESSAGE =
	'DAYTONA_API_KEY is required to use the agent knowledge base Daytona sandbox.';

export const AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE =
	'Invalid Daytona volume subpath prefix for agent knowledge base.';

export const AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE =
	'Daytona proxy mode is currently not supported for agent knowledge base volume mounts.';

export interface AgentKnowledgeDaytonaVolumeConfig {
	volumeId: string;
	subpathPrefix: string;
}

@Service()
export class AgentKnowledgeSandboxConfigService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly aiService?: AiService,
	) {}

	isAvailable(): boolean {
		if (!this.agentsConfig.aiSandboxEnabled) return false;

		try {
			this.assertKnowledgeSandboxSupported();
			return !this.isDaytonaProxyEnabled();
		} catch {
			return false;
		}
	}

	assertKnowledgeSandboxSupported(): void {
		if (!this.agentsConfig.aiSandboxEnabled) return;

		const provider = normalizeSandboxProvider(this.agentsConfig.aiSandboxProvider);
		if (provider !== 'daytona') {
			throw new OperationalError(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);
		}

		this.resolveDaytonaVolumeConfig();
		this.resolveDaytonaApiKey();
	}

	resolveConfig(): SandboxConfig {
		const provider = normalizeSandboxProvider(this.agentsConfig.aiSandboxProvider);
		const timeout = this.agentsConfig.aiSandboxTimeout;

		if (!this.agentsConfig.aiSandboxEnabled) {
			return { enabled: false, provider, timeout };
		}

		if (provider !== 'daytona') {
			throw new OperationalError(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);
		}

		const config: DaytonaSandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: this.trimToUndefined(this.agentsConfig.daytonaApiUrl),
			daytonaApiKey: this.resolveDaytonaApiKey(),
			image: this.trimToUndefined(this.agentsConfig.aiSandboxImage),
			timeout,
			name: undefined,
		};

		return config;
	}

	resolveDaytonaVolumeConfig(): AgentKnowledgeDaytonaVolumeConfig {
		const provider = normalizeSandboxProvider(this.agentsConfig.aiSandboxProvider);
		if (provider !== 'daytona') {
			throw new OperationalError(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);
		}

		const volumeId = this.agentsConfig.aiSandboxDaytonaVolumeId.trim();
		if (volumeId.length === 0) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_VOLUME_ID_REQUIRED_MESSAGE);
		}

		return {
			volumeId,
			subpathPrefix: this.normalizeVolumeSubpathPrefix(
				this.agentsConfig.aiSandboxDaytonaVolumeSubpathPrefix,
			),
		};
	}

	resolveNamePrefix(): string | undefined {
		return this.trimToUndefined(this.agentsConfig.aiSandboxNamePrefix);
	}

	resolveTimeout(): number {
		return this.agentsConfig.aiSandboxTimeout;
	}

	isDaytonaProxyEnabled(): boolean {
		return (
			this.agentsConfig.aiSandboxEnabled &&
			normalizeSandboxProvider(this.agentsConfig.aiSandboxProvider) === 'daytona' &&
			this.aiService?.isProxyEnabled() === true
		);
	}

	async resolveConfigForUser(userId: string): Promise<SandboxConfig> {
		if (!this.isDaytonaProxyEnabled() || !this.aiService) {
			return this.resolveConfig();
		}

		const client = await this.aiService.getClient();
		const proxyConfig = await client.getSandboxProxyConfig();

		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: client.getSandboxProxyBaseUrl(),
			image: proxyConfig.image,
			timeout: this.agentsConfig.aiSandboxTimeout,
			name: undefined,
			getAuthToken: async () => {
				const token = await client.getBuilderApiProxyToken(
					{ id: userId },
					{ userMessageId: nanoid() },
				);

				return token.accessToken;
			},
		};
	}

	private resolveDaytonaApiKey(): string {
		const apiKey = this.agentsConfig.daytonaApiKey.trim();
		if (apiKey.length === 0) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_API_KEY_REQUIRED_MESSAGE);
		}
		return apiKey;
	}

	private normalizeVolumeSubpathPrefix(value: string): string {
		const prefix = value.trim() || 'agent-knowledge';
		if (
			prefix.startsWith('/') ||
			prefix.endsWith('/') ||
			prefix.includes('//') ||
			prefix.includes('\\') ||
			this.hasControlCharacters(prefix)
		) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE);
		}

		const segments = prefix.split('/');
		if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
			throw new OperationalError(AGENT_KNOWLEDGE_DAYTONA_VOLUME_SUBPATH_PREFIX_INVALID_MESSAGE);
		}

		return prefix;
	}

	private hasControlCharacters(value: string): boolean {
		for (const character of value) {
			const code = character.charCodeAt(0);
			if (code <= 0x1f || code === 0x7f) return true;
		}
		return false;
	}

	private trimToUndefined(value: string): string | undefined {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
}
