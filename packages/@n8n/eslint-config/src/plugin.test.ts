import { describe, it, expect } from 'vitest';
import { localRulesPlugin } from './plugin.js';

describe('localRulesPlugin recommended config', () => {
	it('enables the AWS credential-discovery import ban as an error', () => {
		expect(
			localRulesPlugin.configs.recommended.rules[
				'n8n-local-rules/no-aws-credential-discovery-imports'
			],
		).toBe('error');
	});

	it('registers the reka-ui pagination import ban', () => {
		expect(localRulesPlugin.rules?.['no-reka-ui-pagination']).toBeDefined();
	});
});
