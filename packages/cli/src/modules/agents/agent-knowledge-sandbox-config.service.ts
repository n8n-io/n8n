import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { normalizeSandboxProvider, type SandboxConfig } from '@n8n/ai-utilities/sandbox';
import { OperationalError } from 'n8n-workflow';

const AGENTS_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'N8N_AGENTS_AI_SANDBOX_SERVICE_URL is required to use the agent knowledge base sandbox.';
const DAYTONA_API_KEY_REQUIRED_MESSAGE =
	'DAYTONA_API_KEY is required to use the agent knowledge base Daytona sandbox.';

@Service()
export class AgentKnowledgeSandboxConfigService {
	constructor(private readonly agentsConfig: AgentsConfig) {}

	resolveNamePrefix(): string | undefined {
		const prefix = (this.agentsConfig.aiSandboxNamePrefix ?? '').trim();
		return prefix.length > 0 ? prefix : undefined;
	}

	isAvailable(): boolean {
		if (!this.agentsConfig.aiSandboxEnabled) return false;

		try {
			return this.resolveConfig().enabled;
		} catch {
			return false;
		}
	}

	resolveConfig(): SandboxConfig {
		const provider = normalizeSandboxProvider(this.agentsConfig.aiSandboxProvider);
		const timeout = this.agentsConfig.aiSandboxTimeout;

		if (!this.agentsConfig.aiSandboxEnabled) {
			return { enabled: false, provider, timeout };
		}

		if (provider === 'n8n-sandbox') {
			const serviceUrl = this.agentsConfig.aiSandboxServiceUrl.trim();
			if (serviceUrl.length === 0) {
				throw new OperationalError(AGENTS_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE);
			}

			return {
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl,
				apiKey: this.agentsConfig.aiSandboxServiceApiKey || undefined,
				timeout,
			};
		}

		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: this.agentsConfig.daytonaApiUrl || undefined,
			daytonaApiKey: this.resolveDaytonaApiKey(),
			image: this.agentsConfig.aiSandboxImage || undefined,
			timeout,
			name: undefined,
		};
	}

	private resolveDaytonaApiKey(): string {
		const apiKey = this.agentsConfig.daytonaApiKey.trim();
		if (apiKey.length === 0) {
			throw new OperationalError(DAYTONA_API_KEY_REQUIRED_MESSAGE);
		}
		return apiKey;
	}
}
