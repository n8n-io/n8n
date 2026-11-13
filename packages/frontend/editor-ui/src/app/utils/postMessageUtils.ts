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

function hasParent(value: unknown): value is Pick<Window, 'parent'> {
	return typeof value === 'object' && value !== null && 'parent' in value;
}

/** The most frame levels to walk up. Real pages nest a few at most. */
const MAX_FRAME_DEPTH = 32;

/**
 * Whether a message comes from a frame inside this window, such as a side panel
 * view. Commands come from the page that embeds the editor, or from the editor
 * itself, never from a frame that the editor holds.
 */
export function isMessageFromChildFrame(source: MessageEventSource | null) {
	if (!hasParent(source) || source === window) return false;

	const ownFrames = new Set<unknown>(
		Array.from(document.querySelectorAll('iframe'), (frame) => frame.contentWindow),
	);

	try {
		let current: Pick<Window, 'parent'> = source;
		for (let depth = 0; depth < MAX_FRAME_DEPTH; depth++) {
			if (ownFrames.has(current)) return true;
			const parent = current.parent;
			if (parent === window) return true;
			if (!parent || parent === current) return false;
			current = parent;
		}
	} catch {
		// A window that can't be inspected is not trusted.
		return true;
	}
	return true;
}
