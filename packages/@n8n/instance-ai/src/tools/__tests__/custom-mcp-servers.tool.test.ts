import type {
	InstanceAiPermissions,
	McpServerDetailResponse,
	McpServerResponse,
	McpServerToolResponse,
} from '@n8n/api-types';
import type { Mock } from 'vitest';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiCustomMcpServerService } from '../../types';
import { createCustomMcpServersTool } from '../custom-mcp-servers.tool';

const SERVER_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a01';
const TOOL_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a02';

const server: McpServerResponse = {
	id: SERVER_ID,
	projectId: 'project-1',
	project: { name: 'Marketing', type: 'team' },
	name: 'Marketing Tools',
	slug: 'marketing-tools',
	description: 'Tools for the campaign team',
	createdAt: '2026-11-20T00:00:00.000Z',
	updatedAt: '2026-11-21T00:00:00.000Z',
};

const tool: McpServerToolResponse = {
	id: TOOL_ID,
	serverId: SERVER_ID,
	kind: 'workflow',
	targetId: 'workflow-1',
	toolName: 'get_campaign_stats',
	description: 'Reads the stats of one campaign',
	draftSource: 'defaults',
	position: 0,
	brokenReason: null,
	createdAt: '2026-11-20T00:00:00.000Z',
	updatedAt: '2026-11-20T00:00:00.000Z',
};

const detail: McpServerDetailResponse = { ...server, tools: [tool], toolDraftsAvailable: true };

type ServiceMock = { [K in keyof InstanceAiCustomMcpServerService]: Mock };

function createService(): ServiceMock {
	return {
		list: vi.fn().mockResolvedValue([server]),
		get: vi.fn().mockResolvedValue(detail),
		getServer: vi.fn().mockResolvedValue(server),
		getTool: vi.fn().mockResolvedValue({ server, tool, toolDraftsAvailable: true }),
		workflowNames: vi.fn().mockResolvedValue([]),
		assertCanWrite: vi.fn().mockResolvedValue(undefined),
		create: vi.fn().mockResolvedValue(server),
		update: vi.fn().mockResolvedValue(server),
		delete: vi.fn().mockResolvedValue(undefined),
		listToolCandidates: vi.fn().mockResolvedValue({ candidates: [], unusable: 0, more: false }),
		addTools: vi.fn().mockResolvedValue([tool]),
		updateTool: vi.fn().mockResolvedValue(tool),
		generateTool: vi.fn().mockResolvedValue({ status: 'drafted', tool }),
		removeTool: vi.fn().mockResolvedValue(undefined),
	};
}

function createContext(
	service: ServiceMock,
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		customMcpServerService: service,
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspend: Mock) {
	return { resumeData: undefined, suspend } as never;
}

function resumeCtx(approved: boolean, scope?: 'once' | 'session') {
	return { resumeData: { approved, ...(scope ? { scope } : {}) }, suspend: vi.fn() } as never;
}

