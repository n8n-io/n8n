const PEM_BODY_LINE_LENGTH = 64;

function formatCompactPem(pem: string, isPublic: boolean): string | undefined {
	const trimmed = pem.trim();
	if ((trimmed.match(/-----BEGIN /g) ?? []).length !== 1) return undefined;

	const labelPattern = isPublic ? '[A-Z0-9 ]*PUBLIC KEY' : '[A-Z0-9 ]*PRIVATE KEY|CERTIFICATE';
	const pemMatch = trimmed.match(
		new RegExp(`^-----BEGIN (${labelPattern})-----([\\s\\S]*?)-----END \\1-----$`),
	);

	if (!pemMatch) return undefined;

	const [, label, body] = pemMatch;
	const normalizedBody = body.replace(/\\n/g, '\n').trim();
	const formattedBody = /\s/.test(normalizedBody)
		? normalizedBody
				.replace(/:\s+/g, ':')
				.replace(/\s+/g, '\n')
				// Restore RFC 1421 shape for a legacy encrypted key's headers. Both halves
				// are load-bearing: OpenSSL 3 matches no decoder without the blank line
				// before the body, and ssh2 reads the DEK-Info value at a fixed offset that
				// assumes a single space after the colon.
				.replace(
					/^(?:(?:Proc-Type|DEK-Info):\S+\n)+/,
					(headers) => `${headers.replace(/^(Proc-Type|DEK-Info):/gm, '$1: ')}\n`,
				)
		: (normalizedBody.match(new RegExp(`.{1,${PEM_BODY_LINE_LENGTH}}`, 'g')) ?? []).join('\n');

	return `-----BEGIN ${label}-----\n${formattedBody}\n-----END ${label}-----`;
}

/**
 * Normalize a single PEM-encoded block (private key, public key, or certificate)
 * by collapsing whitespace and wrapping the body at 64 chars. Multi-block PEM
 * chains are returned unchanged.
 *
 * Input that is not a single-line PEM block is returned unchanged, so a plain
 * secret (e.g. a key passphrase) passed here by mistake is not corrupted.
 *
 * @param pem - The PEM-encoded block to format.
 * @param isPublic - When true, match `PUBLIC KEY` labels instead of the default `PRIVATE KEY` / `CERTIFICATE`.
 * @returns The formatted PEM block.
 */
export function formatPemBlock(pem: string, isPublic = false): string {
	let regex = /(PRIVATE KEY|CERTIFICATE)/;
	if (isPublic) {
		regex = /(PUBLIC KEY)/;
	}
	// The fallback formatter below would collapse a non-PEM value's whitespace
	// into newlines, corrupting plain secrets such as key passphrases.
	if (!pem || /\n/.test(pem) || !pem.includes('-----BEGIN ')) {
		return pem;
	}
	const compactPem = formatCompactPem(pem, isPublic);
	if (compactPem !== undefined) {
		return compactPem;
	}

	let formattedPem = '';
	const parts = pem.split('-----').filter((item) => item !== '');
	parts.forEach((part) => {
		if (regex.test(part)) {
			formattedPem += `-----${part}-----`;
		} else {
			const passRegex = /Proc-Type|DEK-Info/;
			if (passRegex.test(part)) {
				part = part.replace(/:\s+/g, ':');
				formattedPem += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			} else {
				formattedPem += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			}
		}
	});
	return formattedPem;
}
