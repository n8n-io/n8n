import type {
	InstanceAiMcpConnectionResponse,
	InstanceAiMcpConnectionToolResponse,
} from '@n8n/api-types';
import {
	InstanceAiMcpCreateConnectionRequestDto,
	InstanceAiMcpUpdateConnectionRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';

import type { InstanceAiMcpRegistryConnection } from '../entities/instance-ai-mcp-registry-connection.entity';
import { InstanceAiMcpRegistryService } from './instance-ai-mcp-registry.service';

interface ServerMetadata {
	title: string;
	icons: McpRegistryServer['icons'];
}

function serverMetadata(server: McpRegistryServer | undefined, slug: string): ServerMetadata {
	if (!server) return { title: slug, icons: [] };
	return { title: server.title, icons: server.icons };
}

@RestController('/instance-ai/mcp/connections')
export class InstanceAiMcpConnectionController {
	constructor(
		private readonly service: InstanceAiMcpRegistryService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly mcpRegistryService: McpRegistryService,
	) {}

	@Get('/')
	@GlobalScope('instanceAi:message')
	async list(req: AuthenticatedRequest): Promise<InstanceAiMcpConnectionResponse[]> {
		const connections = await this.service.listConnectionsForUser(req.user);
		const uniqueSlugs = [...new Set(connections.map((c) => c.serverSlug))];
		const servers = await this.mcpRegistryService.getBySlugs(uniqueSlugs);
		const serverBySlug = new Map(servers.map((server) => [server.slug, server]));

		const enriched = await Promise.all(
			connections.map(async (connection) => {
				const credential = await this.credentialsFinderService.findCredentialForUser(
					connection.credentialId,
					req.user,
					['credential:read'],
				);
				if (!credential) return null;
				return toResponse(
					connection,
					credential.name,
					credential.type,
					serverMetadata(serverBySlug.get(connection.serverSlug), connection.serverSlug),
				);
			}),
		);
		return enriched.filter((row): row is InstanceAiMcpConnectionResponse => row !== null);
	}

	@Post('/')
	@GlobalScope('instanceAi:message')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiMcpCreateConnectionRequestDto,
	): Promise<InstanceAiMcpConnectionResponse> {
		const connection = await this.service.createConnection(req.user, payload);
		const credential = await this.credentialsFinderService.findCredentialForUser(
			connection.credentialId,
			req.user,
			['credential:read'],
		);
		if (!credential) {
			throw new NotFoundError('Credential not found after creating connection');
		}
		const server = await this.mcpRegistryService.get(connection.serverSlug);
		return toResponse(
			connection,
			credential.name,
			credential.type,
			serverMetadata(server, connection.serverSlug),
		);
	}

	@Get('/:id/tools')
	@GlobalScope('instanceAi:message')
	async listTools(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
	): Promise<InstanceAiMcpConnectionToolResponse[]> {
		return await this.service.listToolsForConnection(req.user, id);
	}

	/**
	 * Settings persistence is intentionally deferred: the entity has no settings
	 * columns yet. The endpoint validates ownership, accepts the payload, and
	 * returns the existing connection unchanged so the UI can submit changes
	 * forward-compatibly. Replace this no-op with a real update once the
	 * settings columns land.
	 */
	@Patch('/:id')
	@GlobalScope('instanceAi:message')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body _payload: InstanceAiMcpUpdateConnectionRequestDto,
	): Promise<InstanceAiMcpConnectionResponse> {
		const connections = await this.service.listConnectionsForUser(req.user);
		const connection = connections.find((c) => c.id === id);
		if (!connection) {
			throw new NotFoundError('MCP registry connection not found');
		}
		const credential = await this.credentialsFinderService.findCredentialForUser(
			connection.credentialId,
			req.user,
			['credential:read'],
		);
		if (!credential) {
			throw new NotFoundError('Credential not found for connection');
		}
		const server = await this.mcpRegistryService.get(connection.serverSlug);
		return toResponse(
			connection,
			credential.name,
			credential.type,
			serverMetadata(server, connection.serverSlug),
		);
	}

	@Delete('/:id')
	@GlobalScope('instanceAi:message')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('id') id: string): Promise<void> {
		await this.service.deleteConnection(req.user, id);
	}
}

function toResponse(
	connection: InstanceAiMcpRegistryConnection,
	credentialName: string,
	credentialType: string,
	server: ServerMetadata,
): InstanceAiMcpConnectionResponse {
	return {
		id: connection.id,
		serverSlug: connection.serverSlug,
		serverTitle: server.title,
		serverIcons: server.icons,
		credentialId: connection.credentialId,
		credentialName,
		credentialType,
		createdAt: connection.createdAt.toISOString(),
		updatedAt: connection.updatedAt.toISOString(),
	};
}
