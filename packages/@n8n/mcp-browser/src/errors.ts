export class McpBrowserError extends Error {
	constructor(
		message: string,
		readonly hint?: string,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class SessionNotFoundError extends McpBrowserError {
	constructor(readonly sessionId: string) {
		super(
			`Session not found: ${sessionId}`,
			'The session may have expired or been closed. Create a new session with browser_open.',
		);
	}
}

export class PageNotFoundError extends McpBrowserError {
	constructor(
		readonly pageId: string,
		readonly sessionId: string,
	) {
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
			`This operation is not available for ${adapterName} sessions. Use a Chromium or Firefox session instead.`,
		);
	}
}

export class MaxSessionsError extends McpBrowserError {
	constructor(readonly max: number) {
		super(
			`Maximum concurrent sessions (${max}) reached`,
			'Close an existing session with browser_close before opening a new one.',
		);
	}
}

export class BrowserNotAvailableError extends McpBrowserError {
	constructor(readonly browser: string) {
		super(
			`Browser not available: ${browser}`,
			`${browser} was not found on this system. Install it or configure the executablePath.`,
		);
	}
}

export class ProfileLockedError extends McpBrowserError {
	constructor() {
		super(
			'Firefox profile is locked',
			'Close Firefox before opening a local Firefox session. The profile can only be used by one Firefox instance at a time.',
		);
	}
}
