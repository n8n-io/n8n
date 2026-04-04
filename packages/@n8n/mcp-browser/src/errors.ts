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
	| 'network_error'
	| 'heartbeat_timeout';

const connectionLostMessages: Record<ConnectionLostReason, string> = {
	browser_closed: 'The browser was closed',
	extension_disconnected: 'The browser extension disconnected',
	debugger_detached: 'The Chrome debugger was detached (banner dismissed or DevTools closed)',
	network_error: 'The connection to the browser extension was lost',
	heartbeat_timeout: 'The browser extension stopped responding',
};

export class ConnectionLostError extends McpBrowserError {
	constructor(readonly reason: ConnectionLostReason) {
		super(
			`Browser connection lost: ${connectionLostMessages[reason]}`,
			'Call browser_connect to reconnect.',
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
				? 'The browser process may not have started.'
				: phase === 'extension_missing'
					? 'The browser opened but the n8n AI Browser Bridge extension did not connect.'
					: 'The extension did not connect within the timeout period.';
		const install = extensionInstructions ? `\n${extensionInstructions}` : '';
		super(
			`Extension connection timed out after ${timeoutMs}ms`,
			`${phaseHint}${install}\nThen retry browser_connect.`,
		);
	}
}
