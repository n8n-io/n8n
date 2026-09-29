import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { OtelSettingsController } from '../otel-settings.controller';
import type { OtelSettingsUpdateService } from '../otel-settings-update.service';
import type {
	OtelConnectionParams,
	OtelSettingsResponse,
	OtelSettingsService,
} from '../otel-settings.service';
import type { OtelConfig } from '../otel.config';
import type { OtelService } from '../otel.service';

const req = mock<AuthenticatedRequest>();
const res = mock<Response>();

const baseSettings: OtelConfig = {
	enabled: true,
	exporterProtocol: 'http/protobuf',
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
	let otelService: ReturnType<typeof mock<OtelService>>;
	let otelSettingsUpdateService: ReturnType<typeof mock<OtelSettingsUpdateService>>;
	let controller: OtelSettingsController;

	beforeEach(() => {
		vi.clearAllMocks();
		otelSettingsService = mock<OtelSettingsService>();
		otelService = mock<OtelService>();
		otelSettingsUpdateService = mock<OtelSettingsUpdateService>();
		controller = new OtelSettingsController(
			otelSettingsService,
			otelService,
			otelSettingsUpdateService,
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
		it('delegates the update and returns its result', async () => {
			otelSettingsUpdateService.updateSettings.mockResolvedValue(baseResponse);

			const result = await controller.updateSettings(req, res, baseSettings);

			expect(otelSettingsUpdateService.updateSettings).toHaveBeenCalledWith(baseSettings);
			expect(result).toEqual(baseResponse);
		});
	});

	describe('testTrace', () => {
		const dto: OtelConnectionParams = {
			exporterProtocol: 'http/protobuf',
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n-prod',
			exporterHeaders: 'auth=token',
			startupConnectivityTimeoutMs: 2_000,
		};

		it('resolves env-managed fields before sending the test trace', async () => {
			const resolved: OtelConnectionParams = { ...dto, exporterEndpoint: 'https://from-env' };
			otelSettingsService.resolveTestConnection.mockReturnValue(resolved);
			otelService.sendTestTrace.mockResolvedValue({ success: true });

			await controller.testTrace(req, res, dto);

			expect(otelSettingsService.resolveTestConnection).toHaveBeenCalledWith(dto);
			expect(otelService.sendTestTrace).toHaveBeenCalledWith(resolved);
		});

		it('returns the success result from the service', async () => {
			otelSettingsService.resolveTestConnection.mockReturnValue(dto);
			otelService.sendTestTrace.mockResolvedValue({ success: true });

			const result = await controller.testTrace(req, res, dto);

			expect(result).toEqual({ success: true });
		});

		it('returns the failure result with the collector error', async () => {
			otelSettingsService.resolveTestConnection.mockReturnValue(dto);
			otelService.sendTestTrace.mockResolvedValue({ success: false, error: '401 Unauthorized' });

			const result = await controller.testTrace(req, res, dto);

			expect(result).toEqual({ success: false, error: '401 Unauthorized' });
		});
	});
});
