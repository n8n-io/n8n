import { join } from 'node:path';

const N8N_PRODUCT_URL = 'https://n8n.io/';

function readN8nVersion(): string {
	try {
		// require self-caches, so repeated calls are cheap
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const pkg = require(join(__dirname, '../../../../package.json')) as { version: string };
		return pkg.version;
	} catch {
		return '0.0.0';
	}
}

/**
 * Builds the default User-Agent for n8n-initiated HTTP requests when none is set.
 * Uses a conventional browser-style token so strict WAFs accept the value.
 *
 * @see https://github.com/n8n-io/n8n/issues/28280
 */
export function buildDefaultN8nOutboundUserAgent(version: string): string {
	return `Mozilla/5.0 (compatible; n8n/${version}; +${N8N_PRODUCT_URL})`;
}

/**
 * Default User-Agent for n8n outbound HTTP requests (e.g. native integration nodes).
 */
export function getDefaultN8nOutboundUserAgent(): string {
	return buildDefaultN8nOutboundUserAgent(readN8nVersion());
}
