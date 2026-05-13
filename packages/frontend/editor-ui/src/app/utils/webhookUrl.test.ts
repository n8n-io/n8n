import { describe, expect, it } from 'vitest';

import { extractWebhookId } from './webhookUrl';

describe('extractWebhookId', () => {
	const PREFIXES = [
		'http://localhost:5678/webhook',
		'http://localhost:5678/webhook-test',
		'http://localhost:5678/webhook-waiting',
		'http://localhost:5678/form',
		'http://localhost:5678/form-test',
		'http://localhost:5678/form-waiting',
		'http://localhost:5678/mcp',
		'http://localhost:5678/mcp-test',
	];

	it('strips the production webhook prefix from a full URL', () => {
		expect(
			extractWebhookId(
				'http://localhost:5678/webhook/16f540f0-a771-4840-bb6c-3e3ee5b8a5bd',
				PREFIXES,
			),
		).toBe('16f540f0-a771-4840-bb6c-3e3ee5b8a5bd');
	});

	it('preserves slashes in webhook paths', () => {
		// Webhook paths can themselves contain `/` — `foo/bar` is a valid path.
		expect(extractWebhookId('http://localhost:5678/webhook/foo/bar', PREFIXES)).toBe('foo/bar');
	});

	it('strips query strings', () => {
		expect(extractWebhookId('http://localhost:5678/webhook/foo?bar=1', PREFIXES)).toBe('foo');
	});

	it('strips hash fragments', () => {
		expect(extractWebhookId('http://localhost:5678/webhook/foo#section', PREFIXES)).toBe('foo');
	});

	it('strips form, test, and waiting prefixes', () => {
		expect(extractWebhookId('http://localhost:5678/form/abc', PREFIXES)).toBe('abc');
		expect(extractWebhookId('http://localhost:5678/webhook-test/abc', PREFIXES)).toBe('abc');
		expect(extractWebhookId('http://localhost:5678/form-waiting/abc', PREFIXES)).toBe('abc');
		expect(extractWebhookId('http://localhost:5678/mcp/abc', PREFIXES)).toBe('abc');
	});

	it('returns a raw path unchanged when no prefix matches', () => {
		expect(extractWebhookId('foo/bar', PREFIXES)).toBe('foo/bar');
		expect(extractWebhookId('just-a-path', PREFIXES)).toBe('just-a-path');
	});

	it('returns a URL unchanged when no prefix matches (different host)', () => {
		expect(extractWebhookId('http://other-host/webhook/foo', PREFIXES)).toBe(
			'http://other-host/webhook/foo',
		);
	});

	it('does not falsely match similar-prefix paths', () => {
		// `webhook-other` shouldn't match the `webhook` prefix.
		expect(extractWebhookId('http://localhost:5678/webhook-other/foo', PREFIXES)).toBe(
			'http://localhost:5678/webhook-other/foo',
		);
	});

	it('trims surrounding whitespace', () => {
		expect(extractWebhookId('   http://localhost:5678/webhook/foo/bar   ', PREFIXES)).toBe(
			'foo/bar',
		);
	});

	it('returns empty string for empty input', () => {
		expect(extractWebhookId('', PREFIXES)).toBe('');
		expect(extractWebhookId('   ', PREFIXES)).toBe('');
	});

	it('handles trailing slashes in input', () => {
		// `/webhook/foo/` — trailing slash should be preserved as part of the path.
		expect(extractWebhookId('http://localhost:5678/webhook/foo/', PREFIXES)).toBe('foo/');
	});

	it('handles a path that exactly matches the prefix (no remainder)', () => {
		// `/webhook` alone, no trailing path. Doesn't match `webhook/` prefix,
		// so it's returned unchanged.
		expect(extractWebhookId('http://localhost:5678/webhook', PREFIXES)).toBe(
			'http://localhost:5678/webhook',
		);
	});

	it('uses the first matching prefix', () => {
		// If somehow two prefixes could both match (one being a prefix of another),
		// the first one in the list wins. With `webhook` before `webhook-test`,
		// `webhook-test` URLs do NOT match `webhook` because of the trailing `/`.
		expect(extractWebhookId('http://localhost:5678/webhook-test/abc', PREFIXES)).toBe('abc');
	});

	it('returns input unchanged when prefixes list is empty', () => {
		expect(extractWebhookId('http://localhost:5678/webhook/foo', [])).toBe(
			'http://localhost:5678/webhook/foo',
		);
	});
});
