import { describe, expect, it } from 'vitest';

import { scrubSecretsInText } from './scrubSecrets';

describe('scrubSecretsInText', () => {
	it('redacts Bearer/Basic/Token authorization values', () => {
		expect(scrubSecretsInText('Authorization: Bearer abc.def-ghi_jkl/mno=')).toBe('[REDACTED]');
		expect(scrubSecretsInText('header is Basic dXNlcjpwYXNzd29yZA==')).toBe('header is [REDACTED]');
	});

	it('redacts OpenAI/Anthropic, Slack, GitHub and AWS keys', () => {
		expect(scrubSecretsInText('use sk-proj-abcdef1234567890XYZ')).toBe('use [REDACTED]');
		expect(scrubSecretsInText('xoxb-1234567890-abcdefghij')).toBe('[REDACTED]');
		expect(scrubSecretsInText('ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toBe('[REDACTED]');
		expect(scrubSecretsInText('AKIAIOSFODNN7EXAMPLE is the key')).toBe('[REDACTED] is the key');
	});

	it('redacts generic key=value assignments', () => {
		expect(scrubSecretsInText('password=hunter2 and api_key:abc')).toBe(
			'[REDACTED] and [REDACTED]',
		);
	});

	it('leaves plain text alone', () => {
		const input = 'feedback about the workflow plan';
		expect(scrubSecretsInText(input)).toBe(input);
	});
});
