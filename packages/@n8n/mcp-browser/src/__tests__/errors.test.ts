import {
	BrowserNotAvailableError,
	MaxSessionsError,
	McpBrowserError,
	PageNotFoundError,
	ProfileLockedError,
	SessionNotFoundError,
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

describe('SessionNotFoundError', () => {
	const error = new SessionNotFoundError('sess_abc123');

	it('should include session ID in message', () => {
		expect(error.message).toContain('sess_abc123');
	});

	it('should store sessionId property', () => {
		expect(error.sessionId).toBe('sess_abc123');
	});

	it('should have a hint about creating a new session', () => {
		expect(error.hint).toContain('browser_open');
	});

	it('should be instanceof McpBrowserError', () => {
		expect(error).toBeInstanceOf(McpBrowserError);
	});
});

describe('PageNotFoundError', () => {
	const error = new PageNotFoundError('page_1', 'sess_abc');

	it('should include page ID in message', () => {
		expect(error.message).toContain('page_1');
	});

	it('should store pageId and sessionId', () => {
		expect(error.pageId).toBe('page_1');
		expect(error.sessionId).toBe('sess_abc');
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

describe('MaxSessionsError', () => {
	const error = new MaxSessionsError(5);

	it('should include limit in message', () => {
		expect(error.message).toContain('5');
	});

	it('should store max property', () => {
		expect(error.max).toBe(5);
	});

	it('should hint about browser_close', () => {
		expect(error.hint).toContain('browser_close');
	});
});

describe('BrowserNotAvailableError', () => {
	const error = new BrowserNotAvailableError('firefox');

	it('should include browser name in message', () => {
		expect(error.message).toContain('firefox');
	});

	it('should hint about installation', () => {
		expect(error.hint).toContain('firefox');
		expect(error.hint).toContain('Install');
	});
});

describe('ProfileLockedError', () => {
	const error = new ProfileLockedError();

	it('should mention Firefox in hint', () => {
		expect(error.hint).toContain('Firefox');
	});

	it('should be instanceof McpBrowserError', () => {
		expect(error).toBeInstanceOf(McpBrowserError);
	});
});
