import { formatPrivateKey } from '@/format-private-key';

describe('formatPrivateKey', () => {
	const body = 'MIIBVgIBADANBgkqhkiG9w0BAQEFAASCATgwggE0AgEAAk';

	it('returns an already-multiline PEM unchanged', () => {
		const pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
		expect(formatPrivateKey(pem)).toBe(pem);
	});

	it('restores escaped \\n sequences', () => {
		const escaped = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`;
		expect(formatPrivateKey(escaped)).toBe(
			`-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`,
		);
	});

	it('wraps a flattened single-line body onto 64-char lines', () => {
		const longBody = 'A'.repeat(150);
		const formatted = formatPrivateKey(
			`-----BEGIN PRIVATE KEY-----${longBody}-----END PRIVATE KEY-----`,
		);
		const lines = formatted.split('\n').slice(1, -1);
		expect(lines.every((line) => line.length <= 64)).toBe(true);
		expect(lines.join('')).toBe(longBody);
	});

	it('formats a flattened CERTIFICATE PEM (not just private keys)', () => {
		const formatted = formatPrivateKey(
			`-----BEGIN CERTIFICATE-----${body}-----END CERTIFICATE-----`,
		);
		expect(formatted).toBe(`-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`);
	});

	it('honors the public-key label', () => {
		const pem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
		expect(formatPrivateKey(pem, true)).toBe(pem);
	});

	it('returns falsy input as-is', () => {
		expect(formatPrivateKey('')).toBe('');
	});
});
