import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';

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
	it('registers saved reviews only when self-healing is enabled', async () => {
		const config = mockInstance(InstanceAiConfig, { selfHealingEnabled: false });
		const sources = mockInstance(InboxSourceRegistry);
		mockInstance(SelfHealingResultService);
		mockInstance(InstanceCredentialBroker);
		mockInstance(SandboxSettingsService);
		mockInstance(InstanceAiSettingsService);
		mockInstance(InstanceAiSetupTelemetryService);
		mockInstance(InstanceAiEventRelay);
		mockInstance(InstanceAiService);
		mockInstance(InterruptedRunSweeper).sweep.mockResolvedValue();
		vi.stubEnv('E2E_TESTS', 'false');

		await new InstanceAiModule().init();

		expect(loadSuggestionEventRelay).not.toHaveBeenCalled();
		expect(createSuggestionEventRelay).not.toHaveBeenCalled();
		expect(loadResultController).not.toHaveBeenCalled();
		expect(sources.register).not.toHaveBeenCalled();

		config.selfHealingEnabled = true;
		await new InstanceAiModule().init();

		expect(loadSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(createSuggestionEventRelay).toHaveBeenCalledOnce();
		expect(loadResultController).toHaveBeenCalledOnce();
		expect(sources.register).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'self_healing_result' }),
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});
});
