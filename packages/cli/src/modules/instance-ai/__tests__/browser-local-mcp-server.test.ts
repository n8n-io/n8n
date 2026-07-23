import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { DomainAccessTracker } from '@n8n/instance-ai';
import type { BrowserToolkit, ToolContext, ToolDefinition } from '@n8n/mcp-browser';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { BrowserLocalMcpServer, type BrowserDomainGate } from '../browser/browser-local-mcp-server';

const RUN_ID = 'run-1';

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		name: 'browser_navigate',
		description: 'Navigate the browser',
		inputSchema: z.object({ url: z.string().optional() }),
		execute: vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] })),
		getAffectedResources: vi.fn(async () => [
			{ toolGroup: 'browser', resource: 'example.com', description: 'Browser: example.com' },
		]),
		...overrides,
	} as unknown as ToolDefinition;
}

function makeServer(tool: ToolDefinition) {
	const toolkit = { tools: [tool], connection: {} } as unknown as BrowserToolkit;
	return new BrowserLocalMcpServer(toolkit, mock<ToolContext>(), mock<Logger>());
}

function gate(
	tracker: DomainAccessTracker,
	permissionMode: BrowserDomainGate['permissionMode'] = 'require_approval',
): BrowserDomainGate {
	return { tracker, runId: RUN_ID, permissionMode };
}

async function call(
	server: BrowserLocalMcpServer,
	args: Record<string, unknown> = { url: 'https://example.com' },
) {
	return await server.callTool({ name: 'browser_navigate', arguments: args });
}

describe('BrowserLocalMcpServer domain gating', () => {
	let tracker: ReturnType<typeof mock<DomainAccessTracker>>;

	beforeEach(() => {
		tracker = mock<DomainAccessTracker>();
		tracker.isHostAllowed.mockReturnValue(false);
	});

	describe('first call', () => {
		it('requests confirmation for an un-approved host without executing', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			const result = await call(server);

			expect(result.isError).toBe(true);
			const text = (result.content[0] as { text: string }).text;
			expect(text.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)).toBe(true);
			const payload = JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length));
			expect(payload).toMatchObject({ toolGroup: 'browser', resource: 'example.com' });
			expect(tool.execute).not.toHaveBeenCalled();
		});

		it('executes when the host is already allowed', async () => {
			tracker.isHostAllowed.mockReturnValue(true);
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			await call(server);

			expect(tool.execute).toHaveBeenCalledTimes(1);
			expect(tracker.isHostAllowed).toHaveBeenCalledWith('example.com', RUN_ID);
		});

		it('executes without prompting when permission mode is always_allow', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker, 'always_allow'));

			await call(server);

			expect(tool.execute).toHaveBeenCalledTimes(1);
			expect(tracker.isHostAllowed).not.toHaveBeenCalled();
		});

		it('blocks when permission mode is blocked', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker, 'blocked'));

			const result = await call(server);

			expect(result.isError).toBe(true);
			expect((result.content[0] as { text: string }).text).toContain('blocked by admin');
			expect(tool.execute).not.toHaveBeenCalled();
		});

		it('does not gate when there is no real domain (sentinel host)', async () => {
			const tool = makeTool({
				getAffectedResources: vi.fn(async () => [
					{ toolGroup: 'browser', resource: 'browser', description: 'Browser: browser' },
				]),
			} as unknown as Partial<ToolDefinition>);
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			await call(server);

			expect(tool.execute).toHaveBeenCalledTimes(1);
		});

		it('executes unconditionally when no gate is bound', async () => {
			const tool = makeTool();
			const server = makeServer(tool);

			await call(server);

			expect(tool.execute).toHaveBeenCalledTimes(1);
		});
	});

	describe('resume (with _confirmation)', () => {
		it('persists the domain for the thread on allowForSession and executes', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			await call(server, { url: 'https://example.com', _confirmation: 'allowForSession' });

			expect(tracker.approveDomain).toHaveBeenCalledWith('example.com');
			expect(tool.execute).toHaveBeenCalledTimes(1);
		});

		it('grants a transient approval on allowOnce and executes', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			await call(server, { url: 'https://example.com', _confirmation: 'allowOnce' });

			expect(tracker.approveOnce).toHaveBeenCalledWith(RUN_ID, 'example.com');
			expect(tool.execute).toHaveBeenCalledTimes(1);
		});

		it('denies on denyOnce without executing or approving', async () => {
			const tool = makeTool();
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			const result = await call(server, { url: 'https://example.com', _confirmation: 'denyOnce' });

			expect(result.isError).toBe(true);
			expect((result.content[0] as { text: string }).text).toContain('denied by user');
			expect(tool.execute).not.toHaveBeenCalled();
			expect(tracker.approveDomain).not.toHaveBeenCalled();
			expect(tracker.approveOnce).not.toHaveBeenCalled();
		});
	});
});
