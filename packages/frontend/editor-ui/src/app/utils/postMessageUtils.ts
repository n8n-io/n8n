import { useSettingsStore } from '@n8n/stores/settings.store';

/**
 * Whether a `postMessage` command from the given origin should be processed.
 *
 * When an allowlist is configured, only accept commands from those origins
 * (same-origin is always allowed). An empty allowlist keeps the historical
 * behavior of accepting messages from any origin, so existing embeds are
 * unaffected unless an operator opts in.
 *
 * Commands from the opaque origin `'null'` of sandboxed frames are always
 * rejected, because that origin does not identify the sender.
 */
export function isPostMessageOriginAllowed(origin: string) {
	if (origin === 'null') {
		return false;
	}
	const allowedOrigins = useSettingsStore().settings.security?.postMessageAllowedOrigins ?? [];
	if (allowedOrigins.length === 0) {
		return true;
	}
	return origin === window.location.origin || allowedOrigins.includes(origin);
}
