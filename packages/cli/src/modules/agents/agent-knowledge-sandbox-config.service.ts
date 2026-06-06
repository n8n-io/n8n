import { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { normalizeSandboxProvider, type SandboxConfig } from '@n8n/ai-utilities/sandbox';
import { OperationalError } from 'n8n-workflow';

const N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'N8N_SANDBOX_SERVICE_URL is required to use the agent knowledge base sandbox.';

@Service()
export class AgentKnowledgeSandboxConfigService {
	constructor(private readonly instanceAiConfig: InstanceAiConfig) {}

	resolveConfig(): SandboxConfig {
		const provider = normalizeSandboxProvider(this.instanceAiConfig.sandboxProvider);
		const timeout = this.instanceAiConfig.sandboxTimeout;

		if (provider === 'n8n-sandbox') {
			const serviceUrl = this.instanceAiConfig.n8nSandboxServiceUrl.trim();
			if (serviceUrl.length === 0) {
				throw new OperationalError(N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE);
			}

			return {
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl,
				apiKey: this.instanceAiConfig.n8nSandboxServiceApiKey || undefined,
				timeout,
			};
		}

		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: this.instanceAiConfig.daytonaApiUrl || undefined,
			daytonaApiKey: this.instanceAiConfig.daytonaApiKey || undefined,
			image: this.instanceAiConfig.sandboxImage || undefined,
			timeout,
			name: undefined,
		};
	}
}
