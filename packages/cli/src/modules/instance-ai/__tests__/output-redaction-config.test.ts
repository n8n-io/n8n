import type { InstanceAiConfig } from '@n8n/config';

import { resolveOutputRedaction } from '../output-redaction-config';

function config(overrides: Partial<InstanceAiConfig> = {}): InstanceAiConfig {
	return {
		outputRedactionEnabled: true,
		outputRedactionSecrets: true,
		outputRedactionPii: 'email,credit-card,ssn-us',
		outputRedactionPlaceholder: '[REDACTED]',
		...overrides,
	} as InstanceAiConfig;
}

describe('resolveOutputRedaction', () => {
	it('returns false when disabled', () => {
		expect(resolveOutputRedaction(config({ outputRedactionEnabled: false }))).toBe(false);
	});

	it('maps secrets, PII categories, and placeholder from config', () => {
		expect(resolveOutputRedaction(config())).toEqual({
			secrets: true,
			detect: ['email', 'credit-card', 'ssn-us'],
			placeholder: '[REDACTED]',
		});
	});

	it('trims and drops unknown PII categories', () => {
		expect(resolveOutputRedaction(config({ outputRedactionPii: 'email, bogus , ssn-us' }))).toEqual(
			{
				secrets: true,
				detect: ['email', 'ssn-us'],
				placeholder: '[REDACTED]',
			},
		);
	});

	it('drops unsupported categories (e.g. address, which has no detector)', () => {
		expect(
			resolveOutputRedaction(config({ outputRedactionPii: 'email,phone,address,ssn-us' })),
		).toMatchObject({ detect: ['email', 'phone', 'ssn-us'] });
	});

	it('honors the secrets toggle and an empty PII list', () => {
		expect(
			resolveOutputRedaction(config({ outputRedactionSecrets: false, outputRedactionPii: '' })),
		).toEqual({ secrets: false, detect: [], placeholder: '[REDACTED]' });
	});

	it('uses a custom placeholder', () => {
		expect(resolveOutputRedaction(config({ outputRedactionPlaceholder: '***' }))).toMatchObject({
			placeholder: '***',
		});
	});

	it('omits the placeholder when configured blank (engine default applies)', () => {
		expect(resolveOutputRedaction(config({ outputRedactionPlaceholder: '' }))).not.toHaveProperty(
			'placeholder',
		);
	});
});
