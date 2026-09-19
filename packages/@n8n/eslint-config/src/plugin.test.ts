import { describe, it, expect } from 'vitest';
import { frontendConfig } from './configs/frontend.js';
import { functionalGuardrailsConfig } from './configs/functional-guardrails.js';
import { localRulesPlugin } from './plugin.js';

const CREDENTIALS_SEAL = 'no-unsealed-credentials-entity-write';

describe('localRulesPlugin recommended config', () => {
	it('enables the AWS credential-discovery import ban as an error', () => {
		expect(
			localRulesPlugin.configs.recommended.rules[
				'n8n-local-rules/no-aws-credential-discovery-imports'
			],
		).toBe('error');
	});

	it('enables the CredentialsEntity write seal as an error', () => {
		expect(localRulesPlugin.configs.recommended.rules[`n8n-local-rules/${CREDENTIALS_SEAL}`]).toBe(
			'error',
		);
	});
});

describe('functionalGuardrailsConfig', () => {
	const rules = functionalGuardrailsConfig.find((config) => config.rules)?.rules ?? {};

	it('enables the CredentialsEntity write seal as an error', () => {
		expect(rules[`n8n-local-rules/${CREDENTIALS_SEAL}`]).toBe('error');
	});

	it('makes an inline disable of the CredentialsEntity write seal an error', () => {
		const [, options] = rules['n8n-local-rules/no-guardrail-disable'] as [
			string,
			{ guarded: Array<{ rule: string }> },
		];

		expect(options.guarded.map(({ rule }) => rule)).toContain(CREDENTIALS_SEAL);
	});
});

describe('frontendConfig', () => {
	it('enables the reka-ui pagination import ban as an error', () => {
		expect(
			frontendConfig.find(
				(config) => config.rules?.['n8n-local-rules/no-reka-ui-pagination'] !== undefined,
			)?.rules?.['n8n-local-rules/no-reka-ui-pagination'],
		).toBe('error');
	});
});
