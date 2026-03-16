import { createPrivateKey, createPublicKey, X509Certificate } from 'crypto';

/**
 * Validates that a string is in PEM format with the expected type.
 * @param value - The string to validate
 * @param expectedType - The expected PEM type (e.g., 'PRIVATE KEY', 'CERTIFICATE')
 * @returns true if the string is in valid PEM format with the expected type
 */
export function isValidPemFormat(value: string, expectedType: string): boolean {
	const trimmed = value.trim();
	const beginMarker = `-----BEGIN ${expectedType}-----`;
	const endMarker = `-----END ${expectedType}-----`;
	return trimmed.startsWith(beginMarker) && trimmed.endsWith(endMarker);
}

/**
 * Validates that a private key and certificate are a matching pair.
 * @param privateKey - PEM formatted private key (plaintext)
 * @param certificate - PEM formatted certificate
 * @throws Error if validation fails (caller should convert to appropriate error type)
 */
export function validateKeyPair(privateKey: string, certificate: string): void {
	// Validate PEM format for private key
	if (!isValidPemFormat(privateKey, 'PRIVATE KEY')) {
		throw new Error(
			'Invalid private key format. Private key must be in PEM format (begin with -----BEGIN and end with -----END).',
		);
	}

	// Validate PEM format for certificate
	if (!isValidPemFormat(certificate, 'CERTIFICATE')) {
		throw new Error(
			'Invalid certificate format. Certificate must be in PEM format (begin with -----BEGIN and end with -----END).',
		);
	}

	try {
		// Parse the private key
		const privateKeyObj = createPrivateKey({
			key: privateKey,
			format: 'pem',
		});

		// Extract public key from private key
		const publicKeyFromPrivate = createPublicKey(privateKeyObj);

		// Validate and extract public key from certificate
		// Creating X509Certificate validates the certificate format
		new X509Certificate(certificate);
		const publicKeyFromCert = createPublicKey({
			key: certificate,
			format: 'pem',
		});

		// Compare the public keys - they should match if the private key and certificate are a pair
		// We compare the exported keys in PEM format
		const privateKeyPublicPem = publicKeyFromPrivate.export({ format: 'pem', type: 'spki' });
		const certPublicPem = publicKeyFromCert.export({ format: 'pem', type: 'spki' });

		if (privateKeyPublicPem !== certPublicPem) {
			throw new Error(
				'The provided private key and certificate do not match. They must be a valid key pair.',
			);
		}
	} catch (error) {
		// Re-throw as-is if it's already an Error with a message
		if (error instanceof Error) {
			throw error;
		}
		// Otherwise wrap in Error
		throw new Error(
			`Failed to validate key pair: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
