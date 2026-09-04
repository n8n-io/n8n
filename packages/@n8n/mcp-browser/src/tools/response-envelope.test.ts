import { McpBrowserError } from '../errors';
import { buildErrorResponse, enrichResponse, resolvePageContext } from './response-envelope';
import { createMockConnection } from './test-helpers';
import { analyzeHtmlSensitivity } from '../sensitivity/analyze-html';
import type { CallToolResult } from '../types';

vi.mock('../sensitivity/analyze-html', () => ({
	analyzeHtmlSensitivity: vi.fn(),
}));

const analyzeMock = vi.mocked(analyzeHtmlSensitivity);

function makeResult(structured: Record<string, unknown>): CallToolResult {
	return {
		content: [{ type: 'text', text: JSON.stringify(structured) }],
		structuredContent: structured,
	};
}

function structuredOf(result: CallToolResult): Record<string, unknown> {
	return result.structuredContent as Record<string, unknown>;
}

describe('resolvePageContext', () => {
	it('uses the pageId from args when given', () => {
		const { connection, state } = createMockConnection();
		expect(resolvePageContext(connection, { pageId: 'page7' })).toEqual({
			state,
			pageId: 'page7',
		});
	});

	it('defaults to the active page', () => {
		const { connection, state } = createMockConnection();
		expect(resolvePageContext(connection, {})).toEqual({ state, pageId: 'page1' });
	});
});

describe('enrichResponse', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		analyzeMock.mockReturnValue({ ok: true, sensitive: false, hits: [] });
	});

	it('does nothing when the result has no structuredContent', async () => {
		const result: CallToolResult = { content: [{ type: 'text', text: 'ok' }] };

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		expect(mockConnection.adapter.snapshot).not.toHaveBeenCalled();
		expect(result.structuredContent).toBeUndefined();
	});

	it('does not snapshot without autoSnapshot', async () => {
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', {});

		expect(mockConnection.adapter.snapshot).not.toHaveBeenCalled();
		expect(structuredOf(result).snapshot).toBeUndefined();
	});

	it('attaches a snapshot with autoSnapshot', async () => {
		mockConnection.adapter.snapshot.mockResolvedValue({ tree: '- button "OK"', refCount: 1 });
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page1', undefined, undefined);
		expect(structuredOf(result)).toMatchObject({ clicked: true, snapshot: '- button "OK"' });
	});

	it.each([
		['interactive', true],
		['non-interactive', false],
	])('passes the %s flag through to the adapter', async (_label, interactive) => {
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', {
			autoSnapshot: true,
			snapshotInteractive: interactive,
		});

		expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page1', undefined, interactive);
	});

	it('keeps the original result when the snapshot fails', async () => {
		mockConnection.adapter.snapshot.mockRejectedValue(new Error('page gone'));
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		expect(structuredOf(result)).toEqual({ clicked: true });
	});

	it('redacts detected secrets from the snapshot', async () => {
		mockConnection.adapter.snapshot.mockResolvedValue({
			tree: '- text "your key: sk-SECRET123"',
			refCount: 0,
		});
		analyzeMock.mockReturnValue({
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'sk-SECRET123' }],
		});
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		const snapshot = structuredOf(result).snapshot as string;
		expect(snapshot).not.toContain('sk-SECRET123');
		expect(snapshot).toContain('your key: ');
	});

	it('probes sensitivity and redacts content results without autoSnapshot', async () => {
		analyzeMock.mockReturnValue({
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'sk-SECRET123' }],
		});
		const result = makeResult({ content: 'the key is sk-SECRET123' });

		await enrichResponse(result, mockConnection.state, 'page1', {});

		expect(mockConnection.adapter.probePageHtml).toHaveBeenCalledWith('page1');
		expect(structuredOf(result).content).not.toContain('sk-SECRET123');
	});

	it('attaches modal states when present', async () => {
		const modal = {
			type: 'dialog' as const,
			description: 'alert: hi',
			clearedBy: 'browser_dialog',
		};
		mockConnection.adapter.getModalStates.mockReturnValue([modal]);
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', {});

		expect(structuredOf(result).modalStates).toEqual([modal]);
	});

	it('attaches the console summary when there are errors or warnings', async () => {
		mockConnection.adapter.getConsoleSummary.mockReturnValue({ errors: 2, warnings: 1 });
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		expect(structuredOf(result).consoleSummary).toEqual({ errors: 2, warnings: 1 });
	});

	it('omits a clean console summary', async () => {
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', { autoSnapshot: true });

		expect(structuredOf(result).consoleSummary).toBeUndefined();
	});

	it('reports tabs opened by the action', async () => {
		mockConnection.adapter.listTabs.mockResolvedValue([
			{ id: 'page1', title: 'Test Page', url: 'http://test.com' },
			{ id: 'page2', title: 'Popup', url: 'http://test.com/popup' },
		]);
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', {}, new Set(['page1']));

		expect(structuredOf(result).newTabs).toEqual([
			{ id: 'page2', title: 'Popup', url: 'http://test.com/popup' },
		]);
	});

	it('omits newTabs when no tab was opened', async () => {
		const result = makeResult({ clicked: true });

		await enrichResponse(result, mockConnection.state, 'page1', {}, new Set(['page1']));

		expect(structuredOf(result).newTabs).toBeUndefined();
	});
});

