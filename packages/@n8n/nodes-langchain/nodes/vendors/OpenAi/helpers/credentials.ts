import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { assertCredentialAllowsUrl } from 'n8n-workflow';

/** Mirrors the fallback every OpenAI call site applies when the credential has no URL. */
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * Enforces the credential's domain restrictions against a caller-supplied
 * OpenAI-compatible base URL, treating the credential's effective endpoint —
 * its own `url`, or the OpenAI default when that is unset — as the pinned URL
 * for `'none'` mode.
 *
 * @returns {string | undefined} the allowed-domains list for per-redirect-hop checks; `undefined` means allow-all
 * @throws {NodeOperationError} when the URL is outside the credential's allowed domains
 */
export function assertOpenAiCredentialAllowsUrl(
	node: INode,
	credentials: ICredentialDataDecryptedObject,
	url: string,
): string | undefined {
	const credentialUrl = typeof credentials.url === 'string' ? credentials.url : '';

	return assertCredentialAllowsUrl({
		node,
		credentialData: credentials,
		url,
		pinnedUrl: credentialUrl || DEFAULT_BASE_URL,
		surface: 'OpenAI',
	});
}
