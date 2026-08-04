import { describe, expect, it } from 'vitest';

import { formatPemBlock } from './format-pem-block';

describe('formatPemBlock', () => {
	it('should format compact private PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(130)}-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPemBlock(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
${'A'.repeat(64)}
${'A'.repeat(2)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should format compact public PEM blocks with wrapped body lines', () => {
		const compactKey = `-----BEGIN PUBLIC KEY-----${'B'.repeat(66)}-----END PUBLIC KEY-----`;

		expect(formatPemBlock(compactKey, true)).toBe(`-----BEGIN PUBLIC KEY-----
${'B'.repeat(64)}
${'B'.repeat(2)}
-----END PUBLIC KEY-----`);
	});

	it('should keep multiline PEM blocks unchanged', () => {
		const multilineKey = `-----BEGIN OPENSSH PRIVATE KEY-----
ABC
-----END OPENSSH PRIVATE KEY-----`;

		expect(formatPemBlock(multilineKey)).toBe(multilineKey);
	});

	it('should return empty string for empty input', () => {
		expect(formatPemBlock('')).toBe('');
	});

	it('should format compact RSA PRIVATE KEY block', () => {
		const compactKey = `-----BEGIN RSA PRIVATE KEY-----${'C'.repeat(64)}-----END RSA PRIVATE KEY-----`;

		expect(formatPemBlock(compactKey)).toBe(`-----BEGIN RSA PRIVATE KEY-----
${'C'.repeat(64)}
-----END RSA PRIVATE KEY-----`);
	});

	it('should format compact EC PRIVATE KEY block', () => {
		const compactKey = `-----BEGIN EC PRIVATE KEY-----${'D'.repeat(70)}-----END EC PRIVATE KEY-----`;

		expect(formatPemBlock(compactKey)).toBe(`-----BEGIN EC PRIVATE KEY-----
${'D'.repeat(64)}
${'D'.repeat(6)}
-----END EC PRIVATE KEY-----`);
	});

	it('should format compact CERTIFICATE block (not just private keys)', () => {
		const compactCert = `-----BEGIN CERTIFICATE-----${'E'.repeat(128)}-----END CERTIFICATE-----`;

		expect(formatPemBlock(compactCert)).toBe(`-----BEGIN CERTIFICATE-----
${'E'.repeat(64)}
${'E'.repeat(64)}
-----END CERTIFICATE-----`);
	});

	it('should strip surrounding whitespace before formatting compact PEM', () => {
		const compactKey = `   -----BEGIN OPENSSH PRIVATE KEY-----${'A'.repeat(64)}-----END OPENSSH PRIVATE KEY-----   `;

		expect(formatPemBlock(compactKey)).toBe(`-----BEGIN OPENSSH PRIVATE KEY-----
${'A'.repeat(64)}
-----END OPENSSH PRIVATE KEY-----`);
	});

	it('should convert escaped \\n sequences in compact body to newlines', () => {
		const compactKey = `-----BEGIN PRIVATE KEY-----\\n${'F'.repeat(64)}\\n${'F'.repeat(32)}\\n-----END PRIVATE KEY-----`;

		expect(formatPemBlock(compactKey)).toBe(`-----BEGIN PRIVATE KEY-----
${'F'.repeat(64)}
${'F'.repeat(32)}
-----END PRIVATE KEY-----`);
	});

	it('should preserve a compact certificate chain unchanged (chain guard)', () => {
		const chain = `-----BEGIN CERTIFICATE-----${'A'.repeat(10)}-----END CERTIFICATE----------BEGIN CERTIFICATE-----${'B'.repeat(10)}-----END CERTIFICATE-----`;

		expect(formatPemBlock(chain)).toBe(chain);
	});

	it('should preserve multi-line certificate chain unchanged', () => {
		const chain = `-----BEGIN CERTIFICATE-----
AAA
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
BBB
-----END CERTIFICATE-----`;

		expect(formatPemBlock(chain)).toBe(chain);
	});

	it('should not match when BEGIN/END labels differ', () => {
		const mismatched = `-----BEGIN RSA PRIVATE KEY-----${'A'.repeat(64)}-----END EC PRIVATE KEY-----`;

		expect(formatPemBlock(mismatched)).toBe(mismatched);
	});

	it('should keep a multiline encrypted PEM with Proc-Type/DEK-Info unchanged', () => {
		const encrypted = `-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,1234567890ABCDEF

${'X'.repeat(64)}
-----END RSA PRIVATE KEY-----`;

		expect(formatPemBlock(encrypted)).toBe(encrypted);
	});

	it('should collapse Proc-Type/DEK-Info headers on the fallback path', () => {
		// Mismatched labels force the fallback formatter, where a body chunk carrying
		// the encrypted-key headers exercises the Proc-Type/DEK-Info branch.
		const encrypted = `-----BEGIN RSA PRIVATE KEY-----Proc-Type: 4,ENCRYPTED ${'A'.repeat(20)}-----END EC PRIVATE KEY-----`;

		expect(formatPemBlock(encrypted)).toContain('Proc-Type:4,ENCRYPTED');
	});
});
