/**
 * URL schemes accepted for the workflow open-link action. Anything else
 * (`javascript:`, `data:`, `file:`, custom schemes, etc.) is rejected so a
 * compromised or buggy MCP host cannot trick the iframe into asking the host
 * to navigate to a dangerous URL.
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:']);

/**
 * Defense-in-depth check for the workflow URL received from a tool result.
 * The URL ultimately ends up in `app.openLink({ url })`, which the host is
 * expected to validate as well — but the iframe should not blindly forward
 * arbitrary strings.
 *
 * Returns `true` when the value parses as a `http(s)` URL with a non-empty
 * host. We deliberately do not enforce a specific origin: the iframe has no
 * trusted source of the expected n8n instance URL.
 */
export function isAllowedWorkflowUrl(input: unknown): input is string {
	if (typeof input !== 'string' || input.length === 0) return false;

	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		return false;
	}

	return ALLOWED_URL_SCHEMES.has(parsed.protocol) && parsed.hostname.length > 0;
}
