export class McpBrowserError extends Error {
	constructor(
		message: string,
		readonly hint?: string,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class NotConnectedError extends McpBrowserError {
	constructor() {
		super('Not connected to a browser', 'Call browser_connect first to connect to the browser.');
	}
}

export class AlreadyConnectedError extends McpBrowserError {
	constructor() {
		super(
			'Already connected to a browser',
			'Disconnect first with browser_disconnect before connecting again.',
		);
	}
}

export class PageNotFoundError extends McpBrowserError {
	constructor(readonly pageId: string) {
		super(
			`Page not found: ${pageId}`,
			'The page may have been closed. List open pages with browser_tab_list.',
		);
	}
}

export class StaleRefError extends McpBrowserError {
	constructor(readonly ref: string) {
		super(
			`Stale element ref: ${ref}`,
			'The ref is from a previous snapshot. Take a fresh snapshot with browser_snapshot and use the new refs.',
		);
	}
}

const RESUME_AFTER_SESSION_LOST =
	'the session went down with the tab, so call browser_connect first, then redo the step in a fresh tab';

/** Chrome will not re-grant debugger access to this tab; recovery means a fresh one. */
export class ExtensionConflictError extends McpBrowserError {
	static tabLost(blockingExtensionIds: string[]): ExtensionConflictError {
		return new ExtensionConflictError(blockingExtensionIds, true);
	}

	static sessionLost(blockingExtensionIds: string[]): ExtensionConflictError {
		return new ExtensionConflictError(blockingExtensionIds, false);
	}

	private constructor(
		readonly blockingExtensionIds: string[],
		sessionAlive: boolean,
	) {
		const which =
			blockingExtensionIds.length > 0
				? `another browser extension (${blockingExtensionIds.join(', ')})`
				: 'another browser extension';
		// Opposite advice per case: reconnecting is rejected while the session is up,
		// and required once it is down.
		const resume = sessionAlive
			? 'open a fresh tab with browser_tab_open and redo the step there — do not call browser_connect, the session is still live'
			: RESUME_AFTER_SESSION_LOST;
		super(
			`This tab can no longer be automated — it was blocked by ${which}`,
			'Chrome stops automating a tab as soon as another extension opens a frame in it — a ' +
				'password manager showing its autofill menu does exactly that. This tab cannot be ' +
				'recovered and anything already typed into it is lost. Dismissing the menu does not ' +
				'help: it reappears the moment the field is focused again, so a retry fails the same ' +
				'way. In your reply, explain this and offer the user both ways forward: (1) they ' +
				`turn that extension off for this site and tell you once done, after which ${resume}; ` +
				'or (2) they finish this step themselves in the browser. If you were capturing a ' +
				'credential, (2) means the value never comes back through the page — stop using ' +
				'browser tools for it and let the user enter it through n8n credential setup instead.',
		);
	}
}

export class UnsupportedOperationError extends McpBrowserError {
	constructor(
		readonly operation: string,
		readonly adapterName: string,
	) {
		super(
			`Operation not supported: ${operation}`,
			`This operation is not available for ${adapterName} sessions.`,
		);
	}
}

export class BrowserNotAvailableError extends McpBrowserError {
	constructor(
		readonly browser: string,
		readonly availableBrowsers: string[] = [],
		readonly installInstructions?: string,
	) {
		const alternatives =
			availableBrowsers.length > 0
				? `Compatible Chromium-based browsers found: ${availableBrowsers.join(', ')}. ` +
					`Call browser_connect with { "browser": "${availableBrowsers[0]}" } to use it instead.`
				: 'No compatible Chromium-based browsers (Chrome, Brave, Edge, Chromium) were found on this system.';
		const install = installInstructions ? `\n${installInstructions}` : '';
		super(`Browser not available: ${browser}`, `${alternatives}${install}`);
	}
}

export type ConnectionLostReason =
	| 'browser_closed'
	| 'extension_disconnected'
	| 'debugger_detached'
	| 'blocked_by_extension'
	| 'network_error'
	| 'heartbeat_timeout';

const connectionLostMessages: Record<ConnectionLostReason, string> = {
	browser_closed: 'The browser was closed',
	extension_disconnected: 'The browser extension disconnected',
	debugger_detached: 'The Chrome debugger was detached (banner dismissed or DevTools closed)',
	blocked_by_extension: 'Another browser extension blocked automation of the tab',
	network_error: 'The connection to the browser extension was lost',
	heartbeat_timeout: 'The browser extension stopped responding',
};

/** Reasons that override the default "just reconnect" hint. */
const connectionLostHints: Partial<Record<ConnectionLostReason, string>> = {
	blocked_by_extension: `Another extension blocked that tab — ${RESUME_AFTER_SESSION_LOST}.`,
};

export class ConnectionLostError extends McpBrowserError {
	constructor(readonly reason: ConnectionLostReason) {
		super(
			`Browser connection lost: ${connectionLostMessages[reason]}`,
			connectionLostHints[reason] ?? 'Call browser_connect to reconnect.',
		);
	}
}

export class BrowserExecutableNotFoundError extends McpBrowserError {
	constructor(readonly browser: string) {
		super(
			`No executable path for ${browser}`,
			`The browser "${browser}" was detected but has no executable path configured. ` +
				'Verify the browser is properly installed or provide an explicit executablePath in the config.',
		);
	}
}

export type ExtensionNotConnectedPhase = 'browser_not_launched' | 'extension_missing' | 'unknown';

export class ExtensionNotConnectedError extends McpBrowserError {
	constructor(
		readonly timeoutMs: number,
		readonly phase: ExtensionNotConnectedPhase = 'unknown',
		readonly extensionInstructions?: string,
	) {
		const phaseHint =
			phase === 'browser_not_launched'
				? 'The browser process may not have started. Check that the browser is installed and accessible.'
				: phase === 'extension_missing'
					? 'The browser opened but the user did not confirm the browser connection in time. Ask the user to look for the n8n AI Browser Bridge extension popup in their browser and click Connect. If the user does not see the popup, the extension may not be installed.'
					: 'The extension did not connect within the timeout period.';
		const install = extensionInstructions ? `\n${extensionInstructions}` : '';
		super(
			`Extension connection timed out after ${timeoutMs}ms`,
			`${phaseHint}${install}\nThen call browser_connect again.`,
		);
	}
}
