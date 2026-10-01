import type { McpTool } from '@n8n/api-types';
import type { DomainAccessTracker } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { BrowserDomainGate, BrowserLocalMcpServer } from '../browser/browser-local-mcp-server';
import {
	BrowserRouterLocalMcpServer,
	type BrowserBackend,
} from '../browser/browser-router-local-mcp-server';

function browserTool(name: string): McpTool {
	return {
		name,
		description: name,
		inputSchema: { type: 'object', properties: {} },
		annotations: { category: 'browser' },
	};
}

const BROWSER_TOOLS = [
	browserTool('browser_connect'),
	browserTool('browser_disconnect'),
	browserTool('browser_navigate'),
	browserTool('browser_snapshot'),
];

const NAVIGATE = { name: 'browser_navigate', arguments: { url: 'https://example.com' } };
const START = { name: 'browser_start_session', arguments: {} };
const END = { name: 'browser_end_session', arguments: {} };

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content.map((item) => item.text ?? '').join('');
}

describe('BrowserRouterLocalMcpServer', () => {
	let inner: ReturnType<typeof mock<BrowserLocalMcpServer>>;
	let backend: { kind: 'cloud'; start: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
	let router: BrowserRouterLocalMcpServer;

	beforeEach(() => {
		inner = mock<BrowserLocalMcpServer>();
		inner.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'navigated' }] });
		backend = {
			kind: 'cloud',
			start: vi.fn().mockResolvedValue(inner),
			end: vi.fn().mockResolvedValue(undefined),
		};
		router = new BrowserRouterLocalMcpServer(BROWSER_TOOLS, backend as BrowserBackend);
	});

	it('lists the session tools and the shared browser tools, without connect and disconnect', () => {
		const names = router.getAvailableTools().map((tool) => tool.name);

		expect(names).toEqual([
			'browser_start_session',
			'browser_end_session',
			'browser_navigate',
			'browser_snapshot',
		]);
		expect(router.getToolsByCategory('browser')).toEqual(router.getAvailableTools());
		expect(router.getToolsByCategory('filesystem')).toEqual([]);
	});

	it('asks for a session before forwarding browser calls', async () => {
		const result = await router.callTool(NAVIGATE);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('Call browser_start_session first');
		expect(inner.callTool).not.toHaveBeenCalled();
	});

	it('rejects tools it does not list', async () => {
		const result = await router.callTool({ name: 'browser_connect', arguments: {} });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('Unknown browser tool: browser_connect');
	});

	it('forwards browser calls to the started session', async () => {
		const started = await router.callTool(START);
		const result = await router.callTool(NAVIGATE);

		expect(started.isError).toBeUndefined();
		expect(textOf(started)).toContain('Started a cloud browser session');
		expect(backend.start).toHaveBeenCalledTimes(1);
		expect(inner.callTool).toHaveBeenCalledWith(NAVIGATE);
		expect(textOf(result)).toBe('navigated');
	});

	it('refuses to start a second session', async () => {
		await router.callTool(START);
		const result = await router.callTool(START);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('already active');
		expect(backend.start).toHaveBeenCalledTimes(1);
	});

	it('refuses to start a second session while the first is still starting', async () => {
		const first = router.callTool(START);
		const second = await router.callTool(START);
		await first;

		expect(second.isError).toBe(true);
		expect(backend.start).toHaveBeenCalledTimes(1);
	});

	it('reports a failed start as an error result and allows a retry', async () => {
		backend.start.mockRejectedValueOnce(new Error('Not enough credits'));

		const failed = await router.callTool(START);
		const retried = await router.callTool(START);

		expect(failed.isError).toBe(true);
		expect(textOf(failed)).toContain('Not enough credits');
		expect(retried.isError).toBeUndefined();
	});

	it('ends the session and asks for a new one afterwards', async () => {
		await router.callTool(START);

		const ended = await router.callTool(END);
		const after = await router.callTool(NAVIGATE);

		expect(ended.isError).toBeUndefined();
		expect(backend.end).toHaveBeenCalledTimes(1);
		expect(after.isError).toBe(true);
		expect(textOf(after)).toContain('Call browser_start_session first');
	});

	it('reports ending without a session as an error', async () => {
		const result = await router.callTool(END);

		expect(result.isError).toBe(true);
		expect(backend.end).not.toHaveBeenCalled();
	});

	it('reports a failed end as an error result', async () => {
		backend.end.mockRejectedValueOnce(new Error('release failed'));
		await router.callTool(START);

		const result = await router.callTool(END);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('release failed');
	});

	it('applies the domain gate to the session server, whether set before or after the start', async () => {
		const gate = mock<BrowserDomainGate>({ tracker: mock<DomainAccessTracker>() });
		const laterGate = mock<BrowserDomainGate>({ tracker: mock<DomainAccessTracker>() });

		router.setDomainGate(gate);
		await router.callTool(START);
		router.setDomainGate(laterGate);

		expect(inner.setDomainGate).toHaveBeenNthCalledWith(1, gate);
		expect(inner.setDomainGate).toHaveBeenNthCalledWith(2, laterGate);
	});
});
