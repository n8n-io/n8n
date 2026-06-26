import type { InstanceAiMcpConnectionResponse } from '@n8n/api-types';
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

import { InstanceAiMcpRegistryService } from './instance-ai-mcp-registry.service';
import type { InstanceAiMcpRegistryConnection } from '../entities/instance-ai-mcp-registry-connection.entity';

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
		if (connections.length === 0) return [];

		const [accessibleCredentials, servers] = await Promise.all([
			this.credentialsFinderService.findCredentialsForUser(req.user, ['credential:read']),
			this.mcpRegistryService.getBySlugs([...new Set(connections.map((c) => c.serverSlug))]),
		]);
		const credentialById = new Map(accessibleCredentials.map((c) => [c.id, c]));
		const serverBySlug = new Map(servers.map((server) => [server.slug, server]));

		const enriched: InstanceAiMcpConnectionResponse[] = [];
		for (const connection of connections) {
			const credential = credentialById.get(connection.credentialId);
			// Drop rows whose credential the user can no longer read — FK CASCADE
			// removes the connection when the credential is deleted, but access
			// can be revoked independently (project membership change).
			if (!credential) continue;
			enriched.push(
				toResponse(
					connection,
					credential.name,
					credential.type,
					serverMetadata(serverBySlug.get(connection.serverSlug), connection.serverSlug),
				),
			);
		}
		return enriched;
	}

	@Post('/')
	@GlobalScope('instanceAi:message')
	async create(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: InstanceAiMcpCreateConnectionRequestDto,
	): Promise<InstanceAiMcpConnectionResponse> {
		const { connection, credential, server } = await this.service.createConnection(
			req.user,
			payload,
		);
		return toResponse(
			connection,
			credential.name,
			credential.type,
			serverMetadata(server, connection.serverSlug),
		);
	}

	@Patch('/:id')
	@GlobalScope('instanceAi:message')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: InstanceAiMcpUpdateConnectionRequestDto,
	): Promise<InstanceAiMcpConnectionResponse> {
		const connection = await this.service.updateConnection(req.user, id, payload);
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
