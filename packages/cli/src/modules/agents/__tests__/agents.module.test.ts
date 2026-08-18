import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AiService } from '@/services/ai.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { AgentsModule } from '../agents.module';

describe('AgentsModule', () => {
	let module: AgentsModule;

	beforeEach(() => {
		Container.reset();
		module = new AgentsModule();
	});

	describe('settings()', () => {
		it.each([
			{ sandboxEnabled: true, proxyEnabled: false },
			{ sandboxEnabled: false, proxyEnabled: true },
		])(
			'keeps knowledge base ($sandboxEnabled) and proxy ($proxyEnabled) availability independent',
			async ({ sandboxEnabled, proxyEnabled }) => {
				Container.set(AgentsConfig, mock<AgentsConfig>({ modules: [] }));
				Container.set(
					SandboxSettingsService,
					mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => sandboxEnabled }),
				);
				Container.set(AiService, mock<AiService>({ isProxyEnabled: () => proxyEnabled }));

				const settings = await module.settings();

				expect(settings.knowledgeBaseEnabled).toBe(sandboxEnabled);
				expect(settings.proxyEnabled).toBe(proxyEnabled);
			},
		);
	});
});
