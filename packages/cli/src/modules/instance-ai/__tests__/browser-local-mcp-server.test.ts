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
			{
				toolGroup: 'browser',
				kind: 'host',
				resource: 'example.com',
				description: 'Browser: example.com',
			},
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
	createCredentialPermissionMode: BrowserDomainGate['createCredentialPermissionMode'] = 'require_approval',
): BrowserDomainGate {
	return { tracker, runId: RUN_ID, permissionMode, createCredentialPermissionMode };
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
					{
						toolGroup: 'browser',
						kind: 'host',
						resource: 'browser',
						description: 'Browser: browser',
					},
				]),
			} as unknown as Partial<ToolDefinition>);
			const server = makeServer(tool);
			server.setDomainGate(gate(tracker));

			await call(server);

			expect(tool.execute).toHaveBeenCalledTimes(1);
		});

		it('treats a host named "credentials" as a domain, not a credential write', async () => {
			const tool = makeTool({
				getAffectedResources: vi.fn(async () => [
					{
						toolGroup: 'browser',
						kind: 'host',
						resource: 'credentials',
						description: 'Browser: credentials',
					},
				]),
			} as unknown as Partial<ToolDefinition>);
			const server = makeServer(tool);
			// Credential writes are allowed outright; the domain still has to be approved.
			server.setDomainGate(gate(tracker, 'require_approval', 'always_allow'));

			const result = await call(server);

			expect(result.isError).toBe(true);
			const text = (result.content[0] as { text: string }).text;
			const payload = JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length));
			expect(payload.options).toContain('allowForSession');
			expect(tracker.isHostAllowed).toHaveBeenCalledWith('credentials', RUN_ID);
			expect(tool.execute).not.toHaveBeenCalled();
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

describe('BrowserLocalMcpServer credential-creation gating', () => {
	let tracker: ReturnType<typeof mock<DomainAccessTracker>>;

	beforeEach(() => {
		tracker = mock<DomainAccessTracker>();
		tracker.isHostAllowed.mockReturnValue(false);
	});

	const CREDENTIAL_DESCRIPTION = 'Create credential "My key" (openAiApi)';

	function makeCredentialTool(): ToolDefinition {
		return {
			name: 'browser_create_credential',
			description: 'Assemble buffered secrets into a credential',
			inputSchema: z.object({ name: z.string(), type: z.string() }),
			execute: vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] })),
			getAffectedResources: vi.fn(async () => [
				{
					toolGroup: 'browser',
					kind: 'credential-write',
					resource: 'credentials',
					description: CREDENTIAL_DESCRIPTION,
				},
			]),
		} as unknown as ToolDefinition;
	}

	function makeCredentialServer(tool: ToolDefinition) {
		const toolkit = { tools: [tool], connection: {} } as unknown as BrowserToolkit;
		return new BrowserLocalMcpServer(toolkit, mock<ToolContext>(), mock<Logger>());
	}

	async function callCreate(server: BrowserLocalMcpServer, extra: Record<string, unknown> = {}) {
		return await server.callTool({
			name: 'browser_create_credential',
			arguments: { name: 'My key', type: 'openAiApi', ...extra },
		});
	}

	function parseConfirmation(result: Awaited<ReturnType<typeof callCreate>>) {
		const text = (result.content[0] as { text: string }).text;
		expect(text.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)).toBe(true);
		return JSON.parse(text.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length));
	}

	it('requires confirmation regardless of the domain-access mode', async () => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker, 'always_allow'));

		const result = await callCreate(server);

		expect(result.isError).toBe(true);
		expect(parseConfirmation(result)).toMatchObject({ resource: 'credentials' });
		expect(tool.execute).not.toHaveBeenCalled();
	});

	it('requires confirmation regardless of thread-level domain approvals', async () => {
		tracker.isHostAllowed.mockReturnValue(true);
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker));

		const result = await callCreate(server);

		expect(result.isError).toBe(true);
		expect(tool.execute).not.toHaveBeenCalled();
		expect(tracker.isHostAllowed).not.toHaveBeenCalled();
	});

	it('offers no session-wide option and names the credential in the confirmation', async () => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker));

		const payload = parseConfirmation(await callCreate(server));

		expect(payload.options).toEqual(['denyOnce', 'allowOnce']);
		expect(payload.description).toBe(CREDENTIAL_DESCRIPTION);
	});

	it('executes without prompting when the credential permission is always_allow', async () => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker, 'require_approval', 'always_allow'));

		await callCreate(server);

		expect(tool.execute).toHaveBeenCalledTimes(1);
	});

	it('blocks when the credential permission is blocked', async () => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker, 'always_allow', 'blocked'));

		const result = await callCreate(server);

		expect(result.isError).toBe(true);
		expect((result.content[0] as { text: string }).text).toContain('blocked by admin');
		expect(tool.execute).not.toHaveBeenCalled();
	});

	it('executes on allowOnce without recording a domain approval', async () => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker));

		await callCreate(server, { _confirmation: 'allowOnce' });

		expect(tool.execute).toHaveBeenCalledTimes(1);
		expect(tracker.approveOnce).not.toHaveBeenCalled();
		expect(tracker.approveDomain).not.toHaveBeenCalled();
	});

	it.each(['denyOnce', 'allowForSession'])('denies on %s', async (confirmation) => {
		const tool = makeCredentialTool();
		const server = makeCredentialServer(tool);
		server.setDomainGate(gate(tracker));

		const result = await callCreate(server, { _confirmation: confirmation });

		expect(result.isError).toBe(true);
		expect((result.content[0] as { text: string }).text).toContain('denied by user');
		expect(tool.execute).not.toHaveBeenCalled();
		expect(tracker.approveDomain).not.toHaveBeenCalled();
	});
});
