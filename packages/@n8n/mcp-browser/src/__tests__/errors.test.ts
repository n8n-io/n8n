import {
	AlreadyConnectedError,
	BrowserNotAvailableError,
	ConnectionLostError,
	ExtensionConflictError,
	McpBrowserError,
	NotConnectedError,
	PageNotFoundError,
	StaleRefError,
	UnsupportedOperationError,
} from '../errors';

describe('McpBrowserError', () => {
	it('should set message and hint', () => {
		const error = new McpBrowserError('msg', 'hint text');
		expect(error.message).toBe('msg');
		expect(error.hint).toBe('hint text');
	});

	it('should set name to the class name', () => {
		expect(new McpBrowserError('test').name).toBe('McpBrowserError');
	});

	it('should be instanceof Error', () => {
		expect(new McpBrowserError('test')).toBeInstanceOf(Error);
	});
});

describe('NotConnectedError', () => {
	const error = new NotConnectedError();

	it('should mention not connected', () => {
		expect(error.message).toContain('Not connected');
	});

	it('should hint about browser_connect', () => {
		expect(error.hint).toContain('browser_connect');
	});

	it('should be instanceof McpBrowserError', () => {
		expect(error).toBeInstanceOf(McpBrowserError);
	});
});

describe('AlreadyConnectedError', () => {
	const error = new AlreadyConnectedError();

	it('should mention already connected', () => {
		expect(error.message).toContain('Already connected');
	});

	it('should hint about browser_disconnect', () => {
		expect(error.hint).toContain('browser_disconnect');
	});

	it('should be instanceof McpBrowserError', () => {
		expect(error).toBeInstanceOf(McpBrowserError);
	});
});

describe('PageNotFoundError', () => {
	const error = new PageNotFoundError('page_1');

	it('should include page ID in message', () => {
		expect(error.message).toContain('page_1');
	});

	it('should store pageId', () => {
		expect(error.pageId).toBe('page_1');
	});

	it('should hint about browser_tab_list', () => {
		expect(error.hint).toContain('browser_tab_list');
	});
});

describe('StaleRefError', () => {
	const error = new StaleRefError('e5');

	it('should include ref in message', () => {
		expect(error.message).toContain('e5');
	});

	it('should hint about browser_snapshot', () => {
		expect(error.hint).toContain('browser_snapshot');
	});
});

describe('UnsupportedOperationError', () => {
	const error = new UnsupportedOperationError('pdf', 'SafariDriverAdapter');

	it('should include operation in message', () => {
		expect(error.message).toContain('pdf');
	});

	it('should include adapter name in hint', () => {
		expect(error.hint).toContain('SafariDriverAdapter');
	});
});

describe('BrowserNotAvailableError', () => {
	it('should include browser name in message', () => {
		const error = new BrowserNotAvailableError('firefox');
		expect(error.message).toContain('firefox');
	});

	it('should list alternatives when available', () => {
		const error = new BrowserNotAvailableError('firefox', ['chrome', 'brave']);
		expect(error.hint).toContain('chrome');
		expect(error.hint).toContain('browser_connect');
	});

	it('should describe no browsers found when none available', () => {
		const error = new BrowserNotAvailableError('firefox');
		expect(error.hint).toContain('No compatible Chromium-based browsers');
	});
});

describe('ConnectionLostError', () => {
	it('should tell the agent to reconnect for ordinary losses', () => {
		expect(new ConnectionLostError('browser_closed').hint).toContain(
			'browser_connect to reconnect',
		);
	});

	it('should say to reconnect when a block took the session down', () => {
		// Only renders once the session is gone, so reconnecting is right here.
		const hint = new ConnectionLostError('blocked_by_extension').hint ?? '';
		expect(hint).toContain('browser_connect');
		expect(hint).toContain('fresh tab');
	});
});

describe('ExtensionConflictError', () => {
	const error = ExtensionConflictError.tabLost(['offendingextensionid']);

	it('should name the blocking extension', () => {
		expect(error.message).toContain('offendingextensionid');
	});

	it('should steer a still-live session to a fresh tab, not a reconnect', () => {
		// browser_connect throws AlreadyConnectedError while the session is up.
		expect(error.hint).toContain('cannot be recovered');
		expect(error.hint).toContain('browser_tab_open');
		expect(error.hint).toContain('do not call browser_connect');
	});

	it('should send a dead session through browser_connect first', () => {
		const hint = ExtensionConflictError.sessionLost(['abc']).hint ?? '';
		expect(hint).toContain('call browser_connect first');
		expect(hint).not.toContain('do not call browser_connect');
	});

	it('should not route the hand-off through ask-user', () => {
		// ask-user renders an input field; this hand-off belongs in the reply.
		expect(error.hint).not.toContain('ask-user');
	});

	it('should stay readable when no extension could be identified', () => {
		expect(ExtensionConflictError.tabLost([]).message).toContain('another browser extension');
	});

	it('should be instanceof McpBrowserError', () => {
		expect(error).toBeInstanceOf(McpBrowserError);
	});
});
