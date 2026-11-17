import { Container } from '@n8n/di';

import { CodeExecutionConfig } from '../code-execution.config';

const { readFileSyncMock } = vi.hoisted(() => ({
	readFileSyncMock: vi.fn(),
}));

vi.mock('node:fs', () => ({
	readFileSync: readFileSyncMock,
}));

describe('CodeExecutionConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	test('uses task runners and no sandbox settings by default', () => {
		const config = Container.get(CodeExecutionConfig);

		expect(config.backend).toBe('task-runners');
		expect(config.sandbox).toEqual({ url: '', apiKey: '', scope: 'execution' });
	});

	test('reads the sandbox settings from env', () => {
		vi.stubEnv('N8N_CODE_TASKS_BACKEND', 'sandbox');
		vi.stubEnv('N8N_CODE_SANDBOX_URL', 'https://code-sandbox.example.com');
		vi.stubEnv('N8N_CODE_SANDBOX_API_KEY', 'secret');
		vi.stubEnv('N8N_CODE_SANDBOX_SCOPE', 'execution');

		const config = Container.get(CodeExecutionConfig);

		expect(config.backend).toBe('sandbox');
		expect(config.sandbox).toEqual({
			url: 'https://code-sandbox.example.com',
			apiKey: 'secret',
			scope: 'execution',
		});
	});

	test('reads the API key from a file', () => {
		vi.stubEnv('N8N_CODE_SANDBOX_API_KEY_FILE', '/run/secrets/code-sandbox-api-key');
		readFileSyncMock.mockReturnValueOnce('secret-from-file');

		expect(Container.get(CodeExecutionConfig).sandbox.apiKey).toBe('secret-from-file');
	});

	// Startup validation rejects it, so it must not fall back to the default.
	test('keeps an invalid URL as given', () => {
		vi.stubEnv('N8N_CODE_SANDBOX_URL', 'not a url');

		expect(Container.get(CodeExecutionConfig).sandbox.url).toBe('not a url');
	});

	test.each([
		['N8N_CODE_TASKS_BACKEND', 'sandbx'],
		['N8N_CODE_SANDBOX_SCOPE', 'workflow'],
	])('falls back to the default on invalid %s', (envName, value) => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv(envName, value);

		const config = Container.get(CodeExecutionConfig);

		expect(config.backend).toBe('task-runners');
		expect(config.sandbox.scope).toBe('execution');
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(envName));
	});
});
