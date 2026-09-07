/**
 * Chromium refuses `chrome.debugger` access to a tab while any frame in it belongs
 * to a different extension, rechecked on every command, and never names the
 * culprit. Two sources because they cover different windows: `Page.*` events see
 * the URL while the frame is committing, `getAllFrames` sees it once committed.
 */

import { createLogger } from './logger';

const log = createLogger('foreign-frames');

const EXTENSION_SCHEME = 'chrome-extension://';

const DENIAL_MESSAGE =
	/Detached while handling command|Cannot access a chrome-extension|Cannot attach to this target/i;

function foreignExtensionId(url: string | undefined): string | undefined {
	if (!url?.startsWith(EXTENSION_SCHEME)) return undefined;
	// Sliced, not parsed: this runs on every forwarded CDP event, and slicing
	// allocates nothing until a chrome-extension:// URL actually shows up.
	const id = url.slice(EXTENSION_SCHEME.length).split('/', 1)[0];
	return id && id !== chrome.runtime.id ? id : undefined;
}

function frameNavigation(
	method: string,
	params?: object,
): { frameId: string; url: string } | undefined {
	if (method === 'Page.frameRequestedNavigation' || method === 'Page.frameStartedNavigating') {
		const p = params as { frameId?: string; url?: string } | undefined;
		return p?.frameId && p.url ? { frameId: p.frameId, url: p.url } : undefined;
	}
	if (method === 'Page.frameNavigated') {
		const frame = (params as { frame?: { id?: string; url?: string } } | undefined)?.frame;
		return frame?.id && frame.url ? { frameId: frame.id, url: frame.url } : undefined;
	}
	return undefined;
}

export class ForeignFrames {
	/** chromeTabId → frameId → owning extension id. */
	private readonly byTab = new Map<number, Map<string, string>>();

	/** Chrome refused because of the tab's frame tree. */
	static isDenial(error: unknown): error is Error {
		return error instanceof Error && DENIAL_MESSAGE.test(error.message);
	}

	/** Forgets frames that detach or navigate away, so a closed menu is not blamed later. */
	track(chromeTabId: number, method: string, params?: object): void {
		if (method === 'Page.frameDetached') {
			const frameId = (params as { frameId?: string } | undefined)?.frameId;
			if (frameId) this.byTab.get(chromeTabId)?.delete(frameId);
			return;
		}

		const nav = frameNavigation(method, params);
		if (!nav) return;

		const owner = foreignExtensionId(nav.url);
		if (!owner) {
			// about:blank is a step on the way to the real URL, not a navigation away
			// from it — dropping the frame here would lose the only record we get.
			if (nav.url !== 'about:blank') this.byTab.get(chromeTabId)?.delete(nav.frameId);
			return;
		}

		const frames = this.byTab.get(chromeTabId);
		if (frames) frames.set(nav.frameId, owner);
		else this.byTab.set(chromeTabId, new Map([[nav.frameId, owner]]));
		log.debug(`foreign extension frame in tab ${chromeTabId}:`, owner);
	}

	forget(chromeTabId: number): void {
		this.byTab.delete(chromeTabId);
	}

	clear(): void {
		this.byTab.clear();
	}

	/** Tracked frames first: the frame tree cannot read one that is still committing. */
	async owners(chromeTabId: number): Promise<string[]> {
		const tracked = this.byTab.get(chromeTabId);
		if (tracked?.size) return [...new Set(tracked.values())];

		try {
			const frames = await chrome.webNavigation.getAllFrames({ tabId: chromeTabId });
			const ids = (frames ?? []).map((frame) => foreignExtensionId(frame.url));
			return [...new Set(ids.filter((id): id is string => id !== undefined))];
		} catch (e) {
			log.debug('failed to enumerate frames:', e);
			return [];
		}
	}

	async describeDenial(chromeTabId: number, original: Error): Promise<Error> {
		const owners = await this.owners(chromeTabId);
		if (owners.length === 0) return original;

		return new Error(
			`Browser automation was blocked by another browser extension (${owners.join(', ')}): ${original.message}`,
		);
	}
}
