/**
 * URL schemes accepted for the workflow open-link action. Anything else
 * (`javascript:`, `data:`, `file:`, custom schemes, etc.) is rejected so a
 * compromised or buggy MCP host cannot trick the iframe into asking the host
 * to navigate to a dangerous URL.
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:']);
const DEFAULT_WORKFLOW_DEMO_URL =
	'https://n8n-preview-service.internal.n8n.cloud/workflows/demo?hideControls=true';

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

export function buildWorkflowDemoUrl(workflowUrl: string): string | undefined {
	if (!isAllowedWorkflowUrl(workflowUrl)) return undefined;

	const parsed = new URL(workflowUrl);
	const demoPath = parsed.pathname.replace(/\/workflow\/[^/]+\/?$/, '/workflows/demo');
	if (demoPath === parsed.pathname) return undefined;

	parsed.pathname = demoPath;
	parsed.search = '';
	parsed.searchParams.set('hideControls', 'true');
	parsed.hash = '';

	return parsed.toString();
}

export function isAllowedWorkflowDemoUrl(input: unknown): input is string {
	if (!isAllowedWorkflowUrl(input)) return false;

	const parsed = new URL(input);
	return parsed.pathname.endsWith('/workflows/demo');
}

export function resolveWorkflowDemoUrl({
	workflowUrl,
	previewUrl,
}: {
	workflowUrl: unknown;
	previewUrl?: unknown;
}): string | undefined {
	if (isAllowedWorkflowDemoUrl(previewUrl)) return previewUrl;
	if (!isAllowedWorkflowUrl(workflowUrl)) return undefined;
	return DEFAULT_WORKFLOW_DEMO_URL;
}
