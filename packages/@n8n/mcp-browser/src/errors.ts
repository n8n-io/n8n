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
	constructor(readonly browser: string) {
		super(
			`Browser not available: ${browser}`,
			`${browser} was not found on this system. Install it or configure the executablePath.`,
		);
	}
}
