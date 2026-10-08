import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { CapabilityRegistry } from '@/services/capabilities/capability-registry.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { AssistantAgentProvider } from '../assistant-agent.provider';
import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSetupTelemetryService } from '../instance-ai-setup-telemetry.service';
import { InstanceAiModule } from '../instance-ai.module';
import { InstanceAiService } from '../instance-ai.service';

// Importing the controllers resolves their middleware from the container, which needs a database.
vi.mock('../instance-ai.controller', () => ({}));
vi.mock('../mcp/instance-ai-mcp-connection.controller', () => ({}));

describe('InstanceAiModule', () => {
	const usePruneInterval = (pruneInterval: number): void => {
		Container.set(InstanceAiConfig, mock<InstanceAiConfig>({ pruneInterval }));
	};

	it('should register the checkpoint pruning system task when pruning is on', async () => {
		usePruneInterval(3_600_000);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([InstanceAiCheckpointPruningTask]);
	});

	it('should register no system task when the prune interval is zero', async () => {
		usePruneInterval(0);

		const tasks = await new InstanceAiModule().systemTasks();

		expect(tasks).toEqual([]);
	});

	describe('init', () => {
		const capabilityNames = (surface: 'mcp' | 'assistant') =>
			Container.get(CapabilityRegistry)
				.list(surface)
				.map((capability) => capability.name);

		beforeEach(() => {
			// init() gets these services from the container. Stub each new service that init() gets
			// here. Without a stub, the test builds the real service, which can need a database.
			mockInstance(InstanceCredentialBroker);
			mockInstance(InstanceAiSettingsService);
			mockInstance(SandboxSettingsService);
			mockInstance(InstanceAiSetupTelemetryService);
			mockInstance(InstanceAiEventRelay);
			mockInstance(InstanceAiService);
			mockInstance(SystemAgentExecutionService);
			mockInstance(AssistantAgentProvider);
			Container.set(CapabilityRegistry, new CapabilityRegistry());
		});

		afterAll(() => {
			Container.set(CapabilityRegistry, new CapabilityRegistry());
		});

		// The module owns its capabilities, so the Assistant keeps them when the mcp module is off.
		it('registers its capabilities for MCP clients and for the n8n Assistant', async () => {
			await new InstanceAiModule().init();

			expect(capabilityNames('mcp')).toEqual(['parse_schedule', 'propose_automation']);
			expect(capabilityNames('assistant')).toEqual(['parse_schedule', 'propose_automation']);
		});

		it('registers each capability once, also when init runs again', async () => {
			const instanceAiModule = new InstanceAiModule();

			await instanceAiModule.init();
			await instanceAiModule.init();

			expect(capabilityNames('mcp')).toEqual(['parse_schedule', 'propose_automation']);
		});
	});
});
