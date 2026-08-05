import {
	CreateOAuthClientRequestDto,
	CreateOAuthClientResponseDto,
	DeleteOAuthClientQueryDto,
	DeleteOAuthClientResponseDto,
	InstanceMcpClientStatsResponseDto,
	ListOAuthClientsQueryDto,
	ListOAuthClientsResponseDto,
	ManualOAuthClientResponseDto,
	OAuthClientResponseDto,
	RotateOAuthClientSecretResponseDto,
	UpdateOAuthClientRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { OAuthClient } from './database/entities/oauth-client.entity';
import { OAuthServerService } from './oauth-server.service';

@RestController('/mcp/oauth-clients')
export class OAuthClientsController {
	constructor(
		private readonly oauthServerService: OAuthServerService,
		private readonly logger: Logger,
	) {}

	/**
	 * Get connected OAuth clients. Defaults to the current user's consents;
	 * `ownership=all` returns every user's consents and requires `mcp:manage`.
	 */
	@GlobalScope('mcp:oauth')
	@Get('/')
	async getAllClients(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListOAuthClientsQueryDto,
	): Promise<ListOAuthClientsResponseDto> {
		this.logger.debug('Fetching OAuth clients for user', {
			userId: req.user.id,
			ownership: query.ownership ?? 'mine',
		});

		const { clients, count, totals, owners } = await this.oauthServerService.getAllClients(
			req.user,
			query,
		);

		this.logger.debug(`Found ${count} OAuth clients`);

		const clientDtos: OAuthClientResponseDto[] = clients.map((client) => ({
			id: client.id,
			name: client.name,
			redirectUris: client.redirectUris,
			grantTypes: client.grantTypes,
			tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
			createdAt: client.createdAt.toISOString(),
			updatedAt: client.updatedAt.toISOString(),
			grantedAt: client.grantedAt,
			scopes: client.scopes,
			registration: client.registration,
			canManage: client.canManage,
			owner: client.owner,
		}));

		return {
			data: clientDtos,
			count,
			scopeTools: this.oauthServerService.getInstanceScopeTools(),
			totals,
			owners,
		};
	}

	/**
	 * Pre-register an OAuth client by hand, so MCP clients that don't implement
	 * Dynamic Client Registration (Gemini) or that ask the user for their own
	 * client id (ChatGPT) can connect. Self-service: registering is no more
	 * privileged than letting a client self-register over DCR and then consenting
	 * to it, and clients like Gemini are set up per individual user.
	 *
	 * The unauthenticated `/mcp-oauth/register` DCR endpoint is unaffected.
	 */
	@GlobalScope('mcp:oauth')
	@Post('/')
	async createClient(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateOAuthClientRequestDto,
	): Promise<CreateOAuthClientResponseDto> {
		const { client, clientSecret } = await this.oauthServerService.createManualClient(
			req.user,
			payload,
		);

		this.logger.info('Manually registered MCP OAuth client', {
			clientId: client.id,
			userId: req.user.id,
		});

		// The secret is readable here and nowhere else; the clients list and the
		// details view never return it.
		return {
			...this.toManualClientDto(client),
			...(clientSecret ? { clientSecret } : {}),
		};
	}

	/**
	 * Issue a new secret for a confidential manual client. The old secret stops
	 * working immediately; existing tokens are unaffected.
	 */
	@GlobalScope('mcp:oauth')
	@Post('/:clientId/rotate-secret')
	async rotateClientSecret(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('clientId') clientId: string,
	): Promise<RotateOAuthClientSecretResponseDto> {
		const clientSecret = await this.oauthServerService.rotateManualClientSecret(req.user, clientId);
		return { clientSecret };
	}

	/**
	 * Edit a manually registered client. The registrant or an instance manager may
	 * edit; DCR registrations are not editable.
	 */
	@GlobalScope('mcp:oauth')
	@Patch('/:clientId')
	async updateClient(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('clientId') clientId: string,
		@Body payload: UpdateOAuthClientRequestDto,
	): Promise<ManualOAuthClientResponseDto> {
		const client = await this.oauthServerService.updateManualClient(req.user, clientId, payload);
		return this.toManualClientDto(client);
	}

	private toManualClientDto(client: OAuthClient): ManualOAuthClientResponseDto {
		return {
			id: client.id,
			name: client.name,
			redirectUris: client.redirectUris,
			grantTypes: client.grantTypes,
			tokenEndpointAuthMethod: client.tokenEndpointAuthMethod,
			createdAt: client.createdAt.toISOString(),
			updatedAt: client.updatedAt.toISOString(),
			registration: 'manual',
		};
	}

	/**
	 * Instance-wide MCP OAuth client capacity stats. Admin-only — gated by
	 * the `mcp:manage` global scope, matching the existing administrative
	 * MCP settings endpoint.
	 */
	@GlobalScope('mcp:manage')
	@Get('/instance-stats')
	async getInstanceStats(): Promise<InstanceMcpClientStatsResponseDto> {
		return await this.oauthServerService.getInstanceClientStats();
	}

	/**
	 * Revoke a user's grant for an OAuth client (tokens, authorization codes,
	 * consent). Defaults to the caller's own grant; revoking another user's
	 * grant requires `mcp:manage`. The client registration is garbage-collected
	 * once its last consent is gone.
	 */
	@GlobalScope('mcp:oauth')
	@Delete('/:clientId')
	async deleteClient(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('clientId') clientId: string,
		@Query query: DeleteOAuthClientQueryDto,
	): Promise<DeleteOAuthClientResponseDto> {
		const targetUserId = query.userId ?? req.user.id;
		if (targetUserId !== req.user.id && !hasGlobalScope(req.user, 'mcp:manage')) {
			throw new ForbiddenError('You are not allowed to revoke connected clients of other users');
		}

		this.logger.info('Deleting OAuth client', {
			clientId,
			userId: req.user.id,
			targetUserId,
			userEmail: req.user.email,
		});

		try {
			await this.oauthServerService.deleteClient(clientId, targetUserId, req.user);

			this.logger.info('OAuth client deleted successfully', {
				clientId,
				userId: req.user.id,
				targetUserId,
			});

			return {
				success: true,
				message: `OAuth client ${clientId} has been deleted successfully`,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				this.logger.warn('Attempted to delete non-existent OAuth client', {
					clientId,
					userId: req.user.id,
				});
				throw new NotFoundError(`OAuth client with ID ${clientId} not found`);
			}
			throw error;
		}
	}
}
