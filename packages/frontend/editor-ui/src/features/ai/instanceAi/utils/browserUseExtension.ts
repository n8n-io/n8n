import { BROWSER_USE_EXTENSION_ID } from '../constants';

const EXTENSION_CONNECT_PAGE_URL = `chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html`;

const PROBEABLE_LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const PROBEABLE_CLOUD_HOST = /\.(stage-)?app\.n8n\.cloud$/;

export type BrowserUseExtensionState = 'installed' | 'not-installed' | 'unknown';

/**
 * Mirrors `web_accessible_resources.matches` in the extension manifest, and must stay a
 * subset of it: probing an origin the manifest does not cover reports a confident
 * "not installed" to users who do have the extension.
 */
function isProbeableOrigin(): boolean {
	const { hostname, protocol } = window.location;
	if (protocol !== 'http:' && protocol !== 'https:') return false;
	if (PROBEABLE_LOCAL_HOSTS.includes(hostname)) return true;
	return protocol === 'https:' && PROBEABLE_CLOUD_HOST.test(hostname);
}

/**
 * Uncovered origins report `unknown` rather than being probed, so the flow stays available
 * where detection is impossible. A rejection reports `not-installed`, which is not airtight:
 * a disabled extension or a restrictive `Content-Security-Policy` also reject.
 */
export async function detectBrowserUseExtension(): Promise<BrowserUseExtensionState> {
	if (!isProbeableOrigin()) return 'unknown';

	try {
		const response = await fetch(EXTENSION_CONNECT_PAGE_URL, { method: 'HEAD' });
		return response.ok ? 'installed' : 'unknown';
	} catch {
		return 'not-installed';
	}
}
