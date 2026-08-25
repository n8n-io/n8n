import { SUPPORTED_PII_CATEGORIES } from './pii-patterns';
import { redactDeep, redactText } from './redact-text';

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

describe('redactDeep', () => {
	/** Nest `leaf` under `depth` levels of objects. */
	const nest = (depth: number, leaf: unknown): unknown =>
		depth === 0 ? leaf : { nested: nest(depth - 1, leaf) };

	it('redacts strings inside the depth bound', () => {
		const { value } = redactDeep(nest(7, { note: 'mail jane@example.com' }), {
			detect: SUPPORTED_PII_CATEGORIES,
		});

		expect(JSON.stringify(value)).not.toContain('jane@example.com');
	});

	it.each([true, false])(
		'withholds a subtree at the depth bound (redactSensitiveKeys: %s)',
		(redactSensitiveKeys) => {
			const { value, matches } = redactDeep(nest(8, { note: 'mail jane@example.com' }), {
				detect: SUPPORTED_PII_CATEGORIES,
				redactSensitiveKeys,
			});

			expect(JSON.stringify(value)).not.toContain('jane@example.com');
			expect(matches).toEqual([{ category: 'secret' }]);
		},
	);

	it('leaves primitives at the depth bound alone', () => {
		expect(redactDeep(nest(8, 42)).value).toEqual(nest(8, 42));
	});
});
