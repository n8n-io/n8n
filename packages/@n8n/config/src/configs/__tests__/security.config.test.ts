import { Container } from '@n8n/di';

import { SecurityConfig } from '../security.config';

describe('SecurityConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.clearAllMocks();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	describe('awsSystemCredentialsSdkSources', () => {
		test('defaults to "all"', () => {
			process.env = {};
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe('all');
		});

		test.each([
			'all',
			'none',
			'environment',
			'environment,instanceMetadata',
			' environment , podIdentity ',
			'environment,',
		])('accepts valid value %p', (value) => {
			process.env = { N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES: value };
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe(value);
		});

		test('falls back to the default and warns on an unknown source', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			process.env = { N8N_AWS_SYSTEM_CREDENTIALS_SDK_SOURCES: 'enviroment' };
			expect(Container.get(SecurityConfig).awsSystemCredentialsSdkSources).toBe('all');
			expect(consoleWarnSpy).toHaveBeenCalled();

			consoleWarnSpy.mockRestore();
		});
	});
});
