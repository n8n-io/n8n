import { describe, expect, it } from 'vitest';

import { scrubSecretsInText } from './scrub-secrets';

describe('scrubSecretsInText', () => {
	it('redacts Bearer/Basic/Token authorization values', () => {
		// The Bearer/Basic/Token-prefix pattern consumes the prefix and value
		// together, and the generic `authorization: ...` pattern then collapses
		// the whole header to a single placeholder.
		expect(scrubSecretsInText('Authorization: Bearer abc.def-ghi_jkl/mno=')).toBe('[REDACTED]');
		expect(scrubSecretsInText('header is Basic dXNlcjpwYXNzd29yZA==')).toBe('header is [REDACTED]');
		expect(scrubSecretsInText('header is Token abcdef1234567890')).toBe('header is [REDACTED]');
	});

	it('redacts OpenAI and Anthropic API keys', () => {
		expect(scrubSecretsInText('use sk-proj-abcdef1234567890XYZ as the key')).toBe(
			'use [REDACTED] as the key',
		);
		expect(scrubSecretsInText('use sk-ant-api03-aaaaaaaaaaaaaaaa')).toBe('use [REDACTED]');
		expect(scrubSecretsInText('use sk-aaaaaaaaaaaaaaaa')).toBe('use [REDACTED]');
	});

	it('redacts Slack and GitHub tokens', () => {
		expect(scrubSecretsInText('xoxb-1234567890-abcdefghij')).toBe('[REDACTED]');
		expect(scrubSecretsInText('xoxp-9876543210-abcdefghij')).toBe('[REDACTED]');
		expect(scrubSecretsInText('ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toBe('[REDACTED]');
		expect(scrubSecretsInText('ghs_abcdefghijklmnopqrstuvwxyz0123456789')).toBe('[REDACTED]');
	});

	it('redacts AWS access key ids', () => {
		expect(scrubSecretsInText('AKIAIOSFODNN7EXAMPLE is the key')).toBe('[REDACTED] is the key');
	});

	it('redacts generic key=value assignments regardless of separator', () => {
		expect(scrubSecretsInText('password=hunter2 and api_key:abc')).toBe(
			'[REDACTED] and [REDACTED]',
		);
		expect(scrubSecretsInText('REFRESH_TOKEN = xyz')).toBe('[REDACTED]');
		expect(scrubSecretsInText('Authorization: secret-value')).toBe('[REDACTED]');
	});

	it('leaves opaque strings alone to avoid false positives', () => {
		expect(scrubSecretsInText('feedback about the workflow plan')).toBe(
			'feedback about the workflow plan',
		);
		expect(scrubSecretsInText('/var/lib/n8n/data/some-id-1234')).toBe(
			'/var/lib/n8n/data/some-id-1234',
		);
	});

	it('returns the input unchanged when no patterns match', () => {
		const input = 'this is a normal sentence with no secrets in it';
		expect(scrubSecretsInText(input)).toBe(input);
	});
});
