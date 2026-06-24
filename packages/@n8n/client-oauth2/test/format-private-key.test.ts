import { formatPrivateKey } from '@/format-private-key';

describe('formatPrivateKey', () => {
	it('should format compact private PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(130)}-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
${'A'.repeat(64)}
${'A'.repeat(2)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should format compact public PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN PUBLIC KEY-----${'B'.repeat(66)}-----END PUBLIC KEY-----`;

		expect(formatPrivateKey(compactKey, true)).toBe(`-----BEGIN PUBLIC KEY-----
${'B'.repeat(64)}
${'B'.repeat(2)}
-----END PUBLIC KEY-----`);
	});

	it('should keep multiline PEM blocks unchanged', () => {
		const multilineKey = `-----BEGIN OPENSSH PRIVATE KEY-----
ABC
-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPrivateKey(multilineKey)).toBe(multilineKey);
	});

	it('should return empty string for empty input', () => {
		expect(formatPrivateKey('')).toBe('');
	});

	it('should format compact RSA PRIVATE KEY block', () => {
		const compactKey = `-----BEGIN RSA PRIVATE KEY-----${'C'.repeat(64)}-----END RSA PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN RSA PRIVATE KEY-----
${'C'.repeat(64)}
-----END RSA PRIVATE KEY-----`);
	});

	it('should format compact CERTIFICATE block (not just private keys)', () => {
		const compactCert = `-----BEGIN CERTIFICATE-----${'E'.repeat(128)}-----END CERTIFICATE-----`;

		expect(formatPrivateKey(compactCert)).toBe(`-----BEGIN CERTIFICATE-----
${'E'.repeat(64)}
${'E'.repeat(64)}
-----END CERTIFICATE-----`);
	});

	it('should strip surrounding whitespace before formatting compact PEM', () => {
		const compactKey = `   -----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(64)}-----END OPENSSH PRIVATE KEY-----   `;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should convert escaped \\n sequences in compact body to newlines', () => {
		const compactKey = `-----BEGIN PRIVATE KEY-----\\n${'F'.repeat(64)}\\n${'F'.repeat(32)}\\n-----END PRIVATE KEY-----`;

		expect(formatPrivateKey(compactKey)).toBe(`-----BEGIN PRIVATE KEY-----
${'F'.repeat(64)}
${'F'.repeat(32)}
-----END PRIVATE KEY-----`);
	});

	it('should preserve a compact certificate chain unchanged (chain guard)', () => {
		const chain = `-----BEGIN CERTIFICATE-----${'A'.repeat(10)}-----END CERTIFICATE----------BEGIN CERTIFICATE-----${'B'.repeat(10)}-----END CERTIFICATE-----`;

		expect(formatPrivateKey(chain)).toBe(chain);
	});

	it('should not match when BEGIN/END labels differ', () => {
		const mismatched = `-----BEGIN RSA PRIVATE KEY-----${'A'.repeat(64)}-----END EC PRIVATE KEY-----`;

		expect(formatPrivateKey(mismatched)).toBe(mismatched);
	});

	it('should collapse Proc-Type/DEK-Info headers on the fallback path', () => {
		// Mismatched labels force the fallback formatter, where a body chunk carrying
		// the encrypted-key headers exercises the Proc-Type/DEK-Info branch.
		const encrypted = `-----BEGIN RSA PRIVATE KEY-----Proc-Type: 4,ENCRYPTED ${'A'.repeat(20)}-----END EC PRIVATE KEY-----`;

		expect(formatPrivateKey(encrypted)).toContain('Proc-Type:4,ENCRYPTED');
	});
});
