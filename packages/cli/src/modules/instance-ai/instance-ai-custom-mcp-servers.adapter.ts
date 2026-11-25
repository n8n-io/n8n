import { CreateMcpServerDto, mcpServerSlugFromName } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import type { InstanceAiCustomMcpServerService } from '@n8n/instance-ai';
import type { Scope } from '@n8n/permissions';

/** The project checks of the Assistant run, from `createProjectScopeHelpers`. */
export interface CustomMcpServerProjectAccess {
	/** The given project, or the project of the conversation, or the personal project, after the scope check. */
	resolveProjectId(scopes: Scope[], projectId?: string): Promise<string>;
	/** Throws when a conversation bound to a project writes to another project. */
	assertInBoundProject(projectId: string | undefined): void;
}

/**
 * The CLI side of the Assistant tool `custom-mcp-servers`. It calls the module services that the
 * REST controllers call, after the same project scope and flag check, and marks each event with
 * the source "assistant". The host wires the service only for a user with the flag variant `test`.
 */
@Service()
export class InstanceAiCustomMcpServersAdapterService {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	createService(
		user: User,
		options: { threadId?: string; access: CustomMcpServerProjectAccess },
	): InstanceAiCustomMcpServerService | undefined {
		if (!this.moduleRegistry.isActive('mcp-servers')) return undefined;
		const { access, threadId } = options;
		const actor = { userId: user.id, source: 'assistant' as const, threadId };

		const services = async () => {
			const { CustomMcpServersFlagGate, McpServersService, McpServerToolsService } = await import(
				'@n8n/backend-module-mcp-servers'
			);
			// As the REST routes do on each request: the gates of a turn are read once, and an
			// approval can resume after the flag changed.
			await Container.get(CustomMcpServersFlagGate).assertEnabled(user);
			return {
				servers: Container.get(McpServersService),
				tools: Container.get(McpServerToolsService),
			};
		};
		const readProject = async (scope: Scope, projectId?: string) =>
			await access.resolveProjectId([scope], projectId);
		const writeProject = async (scope: Scope, projectId?: string) => {
			const resolved = await access.resolveProjectId([scope], projectId);
			access.assertInBoundProject(resolved);
			return resolved;
		};

		return {
			list: async (projectId) => {
				const { servers } = await services();
				if (projectId === undefined) return await servers.listForUser(user);
				return await servers.list(await readProject('mcpServer:list', projectId));
			},
			get: async ({ serverId, projectId }) => {
				const { servers, tools } = await services();
				const resolved = await readProject('mcpServer:read', projectId);
				const server = await servers.get(resolved, serverId);
				const [serverTools, toolDraftsAvailable] = await Promise.all([
					tools.listTools(resolved, server.id),
					tools.draftsAvailable(user),
				]);
				return { ...server, tools: serverTools, toolDraftsAvailable };
			},
			getServer: async ({ serverId, projectId }) => {
				const { servers } = await services();
				return await servers.get(await readProject('mcpServer:read', projectId), serverId);
			},
			getTool: async ({ serverId, projectId }, toolId) => {
				const { servers, tools } = await services();
				const resolved = await readProject('mcpServer:read', projectId);
				const [server, tool, toolDraftsAvailable] = await Promise.all([
					servers.get(resolved, serverId),
					tools.getTool(resolved, serverId, toolId),
					tools.draftsAvailable(user),
				]);
				return { server, tool, toolDraftsAvailable };
			},
			// The card of add-tools names the workflows. The write needs `update`, as the picker does.
			workflowNames: async ({ projectId }, workflowIds) => {
				const { tools } = await services();
				return await tools.workflowNames(
					await readProject('mcpServer:update', projectId),
					workflowIds,
				);
			},
			assertCanWrite: async (projectId, change) => {
				await writeProject(`mcpServer:${change}`, projectId);
			},
			create: async ({ projectId, name, slug, description }) => {
				const madeSlug = slug ?? mcpServerSlugFromName(name);
				if (!madeSlug) throw new UserError('The name has no letters or digits, so pass a slug.');
				const dto = CreateMcpServerDto.parse({ name, slug: madeSlug, description });
				const { servers } = await services();
				return await servers.create(await writeProject('mcpServer:create', projectId), dto, actor);
			},
			update: async ({ serverId, projectId }, changes) => {
				const { servers } = await services();
				return await servers.update(
					await writeProject('mcpServer:update', projectId),
					serverId,
					changes,
				);
			},
			delete: async ({ serverId, projectId }) => {
				const { servers } = await services();
				await servers.delete(await writeProject('mcpServer:delete', projectId), serverId, actor);
			},
			// The REST route needs `update` too: the picker only serves a change of the server.
			listToolCandidates: async ({ serverId, projectId }, options) => {
				const { tools } = await services();
				return await tools.findCandidates(
					await readProject('mcpServer:update', projectId),
					serverId,
					options,
				);
			},
			addTools: async ({ serverId, projectId }, workflowIds) => {
				const { tools } = await services();
				return await tools.addWorkflowTools(
					await writeProject('mcpServer:update', projectId),
					serverId,
					workflowIds,
					actor,
				);
			},
			updateTool: async ({ serverId, projectId }, toolId, changes) => {
				const { tools } = await services();
				return await tools.updateTool(
					await writeProject('mcpServer:update', projectId),
					serverId,
					toolId,
					changes,
				);
			},
			generateTool: async ({ serverId, projectId }, toolId, field) => {
				const { tools } = await services();
				return await tools.draftTool(
					user,
					await writeProject('mcpServer:update', projectId),
					serverId,
					toolId,
					field,
				);
			},
			removeTool: async ({ serverId, projectId }, toolId) => {
				const { tools } = await services();
				await tools.removeTool(await writeProject('mcpServer:update', projectId), serverId, toolId);
			},
		};
	}
}
