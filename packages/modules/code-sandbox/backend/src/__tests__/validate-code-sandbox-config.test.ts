import type { CodeSandboxConfig } from '@n8n/config';

import { InvalidCodeSandboxConfigError } from '../errors/invalid-code-sandbox-config.error';
import { validateCodeSandboxConfig } from '../validate-code-sandbox-config';

const makeConfig = (config: Partial<CodeSandboxConfig> = {}) =>
	({ url: '', apiKey: '', scope: 'execution', ...config }) as CodeSandboxConfig;

const validConfig = { url: 'https://code-sandbox.example.com', apiKey: 'secret' };

describe('validateCodeSandboxConfig', () => {
	it('accepts a URL and an API key', () => {
		expect(() => validateCodeSandboxConfig(makeConfig(validConfig))).not.toThrow();
	});

	it('rejects a config without a URL and an API key', () => {
		const validate = () => validateCodeSandboxConfig(makeConfig());

		expect(validate).toThrow(InvalidCodeSandboxConfigError);
		expect(validate).toThrow(
			'Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL. Set `N8N_CODE_SANDBOX_API_KEY`.',
		);
	});

	it('rejects a config without an API key', () => {
		const config = makeConfig({ url: validConfig.url });

		expect(() => validateCodeSandboxConfig(config)).toThrow(
			/^Invalid code sandbox configuration\. Set `N8N_CODE_SANDBOX_API_KEY`\.$/,
		);
	});

	it.each(['not a url', 'ftp://code-sandbox.example.com'])(
		'rejects the invalid URL "%s"',
		(url) => {
			const config = makeConfig({ ...validConfig, url });

			expect(() => validateCodeSandboxConfig(config)).toThrow(
				/^Invalid code sandbox configuration\. Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL\.$/,
			);
		},
	);
});