describe('custom-mcp-servers tool', () => {
	let service: ServiceMock;

	beforeEach(() => {
		service = createService();
	});

	it('lists the servers of a project', async () => {
		const tool = createCustomMcpServersTool(createContext(service));

		const result = await executeTool(tool, { action: 'list', projectId: 'project-1' });

		expect(service.list).toHaveBeenCalledWith('project-1');
		expect(result).toEqual({
			servers: [
				{
					id: SERVER_ID,
					projectId: 'project-1',
					projectName: 'Marketing',
					name: 'Marketing Tools',
					slug: 'marketing-tools',
					description: 'Tools for the campaign team',
				},
			],
		});
	});

	it('reads one server with its tools, and says whether "Generate" works', async () => {
		const tool = createCustomMcpServersTool(createContext(service));

		const result = await executeTool(tool, {
			action: 'get',
			serverId: SERVER_ID,
			projectId: 'project-1',
		});

		expect(service.get).toHaveBeenCalledWith({ serverId: SERVER_ID, projectId: 'project-1' });
		expect(result).toEqual({
			server: {
				id: SERVER_ID,
				projectId: 'project-1',
				projectName: 'Marketing',
				name: 'Marketing Tools',
				slug: 'marketing-tools',
				description: 'Tools for the campaign team',
			},
			tools: [
				{
					id: TOOL_ID,
					workflowId: 'workflow-1',
					toolName: 'get_campaign_stats',
					description: 'Reads the stats of one campaign',
					brokenReason: null,
				},
			],
			generateAvailable: true,
		});
	});

	describe('create', () => {
		const input = {
			action: 'create',
			projectId: 'project-1',
			name: 'Marketing Tools',
			description: 'Tools for the campaign team',
		};

		it('asks for approval first, with the server name on the card', async () => {
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(suspend),
			);

			expect(service.create).not.toHaveBeenCalled();
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					resourceName: 'Marketing Tools',
					message:
						'Create a custom MCP server at the URL /mcp-servers/marketing-tools. The URL never changes. AI clients can connect to it after you add tools.',
					severity: 'info',
				}),
			);
		});

		it('refuses without a card when the name gives no slug', async () => {
			const suspend = vi.fn();

			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				{ ...input, name: 'マーケティング' },
				suspendCtx(suspend),
			);

			expect(result).toMatchObject({ success: false, refused: true });
			expect(suspend).not.toHaveBeenCalled();
			expect(service.assertCanWrite).not.toHaveBeenCalled();
		});

		it('creates the server after the approval', async () => {
			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				resumeCtx(true),
			);

			expect(service.create).toHaveBeenCalledWith({
				projectId: 'project-1',
				name: 'Marketing Tools',
				slug: 'marketing-tools',
				description: 'Tools for the campaign team',
			});
			expect(result).toMatchObject({ success: true, server: { id: SERVER_ID } });
			expect(result).not.toHaveProperty('serverMutated');
		});

		it('creates nothing when the user denies', async () => {
			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				resumeCtx(false),
			);

			expect(service.create).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
		});

		it('does not ask again in this conversation after an approval for the session', async () => {
			const grantSessionToolApproval = vi.fn();
			await executeTool(
				createCustomMcpServersTool(createContext(service, { grantSessionToolApproval })),
				input,
				resumeCtx(true, 'session'),
			);
			expect(grantSessionToolApproval).toHaveBeenCalledWith('custom-mcp-servers:create');

			const suspend = vi.fn();
			await executeTool(
				createCustomMcpServersTool(
					createContext(service, {
						sessionApprovedToolKeys: new Set(['custom-mcp-servers:create']),
					}),
				),
				input,
				suspendCtx(suspend),
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(service.create).toHaveBeenCalledTimes(2);
		});

		it('keeps the grant to this action, so other writes still ask', async () => {
			const context = createContext(service, {
				sessionApprovedToolKeys: new Set(['custom-mcp-servers:create']),
			});
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(context),
				{ action: 'add-tools', serverId: SERVER_ID, workflowIds: ['workflow-2'] },
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalled();
			expect(service.addTools).not.toHaveBeenCalled();
		});
	});

	describe('write access', () => {
		it.each<[Record<string, unknown>, string]>([
			[{ action: 'delete', serverId: SERVER_ID, projectId: 'project-2' }, 'delete'],
			[{ action: 'update', serverId: SERVER_ID, name: 'Other' }, 'update'],
			[{ action: 'remove-tool', serverId: SERVER_ID, toolId: TOOL_ID }, 'update'],
			[{ action: 'create', name: 'Sales Tools' }, 'create'],
			[{ action: 'add-tools', serverId: SERVER_ID, workflowIds: ['workflow-1'] }, 'update'],
			[{ action: 'update-tool', serverId: SERVER_ID, toolId: TOOL_ID, toolName: 'x_y' }, 'update'],
			[{ action: 'generate', serverId: SERVER_ID, toolId: TOOL_ID }, 'update'],
		])('shows no card when the user cannot make the change: %j', async (input, change) => {
			service.assertCanWrite.mockRejectedValue(
				new Error('User does not have the required permissions in this project'),
			);
			const suspend = vi.fn();

			await expect(
				executeTool(createCustomMcpServersTool(createContext(service)), input, suspendCtx(suspend)),
			).rejects.toThrow('User does not have the required permissions in this project');

			expect(service.assertCanWrite).toHaveBeenCalledWith(input.projectId, change);
			expect(suspend).not.toHaveBeenCalled();
		});

		it('reads one tool, not the whole server, for a tool card', async () => {
			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				{ action: 'update-tool', serverId: SERVER_ID, toolId: TOOL_ID, description: 'New' },
				suspendCtx(vi.fn()),
			);

			expect(service.getTool).toHaveBeenCalledWith(
				{ serverId: SERVER_ID, projectId: undefined },
				TOOL_ID,
			);
			expect(service.get).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		const input = { action: 'delete', serverId: SERVER_ID, projectId: 'project-1' };

		it('asks first, with a destructive card that names the server', async () => {
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(suspend),
			);

			expect(service.delete).not.toHaveBeenCalled();
			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					resourceName: 'Marketing Tools',
					message:
						'Delete the server. AI clients lose access to its tools now. Its URL /mcp-servers/marketing-tools stays reserved. You cannot undo this.',
					severity: 'destructive',
				}),
			);
		});

		it('asks again even when the user allowed other writes for this conversation', async () => {
			const suspend = vi.fn();
			const context = createContext(service, {
				sessionApprovedToolKeys: new Set([
					'custom-mcp-servers:delete',
					'custom-mcp-servers:create',
				]),
			});

			await executeTool(createCustomMcpServersTool(context), input, suspendCtx(suspend));

			expect(suspend).toHaveBeenCalled();
			expect(service.delete).not.toHaveBeenCalled();
		});

		it('deletes the server after the approval', async () => {
			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				resumeCtx(true),
			);

			expect(service.delete).toHaveBeenCalledWith({ serverId: SERVER_ID, projectId: 'project-1' });
			expect(result).toEqual({ success: true, serverMutated: true, serverId: SERVER_ID });
		});

		it('deletes without asking when an admin always allows it', async () => {
			const suspend = vi.fn();
			const context = createContext(service, { permissions: { deleteMcpServer: 'always_allow' } });

			await executeTool(createCustomMcpServersTool(context), input, suspendCtx(suspend));

			expect(suspend).not.toHaveBeenCalled();
			expect(service.delete).toHaveBeenCalled();
		});

		it('refuses when an admin blocked it', async () => {
			const suspend = vi.fn();
			const context = createContext(service, { permissions: { deleteMcpServer: 'blocked' } });

			const result = await executeTool(
				createCustomMcpServersTool(context),
				input,
				suspendCtx(suspend),
			);

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(suspend).not.toHaveBeenCalled();
			expect(service.delete).not.toHaveBeenCalled();
		});
	});

	it('asks before it changes the name or the description of a server', async () => {
		const tool = createCustomMcpServersTool(createContext(service));
		const input = { action: 'update', serverId: SERVER_ID, name: 'Campaign Tools' };
		const suspend = vi.fn();

		await executeTool(tool, input, suspendCtx(suspend));
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceName: 'Marketing Tools',
				message: 'Rename the server to "Campaign Tools".',
				severity: 'info',
			}),
		);
		expect(service.update).not.toHaveBeenCalled();

		await executeTool(tool, input, resumeCtx(true));
		expect(service.update).toHaveBeenCalledWith(
			{ serverId: SERVER_ID, projectId: undefined },
			{ name: 'Campaign Tools' },
		);
	});

	it('marks its output as untrusted data', () => {
		expect(createCustomMcpServersTool(createContext(service)).outputTrust).toBe('untrusted');
	});

	describe('tool-candidates', () => {
		const candidates = [
			{ workflowId: 'workflow-2', name: 'Lead score', description: null, reason: null },
		];

		it('lists the workflows that can be tools, without asking', async () => {
			service.listToolCandidates.mockResolvedValue({ candidates, unusable: 0, more: false });
			const suspend = vi.fn();

			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				{ action: 'tool-candidates', serverId: SERVER_ID },
				suspendCtx(suspend),
			);

			expect(result).toEqual({ candidates, more: false, unusableLeftOut: 0 });
			expect(service.listToolCandidates).toHaveBeenCalledWith(
				{ serverId: SERVER_ID, projectId: undefined },
				{ query: undefined, limit: 50, includeUnusable: false },
			);
			expect(suspend).not.toHaveBeenCalled();
		});

		it('passes the query and the limit, and says what it left out', async () => {
			service.listToolCandidates.mockResolvedValue({ candidates, unusable: 3, more: true });

			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				{
					action: 'tool-candidates',
					serverId: SERVER_ID,
					query: 'lead',
					limit: 1,
					includeUnusable: false,
				},
				suspendCtx(vi.fn()),
			);

			expect(service.listToolCandidates).toHaveBeenCalledWith(
				{ serverId: SERVER_ID, projectId: undefined },
				{ query: 'lead', limit: 1, includeUnusable: false },
			);
			expect(result).toEqual({
				candidates,
				more: true,
				unusableLeftOut: 3,
				note:
					'More workflows fit. Pass a query, or a higher limit, to see them. ' +
					'3 workflows that cannot be a tool are left out. Pass includeUnusable to see why.',
			});
		});
	});

	describe('add-tools', () => {
		const input = {
			action: 'add-tools',
			serverId: SERVER_ID,
			workflowIds: ['workflow-2', 'workflow-4'],
		};

		it('names the workflows on the card', async () => {
			service.workflowNames.mockResolvedValue([{ workflowId: 'workflow-2', name: 'Lead score' }]);
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					resourceName: 'Marketing Tools',
					message: 'Add 2 workflows as tools: Lead score, workflow-4.',
					severity: 'info',
				}),
			);
			expect(service.addTools).not.toHaveBeenCalled();
		});

		it.each([0, 101])('shows no card for %i workflows', async (count) => {
			const suspend = vi.fn();
			const workflowIds = Array.from({ length: count }, (_, i) => `workflow-${i}`);

			await expect(
				executeTool(
					createCustomMcpServersTool(createContext(service)),
					{ ...input, workflowIds },
					suspendCtx(suspend),
				),
			).rejects.toThrow('Invalid input. workflowIds:');
			expect(suspend).not.toHaveBeenCalled();
		});

		it('reads only the names of the given workflows for the card', async () => {
			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(vi.fn()),
			);

			expect(service.workflowNames).toHaveBeenCalledWith(
				{ serverId: SERVER_ID, projectId: undefined },
				['workflow-2', 'workflow-4'],
			);
			expect(service.listToolCandidates).not.toHaveBeenCalled();
			expect(service.get).not.toHaveBeenCalled();
		});

		it('adds the tools after the approval', async () => {
			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				resumeCtx(true),
			);

			expect(service.addTools).toHaveBeenCalledWith({ serverId: SERVER_ID, projectId: undefined }, [
				'workflow-2',
				'workflow-4',
			]);
			expect(result).toMatchObject({
				success: true,
				serverMutated: true,
				tools: [{ id: TOOL_ID, toolName: 'get_campaign_stats' }],
			});
		});
	});

	it('asks before it changes the text of a tool', async () => {
		const tool = createCustomMcpServersTool(createContext(service));
		const input = {
			action: 'update-tool',
			serverId: SERVER_ID,
			toolId: TOOL_ID,
			toolName: 'campaign_stats',
		};
		const suspend = vi.fn();

		await executeTool(tool, input, suspendCtx(suspend));
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceName: 'get_campaign_stats',
				message: 'Change the tool name to "campaign_stats". AI clients see the change at once.',
			}),
		);

		await executeTool(tool, input, resumeCtx(true));
		expect(service.updateTool).toHaveBeenCalledWith(
			{ serverId: SERVER_ID, projectId: undefined },
			TOOL_ID,
			{ toolName: 'campaign_stats' },
		);
	});

	it('asks before it removes a tool', async () => {
		const tool = createCustomMcpServersTool(createContext(service));
		const input = { action: 'remove-tool', serverId: SERVER_ID, toolId: TOOL_ID };
		const suspend = vi.fn();

		await executeTool(tool, input, suspendCtx(suspend));
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceName: 'get_campaign_stats',
				message: 'Remove the tool from Marketing Tools. AI clients cannot call it after this.',
				severity: 'warning',
			}),
		);

		const result = await executeTool(tool, input, resumeCtx(true));
		expect(service.removeTool).toHaveBeenCalledWith(
			{ serverId: SERVER_ID, projectId: undefined },
			TOOL_ID,
		);
		expect(result).toEqual({ success: true, serverMutated: true, toolId: TOOL_ID });
	});

	it('asks before each removal, even after "Allow for this chat"', async () => {
		const grantSessionToolApproval = vi.fn();
		const input = { action: 'remove-tool', serverId: SERVER_ID, toolId: TOOL_ID };
		await executeTool(
			createCustomMcpServersTool(createContext(service, { grantSessionToolApproval })),
			input,
			resumeCtx(true, 'session'),
		);
		expect(grantSessionToolApproval).not.toHaveBeenCalled();

		const suspend = vi.fn();
		await executeTool(
			createCustomMcpServersTool(
				createContext(service, {
					sessionApprovedToolKeys: new Set(['custom-mcp-servers:remove-tool']),
				}),
			),
			input,
			suspendCtx(suspend),
		);
		expect(suspend).toHaveBeenCalled();
	});

	it('tells the model when the tool is not on the server', async () => {
		service.getTool.mockRejectedValue(new Error('Tool not found'));
		const suspend = vi.fn();

		await expect(
			executeTool(
				createCustomMcpServersTool(createContext(service)),
				{ action: 'remove-tool', serverId: SERVER_ID, toolId: 'other-tool' },
				suspendCtx(suspend),
			),
		).rejects.toThrow('Tool not found');
		expect(suspend).not.toHaveBeenCalled();
	});

	describe('generate', () => {
		const input = {
			action: 'generate',
			serverId: SERVER_ID,
			toolId: TOOL_ID,
			field: 'description',
		};

		it('asks before it writes the text again', async () => {
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					resourceName: 'get_campaign_stats',
					message: 'Write the tool description again with AI, from the workflow.',
					severity: 'info',
				}),
			);
			expect(service.generateTool).not.toHaveBeenCalled();
		});

		it('names both fields on the card when the model sends no field', async () => {
			const suspend = vi.fn();

			await executeTool(
				createCustomMcpServersTool(createContext(service)),
				{ action: 'generate', serverId: SERVER_ID, toolId: TOOL_ID },
				suspendCtx(suspend),
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Write the tool name and the tool description again with AI, from the workflow.',
				}),
			);
		});

		it('returns the new text after the approval', async () => {
			const drafted = { ...tool, description: 'Returns clicks and spend for one campaign' };
			service.generateTool.mockResolvedValue({ status: 'drafted', tool: drafted });

			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				resumeCtx(true),
			);

			expect(service.generateTool).toHaveBeenCalledWith(
				{ serverId: SERVER_ID, projectId: undefined },
				TOOL_ID,
				'description',
			);
			expect(result).toMatchObject({
				success: true,
				tool: { description: 'Returns clicks and spend for one campaign' },
			});
		});

		it('refuses without a card when AI drafts are not available', async () => {
			service.getTool.mockResolvedValue({ server, tool, toolDraftsAvailable: false });
			const suspend = vi.fn();

			const result = await executeTool(
				createCustomMcpServersTool(createContext(service)),
				input,
				suspendCtx(suspend),
			);

			expect(result).toEqual({
				success: false,
				refused: true,
				reason: 'AI drafts are not available for this user. Write the text with update-tool.',
			});
			expect(suspend).not.toHaveBeenCalled();
		});

		it('refuses when AI drafts turned off between the card and the approval', async () => {
			service.generateTool.mockResolvedValue({ status: 'not_available', tool });

			await expect(
				executeTool(createCustomMcpServersTool(createContext(service)), input, resumeCtx(true)),
			).resolves.toMatchObject({
				success: false,
				refused: true,
				reason: 'AI drafts are not available for this user. Write the text with update-tool.',
			});
		});
	});

	describe('input schema', () => {
		const tool = createCustomMcpServersTool(createContext(createService()));

		it.each([
			{ action: 'list' },
			{ action: 'get', serverId: SERVER_ID },
			{ action: 'create', name: 'Sales Tools', slug: 'sales-tools', description: 'For sales' },
			{ action: 'update', serverId: SERVER_ID, name: 'Sales' },
			{ action: 'delete', serverId: SERVER_ID },
			{
				action: 'tool-candidates',
				serverId: SERVER_ID,
				query: 'lead',
				limit: 10,
				includeUnusable: true,
			},
			{ action: 'add-tools', serverId: SERVER_ID, workflowIds: ['workflow-1'] },
			{ action: 'update-tool', serverId: SERVER_ID, toolId: TOOL_ID, toolName: 'get_leads' },
			{ action: 'generate', serverId: SERVER_ID, toolId: TOOL_ID, field: 'description' },
			{ action: 'remove-tool', serverId: SERVER_ID, toolId: TOOL_ID },
		])('accepts the action $action', (input) => {
			expect(parseToolInput(tool, input).success).toBe(true);
		});

		it.each([
			['an unknown action', { action: 'connect', serverId: SERVER_ID }],
			['a get without a server', { action: 'get' }],
			['a slug with capitals', { action: 'create', name: 'Sales', slug: 'Sales' }],
			[
				'a tool name with a dash',
				{ action: 'update-tool', serverId: SERVER_ID, toolId: TOOL_ID, toolName: 'get-leads' },
			],
			[
				'an unknown field to generate',
				{ action: 'generate', serverId: SERVER_ID, toolId: TOOL_ID, field: 'name' },
			],
			['a limit over 100', { action: 'tool-candidates', serverId: SERVER_ID, limit: 101 }],
		])('refuses %s', (_case, input) => {
			expect(parseToolInput(tool, input).success).toBe(false);
		});
	});
});
