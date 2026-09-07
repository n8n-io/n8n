import { Container } from '@n8n/di';
import type { MockInstance } from 'vitest';

import { EngineConfig } from '../src/index';

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
});
