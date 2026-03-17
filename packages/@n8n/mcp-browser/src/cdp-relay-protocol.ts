/**
 * Protocol types for communication between the CDP relay server and the Chrome extension.
 *
 * The relay server acts as a WebSocket bridge between Playwright (which speaks CDP)
 * and the Chrome extension (which uses chrome.debugger to forward CDP commands).
 */

/** Version of the extension protocol. Bump when commands/events change. */
export const PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Commands: relay → extension
// ---------------------------------------------------------------------------

export interface ExtensionCommands {
	attachToTab: {
		params: Record<string, never>;
	};
	forwardCDPCommand: {
		params: {
			method: string;
			sessionId?: string;
			params?: unknown;
		};
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
