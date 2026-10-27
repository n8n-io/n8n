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
	it('enables the design-system direct component import ban for Vue and TypeScript files', () => {
		const ruleName = '@n8n/design-system/no-direct-component-imports';
		const enabledFiles = frontendConfig
			.filter((config) => config.rules?.[ruleName] === 'error')
			.flatMap((config) => config.files ?? []);

		expect(enabledFiles).toEqual(expect.arrayContaining(['**/*.vue', '**/*.{ts,tsx}']));
	});
});
