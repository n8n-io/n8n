import { describe, it, expect } from 'vitest';
import { frontendConfig } from './configs/frontend.js';
import { localRulesPlugin } from './plugin.js';

describe('localRulesPlugin recommended config', () => {
	it('enables the AWS credential-discovery import ban as an error', () => {
		expect(
			localRulesPlugin.configs.recommended.rules[
				'n8n-local-rules/no-aws-credential-discovery-imports'
			],
		).toBe('error');
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

	it('enables the collapse transition import bans as errors', () => {
		const rules = frontendConfig.find(
			(config) =>
				config.rules?.['n8n-local-rules/no-element-plus-collapse-transition'] !== undefined,
		)?.rules;

		expect(rules?.['n8n-local-rules/no-element-plus-collapse-transition']).toBe('error');
		expect(rules?.['n8n-local-rules/no-reka-ui-collapsible']).toBe('error');
	});
});
