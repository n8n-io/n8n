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

	describe('loadSettings', () => {
		it('returns defaults when DB row is absent and no env vars are set', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.loadSettings();
			const result = service.getSettings();

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
				envManagedFields: [],
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

			await service.loadSettings();
			const result = service.getSettings();

			expect(result.enabled).toBe(true);
			expect(result.exporterEndpoint).toBe('https://collector.example.com');
			expect(result.exporterServiceName).toBe('n8n-prod');
			expect(result.tracesSampleRate).toBe(0.5);
			expect(result.includeNodeSpans).toBe(false);
			expect(result.exporterTracingPath).toBe('/v1/traces');
			expect(result.injectOutbound).toBe(true);
			expect(result.envManagedFields).toEqual([]);
		});

		it('env vars override DB values and are tracked in envManagedFields', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: true, exporterEndpoint: 'https://from-db' }),
			} as Settings);
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';

			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.enabled).toBe(true);
			expect(result.envManagedFields).toContain('exporterEndpoint');
			expect(result.envManagedFields).not.toContain('enabled');
		});

		it('env vars win over DB even after UI save', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: false, exporterEndpoint: 'https://from-db' }),
			} as Settings);
			process.env.N8N_OTEL_ENABLED = 'true';
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';

			const configWithEnv = new OtelConfig();
			configWithEnv.enabled = true;
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.enabled).toBe(true);
			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.envManagedFields).toContain('enabled');
			expect(result.envManagedFields).toContain('exporterEndpoint');
		});
	});

	describe('getSettings', () => {
		it('throws if loadSettings was never called', () => {
			expect(() => service.getSettings()).toThrow('OTel settings not yet initialized');
		});

		it('returns settings with envManagedFields after loadSettings', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.loadSettings();
			const result = service.getSettings();

			expect(result.envManagedFields).toEqual([]);
			expect(result.enabled).toBe(false);
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

			const [row] = settingsRepository.save.mock.calls[0] as [
				{ key: string; value: string; loadOnStartup: boolean },
			];
			expect(row.key).toBe(OTEL_SETTINGS_KEY);
			expect(row.loadOnStartup).toBe(true);
			expect(JSON.parse(row.value)).toEqual(settings);
		});

		it('updates an existing row in place', async () => {
			const existing = { key: OTEL_SETTINGS_KEY, value: 'old', loadOnStartup: true } as Settings;
			settingsRepository.findByKey.mockResolvedValue(existing);

			await service.saveSettings(settings);

			expect(JSON.parse(existing.value)).toEqual(settings);
			expect(settingsRepository.save).toHaveBeenCalledWith(existing, { transaction: false });
		});

		it('replaces env-managed fields with env-var values before persisting', async () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);
			settingsRepository.findByKey.mockResolvedValue(null);

			const incoming: OtelConfig = { ...settings, exporterEndpoint: 'https://tampered-by-client' };
			await serviceWithEnv.saveSettings(incoming);

			const saved = JSON.parse(
				(settingsRepository.save.mock.calls[0]?.[0] as { value: string }).value,
			) as OtelConfig;
			expect(saved.exporterEndpoint).toBe('https://from-env');
			expect(saved.enabled).toBe(settings.enabled);
		});
	});

	describe('resolveTestConnection', () => {
		const incoming = {
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n-prod',
			exporterHeaders: 'auth=token',
			startupConnectivityTimeoutMs: 5_000,
		};

		it('returns the incoming connection params when no env vars are set', () => {
			expect(service.resolveTestConnection(incoming)).toEqual(incoming);
		});

		it('overrides env-managed fields with the canonical env-var value', () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository);

			const result = serviceWithEnv.resolveTestConnection({
				...incoming,
				exporterEndpoint: 'https://tampered-by-client',
			});

			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.exporterServiceName).toBe('n8n-prod');
		});
	});
});
