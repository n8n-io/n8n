import type { SandboxConfig } from '@n8n/agents/sandbox';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { SandboxSettingsService } from '@/services/sandbox-settings.service';

export async function resolveAppSandboxConfig(): Promise<SandboxConfig> {
	const settings = Container.get(SandboxSettingsService);
	settings.registerCredentialUses();
	const config = Container.get(GlobalConfig).instanceAi;
	if (settings.getProvider() === 'daytona') {
		const credentials = await settings.resolveDaytonaConfig();
		if (!credentials.apiKey) return { enabled: false, provider: 'daytona' };
		return {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: credentials.apiUrl,
			daytonaApiKey: credentials.apiKey,
			image: config.sandboxImage || undefined,
			snapshot: config.sandboxSnapshot || undefined,
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
