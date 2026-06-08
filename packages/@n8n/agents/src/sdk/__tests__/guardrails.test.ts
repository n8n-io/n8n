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
