// ---------------------------------------------------------------------------
// Stable extension ID derived from the "key" field in mcp-browser-extension/manifest.json.
// This ensures the same ID whether loaded unpacked or installed from the Chrome Web Store.
// ---------------------------------------------------------------------------

export const BROWSER_USE_EXTENSION_ID = 'cegmdpndekdfpnafgacidejijecomlhh';

export function buildExtensionConnectUrl(
	relayEndpoint: string,
	options?: { autoConnect?: boolean },
): string {
	return (
		`chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html` +
		`?mcpRelayUrl=${encodeURIComponent(relayEndpoint)}` +
		(options?.autoConnect ? '&autoConnect=1' : '')
	);
}
