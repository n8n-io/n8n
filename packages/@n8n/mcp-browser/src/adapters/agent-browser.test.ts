import { AgentBrowserAdapter } from './agent-browser';
import { PageNotFoundError, UnsupportedOperationError } from '../errors';
import { configureLogger } from '../logger';
import type { ResolvedConfig } from '../types';

configureLogger({ level: 'silent' });

// ---------------------------------------------------------------------------
// Mock node:child_process
//
// The adapter runs `const execFileAsync = promisify(execFile)` at module load
// time.  To intercept those calls we attach our jest mock as the
// util.promisify.custom symbol on the mocked execFile, so promisify() returns
// our function directly.
//
// `execFileAsyncMock` must be `var` (not `let`/`const`) so its declaration is
// hoisted before jest.mock is processed.  The jest.mock factory — which runs
// when agent-browser.ts is first imported — then assigns the concrete mock to
// the hoisted (undefined) variable, making it available in all tests.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-var
var execFileAsyncMock: jest.Mock;

jest.mock('node:child_process', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const util = require('node:util') as { promisify: { custom: symbol } };
	const execFileFn = jest.fn();
	execFileAsyncMock = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
	// Attach the custom promisify so promisify(execFile) === execFileAsyncMock
	(execFileFn as unknown as Record<symbol, unknown>)[util.promisify.custom] = execFileAsyncMock;
	return { execFile: execFileFn };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RunResponse = { success: boolean; data?: unknown; error?: string | null };

/** Queue the next N run() responses in order. */
function stubRun(...responses: RunResponse[]): void {
	for (const resp of responses) {
		execFileAsyncMock.mockResolvedValueOnce({ stdout: JSON.stringify(resp), stderr: '' });
	}
}

/**
 * Return the action-specific args for the Nth execFileAsync call.
 * Strips the shared prefix ['--json', '--session', 'n8n-computer-use'].
 */
function getRunArgs(callIndex: number): string[] {
	const call = execFileAsyncMock.mock.calls[callIndex] as [string, string[], object];
	return call[1].slice(3);
}

const BASE_CONFIG: ResolvedConfig = {
	defaultBrowser: 'chrome',
	browsers: new Map(),
	adapter: 'agent-browser',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentBrowserAdapter', () => {
	let adapter: AgentBrowserAdapter;

	beforeEach(() => {
		adapter = new AgentBrowserAdapter(BASE_CONFIG);
		execFileAsyncMock.mockReset();
	});

	/** Pre-populate tabCache with a single active tab, then clear call history. */
	async function withActiveTab(tabId = 't1'): Promise<void> {
		stubRun({
			success: true,
			data: { tabs: [{ tabId, title: 'Test', url: 'http://test.com', active: true }] },
		});
		await adapter.listTabs();
		execFileAsyncMock.mockReset();
	}

	/** Pre-populate tabCache with a single inactive tab, then clear call history. */
	async function withInactiveTab(tabId = 't1'): Promise<void> {
		stubRun({
			success: true,
			data: { tabs: [{ tabId, title: 'Test', url: 'http://test.com', active: false }] },
		});
		await adapter.listTabs();
		execFileAsyncMock.mockReset();
	}

	// =========================================================================
	// resolveTarget
	// =========================================================================

	describe('resolveTarget (exercised via click)', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('prepends @ to refs that lack the prefix', async () => {
			stubRun({ success: true });
			await adapter.click('t1', { ref: 'e65' });
			expect(getRunArgs(0)).toEqual(['click', '@e65']);
		});

		it('leaves refs that already have the @ prefix unchanged', async () => {
			stubRun({ success: true });
			await adapter.click('t1', { ref: '@e65' });
			expect(getRunArgs(0)).toEqual(['click', '@e65']);
		});

		it('passes CSS selectors through unchanged', async () => {
			stubRun({ success: true });
			await adapter.click('t1', { selector: '#submit-btn' });
			expect(getRunArgs(0)).toEqual(['click', '#submit-btn']);
		});
	});

	// =========================================================================
	// switchToTab
	// =========================================================================

	describe('switchToTab', () => {
		it('skips the tab-switch command when the tab is already active', async () => {
			// Both calls: refreshTabs (cache miss) + snapshot — no switch in between
			stubRun({
				success: true,
				data: { tabs: [{ tabId: 't1', title: 'T', url: 'u', active: true }] },
			});
			stubRun({ success: true, data: 'tree' });

			await adapter.snapshot('t1');

			expect(execFileAsyncMock).toHaveBeenCalledTimes(2);
			expect(getRunArgs(0)).toEqual(['tab', 'list']);
			expect(getRunArgs(1)).toEqual(['snapshot', '-i']);
		});

		it('issues a tab-switch command when the tab is not active', async () => {
			stubRun({
				success: true,
				data: { tabs: [{ tabId: 't1', title: 'T', url: 'u', active: false }] },
			});
			stubRun({ success: true }); // tab switch
			stubRun({ success: true, data: 'tree' }); // snapshot

			await adapter.snapshot('t1');

			expect(getRunArgs(0)).toEqual(['tab', 'list']);
			expect(getRunArgs(1)).toEqual(['tab', 't1']);
			expect(getRunArgs(2)).toEqual(['snapshot', '-i']);
		});

		it('marks the tab active after switching so the next call skips the switch', async () => {
			await withInactiveTab();

			// First snapshot: switch + snapshot
			stubRun({ success: true }); // tab switch
			stubRun({ success: true, data: 'tree' });
			await adapter.snapshot('t1');
			execFileAsyncMock.mockReset();

			// Second snapshot: tab is now active in cache — only snapshot, no switch
			stubRun({ success: true, data: 'tree2' });
			await adapter.snapshot('t1');

			expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
			expect(getRunArgs(0)).toEqual(['snapshot', '-i']);
		});

		it('throws PageNotFoundError when the tab is not found after refresh', async () => {
			stubRun({ success: true, data: { tabs: [] } }); // empty tab list
			await expect(adapter.snapshot('unknown-id')).rejects.toThrow(PageNotFoundError);
		});
	});

	// =========================================================================
	// runAction
	// =========================================================================

	describe('runAction', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('throws the error message from the response when action fails', async () => {
			stubRun({ success: false, error: 'Unknown ref: e42' });
			await expect(adapter.click('t1', { ref: 'e42' })).rejects.toThrow('Unknown ref: e42');
		});

		it('throws a generic message when the response has no error field', async () => {
			stubRun({ success: false });
			await expect(adapter.click('t1', { selector: '#btn' })).rejects.toThrow(
				'agent-browser action failed',
			);
		});

		it('rethrows stderr from a failed execFile invocation', async () => {
			const execError = Object.assign(new Error('exec failed'), {
				stderr: 'agent-browser: not found',
			});
			execFileAsyncMock.mockRejectedValueOnce(execError);
			await expect(adapter.click('t1', { selector: '#btn' })).rejects.toThrow(
				'agent-browser: not found',
			);
		});
	});

	// =========================================================================
	// snapshot
	// =========================================================================

	describe('snapshot', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('uses the -i flag by default', async () => {
			stubRun({ success: true, data: 'tree' });
			await adapter.snapshot('t1');
			expect(getRunArgs(0)).toEqual(['snapshot', '-i']);
		});

		it('uses the -i flag when interactive is explicitly true', async () => {
			stubRun({ success: true, data: 'tree' });
			await adapter.snapshot('t1', undefined, true);
			expect(getRunArgs(0)).toEqual(['snapshot', '-i']);
		});

		it('omits the -i flag when interactive is false', async () => {
			stubRun({ success: true, data: 'tree' });
			await adapter.snapshot('t1', undefined, false);
			expect(getRunArgs(0)).toEqual(['snapshot']);
		});

		it('returns (empty page) and refCount 0 when the tree is empty', async () => {
			stubRun({ success: true, data: '' });
			const result = await adapter.snapshot('t1');
			expect(result.tree).toBe('(empty page)');
			expect(result.refCount).toBe(0);
		});

		it('counts @eN refs in the tree', async () => {
			stubRun({ success: true, data: 'button @e1 input @e2 link @e3' });
			const result = await adapter.snapshot('t1');
			expect(result.refCount).toBe(3);
		});

		it('returns the tree string verbatim', async () => {
			const tree = '- heading "Title" @e1\n- button "OK" @e2';
			stubRun({ success: true, data: tree });
			const result = await adapter.snapshot('t1');
			expect(result.tree).toBe(tree);
		});
	});

	// =========================================================================
	// click
	// =========================================================================

	describe('click', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('uses click command for a normal click', async () => {
			stubRun({ success: true });
			await adapter.click('t1', { ref: 'e1' });
			expect(getRunArgs(0)).toEqual(['click', '@e1']);
		});

		it('uses dblclick for clickCount: 2', async () => {
			stubRun({ success: true });
			await adapter.click('t1', { ref: 'e1' }, { clickCount: 2 });
			expect(getRunArgs(0)).toEqual(['dblclick', '@e1']);
		});
	});

	// =========================================================================
	// type
	// =========================================================================

	describe('type', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('uses type command by default', async () => {
			stubRun({ success: true });
			await adapter.type('t1', { ref: 'e1' }, 'hello');
			expect(getRunArgs(0)).toEqual(['type', '@e1', 'hello']);
		});

		it('uses fill command when clear is true', async () => {
			stubRun({ success: true });
			await adapter.type('t1', { ref: 'e1' }, 'hello', { clear: true });
			expect(getRunArgs(0)).toEqual(['fill', '@e1', 'hello']);
		});

		it('issues a press Enter after typing when submit is true', async () => {
			stubRun({ success: true }); // type
			stubRun({ success: true }); // press Enter
			await adapter.type('t1', { ref: 'e1' }, 'hello', { submit: true });
			expect(getRunArgs(0)).toEqual(['type', '@e1', 'hello']);
			expect(getRunArgs(1)).toEqual(['press', 'Enter']);
		});
	});

	// =========================================================================
	// select
	// =========================================================================

	describe('select', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('clicks the element first then evaluates the selection script', async () => {
			stubRun({ success: true }); // click
			stubRun({ success: true, data: ['opt1'] }); // eval

			await adapter.select('t1', { ref: 'e5' }, ['opt1']);

			expect(getRunArgs(0)).toEqual(['click', '@e5']);
			expect(getRunArgs(1)[0]).toBe('eval');
		});

		it('returns values resolved by the eval', async () => {
			stubRun({ success: true }); // click
			stubRun({ success: true, data: ['value1', 'value2'] }); // eval

			const result = await adapter.select('t1', { selector: 'select#lang' }, ['value1', 'value2']);
			expect(result).toEqual(['value1', 'value2']);
		});

		it('falls back to input values when eval returns a non-array', async () => {
			stubRun({ success: true }); // click
			stubRun({ success: true, data: null }); // eval returns non-array

			const result = await adapter.select('t1', { selector: 'select' }, ['fallback']);
			expect(result).toEqual(['fallback']);
		});

		it('throws when the eval step fails', async () => {
			stubRun({ success: true }); // click
			stubRun({ success: false, error: 'select failed' }); // eval fails

			await expect(adapter.select('t1', { selector: 'select' }, ['v'])).rejects.toThrow(
				'select failed',
			);
		});
	});

	// =========================================================================
	// scroll
	// =========================================================================

	describe('scroll', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('element mode calls scrollintoview', async () => {
			stubRun({ success: true });
			await adapter.scroll('t1', { ref: 'e3' });
			expect(getRunArgs(0)).toEqual(['scrollintoview', '@e3']);
		});

		it('direction mode calls scroll with direction and amount', async () => {
			stubRun({ success: true });
			await adapter.scroll('t1', undefined, { direction: 'down', amount: 400 });
			expect(getRunArgs(0)).toEqual(['scroll', 'down', '400']);
		});

		it('direction mode uses defaults when direction and amount are omitted', async () => {
			stubRun({ success: true });
			await adapter.scroll('t1');
			expect(getRunArgs(0)).toEqual(['scroll', 'down', '300']);
		});
	});

	// =========================================================================
	// listTabs / listTabSessionIds
	// =========================================================================

	describe('listTabs', () => {
		it('returns PageInfo mapped from the agent-browser tab list', async () => {
			stubRun({
				success: true,
				data: {
					tabs: [
						{ tabId: 't1', title: 'Google', url: 'https://google.com', active: true },
						{ tabId: 't2', title: 'GitHub', url: 'https://github.com', active: false },
					],
				},
			});

			const tabs = await adapter.listTabs();
			expect(tabs).toEqual([
				{ id: 't1', title: 'Google', url: 'https://google.com' },
				{ id: 't2', title: 'GitHub', url: 'https://github.com' },
			]);
		});
	});

	describe('listTabSessionIds', () => {
		it('returns cached tab IDs without making a run() call', async () => {
			stubRun({
				success: true,
				data: {
					tabs: [
						{ tabId: 't1', title: 'A', url: 'u', active: true },
						{ tabId: 't2', title: 'B', url: 'u', active: false },
					],
				},
			});
			await adapter.listTabs(); // populate cache
			execFileAsyncMock.mockReset();

			const ids = await adapter.listTabSessionIds();
			expect(ids).toEqual(['t1', 't2']);
			expect(execFileAsyncMock).not.toHaveBeenCalled();
		});
	});

	// =========================================================================
	// getContent
	// =========================================================================

	describe('getContent', () => {
		beforeEach(async () => {
			await withActiveTab();
		});

		it('uses documentElement when no selector is given', async () => {
			stubRun({ success: true, data: '<html></html>' }); // eval
			stubRun({
				success: true,
				data: { tabs: [{ tabId: 't1', title: 'T', url: 'http://t.com', active: true }] },
			}); // refreshTabs

			await adapter.getContent('t1');

			expect(getRunArgs(0)).toEqual(['eval', "document.documentElement?.outerHTML??''"]);
		});

		it('embeds the selector via JSON.stringify so single quotes are safe', async () => {
			const selector = "input[name='q']";
			stubRun({ success: true, data: '<input>' }); // eval
			stubRun({
				success: true,
				data: { tabs: [{ tabId: 't1', title: 'T', url: 'http://t.com', active: true }] },
			}); // refreshTabs

			await adapter.getContent('t1', selector);

			const script = getRunArgs(0)[1];
			expect(script).toBe(`document.querySelector(${JSON.stringify(selector)})?.outerHTML??''`);
		});
	});

	// =========================================================================
	// navigate
	// =========================================================================

	describe('navigate', () => {
		it('calls open with the target URL and returns the updated tab info', async () => {
			// switchToTab: cache miss → refreshTabs
			stubRun({
				success: true,
				data: { tabs: [{ tabId: 't1', title: 'Old', url: 'http://old.com', active: true }] },
			});
			stubRun({ success: true }); // open
			// refreshTabs after navigate
			stubRun({
				success: true,
				data: [{ tabId: 't1', title: 'New', url: 'https://target.com', active: true }],
			});

			const result = await adapter.navigate('t1', 'https://target.com');

			expect(getRunArgs(1)).toEqual(['open', 'https://target.com']);
			expect(result.url).toBe('https://target.com');
		});
	});

	// =========================================================================
	// Unsupported operations
	// =========================================================================

	describe('unsupported operations', () => {
		it('drag throws UnsupportedOperationError', async () => {
			await expect(adapter.drag('t1', { selector: '#a' }, { selector: '#b' })).rejects.toThrow(
				UnsupportedOperationError,
			);
		});

		it('upload throws UnsupportedOperationError', async () => {
			await expect(adapter.upload('t1', undefined, ['/file.txt'])).rejects.toThrow(
				UnsupportedOperationError,
			);
		});
	});
});
