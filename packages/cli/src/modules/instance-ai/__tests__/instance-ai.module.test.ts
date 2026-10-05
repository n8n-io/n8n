import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { setOtlpSpanProcessorFactory } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import { OtelService } from '@/modules/otel/otel.service';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { InterruptedRunSweeper } from '../event-bus/interrupted-run-sweeper';
import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSetupTelemetryService } from '../instance-ai-setup-telemetry.service';
import { InstanceAiModule } from '../instance-ai.module';
import { InstanceAiService } from '../instance-ai.service';

vi.mock('@n8n/instance-ai', () => ({
	setOtlpSpanProcessorFactory: vi.fn(),
	redactOtlpTelemetrySpan: vi.fn(),
}));
vi.mock('@/credentials/instance-credential-broker', () => ({ InstanceCredentialBroker: class {} }));
vi.mock('@/modules/otel/otel.service', () => ({ OtelService: class {} }));
vi.mock('@/services/sandbox-settings.service', () => ({ SandboxSettingsService: class {} }));
vi.mock('../event-bus/interrupted-run-sweeper', () => ({ InterruptedRunSweeper: class {} }));
vi.mock('../instance-ai-event-relay.service', () => ({ InstanceAiEventRelay: class {} }));
vi.mock('../instance-ai-settings.service', () => ({
	InstanceAiSettingsService: class {},
	INSTANCE_AI_MODEL_CREDENTIAL_POLICY: {},
	INSTANCE_AI_SEARCH_CREDENTIAL_POLICY: {},
}));
vi.mock('../instance-ai-setup-telemetry.service', () => ({
	InstanceAiSetupTelemetryService: class {},
}));
vi.mock('../instance-ai.service', () => ({ InstanceAiService: class {} }));
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
		beforeEach(() => {
			vi.clearAllMocks();
			Container.set(InstanceCredentialBroker, mock<InstanceCredentialBroker>());
			Container.set(OtelService, mock<OtelService>());
			Container.set(SandboxSettingsService, mock<SandboxSettingsService>());
			Container.set(InstanceAiEventRelay, mock<InstanceAiEventRelay>());
			Container.set(InstanceAiSettingsService, mock<InstanceAiSettingsService>());
			Container.set(InstanceAiSetupTelemetryService, mock<InstanceAiSetupTelemetryService>());
			Container.set(InstanceAiService, mock<InstanceAiService>());
			Container.set(Logger, mock<Logger>());
			Container.set(
				InterruptedRunSweeper,
				mock<InterruptedRunSweeper>({ sweep: vi.fn().mockResolvedValue(undefined) }),
			);
		});

		it('should register the OTLP build trace sink with node contracts enabled', async () => {
			Container.set(
				InstanceAiConfig,
				mock<InstanceAiConfig>({ nodeContractsEnabled: true, traceContent: false }),
			);

			await new InstanceAiModule().init();

			expect(setOtlpSpanProcessorFactory).toHaveBeenCalledTimes(1);
		});

		it('should not register the OTLP build trace sink with node contracts disabled', async () => {
			Container.set(
				InstanceAiConfig,
				mock<InstanceAiConfig>({ nodeContractsEnabled: false, traceContent: true }),
			);

			await new InstanceAiModule().init();

			expect(setOtlpSpanProcessorFactory).not.toHaveBeenCalled();
			expect(Container.get(Logger).warn).not.toHaveBeenCalled();
		});
	});
});
