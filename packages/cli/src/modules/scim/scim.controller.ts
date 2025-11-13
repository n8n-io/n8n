import type { ScimUser, ScimListResponse, ScimError } from '@n8n/api-types';
import { ScimQueryDto, ScimUserCreateDto, ScimPatchRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Put,
	Query,
	RootLevelController,
} from '@n8n/decorators';
import type { Response } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import type { AuthenticatedRequest } from '@n8n/db';

import { ScimService } from './scim.service';

/**
 * SCIM 2.0 Controller for User provisioning
 * Implements endpoints defined in RFC 7644
 */
@RootLevelController('/scim/v2')
export class ScimController {
	constructor(
		private readonly logger: Logger,
		private readonly scimService: ScimService,
	) {}

	/**
	 * Helper to format SCIM error responses
	 */
	private scimError(res: Response, status: number, detail: string, scimType?: string): Response {
		const error: ScimError = {
			schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
			status: String(status),
			detail,
			scimType,
		};
		return res.status(status).header('Content-Type', 'application/scim+json').json(error);
	}

	/**
	 * GET /scim/v2/Users
	 * List users with optional filtering and pagination
	 */
	@Get('/Users', { skipAuth: true, usesTemplates: true })
	async listUsers(
		_req: AuthenticatedRequest,
		res: Response,
		@Query query: ScimQueryDto,
	): Promise<ScimListResponse | Response> {
		try {
			this.logger.info('SCIM: List users request', {
				startIndex: query.startIndex,
				count: query.count,
				filter: query.filter,
			});

			const result = await this.scimService.getUsers({
				startIndex: query.startIndex,
				count: query.count,
				filter: query.filter,
			});

			return res.header('Content-Type', 'application/scim+json').json(result);
		} catch (error) {
			this.logger.error('Error listing SCIM users', { error });
			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * GET /scim/v2/Users/:id
	 * Get a specific user by ID
	 */
	@Get('/Users/:id', { skipAuth: true, usesTemplates: true })
	async getUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
	): Promise<ScimUser | Response> {
		try {
			this.logger.info('SCIM: Get user request', { userId });

			const user = await this.scimService.getUserById(userId);

			if (!user) {
				return this.scimError(res, 404, `User ${userId} not found`, 'invalidValue');
			}

			return res.header('Content-Type', 'application/scim+json').json(user);
		} catch (error) {
			this.logger.error('Error getting SCIM user', { error });
			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * POST /scim/v2/Users
	 * Create a new user
	 */
	@Post('/Users', { skipAuth: true })
	async createUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Body body: ScimUserCreateDto,
	): Promise<ScimUser | Response> {
		try {
			this.logger.info('SCIM: Create user request', {
				userName: body.userName,
				externalId: body.externalId,
				hasName: !!body.name,
			});

			const createdUser = await this.scimService.createUser(body);
			this.logger.info('SCIM: User created successfully in controller', { userId: createdUser.id });

			return res.status(201).header('Content-Type', 'application/scim+json').json(createdUser);
		} catch (error) {
			this.logger.error('SCIM: Error in createUser controller', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});

			if (error instanceof UnexpectedError && error.message.includes('already exists')) {
				return this.scimError(res, 409, error.message, 'uniqueness');
			}

			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * PUT /scim/v2/Users/:id
	 * Replace a user
	 */
	@Put('/Users/:id', { skipAuth: true })
	async replaceUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
		@Body body: ScimUserCreateDto,
	): Promise<ScimUser | Response> {
		try {
			this.logger.info('SCIM: Replace user request', { userId });

			const updatedUser = await this.scimService.updateUser(userId, body);

			return res.header('Content-Type', 'application/scim+json').json(updatedUser);
		} catch (error) {
			this.logger.error('Error updating SCIM user', { error });

			if (error instanceof UnexpectedError && error.message.includes('not found')) {
				return this.scimError(res, 404, error.message, 'invalidValue');
			}

			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * PATCH /scim/v2/Users/:id
	 * Partially update a user
	 */
	@Patch('/Users/:id', { skipAuth: true })
	async patchUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
		@Body body: ScimPatchRequestDto,
	): Promise<ScimUser | Response> {
		try {
			this.logger.info('SCIM: Patch user request', { userId });

			const updatedUser = await this.scimService.patchUser(userId, body);

			return res.header('Content-Type', 'application/scim+json').json(updatedUser);
		} catch (error) {
			this.logger.error('Error patching SCIM user', { error });

			if (error instanceof UnexpectedError && error.message.includes('not found')) {
				return this.scimError(res, 404, error.message, 'invalidValue');
			}

			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * DELETE /scim/v2/Users/:id
	 * Delete a user
	 */
	@Delete('/Users/:id', { skipAuth: true })
	async deleteUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
	): Promise<Response> {
		this.logger.info('SCIM: Delete user request', { userId });
		try {
			await this.scimService.deleteUser(userId);

			return res.status(204).send();
		} catch (error) {
			this.logger.error('Error deleting SCIM user', { error });

			if (error instanceof UnexpectedError && error.message.includes('not found')) {
				return this.scimError(res, 404, error.message, 'invalidValue');
			}

			return this.scimError(res, 500, 'Internal server error');
		}
	}

	/**
	 * GET /scim/v2/ServiceProviderConfig
	 * Return service provider configuration
	 */
	@Get('/ServiceProviderConfig', { skipAuth: true, usesTemplates: true })
	getServiceProviderConfig(_req: AuthenticatedRequest, res: Response) {
		this.logger.info('SCIM: ServiceProviderConfig request');
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
			documentationUri: 'https://docs.n8n.io/scim',
			patch: {
				supported: true,
			},
			bulk: {
				supported: false,
				maxOperations: 0,
				maxPayloadSize: 0,
			},
			filter: {
				supported: true,
				maxResults: 1000,
			},
			changePassword: {
				supported: false,
			},
			sort: {
				supported: false,
			},
			etag: {
				supported: false,
			},
			authenticationSchemes: [
				{
					type: 'oauthbearertoken',
					name: 'OAuth Bearer Token',
					description: 'Authentication scheme using the OAuth Bearer Token Standard',
					specUri: 'https://tools.ietf.org/html/rfc6750',
					documentationUri: 'https://docs.n8n.io/scim',
					primary: true,
				},
			],
		});
	}

	/**
	 * GET /scim/v2/ResourceTypes
	 * Return supported resource types
	 */
	@Get('/ResourceTypes', { skipAuth: true, usesTemplates: true })
	getResourceTypes(_req: AuthenticatedRequest, res: Response) {
		this.logger.info('SCIM: ResourceTypes request');
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: 1,
			Resources: [
				{
					schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
					id: 'User',
					name: 'User',
					endpoint: '/Users',
					description: 'User Account',
					schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
				},
			],
		});
	}

	/**
	 * GET /scim/v2/Schemas
	 * Return supported schemas
	 */
	@Get('/Schemas', { skipAuth: true, usesTemplates: true })
	getSchemas(_req: AuthenticatedRequest, res: Response) {
		this.logger.info('SCIM: Schemas request');
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: 1,
			Resources: [
				{
					id: 'urn:ietf:params:scim:schemas:core:2.0:User',
					name: 'User',
					description: 'User Account',
					attributes: [
						{
							name: 'userName',
							type: 'string',
							multiValued: false,
							required: true,
							caseExact: false,
							mutability: 'readWrite',
							returned: 'default',
							uniqueness: 'server',
						},
						{
							name: 'name',
							type: 'complex',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							subAttributes: [
								{
									name: 'givenName',
									type: 'string',
									multiValued: false,
									required: false,
									mutability: 'readWrite',
									returned: 'default',
								},
								{
									name: 'familyName',
									type: 'string',
									multiValued: false,
									required: false,
									mutability: 'readWrite',
									returned: 'default',
								},
							],
						},
						{
							name: 'emails',
							type: 'complex',
							multiValued: true,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
						},
						{
							name: 'active',
							type: 'boolean',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
						},
					],
				},
			],
		});
	}
}
