import {
	mcpServerSchema,
	type CreateMcpServerDto,
	type McpServerResponse,
	type McpServerSlugAvailability,
	type UpdateMcpServerDto,
} from '@n8n/api-types';
import { EventService, ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError, UnexpectedError } from '@n8n/errors';

import { RefreshTokenPort } from '../access/refresh-token-port';
import { McpServerProtectedResource } from '../runtime/mcp-server-protected-resource';
import type { McpServer } from '../database/entities/mcp-server.entity';
import type { McpServerActor } from '../mcp-server-events';
import {
	McpServerRepository,
	type McpServerProject,
} from '../database/repositories/mcp-server.repository';

function toResponse(server: McpServer, project: McpServerProject): McpServerResponse {
	return {
		id: server.id,
		projectId: server.projectId,
		project,
		name: server.name,
		slug: server.slug,
		description: server.description,
		createdAt: server.createdAt.toISOString(),
		updatedAt: server.updatedAt.toISOString(),
	};
}

/**
 * The builder actions on servers. The REST controllers check the project scopes, and later the
 * Assistant tool calls the same methods.
 */
@Service()
export class McpServersService {
	constructor(
		private readonly servers: McpServerRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly events: EventService,
		private readonly resources: McpServerProtectedResource,
		private readonly refreshTokens: RefreshTokenPort,
	) {}

	async create(
		projectId: string,
		dto: CreateMcpServerDto,
		actor: McpServerActor,
	): Promise<McpServerResponse> {
		if (!(await this.servers.projectExists(projectId))) {
			throw new NotFoundError('Project not found');
		}
		const server = await this.servers.create({
			projectId,
			name: dto.name,
			slug: dto.slug,
			description: dto.description,
			createdById: actor.userId,
		});
		// A slug is free again after its project is deleted. Grants for the old server must not
		// reach the new one. Old access tokens end within their short lifetime.
		await this.refreshTokens.deleteForResource(this.resources.serverUrl(server));
		this.events.emit('mcp-server-created', { ...actor, serverId: server.id, projectId });
		return await this.withProject(server);
	}

	async list(projectId: string): Promise<McpServerResponse[]> {
		if (!(await this.servers.projectExists(projectId))) {
			throw new NotFoundError('Project not found');
		}
		return await this.toResponses(await this.servers.listInProjects([projectId]));
	}

	/** The servers of each project in which the user has the scope `mcpServer:list`. */
	async listForUser(user: User): Promise<McpServerResponse[]> {
		const projectIds = await this.projectScopeService.getProjectIds(user, ['mcpServer:list']);
		return await this.toResponses(await this.servers.listInProjects(projectIds));
	}

	async get(projectId: string, serverId: string): Promise<McpServerResponse> {
		return await this.withProject(await this.find(projectId, serverId));
	}

	async update(
		projectId: string,
		serverId: string,
		dto: UpdateMcpServerDto,
	): Promise<McpServerResponse> {
		if (dto.name === undefined && dto.description === undefined) {
			throw new BadRequestError('Give a name or a description to change.');
		}
		const server = this.isServerId(serverId)
			? await this.servers.update(projectId, serverId, dto)
			: null;
		if (!server) throw new NotFoundError('MCP server not found');
		return await this.withProject(server);
	}

	/** Also deletes the refresh tokens of the server at once, so no client keeps a way back in. */
	async delete(projectId: string, serverId: string, actor: McpServerActor): Promise<void> {
		const server = await this.find(projectId, serverId);
		// The tokens go first. If their delete fails, the server stays and a retry works.
		await this.refreshTokens.deleteForResource(this.resources.serverUrl(server));
		if (!(await this.servers.softDelete(projectId, server.id))) {
			throw new NotFoundError('MCP server not found');
		}
		this.events.emit('mcp-server-deleted', { ...actor, serverId, projectId });
	}

	/** Slugs are unique on the instance, so the check looks at the servers of all projects. */
	async slugAvailability(slug: string): Promise<McpServerSlugAvailability> {
		const status = await this.servers.slugStatus(slug);
		return status === 'free'
			? { available: true, reason: null }
			: { available: false, reason: status };
	}

	private async find(projectId: string, serverId: string): Promise<McpServer> {
		const server = this.isServerId(serverId)
			? await this.servers.findInProject(projectId, serverId)
			: null;
		if (!server) throw new NotFoundError('MCP server not found');
		return server;
	}

	// An id that is not a UUID cannot exist, and Postgres refuses it in a uuid column.
	private isServerId(serverId: string) {
		return mcpServerSchema.shape.id.safeParse(serverId).success;
	}

	private async withProject(server: McpServer): Promise<McpServerResponse> {
		const [response] = await this.toResponses([server]);
		// A server row always has its project row: a project delete also deletes its servers.
		if (!response)
			throw new UnexpectedError('MCP server has no project', { extra: { serverId: server.id } });
		return response;
	}

	private async toResponses(servers: McpServer[]): Promise<McpServerResponse[]> {
		const rows = await this.servers.withProjects(servers);
		return rows.map(({ server, project }) => toResponse(server, project));
	}
}
