import { WORKFLOW_PREVIEW_ORIGIN } from '../../../server/constants';

/**
 * URL schemes accepted for the workflow open-link action. Anything else
 * (`javascript:`, `data:`, `file:`, custom schemes, etc.) is rejected so a
 * compromised or buggy MCP host cannot trick the iframe into asking the host
 * to navigate to a dangerous URL.
 */
const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:']);
const DEFAULT_WORKFLOW_DEMO_URL = `${WORKFLOW_PREVIEW_ORIGIN}/workflows/demo?hideControls=true&canOpenNDV=false&canvasBackground=dots`;
type WorkflowPreviewTheme = 'light' | 'dark';
const WORKFLOW_DEMO_PATH_SUFFIX = '/workflows/demo';

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

export function isAllowedWorkflowDemoUrl(input: unknown, workflowUrl?: unknown): input is string {
	if (!isAllowedWorkflowUrl(input)) return false;

	const parsed = new URL(input);
	if (!parsed.pathname.endsWith(WORKFLOW_DEMO_PATH_SUFFIX)) return false;
	if (parsed.origin === WORKFLOW_PREVIEW_ORIGIN) return true;
	if (!isAllowedWorkflowUrl(workflowUrl)) return false;

	return parsed.origin === new URL(workflowUrl).origin;
}

export function resolveWorkflowDemoUrl({
	workflowUrl,
	previewUrl,
}: {
	workflowUrl: unknown;
	previewUrl?: unknown;
}): string | undefined {
	if (!isAllowedWorkflowUrl(workflowUrl)) return undefined;
	if (isAllowedWorkflowDemoUrl(previewUrl, workflowUrl)) return previewUrl;

	return DEFAULT_WORKFLOW_DEMO_URL;
}

export function applyWorkflowDemoTheme({
	previewUrl,
	workflowUrl,
	theme,
}: {
	previewUrl: string | undefined;
	workflowUrl?: string | undefined;
	theme: WorkflowPreviewTheme | undefined;
}): string | undefined {
	if (!isAllowedWorkflowDemoUrl(previewUrl, workflowUrl)) return undefined;

	const parsed = new URL(previewUrl);
	parsed.searchParams.set('canOpenNDV', 'false');
	parsed.searchParams.set('canvasBackground', 'dots');
	if (theme) {
		parsed.searchParams.set('theme', theme);
	} else {
		parsed.searchParams.delete('theme');
	}

	return parsed.toString();
}