describe('buildErrorResponse', () => {
	let mockConnection: ReturnType<typeof createMockConnection>;

	beforeEach(() => {
		mockConnection = createMockConnection();
		analyzeMock.mockReturnValue({ ok: true, sensitive: false, hits: [] });
	});

	it('returns a structured error with hint for McpBrowserError', async () => {
		const result = await buildErrorResponse(
			new McpBrowserError('element not found', 'take a fresh snapshot'),
			mockConnection.connection,
			{},
			{},
		);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: 'element not found',
			hint: 'take a fresh snapshot',
		});
	});

	it('wraps unknown errors', async () => {
		const result = await buildErrorResponse(new Error('boom'), mockConnection.connection, {}, {});

		expect(result.isError).toBe(true);
		expect(structuredOf(result).error).toBe('boom');
	});

	it('includes a snapshot with autoSnapshot, threading the interactive flag', async () => {
		mockConnection.adapter.snapshot.mockResolvedValue({ tree: '- button "OK"', refCount: 1 });

		const result = await buildErrorResponse(
			new Error('boom'),
			mockConnection.connection,
			{ pageId: 'page1' },
			{ autoSnapshot: true, snapshotInteractive: true },
		);

		expect(mockConnection.adapter.snapshot).toHaveBeenCalledWith('page1', undefined, true);
		expect(structuredOf(result).snapshot).toBe('- button "OK"');
	});

	it('redacts detected secrets from the error snapshot', async () => {
		mockConnection.adapter.snapshot.mockResolvedValue({
			tree: '- text "your key: sk-SECRET123"',
			refCount: 0,
		});
		analyzeMock.mockReturnValue({
			ok: true,
			sensitive: true,
			hits: [{ type: 'secret', value: 'sk-SECRET123' }],
		});

		const result = await buildErrorResponse(
			new Error('boom'),
			mockConnection.connection,
			{},
			{
				autoSnapshot: true,
			},
		);

		expect(structuredOf(result).snapshot).not.toContain('sk-SECRET123');
		expect(JSON.stringify(result.content)).not.toContain('sk-SECRET123');
	});

	it('still returns the error when the snapshot fails', async () => {
		mockConnection.adapter.snapshot.mockRejectedValue(new Error('page gone'));

		const result = await buildErrorResponse(
			new Error('boom'),
			mockConnection.connection,
			{},
			{
				autoSnapshot: true,
			},
		);

		expect(result.isError).toBe(true);
		expect(structuredOf(result)).toEqual({ error: 'boom' });
	});

	it('includes modal states', async () => {
		const modal = {
			type: 'filechooser' as const,
			description: 'file chooser open',
			clearedBy: 'browser_upload',
		};
		mockConnection.adapter.getModalStates.mockReturnValue([modal]);

		const result = await buildErrorResponse(new Error('boom'), mockConnection.connection, {}, {});

		expect(structuredOf(result).modalStates).toEqual([modal]);
	});

	it('still returns the error when the connection lookup fails', async () => {
		const connection = {
			getConnection: vi.fn().mockImplementation(() => {
				throw new McpBrowserError('not connected');
			}),
		} as unknown as ReturnType<typeof createMockConnection>['connection'];

		const result = await buildErrorResponse(
			new Error('boom'),
			connection,
			{},
			{
				autoSnapshot: true,
			},
		);

		expect(result.isError).toBe(true);
		expect(structuredOf(result)).toEqual({ error: 'boom' });
	});
});
