import { SUPPORTED_PII_CATEGORIES } from './pii-patterns';
import { redactText } from './redact-text';

describe('redactText', () => {
	it('redacts secrets and PII while keeping URL structure', () => {
		const { text } = redactText(
			'mail jane@example.com from https://api.example.com/v1/orders?token=abc123xyz',
			{ secrets: true, detect: SUPPORTED_PII_CATEGORIES, preserveUrlStructure: true },
		);

		expect(text).not.toContain('jane@example.com');
		expect(text).not.toContain('abc123xyz');
		expect(text).toContain('https://api.example.com/v1/orders');
	});

	it('leaves text with nothing sensitive untouched', () => {
		const input = 'I added an HTTP Request node and connected it to the Schedule Trigger.';

		expect(redactText(input, { detect: SUPPORTED_PII_CATEGORIES }).text).toBe(input);
	});

	describe('crypto-wallet detection without a synchronous SHA-256', () => {
		it('redacts a valid legacy address', () => {
			expect(
				redactText('to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', { detect: ['crypto-wallet'] }).text,
			).toBe('to [REDACTED]');
		});

		it('also redacts one whose checksum is broken', () => {
			// The browser table can only length-check Base58 payloads, so it redacts a
			// superset of what `@n8n/agents` does (which verifies the checksum and
			// leaves this string alone). Over-redacting an opaque blob is the safe
			// direction for an egress boundary.
			expect(
				redactText('addr 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb', { detect: ['crypto-wallet'] }).text,
			).toBe('addr [REDACTED]');
		});
	});
});
