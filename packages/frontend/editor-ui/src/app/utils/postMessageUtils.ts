import { useSettingsStore } from '@n8n/stores/settings.store';

/**
 * Whether a `postMessage` command from the given origin should be processed.
 *
 * When an allowlist is configured, only accept commands from those origins
 * (same-origin is always allowed). An empty allowlist keeps the historical
 * behavior of accepting messages from any origin, so existing embeds are
 * unaffected unless an operator opts in.
 */
export function isPostMessageOriginAllowed(origin: string) {
	const allowedOrigins = useSettingsStore().settings.security?.postMessageAllowedOrigins ?? [];
	if (allowedOrigins.length === 0) {
		return true;
	}
	return origin === window.location.origin || allowedOrigins.includes(origin);
}

/**
 * Whether a `postMessage` command may come from this source: the editor window
 * itself, or the page that embeds the editor. A frame inside the editor (such as
 * a side panel view), a frame that was removed, and other windows are not trusted.
 */
export function isTrustedCommandSource(
	source: MessageEventSource | null,
	self: Pick<Window, 'parent'> = window,
): boolean {
	if (source === null) return false;
	if (source === self) return true;
	return self.parent !== self && source === self.parent;
}
