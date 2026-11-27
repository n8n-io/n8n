import type { McpServerResponse, McpServerToolResponse } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import {
	CustomMcpServersFlagGate,
	McpServersService,
	McpServerToolsService,
} from '@n8n/backend-module-mcp-servers';
import { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import {
	InstanceAiCustomMcpServersAdapterService,
	type CustomMcpServerProjectAccess,
} from '../instance-ai-custom-mcp-servers.adapter';

vi.mock('@n8n/backend-module-mcp-servers', () => ({
	CustomMcpServersFlagGate: class CustomMcpServersFlagGate {},
	McpServersService: class McpServersService {},
	McpServerToolsService: class McpServerToolsService {},
}));

const SERVER_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a01';
const TOOL_ID = '7b0c2a52-3c1f-4f53-9a51-0c0d8c3a0a02';

const server = mock<McpServerResponse>({ id: SERVER_ID, projectId: 'project-1' });
const tool = mock<McpServerToolResponse>({ id: TOOL_ID });

describe('InstanceAiCustomMcpServersAdapterService', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const servers = mock<McpServersService>();
	const tools = mock<McpServerToolsService>();
	const flagGate = mock<CustomMcpServersFlagGate>();
	const moduleRegistry = mock<ModuleRegistry>();
	const access = mock<CustomMcpServerProjectAccess>();
	const adapter = new InstanceAiCustomMcpServersAdapterService(moduleRegistry);
	const actor = { userId: 'user-1', source: 'assistant', threadId: 'thread-1' };

	function createService() {
		const service = adapter.createService(user, { threadId: 'thread-1', access });
		if (!service) throw new Error('The adapter must give a service while the module is on.');
		return service;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(McpServersService, servers);
		Container.set(McpServerToolsService, tools);
		Container.set(CustomMcpServersFlagGate, flagGate);
		flagGate.assertEnabled.mockReset().mockResolvedValue(undefined);
		moduleRegistry.isActive.mockReturnValue(true);
		access.assertInBoundProject.mockReset();
		// The resolved project is the given one, or the project of the conversation.
		access.resolveProjectId.mockImplementation(async (_scopes, projectId) => projectId ?? 'bound');
	});

	it('gives no service while the module is off', () => {
		moduleRegistry.isActive.mockReturnValue(false);

		expect(adapter.createService(user, { access })).toBeUndefined();
		expect(moduleRegistry.isActive).toHaveBeenCalledWith('mcp-servers');
	});

	describe('list', () => {
		it('lists the servers of every project that the user can see, without a project', async () => {
			servers.listForUser.mockResolvedValue([server]);

			await expect(createService().list()).resolves.toEqual([server]);

			expect(servers.listForUser).toHaveBeenCalledWith(user);
			expect(access.resolveProjectId).not.toHaveBeenCalled();
		});

		it('checks the list scope in the given project', async () => {
			servers.list.mockResolvedValue([server]);

			await createService().list('project-2');

			expect(access.resolveProjectId).toHaveBeenCalledWith(['mcpServer:list'], 'project-2');
			expect(servers.list).toHaveBeenCalledWith('project-2');
		});
	});

	it('reads a server with its tools and whether drafts work, with the read scope', async () => {
		servers.get.mockResolvedValue(server);
		tools.listTools.mockResolvedValue([tool]);
		tools.draftsAvailable.mockResolvedValue(true);

		const detail = await createService().get({ serverId: SERVER_ID });

		expect(access.resolveProjectId).toHaveBeenCalledWith(['mcpServer:read'], undefined);
		expect(servers.get).toHaveBeenCalledWith('bound', SERVER_ID);
		expect(tools.listTools).toHaveBeenCalledWith('bound', SERVER_ID);
		expect(detail).toEqual({ ...server, tools: [tool], toolDraftsAvailable: true });
	});

	describe('reads for an approval card', () => {
		it('reads one tool and its server, without the other tools', async () => {
			servers.get.mockResolvedValue(server);
			tools.getTool.mockResolvedValue(tool);
			tools.draftsAvailable.mockResolvedValue(false);

			const result = await createService().getTool({ serverId: SERVER_ID }, TOOL_ID);

			expect(access.resolveProjectId).toHaveBeenCalledWith(['mcpServer:read'], undefined);
			expect(tools.getTool).toHaveBeenCalledWith('bound', SERVER_ID, TOOL_ID);
			expect(tools.listTools).not.toHaveBeenCalled();
			expect(result).toEqual({ server, tool, toolDraftsAvailable: false });
		});

		it('reads only the names of the given workflows', async () => {
			tools.workflowNames.mockResolvedValue([{ workflowId: 'workflow-1', name: 'Lead score' }]);

			await createService().workflowNames({ serverId: SERVER_ID, projectId: 'project-1' }, [
				'workflow-1',
			]);

			expect(access.resolveProjectId).toHaveBeenCalledWith(['mcpServer:update'], 'project-1');
			expect(tools.workflowNames).toHaveBeenCalledWith('project-1', ['workflow-1']);
			expect(tools.findCandidates).not.toHaveBeenCalled();
		});
	});

	describe('assertCanWrite', () => {
		it.each(['create', 'update', 'delete'] as const)(
			'checks the %s scope and the bound project',
			async (change) => {
				await createService().assertCanWrite('project-1', change);

				expect(access.resolveProjectId).toHaveBeenCalledWith([`mcpServer:${change}`], 'project-1');
				expect(access.assertInBoundProject).toHaveBeenCalledWith('project-1');
			},
		);

		it('throws with the flag off, before the scope check, so no card shows', async () => {
			flagGate.assertEnabled.mockRejectedValue(new Error('Not found'));

			await expect(createService().assertCanWrite('project-1', 'create')).rejects.toThrow(
				'Not found',
			);
			expect(access.resolveProjectId).not.toHaveBeenCalled();
		});

		it('throws when the user has no scope in the project', async () => {
			access.resolveProjectId.mockRejectedValue(
				new Error('User does not have the required permissions in this project'),
			);

			await expect(createService().assertCanWrite('project-2', 'delete')).rejects.toThrow(
				'User does not have the required permissions in this project',
			);
		});
	});

	describe('input checks of the REST DTOs', () => {
		const ref = { serverId: SERVER_ID, projectId: 'project-1' };
		const ids = (count: number) => Array.from({ length: count }, (_, i) => `workflow-${i}`);

		it.each([0, 101])('refuses to add %i workflows', async (count) => {
			await expect(createService().addTools(ref, ids(count))).rejects.toThrow();
			expect(tools.addWorkflowTools).not.toHaveBeenCalled();
		});

		it('adds 100 workflows', async () => {
			tools.addWorkflowTools.mockResolvedValue([tool]);

			await createService().addTools(ref, ids(100));

			expect(tools.addWorkflowTools).toHaveBeenCalledWith('project-1', SERVER_ID, ids(100), actor);
		});

		it('refuses a server description over the limit', async () => {
			await expect(
				createService().update(ref, { description: 'x'.repeat(2001) }),
			).rejects.toThrow();
			expect(servers.update).not.toHaveBeenCalled();
		});

		it('refuses a tool name that AI clients cannot call', async () => {
			await expect(
				createService().updateTool(ref, TOOL_ID, { toolName: 'Not a tool name' }),
			).rejects.toThrow();
			expect(tools.updateTool).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		it('makes the slug from the name, and marks the event with the Assistant source', async () => {
			servers.create.mockResolvedValue(server);

			await createService().create({ projectId: 'project-1', name: 'Marketing Tools' });

			expect(access.resolveProjectId).toHaveBeenCalledWith(['mcpServer:create'], 'project-1');
			expect(access.assertInBoundProject).toHaveBeenCalledWith('project-1');
			expect(servers.create).toHaveBeenCalledWith(
				'project-1',
				{ name: 'Marketing Tools', slug: 'marketing-tools', description: '' },
				actor,
			);
		});

		it('keeps the slug that the model sent', async () => {
			servers.create.mockResolvedValue(server);

			await createService().create({ name: 'Marketing Tools', slug: 'campaigns' });

			expect(servers.create).toHaveBeenCalledWith(
				'bound',
				expect.objectContaining({ slug: 'campaigns' }),
				actor,
			);
		});

		it('asks for a slug when the name has no letter or digit', async () => {
			await expect(createService().create({ name: '???' })).rejects.toThrow(
				'The name has no letters or digits, so pass a slug.',
			);
			expect(servers.create).not.toHaveBeenCalled();
		});
	});

	it('checks the flag on each call, so a turn that started before the flag went off writes nothing', async () => {
		flagGate.assertEnabled.mockRejectedValue(new Error('Not found'));

		await expect(createService().delete({ serverId: SERVER_ID })).rejects.toThrow('Not found');

		expect(flagGate.assertEnabled).toHaveBeenCalledWith();
		expect(servers.delete).not.toHaveBeenCalled();
	});

	it('does not write outside the project of the conversation', async () => {
		access.assertInBoundProject.mockImplementation(() => {
			throw new Error('outside the thread project');
		});

		await expect(
			createService().delete({ serverId: SERVER_ID, projectId: 'other' }),
		).rejects.toThrow('outside the thread project');
		expect(servers.delete).not.toHaveBeenCalled();
	});

	it('updates and deletes with their own scopes', async () => {
		servers.update.mockResolvedValue(server);
		const service = createService();

		await service.update({ serverId: SERVER_ID }, { name: 'Campaign Tools' });
		await service.delete({ serverId: SERVER_ID });

		expect(access.resolveProjectId).toHaveBeenNthCalledWith(1, ['mcpServer:update'], undefined);
		expect(servers.update).toHaveBeenCalledWith('bound', SERVER_ID, { name: 'Campaign Tools' });
		expect(access.resolveProjectId).toHaveBeenNthCalledWith(2, ['mcpServer:delete'], undefined);
		expect(servers.delete).toHaveBeenCalledWith('bound', SERVER_ID, actor);
	});

	it('runs the tool actions with the update scope, as the REST routes do', async () => {
		tools.findCandidates.mockResolvedValue({ candidates: [], unusable: 0, more: false });
		tools.addWorkflowTools.mockResolvedValue([tool]);
		tools.updateTool.mockResolvedValue(tool);
		tools.draftTool.mockResolvedValue({ status: 'drafted', tool });
		const service = createService();
		const ref = { serverId: SERVER_ID, projectId: 'project-1' };

		await service.listToolCandidates(ref, { query: 'lead', limit: 20 });
		await service.addTools(ref, ['workflow-1']);
		await service.updateTool(ref, TOOL_ID, { toolName: 'campaign_stats' });
		await service.generateTool(ref, TOOL_ID, 'description');
		await service.removeTool(ref, TOOL_ID);

		expect(access.resolveProjectId).toHaveBeenCalledTimes(5);
		for (const call of access.resolveProjectId.mock.calls) {
			expect(call).toEqual([['mcpServer:update'], 'project-1']);
		}
		expect(tools.findCandidates).toHaveBeenCalledWith('project-1', SERVER_ID, {
			query: 'lead',
			limit: 20,
		});
		expect(tools.addWorkflowTools).toHaveBeenCalledWith(
			'project-1',
			SERVER_ID,
			['workflow-1'],
			actor,
		);
		// The Assistant wrote the text, so the tool keeps the draft source of an AI draft.
		expect(tools.updateTool).toHaveBeenCalledWith(
			'project-1',
			SERVER_ID,
			TOOL_ID,
			{ toolName: 'campaign_stats' },
			'ai',
		);
		expect(tools.draftTool).toHaveBeenCalledWith(
			user,
			'project-1',
			SERVER_ID,
			TOOL_ID,
			actor,
			'description',
		);
		expect(tools.removeTool).toHaveBeenCalledWith('project-1', SERVER_ID, TOOL_ID);
		// Reading the candidates writes nothing, so it may look at another project.
		expect(access.assertInBoundProject).toHaveBeenCalledTimes(4);
	});
});
