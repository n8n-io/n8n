import type {
	BrowserAutomationIdea,
	BrowserRecording,
	BrowserRecordingAction,
	BrowserRecordingScreenshot,
} from '@n8n/api-types';

/**
 * Protocol types for communication between the CDP relay server and the Chrome extension.
 *
 * All tab identifiers use CDP Target.targetId strings resolved by the extension
 * via chrome.debugger + Target.getTargetInfo (e.g. "B4FE7A8D1C3E…").
 * The extension is the only component that maps these to Chrome internals.
 */

/** Version of the extension protocol. Bump when commands/events change. */
export const PROTOCOL_VERSION = 6;

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
	/** Report whether a submitted recording started an Instance AI conversation. */
	recordingResult: {
		params: {
			recordingId: string;
			accepted: boolean;
			threadUrl?: string;
		};
	};
	/** Start a semantic recording, as if the user had clicked Start Recording. */
	startRecording: {
		params: Record<string, never>;
	};
	/** Stop the active recording and submit it immediately, skipping the review step. */
	stopAndSubmitRecording: {
		params: Record<string, never>;
	};
	/** Discard the active recording without submitting it. */
	discardRecording: {
		params: Record<string, never>;
	};
	/** Deliver the automation ideas generated for the page the extension asked about. */
	recommendationsReady: {
		params: {
			ideas: BrowserAutomationIdea[];
		};
	};
	/** Report whether an accepted idea started an Instance AI conversation. */
	recommendationAcceptedResult: {
		params: {
			accepted: boolean;
			threadUrl?: string;
		};
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
	/** A tab was closed, or left our control. */
	tabClosed: {
		params: {
			id: string;
			/** Absent on extension builds older than this field. */
			reason?: 'blocked_by_extension';
			blockingExtensionIds?: string[];
		};
	};
	/** A user-reviewed semantic demonstration for Instance AI. */
	recordingCompleted: {
		params: {
			recording: BrowserRecording;
		};
	};
	/** One action captured during an in-progress recording, sent live as it happens. */
	recordingActionAppended: {
		params: {
			recordingId: string;
			action: BrowserRecordingAction;
		};
	};
	/** One screenshot captured during an in-progress recording, sent live as it happens. */
	recordingScreenshotCaptured: {
		params: {
			recordingId: string;
			screenshot: BrowserRecordingScreenshot;
		};
	};
	/** The popup opened on this page and wants automation ideas for it. */
	recommendationsRequested: {
		params: {
			url: string;
			pageText: string;
		};
	};
	/** The user picked one of the offered ideas to build. */
	recommendationAccepted: {
		params: {
			title: string;
			description: string;
			/** The page the idea was generated for, so Instance AI doesn't have to ask. */
			url?: string;
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
