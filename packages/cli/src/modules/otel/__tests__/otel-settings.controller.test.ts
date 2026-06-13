import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { OtelLifecycleHandler } from '../otel-lifecycle-handler';
import { OtelSettingsController } from '../otel-settings.controller';
import type { OtelSettingsResponse, OtelSettingsService } from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

const req = mock<AuthenticatedRequest>();
const res = mock<Response>();

const baseSettings: OtelConfig = {
	enabled: true,
	exporterEndpoint: 'https://collector.example.com',
	exporterTracingPath: '/v1/traces',
	exporterHeaders: '',
	exporterServiceName: 'n8n-prod',
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2_000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: false,
};

const baseResponse: OtelSettingsResponse = { ...baseSettings, envManagedFields: [] };

describe('OtelSettingsController', () => {
	let otelSettingsService: ReturnType<typeof mock<OtelSettingsService>>;
	let otelLifecycleHandler: ReturnType<typeof mock<OtelLifecycleHandler>>;
	let moduleRegistry: ReturnType<typeof mock<ModuleRegistry>>;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let controller: OtelSettingsController;

	beforeEach(() => {
		jest.clearAllMocks();
		otelSettingsService = mock<OtelSettingsService>();
		otelLifecycleHandler = mock<OtelLifecycleHandler>();
		moduleRegistry = mock<ModuleRegistry>();
		publisher = mock<Publisher>();
		controller = new OtelSettingsController(
			otelSettingsService,
			otelLifecycleHandler,
			moduleRegistry,
			publisher,
		);
	});

	describe('getSettings', () => {
		it('returns settings from the service', () => {
			otelSettingsService.getSettings.mockReturnValue(baseResponse);

			const result = controller.getSettings(req);

			expect(result).toEqual(baseResponse);
		});
	});

	describe('updateSettings', () => {
		beforeEach(() => {
			otelSettingsService.saveSettings.mockResolvedValue(undefined);
			otelLifecycleHandler.onReloadOtelConfig.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue(null);
			publisher.publishCommand.mockResolvedValue(undefined);
			otelSettingsService.getSettings.mockReturnValue(baseResponse);
		});

		it('saves the incoming DTO to the settings service', async () => {
			await controller.updateSettings(req, res, baseSettings);

			expect(otelSettingsService.saveSettings).toHaveBeenCalledWith(baseSettings);
		});

		it('triggers OTel reload after saving', async () => {
			await controller.updateSettings(req, res, baseSettings);

			expect(otelLifecycleHandler.onReloadOtelConfig).toHaveBeenCalledTimes(1);
		});

		it('refreshes module settings after reload', async () => {
			await controller.updateSettings(req, res, baseSettings);

			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('otel');
		});

		it('publishes reload-otel-config command to other instances', async () => {
			await controller.updateSettings(req, res, baseSettings);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-otel-config',
			});
		});

		it('returns settings after all side-effects complete', async () => {
			const updatedResponse: OtelSettingsResponse = {
				...baseSettings,
				enabled: false,
				envManagedFields: [],
			};
			otelSettingsService.getSettings.mockReturnValue(updatedResponse);

			const result = await controller.updateSettings(req, res, baseSettings);

			expect(result).toEqual(updatedResponse);
		});

		it('saves before reloading', async () => {
			const order: string[] = [];
			otelSettingsService.saveSettings.mockImplementation(async () => {
				order.push('save');
			});
			otelLifecycleHandler.onReloadOtelConfig.mockImplementation(async () => {
				order.push('reload');
			});

			await controller.updateSettings(req, res, baseSettings);

			expect(order).toEqual(['save', 'reload']);
		});
	});
});
