import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AiService } from '@/services/ai.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { AgentCheckpointPruningTask } from '../agent-checkpoint-pruning.task';
import { AgentInterruptedExecutionSweepTask } from '../agent-interrupted-execution-sweep.task';
import { AgentsSettingsService } from '../agents-settings.service';
import { AgentsModule } from '../agents.module';

describe('AgentsModule', () => {
	let module: AgentsModule;

	beforeEach(() => {
		Container.reset();
		Container.set(
			AgentsSettingsService,
			mock<AgentsSettingsService>({ getEnabled: async () => true }),
		);
		module = new AgentsModule();
	});

	describe('systemTasks()', () => {
		it('registers the pruning and the sweep tasks', async () => {
			await expect(module.systemTasks()).resolves.toEqual([
				AgentCheckpointPruningTask,
				AgentInterruptedExecutionSweepTask,
			]);
		});
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
