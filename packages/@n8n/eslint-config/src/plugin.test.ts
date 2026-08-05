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

	// Every package's `lint` script passes `--quiet`, which drops warnings, so a
	// discarded test body only fails a build while this rule is an error.
	it('enables the discarded test body ban as an error', () => {
		expect(
			localRulesPlugin.configs.recommended.rules['n8n-local-rules/no-todo-test-with-body'],
		).toBe('error');
	});
});
