import { normalizePem } from '../helpers';

describe('normalizePem', () => {
	describe('empty / falsy input', () => {
		it('should return empty string unchanged', () => {
			expect(normalizePem('')).toBe('');
		});
	});

	describe('already-normalised PEM (real newlines)', () => {
		it('should return a certificate that already has real newlines unchanged', () => {
			const pem =
				'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE-----';
			expect(normalizePem(pem)).toBe(pem);
		});

		it('should return a private key that already has real newlines unchanged', () => {
			const key =
				'-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA\n-----END PRIVATE KEY-----';
			expect(normalizePem(key)).toBe(key);
		});
	});

	describe('literal \\n escape sequences', () => {
		it('should convert literal \\n escapes to real newlines', () => {
			const input =
				'-----BEGIN CERTIFICATE-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\\n-----END CERTIFICATE-----';
			const expected =
				'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE-----';
			expect(normalizePem(input)).toBe(expected);
		});

		it('should convert literal \\n escapes in private keys', () => {
			const input =
				'-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA\\n-----END PRIVATE KEY-----';
			const expected =
				'-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA\n-----END PRIVATE KEY-----';
			expect(normalizePem(input)).toBe(expected);
		});
	});

	describe('space-separated PEM (pasted as single line)', () => {
		// n8n stores PEM data with spaces when the user pastes a cert as a
		// single line into the credential field, replacing all newlines with spaces.
		it('should reconstruct a certificate from space-separated format', () => {
			// A minimal but structurally valid space-separated PEM
			const b64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';
			const input = `-----BEGIN CERTIFICATE----- ${b64} -----END CERTIFICATE-----`;

			const result = normalizePem(input);

			expect(result).toMatch(/^-----BEGIN CERTIFICATE-----\n/);
			expect(result).toMatch(/\n-----END CERTIFICATE-----$/);
			// Base64 body must be present
			expect(result).toContain(b64);
			// The base64 body lines must not contain spaces
			const bodyLines = result.split('\n').slice(1, -1);
			for (const line of bodyLines) {
				expect(line).not.toContain(' ');
			}
		});

		it('should wrap base64 body at 64-character boundaries', () => {
			// 128 base64 chars → should wrap to two 64-char lines
			const b64 = 'A'.repeat(128);
			const input = `-----BEGIN CERTIFICATE----- ${b64} -----END CERTIFICATE-----`;

			const result = normalizePem(input);
			const lines = result.split('\n');

			// lines[0] = header, lines[1] = first 64 chars, lines[2] = next 64 chars, lines[3] = footer
			expect(lines[0]).toBe('-----BEGIN CERTIFICATE-----');
			expect(lines[1]).toBe('A'.repeat(64));
			expect(lines[2]).toBe('A'.repeat(64));
			expect(lines[3]).toBe('-----END CERTIFICATE-----');
		});

		it('should handle PRIVATE KEY header in space-separated format', () => {
			const b64 = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA';
			const input = `-----BEGIN PRIVATE KEY----- ${b64} -----END PRIVATE KEY-----`;

			const result = normalizePem(input);

			expect(result).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
			expect(result).toMatch(/\n-----END PRIVATE KEY-----$/);
		});

		it('should handle RSA PRIVATE KEY header in space-separated format', () => {
			const b64 = 'MIIEpAIBAAKCAQEA1234';
			const input = `-----BEGIN RSA PRIVATE KEY----- ${b64} -----END RSA PRIVATE KEY-----`;

			const result = normalizePem(input);

			expect(result).toMatch(/^-----BEGIN RSA PRIVATE KEY-----\n/);
			expect(result).toMatch(/\n-----END RSA PRIVATE KEY-----$/);
		});
	});

	describe('edge cases', () => {
		it('should return input unchanged when it is not a recognised PEM format', () => {
			const garbage = 'not a pem at all';
			expect(normalizePem(garbage)).toBe(garbage);
		});
	});
});
