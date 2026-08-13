import type { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
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
			{
				agentsSandboxEnabled: true,
				instanceAiSandboxEnabled: false,
				proxyEnabled: false,
				knowledgeBaseEnabled: true,
			},
			{
				agentsSandboxEnabled: false,
				instanceAiSandboxEnabled: true,
				proxyEnabled: false,
				knowledgeBaseEnabled: true,
			},
			{
				agentsSandboxEnabled: false,
				instanceAiSandboxEnabled: false,
				proxyEnabled: true,
				knowledgeBaseEnabled: false,
			},
		])(
			'enables knowledge base=$knowledgeBaseEnabled for Agents sandbox=$agentsSandboxEnabled and Instance AI sandbox=$instanceAiSandboxEnabled',
			async ({
				agentsSandboxEnabled,
				instanceAiSandboxEnabled,
				proxyEnabled,
				knowledgeBaseEnabled,
			}) => {
				const agentsConfig = mock<AgentsConfig>({
					modules: [],
					sandboxEnabled: agentsSandboxEnabled,
				});
				Container.set(AgentsConfig, agentsConfig);
				Container.set(
					SandboxSettingsService,
					new SandboxSettingsService(
						{
							agents: agentsConfig,
							instanceAi: mock<InstanceAiConfig>({
								sandboxEnabled: instanceAiSandboxEnabled,
								sandboxProvider: 'n8n-sandbox',
							}),
							deployment: { type: 'default' },
						} as never,
						mock<InstanceCredentialBroker>(),
						mock<Logger>(),
					),
				);
				Container.set(AiService, mock<AiService>({ isProxyEnabled: () => proxyEnabled }));

				const settings = await module.settings();

				expect(settings.knowledgeBaseEnabled).toBe(knowledgeBaseEnabled);
				expect(settings.proxyEnabled).toBe(proxyEnabled);
			},
		);
	});
});
