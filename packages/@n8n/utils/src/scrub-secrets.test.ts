import { describe, expect, it } from 'vitest';

import { scrubSecretsInText } from './scrub-secrets';

// Build token-shaped strings at runtime so the source file never contains a
// literal that matches GitHub / vendor secret-scanning fingerprints (the
// scanners flag the shape `<prefix><N alphanumeric>` even when the suffix is
// obviously synthetic).
const join = (prefix: string, suffix: string) => prefix + suffix;

describe('scrubSecretsInText', () => {
	it('redacts Bearer/Basic/Token authorization values', () => {
		// The Bearer/Basic/Token-prefix pattern consumes the prefix and value;
		// the generic `authorization: ...` pattern then skips the already-redacted
		// value (idempotency lookahead), keeping the header label.
		expect(scrubSecretsInText('Authorization: Bearer abc.def-ghi_jkl/mno=')).toBe(
			'Authorization: [REDACTED]',
		);
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

	it('redacts a PEM private-key block', () => {
		const pem = `-----BEGIN PRIVATE KEY-----\n${'FAKEKEYMATERIAL'}\n-----END PRIVATE KEY-----`;
		expect(scrubSecretsInText(`key:\n${pem}\ndone`)).toBe('key:\n[REDACTED]\ndone');
	});

	it('redacts a JWT', () => {
		const jwt = `${join('eyJ', 'hbGciOiJIUzI1NiJ9')}.${join('eyJ', 'zdWIiOiIxMjMifQ')}.${'c2lnbmF0dXJl'}`;
		expect(scrubSecretsInText(`token ${jwt} end`)).toBe('token [REDACTED] end');
	});

	it('redacts Stripe, Google, and GitHub fine-grained tokens', () => {
		expect(scrubSecretsInText(join('sk', '_live_abcdefghijklmnop1234'))).toBe('[REDACTED]');
		expect(scrubSecretsInText(join('AIza', 'B'.repeat(35)))).toBe('[REDACTED]');
		expect(scrubSecretsInText(join('github_pat_', 'A'.repeat(30)))).toBe('[REDACTED]');
	});

	it('redacts credentials embedded in a URL, keeping scheme and host', () => {
		const out = scrubSecretsInText('fetch https://alice:s3cretPass@db.example.com/items');
		expect(out).not.toContain('s3cretPass');
		expect(out).toBe('fetch https://[REDACTED]@db.example.com/items');
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

	it('matches a quoted value with many escapes in linear time', () => {
		// A quoted secret value made of many backslashes with no closing quote.
		// The value body must have a single, unambiguous parse so matching stays
		// fast regardless of the input shape.
		const input = '{"password": "' + '\\'.repeat(200);
		const start = performance.now();
		const out = scrubSecretsInText(input);
		const elapsedMs = performance.now() - start;
		expect(elapsedMs).toBeLessThan(50);
		// No closing quote, so the JSON-shaped pattern can't match; the value is
		// left as-is and matching returns promptly.
		expect(out).toContain('password');
	});

	it('leaves typed redaction markers untouched instead of nesting them', () => {
		expect(scrubSecretsInText('[REDACTED:secret:1]')).toBe('[REDACTED:secret:1]');
		expect(scrubSecretsInText('[REDACTED:password:2]')).toBe('[REDACTED:password:2]');
		const out = scrubSecretsInText('button "Copy [REDACTED:secret:1]" and [REDACTED:secret:2]');
		expect(out).not.toContain('[REDACTED:[REDACTED');
		expect(out).toContain('[REDACTED:secret:1]');
		expect(out).toContain('[REDACTED:secret:2]');
	});

	it('leaves typed redaction markers untouched inside serialized JSON/JS fields', () => {
		const json = '{"password":"[REDACTED:secret:1]","apiKey":"[REDACTED:anthropic_api_key:2]"}';
		expect(scrubSecretsInText(json)).toBe(json);
		const js = "{'password': '[REDACTED:secret:1]'}";
		expect(scrubSecretsInText(js)).toBe(js);
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

	it('redacts a Telegram bot token, including inside a /bot… URL', () => {
		const url = join(
			'https://api.telegram.org/bot',
			'123456789:AAEabcDEFghiJKLmnoPQRstuVWX01234567/sendMessage',
		);
		expect(scrubSecretsInText(url)).toBe('https://api.telegram.org/[REDACTED]/sendMessage');
	});

	it('skips already-redacted generic assignments (idempotent, incl. URL-safe form)', () => {
		expect(scrubSecretsInText('api_key=[REDACTED] and password=[redacted]')).toBe(
			'api_key=[REDACTED] and password=[redacted]',
		);
		expect(scrubSecretsInText('?X-Amz-Credential=REDACTED&X-Amz-Signature=abc')).toBe(
			'?X-Amz-Credential=REDACTED&X-Amz-Signature=abc',
		);
	});
});
