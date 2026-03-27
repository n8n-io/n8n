import {
	DeleteOAuthClientResponseDto,
	ListOAuthClientsResponseDto,
	OAuthClientResponseDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Param, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { McpOAuthService } from './mcp-oauth-service';

@RestController('/mcp/oauth-clients')
export class McpOAuthClientsController {
	constructor(
		private readonly mcpOAuthService: McpOAuthService,
		private readonly logger: Logger,
	) {}

	/**
	 * Get all OAuth clients for the current user
	 */
	@GlobalScope('mcp:oauth')
	@Get('/')
	async getAllClients(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<ListOAuthClientsResponseDto> {
		this.logger.debug('Fetching all OAuth clients for user', { userId: req.user.id });

		const clients = await this.mcpOAuthService.getAllClients(req.user.id);

		this.logger.debug(`Found ${clients.length} OAuth clients`);

		const clientDtos: OAuthClientResponseDto[] = clients.map((client) => ({
			id: client.id,
			name: client.name,
			redirectUris: client.redirectUris,
			grantTypes: client.grantTypes,
			tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
			createdAt: client.createdAt.toISOString(),
			updatedAt: client.updatedAt.toISOString(),
		}));

		return {
			data: clientDtos,
			count: clients.length,
		};
	}

	/**
	 * Revoke the current user's access to an OAuth client.
	 * Deletes the user's consent and tokens, but not the client itself.
	 */
	@GlobalScope('mcp:oauth')
	@Delete('/:clientId')
	async deleteClient(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('clientId') clientId: string,
	): Promise<DeleteOAuthClientResponseDto> {
		this.logger.info('Revoking OAuth client access', {
			clientId,
			userId: req.user.id,
			userEmail: req.user.email,
		});

		try {
			await this.mcpOAuthService.revokeClientAccess(clientId, req.user.id);

			this.logger.info('OAuth client access revoked successfully', {
				clientId,
				userId: req.user.id,
			});

			return {
				success: true,
				message: `OAuth client ${clientId} access has been revoked successfully`,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				this.logger.warn('Attempted to revoke non-existent OAuth client', {
					clientId,
					userId: req.user.id,
				});
				throw new NotFoundError(`OAuth client with ID ${clientId} not found`);
			}
			throw error;
		}
	}
}
