/**
 * Protocol types for communication between the CDP relay server and the Chrome extension.
 *
 * All tab identifiers use CDP Target.targetId strings resolved by the extension
 * via chrome.debugger + Target.getTargetInfo (e.g. "B4FE7A8D1C3E…").
 * The extension is the only component that maps these to Chrome internals.
 */

/** Version of the extension protocol. Bump when commands/events change. */
export const PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Commands: relay → extension
// ---------------------------------------------------------------------------

export interface ExtensionCommands {
	/** List all registered (user-selected) tabs. */
	listRegisteredTabs: {
		params: Record<string, never>;
	};
	/** Forward a CDP command to a specific tab. */
	forwardCDPCommand: {
		params: {
			method: string;
			params?: unknown;
			/** Target tab ID. Omit to use the primary tab. */
			id?: string;
		};
	};
	/** Create a new tab and attach debugger to it. */
	createTab: {
		params: {
			url?: string;
		};
	};
	/** Close a tab (detach debugger + remove). */
	closeTab: {
		params: {
			id: string;
		};
	};
	/** Attach the debugger to a tab (lazy, on first interaction). */
	attachTab: {
		params: {
			id: string;
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
	/** A CDP event forwarded from a tab. */
	forwardCDPEvent: {
		params: {
			method: string;
			params?: unknown;
			/** Tab that emitted this event. */
			id?: string;
		};
	};
	/** A new tab was opened. */
	tabOpened: {
		params: {
			id: string;
			title: string;
			url: string;
		};
	};
	/** A tab was closed. */
	tabClosed: {
		params: {
			id: string;
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
