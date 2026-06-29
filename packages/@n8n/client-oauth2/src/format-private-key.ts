// NOTE: Copied verbatim from `n8n-nodes-base` (utils/utilities.ts). It can't be
// imported from there because nodes-base already depends on this package, so a
// reverse dependency would be a cycle. De-duplicating both copies into a shared
// low-level package is tracked in ENT-114.

const PEM_BODY_LINE_LENGTH = 64;

function formatCompactPem(privateKey: string, keyIsPublic: boolean): string | undefined {
	const trimmed = privateKey.trim();
	if ((trimmed.match(/-----BEGIN /g) ?? []).length !== 1) return undefined;

	const labelPattern = keyIsPublic ? '[A-Z0-9 ]*PUBLIC KEY' : '[A-Z0-9 ]*PRIVATE KEY|CERTIFICATE';
	const pemMatch = trimmed.match(
		new RegExp(`^-----BEGIN (${labelPattern})-----([\\s\\S]*?)-----END \\1-----$`),
	);

	if (!pemMatch) return undefined;

	const [, label, body] = pemMatch;
	const normalizedBody = body.replace(/\\n/g, '\n').trim();
	const formattedBody = /\s/.test(normalizedBody)
		? normalizedBody.replace(/:\s+/g, ':').replace(/\s+/g, '\n')
		: (normalizedBody.match(new RegExp(`.{1,${PEM_BODY_LINE_LENGTH}}`, 'g')) ?? []).join('\n');

	return `-----BEGIN ${label}-----\n${formattedBody}\n-----END ${label}-----`;
}

/**
 * Formats a private key by removing unnecessary whitespace and adding line breaks.
 * @param privateKey - The private key to format.
 * @returns The formatted private key.
 */
export function formatPrivateKey(privateKey: string, keyIsPublic = false): string {
	let regex = /(PRIVATE KEY|CERTIFICATE)/;
	if (keyIsPublic) {
		regex = /(PUBLIC KEY)/;
	}
	if (!privateKey || /\n/.test(privateKey)) {
		return privateKey;
	}
	const compactPem = formatCompactPem(privateKey, keyIsPublic);
	if (compactPem !== undefined) {
		return compactPem;
	}

	let formattedPrivateKey = '';
	const parts = privateKey.split('-----').filter((item) => item !== '');
	parts.forEach((part) => {
		if (regex.test(part)) {
			formattedPrivateKey += `-----${part}-----`;
		} else {
			const passRegex = /Proc-Type|DEK-Info/;
			if (passRegex.test(part)) {
				part = part.replace(/:\s+/g, ':');
				formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			} else {
				formattedPrivateKey += part.replace(/\\n/g, '\n').replace(/\s+/g, '\n');
			}
		}
	});
	return formattedPrivateKey;
}
