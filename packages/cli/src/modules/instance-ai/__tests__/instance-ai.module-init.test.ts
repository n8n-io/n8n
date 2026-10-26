import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { WorkflowMutationHooksProxy } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import { License } from '@/license';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { InboxSourceRegistry } from '../../inbox/inbox-source.registry';
import { SelfHealingConfigurationService } from '../self-healing/self-healing-configuration.service';
import { SelfHealingResultService } from '../self-healing/self-healing-result.service';

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
vi.mock('@/license', () => ({ License: vi.fn() }));
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
		});
		const instanceSettings = mockInstance(InstanceSettings, { instanceType: 'main' });
		const sources = mockInstance(InboxSourceRegistry);
		const mutationHooks = mockInstance(WorkflowMutationHooksProxy);
		const configurations = mockInstance(SelfHealingConfigurationService);
		mockInstance(SelfHealingResultService);
		mockInstance(InstanceCredentialBroker);
		mockInstance(SandboxSettingsService);
		const settings = mockInstance(InstanceAiSettingsService);
		const license = mockInstance(License);
		const moduleRegistry = mockInstance(ModuleRegistry);
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
			license,
			moduleRegistry,
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

	it('re-checks the Assistant default on a license change, then refreshes its settings', async () => {
		const { settings, license, moduleRegistry } = setup();
		const recheck = createDeferredPromise();
		settings.keepEnabledIfInUse.mockReturnValue(recheck.promise);

		await new InstanceAiModule().init();
		const [[onLicenseChange]] = license.onCertRefresh.mock.calls;
		onLicenseChange('cert');

		expect(settings.keepEnabledIfInUse).toHaveBeenCalledOnce();
		expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		recheck.resolve();
		await vi.waitFor(() =>
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai'),
		);
	});

	it('refreshes the settings and logs a failed re-check after a license change', async () => {
		const { settings, license, moduleRegistry, logger } = setup();
		const error = new Error('Settings write failed.');
		settings.keepEnabledIfInUse.mockRejectedValue(error);

		await new InstanceAiModule().init();
		const [[onLicenseChange]] = license.onCertRefresh.mock.calls;
		onLicenseChange('cert');

		await vi.waitFor(() =>
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to apply a license change to the n8n Assistant',
				{ error },
			),
		);
		expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});
});
