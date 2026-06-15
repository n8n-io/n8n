import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const ALLOWED_OAUTH_URL_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates that a URL is valid and uses an allowed protocol (http or https).
 * Used for OAuth authorization, token, and server URLs to prevent javascript: and other non-http(s) schemes.
 *
 * @param url - The URL string to validate
 * @throws BadRequestError if the URL is invalid or uses a disallowed protocol
 */
export function validateOAuthUrl(url: string): void {
	const trimmed = url?.trim();
	if (!trimmed) return;

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new BadRequestError('OAuth url is not a valid URL.');
	}

	if (!ALLOWED_OAUTH_URL_PROTOCOLS.includes(parsed.protocol)) {
		throw new BadRequestError(
			`OAuth url must use HTTP or HTTPS protocol. Invalid protocol: ${parsed.protocol}`,
		);
	}
}
