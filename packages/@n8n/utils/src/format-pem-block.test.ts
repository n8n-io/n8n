import { createPrivateKey, generateKeyPairSync } from 'node:crypto';
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

	it('should return non-PEM input unchanged', () => {
		expect(formatPemBlock('my secret key')).toBe('my secret key');
		expect(formatPemBlock('pass\\nphrase')).toBe('pass\\nphrase');
		expect(formatPemBlock('-----END CERTIFICATE-----')).toBe('-----END CERTIFICATE-----');
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

	it('should restore RFC 1421 headers in legacy encrypted RSA PEM keys', () => {
		// What the SSL Certificates credential stores after a multi-line legacy
		// encrypted RSA key is pasted into the single-line "Private Key" input:
		// newlines are collapsed to spaces, so the blank line separating the
		// Proc-Type/DEK-Info headers from the body becomes two consecutive spaces.
		const flattened =
			'-----BEGIN RSA PRIVATE KEY----- ' +
			'Proc-Type: 4,ENCRYPTED ' +
			'DEK-Info: AES-256-CBC,A4F349D0CD99508CA625518C9D671B68  ' + // double space = blank line
			'Pr9ZjzHxUr4HuhWspQ1vQHIgriYbTzbLdbXoWH/n6ABBRTocD3WO5/JFf83jZJzo ' +
			'yGnbXk6DK1JScbTHPYT6IuBqfDpQGB8FfFCZuANLwYtBZTFqVKdrsEHwZzGb0hSK ' +
			'-----END RSA PRIVATE KEY-----';

		// OpenSSL 3 needs the blank line after the headers to pick a decoder for the
		// block, and ssh2 needs the space after each header colon to read the cipher
		// name; either one missing fails before the passphrase is ever consulted.
		expect(formatPemBlock(flattened)).toBe(`-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,A4F349D0CD99508CA625518C9D671B68

Pr9ZjzHxUr4HuhWspQ1vQHIgriYbTzbLdbXoWH/n6ABBRTocD3WO5/JFf83jZJzo
yGnbXk6DK1JScbTHPYT6IuBqfDpQGB8FfFCZuANLwYtBZTFqVKdrsEHwZzGb0hSK
-----END RSA PRIVATE KEY-----`);
	});

	it('should keep a flattened legacy encrypted RSA key loadable by OpenSSL', () => {
		const passphrase = 'passphrase';
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
			privateKeyEncoding: { type: 'pkcs1', format: 'pem', cipher: 'aes-256-cbc', passphrase },
		});
		const flattened = privateKey.trim().replace(/\n/g, ' ');
		const formatted = formatPemBlock(flattened);

		expect(() => createPrivateKey({ key: formatted, passphrase })).not.toThrow();
		// ssh2 is not a dependency here, so pin the header shape its parser relies on:
		// it slices the DEK-Info value past a fixed ": " offset.
		expect(formatted).toMatch(/\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-256-CBC,[0-9A-F]+\n\n/);
	});

	it('should collapse Proc-Type/DEK-Info headers on the fallback path', () => {
		// Mismatched labels force the fallback formatter, where a body chunk carrying
		// the encrypted-key headers exercises the Proc-Type/DEK-Info branch.
		const encrypted = `-----BEGIN RSA PRIVATE KEY-----Proc-Type: 4,ENCRYPTED ${'A'.repeat(20)}-----END EC PRIVATE KEY-----`;

		expect(formatPemBlock(encrypted)).toContain('Proc-Type:4,ENCRYPTED');
	});
});
