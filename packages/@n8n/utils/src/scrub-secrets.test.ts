import { describe, expect, it } from 'vitest';

import { scrubSecretsInText } from './scrub-secrets';

// Build token-shaped strings at runtime so the source file never contains a
// literal that matches GitHub / vendor secret-scanning fingerprints (the
// scanners flag the shape `<prefix><N alphanumeric>` even when the suffix is
// obviously synthetic).
const join = (prefix: string, suffix: string) => prefix + suffix;

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
		expect(scrubSecretsInText(`use ${join('sk-', 'proj-abcdef1234567890XYZ')} as the key`)).toBe(
			'use [REDACTED] as the key',
		);
		expect(scrubSecretsInText(`use ${join('sk-', 'ant-api03-aaaaaaaaaaaaaaaa')}`)).toBe(
			'use [REDACTED]',
		);
		expect(scrubSecretsInText(`use ${join('sk-', 'aaaaaaaaaaaaaaaa')}`)).toBe('use [REDACTED]');
	});

	it('redacts Slack and GitHub tokens', () => {
		expect(scrubSecretsInText('xoxb-1234567890-abcdefghij')).toBe('[REDACTED]');
		expect(scrubSecretsInText('xoxp-9876543210-abcdefghij')).toBe('[REDACTED]');
		expect(scrubSecretsInText(join('ghp', '_abcdefghijklmnopqrstuvwxyz0123456789'))).toBe(
			'[REDACTED]',
		);
		expect(scrubSecretsInText(join('ghs', '_abcdefghijklmnopqrstuvwxyz0123456789'))).toBe(
			'[REDACTED]',
		);
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

	it('redacts JSON-shaped credential fields with quoted keys and values', () => {
		const input = '{"apiKey": "abc123XYZ", "password": "hunter2", "accessToken": "tok-xyz"}';
		expect(scrubSecretsInText(input)).toBe('{[REDACTED], [REDACTED], [REDACTED]}');
	});

	it('redacts a "credentials" field holding a serialized scalar value', () => {
		const out = scrubSecretsInText('user pasted {"credentials": "long-credentials-blob"}');
		expect(out).not.toContain('long-credentials-blob');
		expect(out).toContain('[REDACTED]');
	});

	it('redacts inner secret keys when the outer field is a nested object', () => {
		// The JSON-shaped pattern runs before the loose `key:value` pattern,
		// so the inner "apiKey":"..." gets caught before the outer
		// "credentials" key can greedy-eat it.
		const out = scrubSecretsInText('{"credentials": {"apiKey": "abc123XYZ"}}');
		expect(out).not.toContain('abc123XYZ');
		expect(out).toContain('[REDACTED]');
	});

	it('redacts single-quoted JS object credential fields', () => {
		const out = scrubSecretsInText("config = {'apiKey': 'abc123XYZ'}");
		expect(out).not.toContain('abc123XYZ');
		expect(out).toContain('[REDACTED]');
	});

	it('redacts JSON-shaped values containing escaped quotes without leaking the suffix', () => {
		// Raw text with a JSON-escaped quote inside the value. A naive
		// `[^"]*` value matcher would stop at the inner `"` and only redact
		// `"apiKey": "abc\"`, leaving `def\"ghi"` exposed.
		const input = '{"apiKey": "abc\\"def\\"ghi", "other": 1}';
		const out = scrubSecretsInText(input);
		expect(out).not.toContain('abc');
		expect(out).not.toContain('def');
		expect(out).not.toContain('ghi');
		expect(out).toBe('{[REDACTED], "other": 1}');
	});

	it('leaves already-redacted JSON placeholder values untouched (idempotent with object walkers)', () => {
		// Upstream object-aware redaction (e.g. langsmith trace payloads)
		// produces `"apiKey": "[redacted]"`; running this scrubber over the
		// stringified result must not corrupt that structure.
		const walkerOutput = '{"ok":true,"items":[{"name":"Slack account","apiKey":"[redacted]"}]}';
		expect(scrubSecretsInText(walkerOutput)).toBe(walkerOutput);
		const ownOutput = '{"apiKey":"[REDACTED]"}';
		expect(scrubSecretsInText(ownOutput)).toBe(ownOutput);
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
