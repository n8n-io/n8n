/* eslint-disable @typescript-eslint/unbound-method */
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { OTEL_SETTINGS_KEY, OtelSettingsService } from '../otel-settings.service';
import { OtelConfig } from '../otel.config';

describe('OtelSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const config = new OtelConfig(); // env-defaults (no env vars set in test runtime)
	let service: OtelSettingsService;

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		// Strip any OTel env vars inherited from the test runner so each test
		// starts from a known state.
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('N8N_OTEL_')) delete process.env[key];
		}
		service = new OtelSettingsService(config, settingsRepository);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('loadEffective', () => {
		it('returns defaults when DB row is absent and no env vars are set', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const result = await service.loadEffective();

			expect(result).toEqual({
				enabled: false,
				exporterEndpoint: 'http://localhost:4318',
				exporterTracingPath: '/v1/traces',
				exporterHeaders: '',
				exporterServiceName: 'n8n',
				tracesSampleRate: 1.0,
				startupConnectivityTimeoutMs: 2_000,
				includeNodeSpans: true,
				injectOutbound: true,
				productionExecutionsOnly: true,
			});
		});

		it('returns DB values when persisted and no env vars are set', async () => {
			const persisted: Partial<OtelConfig> = {
				enabled: true,
				exporterEndpoint: 'https://collector.example.com',
				exporterServiceName: 'n8n-prod',
				tracesSampleRate: 0.5,
				includeNodeSpans: false,
			};
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify(persisted),
			} as Settings);

			const result = await service.loadEffective();

			expect(result.enabled).toBe(true);
			expect(result.exporterEndpoint).toBe('https://collector.example.com');
			expect(result.exporterServiceName).toBe('n8n-prod');
			expect(result.tracesSampleRate).toBe(0.5);
			expect(result.includeNodeSpans).toBe(false);
			// Fields not in DB row fall back to defaults
			expect(result.exporterTracingPath).toBe('/v1/traces');
			expect(result.injectOutbound).toBe(true);
		});

		it('lets env vars override DB values', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: true, exporterEndpoint: 'https://from-db' }),
			} as Settings);
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';

			// Re-build config so @Env decorator picks up the new process.env value
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			const result = await serviceWithEnv.loadEffective();

			expect(result.exporterEndpoint).toBe('https://from-env');
			// Other DB fields still applied
			expect(result.enabled).toBe(true);
		});

		it('uses env values when no DB row exists', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			process.env.N8N_OTEL_ENABLED = 'true';

			const configWithEnv = new OtelConfig();
			configWithEnv.enabled = true;
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			const result = await serviceWithEnv.loadEffective();

			expect(result.enabled).toBe(true);
		});
	});

	describe('loadSaved', () => {
		it('returns DB values without applying env override', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: false, exporterEndpoint: 'https://from-db' }),
			} as Settings);
			process.env.N8N_OTEL_ENABLED = 'true';
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';

			// Even with env vars set, loadSaved ignores them and returns DB values
			const configWithEnv = new OtelConfig();
			configWithEnv.enabled = true;
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			const result = await serviceWithEnv.loadSaved();

			expect(result.enabled).toBe(false);
			expect(result.exporterEndpoint).toBe('https://from-db');
		});

		it('returns defaults when no DB row and no UI save has happened', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const result = await service.loadSaved();

			expect(result.enabled).toBe(false);
			expect(result.exporterEndpoint).toBe('http://localhost:4318');
		});
	});

	describe('saveSettings', () => {
		const settings: OtelConfig = {
			enabled: true,
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterHeaders: 'auth=token',
			exporterServiceName: 'n8n-prod',
			tracesSampleRate: 0.7,
			startupConnectivityTimeoutMs: 5_000,
			includeNodeSpans: false,
			injectOutbound: true,
			productionExecutionsOnly: false,
		};

		it('inserts a new row with loadOnStartup when none exists', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.saveSettings(settings);

			expect(settingsRepository.save).toHaveBeenCalledWith(
				{
					key: OTEL_SETTINGS_KEY,
					value: JSON.stringify(settings),
					loadOnStartup: true,
				},
				{ transaction: false },
			);
		});

		it('updates an existing row in place', async () => {
			const existing = { key: OTEL_SETTINGS_KEY, value: 'old', loadOnStartup: true } as Settings;
			settingsRepository.findByKey.mockResolvedValue(existing);

			await service.saveSettings(settings);

			expect(existing.value).toBe(JSON.stringify(settings));
			expect(settingsRepository.save).toHaveBeenCalledWith(existing, { transaction: false });
		});
	});
});
