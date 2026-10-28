import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { WorkflowMutationHooksProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { InboxSourceRegistry } from '../../inbox/inbox-source.registry';
import { SelfHealingConfigurationService } from '../self-healing/self-healing-configuration.service';
import { SelfHealingResultService } from '../self-healing/self-healing-result.service';

import { AssistantAgentProvider } from '../assistant-agent/assistant-agent.provider';
import { InterruptedRunSweeper } from '../event-bus/interrupted-run-sweeper';
import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSetupTelemetryService } from '../instance-ai-setup-telemetry.service';
import { InstanceAiModule } from '../instance-ai.module';
import { InstanceAiService } from '../instance-ai.service';
import { SelfHealingInvestigationService } from '../self-healing/self-healing-investigation.service';

const {
	loadSuggestionEventRelay,
	createSuggestionEventRelay,
	loadResultController,
	loadConfigurationController,
	loadEvalController,
} = vi.hoisted(() => ({
	loadSuggestionEventRelay: vi.fn(),
	createSuggestionEventRelay: vi.fn(),
	loadResultController: vi.fn(),
	loadConfigurationController: vi.fn(),
	loadEvalController: vi.fn(),
}));

vi.mock('@/credentials/instance-credential-broker', () => ({
	InstanceCredentialBroker: vi.fn(),
}));
vi.mock('@/services/sandbox-settings.service', () => ({
	SandboxSettingsService: vi.fn(),
}));
vi.mock('../instance-ai-settings.service', () => ({
	InstanceAiSettingsService: vi.fn(),
	INSTANCE_AI_MODEL_CREDENTIAL_POLICY: {},
	INSTANCE_AI_SEARCH_CREDENTIAL_POLICY: {},
}));
vi.mock('../instance-ai-setup-telemetry.service', () => ({
	InstanceAiSetupTelemetryService: vi.fn(),
}));
vi.mock('../instance-ai-event-relay.service', () => ({
	InstanceAiEventRelay: vi.fn(),
}));
vi.mock('../event-bus/interrupted-run-sweeper', () => ({
	InterruptedRunSweeper: vi.fn(),
}));
vi.mock('../self-healing/self-healing-configuration.service', () => ({
	SelfHealingConfigurationService: vi.fn(),
}));
vi.mock('../self-healing/self-healing-result.service', () => ({
	SelfHealingResultService: vi.fn(),
}));
vi.mock('../instance-ai.service', () => ({ InstanceAiService: vi.fn() }));
vi.mock('../assistant-agent/assistant-agent.provider', () => ({ AssistantAgentProvider: vi.fn() }));
vi.mock('@/modules/agents/system-agents/system-agent-registration.service', () => ({
	SystemAgentRegistrationService: vi.fn(),
}));
vi.mock('../self-healing/self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));
vi.mock('../instance-ai.controller', () => ({}));
vi.mock('../mcp/instance-ai-mcp-connection.controller', () => ({}));
vi.mock('../self-healing/self-healing-configurations.controller', () => {
	loadConfigurationController();
	return {};
});
vi.mock('../eval/eval.controller', () => {
	loadEvalController();
	return {};
});
vi.mock('../self-healing/self-healing-results.controller', () => {
	loadResultController();
	return {};
});
vi.mock('../workflow-suggestions/workflow-suggestion-event-relay.service', () => {
	loadSuggestionEventRelay();
	@Service()
	class WorkflowSuggestionEventRelay {
		constructor() {
			createSuggestionEventRelay(this);
		}
	}
	return { WorkflowSuggestionEventRelay };
});

describe('InstanceAiModule.init', () => {
	function setup() {
		const config = mockInstance(InstanceAiConfig, {
			workflowSuggestionsEnabled: false,
			evalInstance: false,
			assistantAgentEnabled: false,
		});
		const instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main' });
		const sources = mockInstance(InboxSourceRegistry);
		const mutationHooks = mockInstance(WorkflowMutationHooksProxy);
		const configurations = mockInstance(SelfHealingConfigurationService);
		mockInstance(SelfHealingResultService);
		mockInstance(InstanceCredentialBroker);
		mockInstance(SandboxSettingsService);
		const settings = mockInstance(InstanceAiSettingsService);
		mockInstance(InstanceAiSetupTelemetryService);
		mockInstance(InstanceAiEventRelay);
		const runtime = mockInstance(InstanceAiService);
		const sweeper = mockInstance(InterruptedRunSweeper);
		sweeper.sweep.mockResolvedValue();
		const investigations = mockInstance(SelfHealingInvestigationService);
		investigations.reconcile.mockResolvedValue();
		const logger = mockInstance(Logger);
		logger.scoped.mockReturnValue(logger);
		vi.stubEnv('E2E_TESTS', 'false');
		return {
			config,
			mutationHooks,
			configurations,
			sources,
			sweeper,
			investigations,
			logger,
			instanceSettings,
			settings,
			runtime,
		};
	}

	it('loads suggestion listeners only when workflow suggestions are enabled', async () => {
		const { config, sources, investigations, mutationHooks, configurations } = setup();

		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());

		expect(loadSuggestionEventRelay).not.toHaveBeenCalled();
		expect(createSuggestionEventRelay).not.toHaveBeenCalled();
		expect(loadResultController).not.toHaveBeenCalled();
		expect(loadConfigurationController).not.toHaveBeenCalled();
		expect(sources.register).not.toHaveBeenCalled();
		expect(mutationHooks.registerProvider).toHaveBeenCalledWith(configurations);

		config.workflowSuggestionsEnabled = true;
		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(2));

		expect(loadSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(createSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(mutationHooks.registerProvider).toHaveBeenCalledWith(
			createSuggestionEventRelay.mock.calls[0][0],
		);
		expect(loadResultController).toHaveBeenCalledOnce();
		expect(loadConfigurationController).toHaveBeenCalledOnce();
		expect(sources.register).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'self_healing_result' }),
		);
	});

	it.each(['worker', 'webhook'] as const)(
		'keeps the Assistant runtime off %s processes',
		async (instanceType) => {
			const {
				config,
				instanceSettings,
				settings,
				runtime,
				investigations,
				sources,
				mutationHooks,
			} = setup();
			config.workflowSuggestionsEnabled = true;
			Object.assign(instanceSettings, { instanceType });
			const module = new InstanceAiModule();

			await module.init();

			expect(await module.settings()).toEqual({});
			expect(await module.systemTasks()).toEqual([]);

			await module.shutdown();

			expect(settings.loadFromDb).not.toHaveBeenCalled();
			expect(runtime.shutdown).not.toHaveBeenCalled();
			expect(investigations.reconcile).not.toHaveBeenCalled();
			expect(sources.register).not.toHaveBeenCalled();
			expect(mutationHooks.registerProvider).not.toHaveBeenCalled();
			expect(loadResultController).not.toHaveBeenCalled();
			expect(loadConfigurationController).not.toHaveBeenCalled();
		},
	);

	it('registers the Assistant agent only when it is enabled and the agents module starts', async () => {
		const { config, investigations } = setup();
		const systemAgents = mockInstance(SystemAgentRegistrationService);
		systemAgents.register.mockResolvedValue();
		const provider = mockInstance(AssistantAgentProvider);
		const modules = mockInstance(ModuleRegistry);
		let eligibleModules = ['instance-ai', 'agents'];
		Object.defineProperty(modules, 'eligibleModules', { get: () => eligibleModules });

		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());
		expect(systemAgents.register).not.toHaveBeenCalled();

		config.assistantAgentEnabled = true;
		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(2));
		expect(systemAgents.register).toHaveBeenCalledWith(provider);

		eligibleModules = ['instance-ai'];
		systemAgents.register.mockClear();
		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(3));
		expect(systemAgents.register).not.toHaveBeenCalled();
	});

	it('tells the editor whether this main registered the Assistant agent', async () => {
		const { config, investigations, settings, runtime } = setup();
		mockInstance(SystemAgentRegistrationService).register.mockResolvedValue();
		mockInstance(AssistantAgentProvider);
		const modules = mockInstance(ModuleRegistry);
		Object.defineProperty(modules, 'eligibleModules', { get: () => ['instance-ai', 'agents'] });
		mockInstance(GlobalConfig, {
			deployment: { type: 'default' },
			instanceAi: { runDebugEnabled: false, workflowSuggestionsEnabled: false },
		} as GlobalConfig);
		settings.isAgentEnabled.mockReturnValue(true);
		settings.getSandboxStatus.mockReturnValue({
			enabled: false,
			workflowBuilderAvailable: false,
			unavailableReason: null,
		} as never);
		settings.isSetupCompleted.mockResolvedValue(true);
		runtime.areMcpConnectionsAvailable.mockReturnValue(false);
		runtime.isProxyEnabled.mockReturnValue(false);

		const withoutAgent = new InstanceAiModule();
		await withoutAgent.init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());
		expect(await withoutAgent.settings()).toMatchObject({ assistantAgentEnabled: false });

		config.assistantAgentEnabled = true;
		const withAgent = new InstanceAiModule();
		await withAgent.init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(2));
		expect(await withAgent.settings()).toMatchObject({ assistantAgentEnabled: true });
	});

	it('registers the eval controller only on an eval instance', async () => {
		const { config, investigations } = setup();

		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());

		expect(loadEvalController).not.toHaveBeenCalled();

		config.evalInstance = true;
		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(2));

		expect(loadEvalController).toHaveBeenCalledOnce();
	});

	it('starts reconciliation after the interrupted-run sweep finishes', async () => {
		const { sweeper, investigations } = setup();
		const sweep = createDeferredPromise();
		sweeper.sweep.mockReturnValue(sweep.promise);

		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(sweeper.sweep).toHaveBeenCalledOnce());

		expect(investigations.reconcile).not.toHaveBeenCalled();
		sweep.resolve();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());
	});

	it('reports a startup reconciliation failure', async () => {
		const { investigations, logger } = setup();
		const error = new Error('Investigation query failed.');
		investigations.reconcile.mockRejectedValue(error);

		await new InstanceAiModule().init();

		await vi.waitFor(() =>
			expect(logger.error).toHaveBeenCalledWith('Startup run reconciliation failed', { error }),
		);
	});

	it('reports a rejected sweep without starting reconciliation', async () => {
		const { sweeper, investigations, logger } = setup();
		const error = new Error('Interrupted-run sweep failed.');
		sweeper.sweep.mockRejectedValue(error);

		await new InstanceAiModule().init();

		await vi.waitFor(() =>
			expect(logger.error).toHaveBeenCalledWith('Startup run reconciliation failed', {
				error,
			}),
		);
		expect(investigations.reconcile).not.toHaveBeenCalled();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});
});
