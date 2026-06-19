import { Guardrail } from '../guardrail';
import { passesLuhn } from '../guardrails/patterns';
import { redactText, redactionOptionsFromGuardrail } from '../guardrails/redactor';
import { StreamingRedactor } from '../guardrails/streaming-redactor';

// A Luhn-valid test card number (Visa test PAN).
const VALID_CARD = '4111111111111111';
// Same length, not Luhn-valid.
const INVALID_CARD = '4111111111111112';

describe('redactText', () => {
	describe('secrets', () => {
		it('redacts an Anthropic-style key', () => {
			const { text, matches } = redactText('use sk-ant-api03-aaaaaaaaaaaaaaaa now');
			expect(text).toBe('use [REDACTED] now');
			expect(matches).toEqual([{ category: 'secret' }]);
		});

		it('redacts a bearer token', () => {
			const { text } = redactText('Authorization: Bearer abc.def-ghi_jkl/mno=');
			expect(text).toContain('[REDACTED]');
			expect(text).not.toContain('abc.def');
		});

		it('leaves non-sensitive prose untouched', () => {
			const input = 'The workflow ran successfully and produced 42 items.';
			const { text, matches } = redactText(input);
			expect(text).toBe(input);
			expect(matches).toEqual([]);
		});

		it('is idempotent', () => {
			const once = redactText('key sk-ant-api03-aaaaaaaaaaaaaaaa').text;
			const twice = redactText(once).text;
			expect(twice).toBe(once);
		});

		it('can be disabled', () => {
			const input = 'key sk-ant-api03-aaaaaaaaaaaaaaaa';
			const { text } = redactText(input, { secrets: false });
			expect(text).toBe(input);
		});

		it('uses a custom placeholder', () => {
			const { text } = redactText('key sk-ant-api03-aaaaaaaaaaaaaaaa', { placeholder: '###' });
			expect(text).toBe('key ###');
		});
	});

	describe('PII', () => {
		it('does not scan PII unless requested', () => {
			const input = 'reach me at jane@example.com';
			expect(redactText(input).text).toBe(input);
		});

		it('redacts an email when detect includes email', () => {
			const { text, matches } = redactText('reach me at jane@example.com', {
				detect: ['email'],
			});
			expect(text).toBe('reach me at [REDACTED]');
			expect(matches).toEqual([{ category: 'email' }]);
		});

		it('redacts a Luhn-valid credit card', () => {
			const { text, matches } = redactText(`card ${VALID_CARD}`, { detect: ['credit-card'] });
			expect(text).toBe('card [REDACTED]');
			expect(matches).toEqual([{ category: 'credit-card' }]);
		});

		it('does not redact a Luhn-invalid number', () => {
			const input = `card ${INVALID_CARD}`;
			const { text, matches } = redactText(input, { detect: ['credit-card'] });
			expect(text).toBe(input);
			expect(matches).toEqual([]);
		});

		it('redacts a US SSN', () => {
			const { text } = redactText('ssn 123-45-6789', { detect: ['ssn-us'] });
			expect(text).toBe('ssn [REDACTED]');
		});

		it('redacts E.164 phone numbers, compact and formatted', () => {
			const { text, matches } = redactText('intl +15551234567', { detect: ['phone'] });
			expect(text).toBe('intl [REDACTED]');
			expect(matches).toEqual([{ category: 'phone' }]);
			expect(redactText('call +1 (555) 123-4567', { detect: ['phone'] }).text).toBe(
				'call [REDACTED]',
			);
		});

		it('does not redact non-E.164 numbers (no leading +) or dates/IDs', () => {
			// NANP without a leading + is intentionally not E.164.
			const input = 'call 555-123-4567 on 2024-01-15 ticket 12345';
			expect(redactText(input, { detect: ['phone'] }).text).toBe(input);
		});

		it('redacts a checksum-valid IBAN (spaced or compact) but not an invalid one', () => {
			expect(redactText('pay GB82 WEST 1234 5698 7654 32 today', { detect: ['iban'] }).text).toBe(
				'pay [REDACTED] today',
			);
			// Lower/mixed-case compact IBANs must still be located and redacted.
			expect(redactText('pay gb82west12345698765432 today', { detect: ['iban'] }).text).toBe(
				'pay [REDACTED] today',
			);
			expect(redactText('pay Gb82WEST12345698765432 today', { detect: ['iban'] }).text).toBe(
				'pay [REDACTED] today',
			);
			const invalid = 'iban GB99WEST12345698765432';
			expect(redactText(invalid, { detect: ['iban'] }).text).toBe(invalid);
		});

		it('redacts crypto wallet addresses (ETH, BTC bech32, BTC base58)', () => {
			expect(
				redactText('to 0x52908400098527886E0F7030069857D2E4169EE7', {
					detect: ['crypto-wallet'],
				}).text,
			).toBe('to [REDACTED]');
			expect(
				redactText('to bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', { detect: ['crypto-wallet'] })
					.text,
			).toBe('to [REDACTED]');
			expect(
				redactText('to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', { detect: ['crypto-wallet'] }).text,
			).toBe('to [REDACTED]');
		});

		it('does not redact a base58 string with a broken checksum', () => {
			const input = 'addr 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb';
			expect(redactText(input, { detect: ['crypto-wallet'] }).text).toBe(input);
		});

		it('redacts IPv4 and IPv6 addresses but not out-of-range octets', () => {
			expect(redactText('host 192.168.0.1 and 2001:db8::1', { detect: ['ip'] }).text).toBe(
				'host [REDACTED] and [REDACTED]',
			);
			const invalid = 'ver 999.888.777.666';
			expect(redactText(invalid, { detect: ['ip'] }).text).toBe(invalid);
		});

		it('redacts a MAC address', () => {
			const { text, matches } = redactText('mac 01:23:45:67:89:AB', { detect: ['mac'] });
			expect(text).toBe('mac [REDACTED]');
			expect(matches).toEqual([{ category: 'mac' }]);
		});

		it('redacts a full URL', () => {
			expect(
				redactText('see https://internal.example.com/admin?token=abc123 ok', { detect: ['url'] })
					.text,
			).toBe('see [REDACTED] ok');
		});
	});

	describe('redactionOptionsFromGuardrail', () => {
		it('maps a pii guardrail to detect types without secrets', () => {
			const guardrail = new Guardrail('pii')
				.type('pii')
				.strategy('redact')
				.detect(['email', 'ssn-us'])
				.build();
			expect(redactionOptionsFromGuardrail(guardrail)).toEqual({
				secrets: false,
				detect: ['email', 'ssn-us'],
			});
		});
	});
});

