import type { BrowserUseState } from '@n8n/instance-ai';

/**
 * `reportedByClient` is whether the client renders the Browser Use + menu entry.
 * Only the client can see its own device, so it decides whether the prompt may
 * offer the entry — but it is client input, so it may only narrow: the channel
 * is still checked against the admin switch here.
 *
 * It does not decide whether the browser is *connected*. Tool registration
 * follows the MCP server, so a live session the client cannot render still has
 * callable tools, and the prompt must describe them. The report governs the
 * connect-me prose, nothing more.
 */
export function resolveBrowserUseState({
	reportedByClient,
	browserUseEnabledGlobally,
	browserConnected,
}: {
	reportedByClient: boolean;
	browserUseEnabledGlobally: boolean;
	browserConnected: boolean;
}): BrowserUseState {
	if (browserConnected) return { status: 'connected' };
	if (!browserUseEnabledGlobally || !reportedByClient) return { status: 'unavailable' };
	return { status: 'disconnected' };
}
