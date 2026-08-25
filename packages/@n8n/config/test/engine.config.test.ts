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
});
