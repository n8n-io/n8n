import type { SandboxConfig } from '@n8n/agents/sandbox';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { SandboxSettingsService } from '@/services/sandbox-settings.service';

export async function resolveAppSandboxConfig(projectId: string): Promise<SandboxConfig> {
	const settings = Container.get(SandboxSettingsService);
	const provider = settings.getProvider();
	if (!settings.isAgentSandboxEnabled()) return { enabled: false, provider };

	settings.registerCredentialUses();
	const config = Container.get(GlobalConfig).instanceAi;
	if (provider === 'daytona') {
		const connection = await settings.resolveDaytonaSandboxConfig(projectId, {
			image: config.sandboxImage || undefined,
			snapshot: config.sandboxSnapshot || undefined,
		});
		if (!connection.daytonaApiKey && !connection.getAuthToken)
			return { enabled: false, provider: 'daytona' };
		return {
			...connection,
			enabled: true,
			provider: 'daytona',
			timeout: config.sandboxTimeout,
		};
	}
	const credentials = await settings.resolveN8nSandboxConfig();
	if (!credentials.serviceUrl) return { enabled: false, provider: 'n8n-sandbox' };
	return {
		enabled: true,
		provider: 'n8n-sandbox',
		serviceUrl: credentials.serviceUrl,
		apiKey: credentials.apiKey,
		timeout: config.sandboxTimeout,
	};
}
