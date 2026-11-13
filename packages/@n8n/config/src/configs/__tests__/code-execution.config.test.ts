import { Container } from '@n8n/di';

import { CodeExecutionConfig, isCodeExecutionBackend } from '../code-execution.config';

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

	// Startup validation rejects these, so they must not fall back to the defaults.
	test('keeps an invalid backend and URL as given', () => {
		vi.stubEnv('N8N_CODE_TASKS_BACKEND', 'sandbx');
		vi.stubEnv('N8N_CODE_SANDBOX_URL', 'not a url');

		const config = Container.get(CodeExecutionConfig);

		expect(config.backend).toBe('sandbx');
		expect(config.sandbox.url).toBe('not a url');
	});

	test('falls back to the default on an invalid scope', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_CODE_SANDBOX_SCOPE', 'workflow');

		expect(Container.get(CodeExecutionConfig).sandbox.scope).toBe('execution');
		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('N8N_CODE_SANDBOX_SCOPE'));
	});

	describe('isCodeExecutionBackend', () => {
		test.each(['task-runners', 'sandbox'])('accepts %s', (value) => {
			expect(isCodeExecutionBackend(value)).toBe(true);
		});

		test.each(['', 'sandbx', 'Sandbox'])('rejects "%s"', (value) => {
			expect(isCodeExecutionBackend(value)).toBe(false);
		});
	});
});