describe('passesLuhn', () => {
	it('accepts a valid card with separators', () => {
		expect(passesLuhn('4111 1111 1111 1111')).toBe(true);
	});

	it('rejects too-short input', () => {
		expect(passesLuhn('411111')).toBe(false);
	});
});

describe('StreamingRedactor', () => {
	// Small holdback keeps the tests readable while exercising the same logic.
	const HOLDBACK = 8;

	it('redacts a secret split across two deltas', () => {
		const redactor = new StreamingRedactor({}, HOLDBACK);
		let out = '';
		out += redactor.push('here is sk-ant-').text;
		out += redactor.push('api03-aaaaaaaaaaaaaaaa done now').text;
		out += redactor.flush().text;
		expect(out).toBe('here is [REDACTED] done now');
		expect(out).not.toContain('sk-ant-');
	});

	it('redacts an email split across deltas', () => {
		const redactor = new StreamingRedactor({ detect: ['email'] }, HOLDBACK);
		let out = '';
		out += redactor.push('mail jane@').text;
		out += redactor.push('example.com bye').text;
		out += redactor.flush().text;
		expect(out).toBe('mail [REDACTED] bye');
	});

	it('redacts a spaced credit card that straddles the holdback boundary', () => {
		const redactor = new StreamingRedactor({ detect: ['credit-card'] }, HOLDBACK);
		let out = '';
		out += redactor.push('card 4111 1111 ').text;
		out += redactor.push('1111 1111 done here').text;
		out += redactor.flush().text;
		expect(out).toBe('card [REDACTED] done here');
		expect(out).not.toContain('4111');
	});

	it('passes through non-sensitive streamed prose intact', () => {
		const redactor = new StreamingRedactor({}, HOLDBACK);
		const parts = ['Hello ', 'there, ', 'this is ', 'all fine.'];
		let out = '';
		for (const part of parts) out += redactor.push(part).text;
		out += redactor.flush().text;
		expect(out).toBe('Hello there, this is all fine.');
	});

	it('emits nothing before the holdback fills and flushes the remainder', () => {
		const redactor = new StreamingRedactor({}, HOLDBACK);
		expect(redactor.push('short').text).toBe('');
		expect(redactor.flush().text).toBe('short');
	});

	it('reports one match for a secret across the whole stream', () => {
		const redactor = new StreamingRedactor({}, HOLDBACK);
		const matches = [
			...redactor.push('token sk-ant-').matches,
			...redactor.push('api03-aaaaaaaaaaaaaaaa end').matches,
			...redactor.flush().matches,
		];
		expect(matches).toEqual([{ category: 'secret' }]);
	});
});
