const PEM_BODY_LINE_LENGTH = 64;

/** A single `Proc-Type:`/`DEK-Info:` header of a legacy encrypted PEM key; its value never contains whitespace. */
const ENCRYPTION_HEADER = /^(Proc-Type|DEK-Info):[^\S\n]*(\S+)\s*/;

/**
 * Split the leading `Proc-Type:`/`DEK-Info:` headers of a legacy encrypted key off
 * the body, so the mandatory blank line between them can be restored. Collapsing
 * whitespace across both at once would drop that separator and leave a PEM that
 * OpenSSL 3 has no decoder for.
 */
function splitEncryptionHeaders(body: string) {
	const headers: string[] = [];
	let rest = body;

	for (let match = ENCRYPTION_HEADER.exec(rest); match; match = ENCRYPTION_HEADER.exec(rest)) {
		headers.push(`${match[1]}: ${match[2]}`);
		rest = rest.slice(match[0].length);
	}

	return { headers, rest };
}

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
	const { headers, rest } = splitEncryptionHeaders(normalizedBody);
	const formattedBody = /\s/.test(rest)
		? rest.replace(/\s+/g, '\n')
		: (rest.match(new RegExp(`.{1,${PEM_BODY_LINE_LENGTH}}`, 'g')) ?? []).join('\n');
	// Headers and body are separated by a blank line, as RFC 1421 requires.
	const sections = [headers.join('\n'), formattedBody].filter((section) => section !== '');

	return `-----BEGIN ${label}-----\n${sections.join('\n\n')}\n-----END ${label}-----`;
}

/**
 * Normalize a single PEM-encoded block (private key, public key, or certificate)
 * by collapsing whitespace and wrapping the body at 64 chars. Multi-block PEM
 * chains are returned unchanged.
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
	if (!pem || /\n/.test(pem)) {
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
