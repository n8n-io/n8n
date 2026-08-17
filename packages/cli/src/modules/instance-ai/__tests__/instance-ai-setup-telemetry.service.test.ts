import type { InstanceAiAdminSettingsResponse } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig, InstanceAiConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import type { EventService } from '@/events/event.service';
import type { Telemetry } from '@/telemetry';

import type {
	AdminCredentialSelection,
	InstanceAiSettingsService,
} from '../instance-ai-settings.service';
import { InstanceAiSetupTelemetryService } from '../instance-ai-setup-telemetry.service';

const emptySelection: AdminCredentialSelection = {
	modelCredentialId: null,
	modelName: null,
	daytonaCredentialId: null,
	n8nSandboxCredentialId: null,
	searchCredentialId: null,
};

describe('InstanceAiSetupTelemetryService', () => {
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	const telemetry = mock<Telemetry>();
	const settingsRepository = mock<SettingsRepository>();
	const instanceCredentialBroker = mock<InstanceCredentialBroker>();
	const settingsService = mock<InstanceAiSettingsService>();
	const globalConfig = mock<GlobalConfig>({
		deployment: { type: 'default' },
		instanceAi: {
			model: 'openai/gpt-4',
			braveSearchApiKey: '',
			searxngUrl: '',
		} as unknown as InstanceAiConfig,
	});

	let service: InstanceAiSetupTelemetryService;

	const createService = () =>
		new InstanceAiSetupTelemetryService(
			logger,
			globalConfig,
			eventService,
			telemetry,
			settingsRepository,
			instanceCredentialBroker,
			settingsService,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		globalConfig.deployment.type = 'default';
		Object.assign(globalConfig.instanceAi, {
			model: 'openai/gpt-4',
			braveSearchApiKey: '',
			searxngUrl: '',
		});
		settingsService.isProxyEnabled.mockReturnValue(false);
		settingsService.isSetupCompleted.mockResolvedValue(false);
		settingsRepository.findByKey.mockResolvedValue(null);
		instanceCredentialBroker.listForUse.mockResolvedValue([
			{ id: 'model-cred', type: 'openAiApi', name: 'OpenAI key' },
			{ id: 'previous-model-cred', type: 'anthropicApi', name: 'Anthropic key' },
			{ id: 'search-cred', type: 'braveSearchApi', name: 'Brave key' },
			{ id: 'previous-search-cred', type: 'searXngApi', name: 'SearXNG' },
		] as never);
		service = createService();
	});

	describe('event subscription', () => {
		it('reports changes carried by the settings-updated event and ignores events without selections', async () => {
			const [eventName, handler] = eventService.on.mock.calls[0];
			expect(eventName).toBe('instance-ai-settings-updated');

			handler({ mcpSettingsChanged: false });
			handler({
				mcpSettingsChanged: false,
				credentialSelections: {
					previous: emptySelection,
					next: { ...emptySelection, modelCredentialId: 'model-cred', modelName: 'gpt-4' },
					connectionsUpdated: { model: false, sandbox: false, search: false },
				},
			});
			await vi.waitFor(() => expect(telemetry.track).toHaveBeenCalled());

			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_MODEL,
				{ provider: 'openai', model: 'gpt-4' },
			);
		});
	});

	describe('reportSetupChanges', () => {
		it('reports a first model connect without previous properties', async () => {
			await service.reportSetupChanges(emptySelection, {
				...emptySelection,
				modelCredentialId: 'model-cred',
				modelName: 'gpt-4',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_MODEL,
				{ provider: 'openai', model: 'gpt-4' },
			);
		});

		it('reports the previous provider and model when the model changes', async () => {
			await service.reportSetupChanges(
				{ ...emptySelection, modelCredentialId: 'previous-model-cred', modelName: 'claude-3' },
				{ ...emptySelection, modelCredentialId: 'model-cred', modelName: 'gpt-4' },
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_MODEL,
				{
					provider: 'openai',
					model: 'gpt-4',
					previous_provider: 'anthropic',
					previous_model: 'claude-3',
				},
			);
		});

		it('reports nothing when the selections did not change', async () => {
			const selection = {
				...emptySelection,
				modelCredentialId: 'model-cred',
				modelName: 'gpt-4',
			};

			await service.reportSetupChanges(selection, { ...selection });

			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('reports a key rotation that keeps the credential id and model unchanged', async () => {
			const selection = {
				...emptySelection,
				modelCredentialId: 'model-cred',
				modelName: 'gpt-4',
			};

			await service.reportSetupChanges(
				selection,
				{ ...selection },
				{ model: true, sandbox: false, search: false },
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_MODEL,
				{
					provider: 'openai',
					model: 'gpt-4',
					previous_provider: 'openai',
					previous_model: 'gpt-4',
				},
			);
		});

		it('reports a first sandbox connect without previous properties', async () => {
			await service.reportSetupChanges(emptySelection, {
				...emptySelection,
				daytonaCredentialId: 'day-cred',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_SANDBOX,
				{ sandbox_type: 'daytona' },
			);
		});

		it('reports the previous web search provider on change', async () => {
			await service.reportSetupChanges(
				{ ...emptySelection, searchCredentialId: 'previous-search-cred' },
				{ ...emptySelection, searchCredentialId: 'search-cred' },
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_WEB_SEARCH,
				{ provider: 'brave', previous_provider: 'searxng' },
			);
		});

		it('reports nothing on managed deployments', async () => {
			globalConfig.deployment.type = 'cloud';
			service = createService();

			await service.reportSetupChanges(emptySelection, {
				...emptySelection,
				modelCredentialId: 'model-cred',
				modelName: 'gpt-4',
			});

			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('recordSetupCompletedIfNeeded', () => {
		const envConfiguredResponse = {
			enabled: true,
			sandboxEnabled: true,
			sandboxProvider: 'n8n-sandbox',
			daytonaCredentialId: null,
			n8nSandboxCredentialId: null,
			searchCredentialId: null,
			modelCredentialId: null,
			modelName: null,
			modelEnvConfigured: true,
			sandboxEnvConfigured: true,
			searchEnvConfigured: true,
			searchDisabled: false,
		} as unknown as InstanceAiAdminSettingsResponse;

		it('emits setup completed with the env snapshot when the last piece is env-configured', async () => {
			globalConfig.instanceAi.braveSearchApiKey = 'env-search-key';
			settingsService.isSetupCompleted.mockResolvedValue(true);
			settingsService.getAdminSettings.mockResolvedValue(envConfiguredResponse);
			settingsRepository.claimKey.mockResolvedValue(true);

			await service.recordSetupCompletedIfNeeded();

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_SETUP_COMPLETED,
				{
					model_source: 'env',
					model_provider: 'openai',
					model_name: 'gpt-4',
					sandbox_source: 'env',
					sandbox_type: 'n8n-sandbox',
					web_search_source: 'env',
					web_search_provider: 'brave',
				},
			);
			// Key values must never leave the instance
			expect(JSON.stringify(telemetry.track.mock.calls)).not.toContain('env-search-key');
		});

		it('does not emit setup completed when another process already claimed it', async () => {
			settingsService.isSetupCompleted.mockResolvedValue(true);
			settingsRepository.claimKey.mockResolvedValue(false);

			await service.recordSetupCompletedIfNeeded();

			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('does not claim the completion marker while setup is incomplete', async () => {
			await service.recordSetupCompletedIfNeeded();

			expect(settingsRepository.claimKey).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});
});
