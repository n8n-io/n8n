import { z } from 'zod';

/**
 * Protocol types for communication between the CDP relay server and the Chrome extension.
 *
 * All tab identifiers use CDP Target.targetId strings resolved by the extension
 * via chrome.debugger + Target.getTargetInfo (e.g. "B4FE7A8D1C3E…").
 * The extension is the only component that maps these to Chrome internals.
 */

/** Version of the extension protocol. Bump when commands/events change. */
export const PROTOCOL_VERSION = 2;

const browserRecordingTargetSchema = z
	.object({
		tag: z.string().min(1).max(30),
		role: z.string().max(40).optional(),
		label: z.string().max(160).optional(),
		name: z.string().max(80).optional(),
		inputType: z.string().max(40).optional(),
	})
	.strict();

const browserRecordingActionSchema = z
	.object({
		id: z.string().uuid(),
		type: z.enum([
			'navigation',
			'click',
			'context_menu',
			'copy',
			'input',
			'key',
			'select',
			'submit',
			'tab_switch',
		]),
		timestamp: z
			.number()
			.int()
			.nonnegative()
			.max(24 * 60 * 60 * 1000),
		url: z.string().max(500),
		target: browserRecordingTargetSchema.optional(),
		value: z.string().max(200).optional(),
		redacted: z.boolean().optional(),
	})
	.strict();

export const browserRecordingSchema = z
	.object({
		id: z.string().uuid(),
		startedAt: z.string().datetime(),
		status: z.enum(['submitting', 'submitted']),
		actions: z.array(browserRecordingActionSchema).min(1).max(250),
	})
	.strict();

export type BrowserRecording = z.infer<typeof browserRecordingSchema>;

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
