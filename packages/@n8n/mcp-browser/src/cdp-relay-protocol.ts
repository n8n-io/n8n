/**
 * Protocol types for communication between the CDP relay server and the Chrome extension.
 *
 * The relay server acts as a WebSocket bridge between Playwright (which speaks CDP)
 * and the Chrome extension (which uses chrome.debugger to forward CDP commands).
 */

/** Version of the extension protocol. Bump when commands/events change. */
export const PROTOCOL_VERSION = 3;

// ---------------------------------------------------------------------------
// Commands: relay → extension
// ---------------------------------------------------------------------------

export interface ExtensionCommands {
	/** List all registered (user-selected) tabs without attaching debugger. */
	listRegisteredTabs: {
		params: Record<string, never>;
	};
	/** Forward a CDP command to a specific tab (or the first attached tab). */
	forwardCDPCommand: {
		params: {
			method: string;
			sessionId?: string;
			params?: unknown;
			/** Target tab for multi-tab routing. Omit to use first attached tab. */
			tabId?: number;
		};
	};
	/** Create a new tab and attach debugger to it. */
	createTab: {
		params: {
			url?: string;
		};
	};
	/** Close a shared tab (detach debugger + remove). */
	closeTab: {
		params: {
			tabId: number;
		};
	};
	/** List all currently controlled tabs. */
	listTabs: {
		params: Record<string, never>;
	};
}

// ---------------------------------------------------------------------------
// Events: extension → relay
// ---------------------------------------------------------------------------

export interface ExtensionEvents {
	forwardCDPEvent: {
		params: {
			method: string;
			sessionId?: string;
			params?: unknown;
			/** Tab that emitted this event. */
			tabId?: number;
		};
	};
	/** A new tab was opened and auto-attached. */
	tabOpened: {
		params: {
			tabId: number;
			title: string;
			url: string;
		};
	};
	/** A tab was closed. */
	tabClosed: {
		params: {
			tabId: number;
		};
	};
}

// ---------------------------------------------------------------------------
// Wire format
// ---------------------------------------------------------------------------

export interface ExtensionRequest {
	id: number;
	method: string;
	params?: unknown;
}

export interface ExtensionResponse {
	id?: number;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: string;
}

export interface CDPCommand {
	id: number;
	sessionId?: string;
	method: string;
	params?: unknown;
}

export interface CDPResponse {
	id?: number;
	sessionId?: string;
	method?: string;
	params?: unknown;
	result?: unknown;
	error?: { code?: number; message: string };
}
