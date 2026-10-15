import { Container } from '@n8n/di';
import type { MockInstance } from 'vitest';

import { EngineConfig } from '../engine.config';

describe('EngineConfig', () => {
	const originalEnv = process.env;
	let consoleWarnMock: MockInstance;

	beforeEach(() => {
		Container.reset();
		process.env = {};
		consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		process.env = originalEnv;
		consoleWarnMock.mockRestore();
	});

	it('should accept an auth secret of at least 32 characters', () => {
		const secret = 'a'.repeat(32);
		process.env.N8N_ENGINE_AUTH_SECRET = secret;

		expect(Container.get(EngineConfig).authSecret).toBe(secret);
	});

	it('should reject a shorter auth secret and fall back to the default', () => {
		process.env.N8N_ENGINE_AUTH_SECRET = 'a'.repeat(31);

		expect(Container.get(EngineConfig).authSecret).toBe('');
		expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('N8N_ENGINE_AUTH_SECRET'));
	});

	it('should leave the control plane base URL empty so the host picks the default', () => {
		expect(Container.get(EngineConfig).controlPlaneBaseUrl).toBe('');
	});

	it('should bind the control plane server to loopback by default', () => {
		const config = Container.get(EngineConfig);

		expect(config.controlPlaneHost).toBe('127.0.0.1');
		expect(config.controlPlanePort).toBe(3001);
	});

	it('should read the control plane server bind address', () => {
		process.env.N8N_ENGINE_CONTROL_PLANE_HOST = '0.0.0.0';
		process.env.N8N_ENGINE_CONTROL_PLANE_PORT = '4001';

		const config = Container.get(EngineConfig);

		expect(config.controlPlaneHost).toBe('0.0.0.0');
		expect(config.controlPlanePort).toBe(4001);
	});

	it('should read the control plane base URL', () => {
		process.env.N8N_ENGINE_CONTROL_PLANE_BASE_URL = 'http://cp.internal:5678';

		expect(Container.get(EngineConfig).controlPlaneBaseUrl).toBe('http://cp.internal:5678');
	});

	it('should host the data plane in-process by default', () => {
		expect(Container.get(EngineConfig).mode).toBe('in-process');
	});

	it('keeps engine tracing off by default', () => {
		expect(Container.get(EngineConfig).tracingEnabled).toBe(false);
	});

	it('keeps legacy NoOp benchmarking off by default', () => {
		expect(Container.get(EngineConfig).benchmarkLegacyNoops).toBe(false);
	});

	it('enables legacy NoOp benchmarking only through an explicit flag', () => {
		process.env.N8N_ENGINE_BENCHMARK_LEGACY_NOOPS = 'true';
		expect(Container.get(EngineConfig).benchmarkLegacyNoops).toBe(true);
	});

	it('keeps legacy NoOp benchmarking off when the flag is false', () => {
		process.env.N8N_ENGINE_BENCHMARK_LEGACY_NOOPS = 'false';
		expect(Container.get(EngineConfig).benchmarkLegacyNoops).toBe(false);
	});

	it('rejects an invalid legacy NoOp benchmark flag', () => {
		process.env.N8N_ENGINE_BENCHMARK_LEGACY_NOOPS = 'invalid';
		expect(Container.get(EngineConfig).benchmarkLegacyNoops).toBe(false);
		expect(consoleWarnMock).toHaveBeenCalledWith(
			expect.stringContaining('N8N_ENGINE_BENCHMARK_LEGACY_NOOPS'),
		);
	});

	it('enables engine tracing only through an explicit flag', () => {
		process.env.N8N_ENGINE_TRACING_ENABLED = 'true';
		expect(Container.get(EngineConfig).tracingEnabled).toBe(true);
	});

	it('keeps engine tracing off when the flag is false', () => {
		process.env.N8N_ENGINE_TRACING_ENABLED = 'false';
		expect(Container.get(EngineConfig).tracingEnabled).toBe(false);
	});

	it('should read the remote mode', () => {
		process.env.N8N_ENGINE_MODE = 'remote';

		expect(Container.get(EngineConfig).mode).toBe('remote');
	});

	it('should reject an unknown mode and fall back to in-process', () => {
		process.env.N8N_ENGINE_MODE = 'sidecar';

		expect(Container.get(EngineConfig).mode).toBe('in-process');
		expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('N8N_ENGINE_MODE'));
	});
});
