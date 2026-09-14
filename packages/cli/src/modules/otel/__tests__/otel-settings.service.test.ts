/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import type { OtelConnectionParams } from '../otel-settings.service';
import { OTEL_SETTINGS_KEY, OtelSettingsService } from '../otel-settings.service';
import { OtelConfig } from '../otel.config';

describe('OtelSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const logger = mock<Logger>();
	const config = new OtelConfig(); // env-defaults (no env vars set in test runtime)
	let service: OtelSettingsService;

	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		// Strip any OTel env vars inherited from the test runner so each test
		// starts from a known state.
		for (const key of Object.keys(process.env)) {
			if (key.startsWith('N8N_OTEL_')) delete process.env[key];
		}
		service = new OtelSettingsService(config, settingsRepository, logger);
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('loadSettings', () => {
		it('warns and falls back to defaults when persisted exporterHeaders is not a string', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ exporterHeaders: 123 }),
			} as Settings);

			await service.loadSettings();
			const result = service.getSettings();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('non-string exporterHeaders'),
			);
			expect(result.exporterHeaders).toBe('');
		});

		it('warns and falls back to defaults when the persisted row is not a settings object', async () => {
			settingsRepository.findByKey.mockResolvedValue({ value: '"a-string"' } as Settings);

			await service.loadSettings();
			const result = service.getSettings();

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not a settings object'));
			expect(result.exporterServiceName).toBe('n8n');
		});

		it('warns and falls back to defaults when the persisted row contains invalid JSON', async () => {
			settingsRepository.findByKey.mockResolvedValue({ value: 'not-valid-json' } as Settings);

			await service.loadSettings();
			const result = service.getSettings();

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('invalid JSON'),
				expect.objectContaining({ error: expect.any(String) }),
			);
			expect(result.exporterEndpoint).toBe('http://localhost:4318');
		});

		it('returns defaults when DB row is absent and no env vars are set', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.loadSettings();
			const result = service.getSettings();

			expect(result).toEqual({
				enabled: false,
				exporterProtocol: 'http/protobuf',
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
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.enabled).toBe(true);
			expect(result.envManagedFields).toContain('exporterEndpoint');
			expect(result.envManagedFields).not.toContain('enabled');
		});

		it('returns the persisted exporter protocol', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ exporterProtocol: 'grpc' }),
			} as Settings);

			await service.loadSettings();

			expect(service.getSettings().exporterProtocol).toBe('grpc');
		});

		it('falls back to the default protocol for a DB row written before the field existed', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ enabled: true, exporterEndpoint: 'https://from-db' }),
			} as Settings);

			await service.loadSettings();
			const result = service.getSettings();

			expect(result.exporterProtocol).toBe('http/protobuf');
			expect(result.envManagedFields).not.toContain('exporterProtocol');
		});

		it('the protocol env var overrides the DB value and is tracked in envManagedFields', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ exporterProtocol: 'http/protobuf' }),
			} as Settings);
			process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';

			const configWithEnv = new OtelConfig();
			configWithEnv.exporterProtocol = 'grpc';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.exporterProtocol).toBe('grpc');
			expect(result.envManagedFields).toContain('exporterProtocol');
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
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.enabled).toBe(true);
			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.envManagedFields).toContain('enabled');
			expect(result.envManagedFields).toContain('exporterEndpoint');
		});

		it('masks env-managed exporterHeaders in the settings response', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);
			process.env.N8N_OTEL_EXPORTER_OTLP_HEADERS = 'authorization=Bearer secret-token';

			const configWithEnv = new OtelConfig();
			configWithEnv.exporterHeaders = 'authorization=Bearer secret-token';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			await serviceWithEnv.loadSettings();
			const result = serviceWithEnv.getSettings();

			expect(result.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
			expect(result.exporterHeaders).not.toContain('secret-token');
			expect(result.envManagedFields).toContain('exporterHeaders');
		});

		it('returns an empty string when no headers are set', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.loadSettings();
			const result = service.getSettings();

			expect(result.exporterHeaders).toBe('');
		});

		it('masks stored exporterHeaders even when not env-managed', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ exporterHeaders: 'x-api-key=stored' }),
			} as Settings);

			await service.loadSettings();
			const result = service.getSettings();

			expect(result.exporterHeaders).toBe(`x-api-key=${CREDENTIAL_BLANKING_VALUE}`);
			expect(result.exporterHeaders).not.toContain('stored');
			expect(result.envManagedFields).not.toContain('exporterHeaders');
		});

		describe('values supplied via the _FILE env variant', () => {
			// Temp dir backing the _FILE test; removed in afterEach
			let tempHeadersDir: string | undefined;

			afterEach(() => {
				if (tempHeadersDir) {
					rmSync(tempHeadersDir, { recursive: true, force: true });
					tempHeadersDir = undefined;
				}
			});

			it('treats headers from N8N_OTEL_EXPORTER_OTLP_HEADERS_FILE as env-managed and masks them', async () => {
				const dir = mkdtempSync(join(tmpdir(), 'otel-headers-'));
				tempHeadersDir = dir;
				const headersFile = join(dir, 'headers');
				writeFileSync(headersFile, 'authorization=Bearer file-secret');
				process.env.N8N_OTEL_EXPORTER_OTLP_HEADERS_FILE = headersFile;
				settingsRepository.findByKey.mockResolvedValue(null);

				// Mirror what the config factory does when it reads the _FILE variant
				// (covered by @n8n/config's own decorator tests)
				const configFromFile = new OtelConfig();
				configFromFile.exporterHeaders = 'authorization=Bearer file-secret';

				const serviceFromFile = new OtelSettingsService(configFromFile, settingsRepository, logger);
				await serviceFromFile.loadSettings();
				const result = serviceFromFile.getSettings();

				expect(result.exporterHeaders).toBe(`authorization=${CREDENTIAL_BLANKING_VALUE}`);
				expect(result.envManagedFields).toContain('exporterHeaders');
			});

			it('does not treat an empty _FILE variable as env-managed', async () => {
				process.env.N8N_OTEL_EXPORTER_OTLP_HEADERS_FILE = '';
				settingsRepository.findByKey.mockResolvedValue(null);

				await service.loadSettings();
				const result = service.getSettings();

				expect(result.envManagedFields).not.toContain('exporterHeaders');
				expect(result.exporterHeaders).toBe('');
			});
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
			exporterProtocol: 'grpc',
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
			process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			configWithEnv.exporterProtocol = 'grpc';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);
			settingsRepository.findByKey.mockResolvedValue(null);

			const incoming: OtelConfig = {
				...settings,
				exporterEndpoint: 'https://tampered-by-client',
				exporterProtocol: 'http/protobuf',
			};
			await serviceWithEnv.saveSettings(incoming);

			const saved = JSON.parse(
				(settingsRepository.save.mock.calls[0]?.[0] as { value: string }).value,
			) as OtelConfig;
			expect(saved.exporterEndpoint).toBe('https://from-env');
			expect(saved.exporterProtocol).toBe('grpc');
			expect(saved.enabled).toBe(settings.enabled);
		});

		it('keeps the stored value per key when blanked values are echoed back', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ ...settings, exporterHeaders: 'a=1,b=2' }),
			} as Settings);

			await service.saveSettings({
				...settings,
				exporterHeaders: `a=${CREDENTIAL_BLANKING_VALUE},c=3`,
			});

			const saved = JSON.parse(
				(settingsRepository.save.mock.calls[0]?.[0] as { value: string }).value,
			) as OtelConfig;
			// 'a' keeps its stored value, 'b' is dropped (absent), 'c' is new
			expect(saved.exporterHeaders).toBe('a=1,c=3');
		});

		it('drops a blanked pair whose key has no stored value', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.saveSettings({
				...settings,
				exporterHeaders: `z=${CREDENTIAL_BLANKING_VALUE}`,
			});

			const saved = JSON.parse(
				(settingsRepository.save.mock.calls[0]?.[0] as { value: string }).value,
			) as OtelConfig;
			expect(saved.exporterHeaders).toBe('');
		});
	});

	describe('resolveTestConnection', () => {
		const incoming: OtelConnectionParams = {
			exporterProtocol: 'grpc',
			exporterEndpoint: 'https://collector.example.com',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n-prod',
			exporterHeaders: 'auth=token',
			startupConnectivityTimeoutMs: 5_000,
		};

		it('returns the incoming connection params when no env vars are set', () => {
			expect(service.resolveTestConnection(incoming)).toEqual(incoming);
		});

		it('resolves blanked values against the stored ones for test connections', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				value: JSON.stringify({ exporterHeaders: 'x-api-key=stored,x-other=2' }),
			} as Settings);

			await service.loadSettings();

			const result = service.resolveTestConnection({
				...incoming,
				exporterHeaders: `x-api-key=${CREDENTIAL_BLANKING_VALUE}`,
			});

			expect(result.exporterHeaders).toBe('x-api-key=stored');
		});

		it('overrides env-managed fields with the canonical env-var value', () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://from-env';
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterEndpoint = 'https://from-env';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			const result = serviceWithEnv.resolveTestConnection({
				...incoming,
				exporterEndpoint: 'https://tampered-by-client',
			});

			expect(result.exporterEndpoint).toBe('https://from-env');
			expect(result.exporterServiceName).toBe('n8n-prod');
		});

		it('overrides an env-managed exporter protocol with the canonical env-var value', () => {
			process.env.N8N_OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';
			const configWithEnv = new OtelConfig();
			configWithEnv.exporterProtocol = 'grpc';
			const serviceWithEnv = new OtelSettingsService(configWithEnv, settingsRepository, logger);

			const result = serviceWithEnv.resolveTestConnection({
				...incoming,
				exporterProtocol: 'http/protobuf',
			});

			expect(result.exporterProtocol).toBe('grpc');
		});
	});
});
