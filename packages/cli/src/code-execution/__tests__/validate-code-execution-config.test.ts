import type { CodeExecutionConfig } from '@n8n/config';

import { InvalidCodeExecutionConfigError } from '../errors/invalid-code-execution-config.error';
import { validateCodeExecutionConfig } from '../validate-code-execution-config';

const makeConfig = (backend: string, sandbox: Partial<CodeExecutionConfig['sandbox']> = {}) =>
	({
		backend,
		sandbox: { url: '', apiKey: '', scope: 'execution', ...sandbox },
	}) as CodeExecutionConfig;

const validSandbox = { url: 'https://code-sandbox.example.com', apiKey: 'secret' };

describe('validateCodeExecutionConfig', () => {
	it('accepts task runners without sandbox settings', () => {
		expect(() => validateCodeExecutionConfig(makeConfig('task-runners'))).not.toThrow();
	});

	it('accepts the sandbox backend with a URL and an API key', () => {
		expect(() => validateCodeExecutionConfig(makeConfig('sandbox', validSandbox))).not.toThrow();
	});

	it('rejects an unknown backend', () => {
		const validate = () => validateCodeExecutionConfig(makeConfig('sandbx', validSandbox));

		expect(validate).toThrow(InvalidCodeExecutionConfigError);
		expect(validate).toThrow(
			'`N8N_CODE_TASKS_BACKEND` must be `task-runners` or `sandbox`, but is "sandbx".',
		);
	});

	it('rejects the sandbox backend without a URL and an API key', () => {
		const validate = () => validateCodeExecutionConfig(makeConfig('sandbox'));

		expect(validate).toThrow(InvalidCodeExecutionConfigError);
		expect(validate).toThrow(
			'Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL. Set `N8N_CODE_SANDBOX_API_KEY`.',
		);
	});

	it('rejects the sandbox backend without an API key', () => {
		const config = makeConfig('sandbox', { url: validSandbox.url });

		expect(() => validateCodeExecutionConfig(config)).toThrow(
			/^Invalid code execution configuration\. Set `N8N_CODE_SANDBOX_API_KEY`\.$/,
		);
	});

	it.each(['not a url', 'ftp://code-sandbox.example.com'])(
		'rejects the sandbox backend with the invalid URL "%s"',
		(url) => {
			const config = makeConfig('sandbox', { ...validSandbox, url });

			expect(() => validateCodeExecutionConfig(config)).toThrow(
				/^Invalid code execution configuration\. Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL\.$/,
			);
		},
	);
});
