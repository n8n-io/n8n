import type { ScimUser, ScimListResponse, ScimError } from '@n8n/api-types';
import { ScimQueryDto, ScimUserCreateDto, ScimPatchRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
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

import { scimRoute } from './scim-route';
import {
	ScimConflictError,
	ScimInvalidFilterError,
	ScimInvalidValueError,
	ScimResourceNotFoundError,
} from './scim.errors';
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
	 * Map service-layer errors to SCIM error responses (RFC 7644 section 3.12)
	 */
	private handleError(res: Response, error: unknown, operation: string): Response {
		if (error instanceof ScimResourceNotFoundError) {
			return this.scimError(res, 404, error.message);
		}
		if (error instanceof ScimConflictError) {
			return this.scimError(res, 409, error.message, 'uniqueness');
		}
		if (error instanceof ScimInvalidFilterError) {
			return this.scimError(res, 400, error.message, 'invalidFilter');
		}
		if (error instanceof ScimInvalidValueError) {
			return this.scimError(res, 400, error.message, 'invalidValue');
		}

		this.logger.error(`SCIM: Error during ${operation}`, { error });
		return this.scimError(res, 500, 'Internal server error');
	}

	/**
	 * GET /scim/v2/Users
	 * List users with optional filtering and pagination
	 */
	@Get('/Users', scimRoute)
	async listUsers(
		_req: AuthenticatedRequest,
		res: Response,
		@Query query: ScimQueryDto,
	): Promise<ScimListResponse | Response> {
		try {
			const result = await this.scimService.getUsers({
				startIndex: query.startIndex,
				count: query.count,
				filter: query.filter,
			});

			return res.header('Content-Type', 'application/scim+json').json(result);
		} catch (error) {
			return this.handleError(res, error, 'list users');
		}
	}

	/**
	 * GET /scim/v2/Users/:id
	 * Get a specific user by ID
	 */
	@Get('/Users/:id', scimRoute)
	async getUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
	): Promise<ScimUser | Response> {
		try {
			const user = await this.scimService.getUserById(userId);

			if (!user) {
				return this.scimError(res, 404, `Resource ${userId} not found`);
			}

			return res.header('Content-Type', 'application/scim+json').json(user);
		} catch (error) {
			return this.handleError(res, error, 'get user');
		}
	}

	/**
	 * POST /scim/v2/Users
	 * Create a new user
	 */
	@Post('/Users', scimRoute)
	async createUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Body body: ScimUserCreateDto,
	): Promise<ScimUser | Response> {
		try {
			const createdUser = await this.scimService.createUser(body);

			return res.status(201).header('Content-Type', 'application/scim+json').json(createdUser);
		} catch (error) {
			return this.handleError(res, error, 'create user');
		}
	}

	/**
	 * PUT /scim/v2/Users/:id
	 * Replace a user
	 */
	@Put('/Users/:id', scimRoute)
	async replaceUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
		@Body body: ScimUserCreateDto,
	): Promise<ScimUser | Response> {
		try {
			const updatedUser = await this.scimService.updateUser(userId, body);

			return res.header('Content-Type', 'application/scim+json').json(updatedUser);
		} catch (error) {
			return this.handleError(res, error, 'replace user');
		}
	}

	/**
	 * PATCH /scim/v2/Users/:id
	 * Partially update a user
	 */
	@Patch('/Users/:id', scimRoute)
	async patchUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
		@Body body: ScimPatchRequestDto,
	): Promise<ScimUser | Response> {
		try {
			const updatedUser = await this.scimService.patchUser(userId, body);

			return res.header('Content-Type', 'application/scim+json').json(updatedUser);
		} catch (error) {
			return this.handleError(res, error, 'patch user');
		}
	}

	/**
	 * DELETE /scim/v2/Users/:id
	 * Deactivate a user (soft delete)
	 */
	@Delete('/Users/:id', scimRoute)
	async deleteUser(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('id') userId: string,
	): Promise<Response> {
		try {
			await this.scimService.deleteUser(userId);

			return res.status(204).send();
		} catch (error) {
			return this.handleError(res, error, 'delete user');
		}
	}
}
