import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { InboxSourceRegistry } from '../../inbox/inbox-source.registry';
import { SelfHealingResultService } from '../self-healing/self-healing-result.service';

import { InterruptedRunSweeper } from '../event-bus/interrupted-run-sweeper';
import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSetupTelemetryService } from '../instance-ai-setup-telemetry.service';
import { InstanceAiModule } from '../instance-ai.module';
import { InstanceAiService } from '../instance-ai.service';
import { SelfHealingInvestigationService } from '../self-healing/self-healing-investigation.service';

const { loadSuggestionEventRelay, createSuggestionEventRelay, loadResultController } = vi.hoisted(
	() => ({
		loadSuggestionEventRelay: vi.fn(),
		createSuggestionEventRelay: vi.fn(),
		loadResultController: vi.fn(),
	}),
);

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
vi.mock('../self-healing/self-healing-result.service', () => ({
	SelfHealingResultService: vi.fn(),
}));
vi.mock('../instance-ai.service', () => ({ InstanceAiService: vi.fn() }));
vi.mock('../self-healing/self-healing-investigation.service', () => ({
	SelfHealingInvestigationService: vi.fn(),
}));
vi.mock('../instance-ai.controller', () => ({}));
vi.mock('../mcp/instance-ai-mcp-connection.controller', () => ({}));
vi.mock('../self-healing/self-healing-results.controller', () => {
	loadResultController();
	return {};
});
vi.mock('../workflow-suggestions/workflow-suggestion-event-relay.service', () => {
	loadSuggestionEventRelay();
	@Service()
	class WorkflowSuggestionEventRelay {
		constructor() {
			createSuggestionEventRelay();
		}
	}
	return { WorkflowSuggestionEventRelay };
});

describe('InstanceAiModule.init', () => {
	function setup() {
		const config = mockInstance(InstanceAiConfig, { workflowSuggestionsEnabled: false });
		const sources = mockInstance(InboxSourceRegistry);
		mockInstance(SelfHealingResultService);
		mockInstance(InstanceCredentialBroker);
		mockInstance(SandboxSettingsService);
		mockInstance(InstanceAiSettingsService);
		mockInstance(InstanceAiSetupTelemetryService);
		mockInstance(InstanceAiEventRelay);
		mockInstance(InstanceAiService);
		const sweeper = mockInstance(InterruptedRunSweeper);
		sweeper.sweep.mockResolvedValue();
		const investigations = mockInstance(SelfHealingInvestigationService);
		investigations.reconcile.mockResolvedValue();
		const logger = mockInstance(Logger);
		logger.scoped.mockReturnValue(logger);
		vi.stubEnv('E2E_TESTS', 'false');
		return { config, sources, sweeper, investigations, logger };
	}

	it('loads suggestion listeners only when workflow suggestions are enabled', async () => {
		const { config, sources, investigations } = setup();

		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledOnce());

		expect(loadSuggestionEventRelay).not.toHaveBeenCalled();
		expect(createSuggestionEventRelay).not.toHaveBeenCalled();
		expect(loadResultController).not.toHaveBeenCalled();
		expect(sources.register).not.toHaveBeenCalled();

		config.workflowSuggestionsEnabled = true;
		await new InstanceAiModule().init();
		await vi.waitFor(() => expect(investigations.reconcile).toHaveBeenCalledTimes(2));

		expect(loadSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(createSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(loadResultController).toHaveBeenCalledOnce();
		expect(sources.register).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'self_healing_result' }),
		);
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
