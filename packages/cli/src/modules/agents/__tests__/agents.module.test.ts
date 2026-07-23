import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AiService } from '@/services/ai.service';

import { AgentsModule } from '../agents.module';

describe('AgentsModule', () => {
	let module: AgentsModule;

	beforeEach(() => {
		Container.reset();
		module = new AgentsModule();
	});

	describe('settings()', () => {
		it('exposes knowledgeBaseEnabled when the direct Daytona sandbox config is complete', async () => {
			Container.set(
				AgentsConfig,
				mock<AgentsConfig>({
					modules: [],
					sandboxEnabled: true,
					sandboxProvider: 'daytona',
				}),
			);
			Container.set(AiService, mock<AiService>({ isProxyEnabled: () => false }));

			const settings = await module.settings();

			expect(settings.knowledgeBaseEnabled).toBe(true);
			expect(settings.proxyEnabled).toBe(false);
		});

		it('exposes knowledgeBaseEnabled when the AI Assistant proxy is available without sandbox env vars', async () => {
			Container.set(
				AgentsConfig,
				mock<AgentsConfig>({
					modules: [],
					sandboxEnabled: false,
					sandboxProvider: '',
				}),
			);
			Container.set(AiService, mock<AiService>({ isProxyEnabled: () => true }));

			const settings = await module.settings();

			expect(settings.knowledgeBaseEnabled).toBe(true);
			expect(settings.proxyEnabled).toBe(true);
		});

		it('disables knowledgeBaseEnabled when neither the sandbox config nor the proxy is available', async () => {
			Container.set(
				AgentsConfig,
				mock<AgentsConfig>({
					modules: [],
					sandboxEnabled: false,
					sandboxProvider: '',
				}),
			);
			Container.set(AiService, mock<AiService>({ isProxyEnabled: () => false }));

			const settings = await module.settings();

			expect(settings.knowledgeBaseEnabled).toBe(false);
			expect(settings.proxyEnabled).toBe(false);
		});
	});
});
