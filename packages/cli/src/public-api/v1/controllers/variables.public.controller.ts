import { CreateVariableRequestDto, UpdateVariableRequestDto, Z } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	Post,
	Put,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { z } from 'zod';

import { VariablesController } from '@/environments.ee/variables/variables.controller.ee';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { License } from '@/license';
import { decodeCursor, paginateArray } from '@/public-api/v1/shared/services/pagination.service';

const variablePublicSchema = z.object({
	id: z.string(),
	key: z.string(),
	value: z.string(),
	type: z.string(),
	project: z.object({ id: z.string(), name: z.string(), type: z.string() }).nullable(),
});

class VariableListPublicDto extends Z.class({
	data: z.array(variablePublicSchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * `limit` mirrors `@n8n/api-types`'s `publicApiPaginationSchema.limit`, kept local rather than
 * reused across packages for this demo migration.
 */
const limitQuerySchema = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 100))
	.refine((val) => !isNaN(val) && Number.isInteger(val) && val >= 0, {
		message: 'Param `limit` must be a non-negative integer',
	})
	.transform((val) => Math.min(val, 250));

class ListVariablesQueryDto extends Z.class({
	limit: limitQuerySchema,
	cursor: z.string().optional(),
	projectId: z.string().max(36).optional(),
	state: z.literal('empty').optional(),
}) {}

/**
 * Demo: the entire hand-written eov `variables` handler (list/create/update/delete) migrated to
 * the decorator pattern in one controller.
 *
 * `@Licensed` isn't wired into `PublicApiControllerRegistry` yet (only the internal
 * `@RestController` registry enforces it), so the license gate the original handler had via
 * `isLicensed('feat:variables')` middleware is replicated manually here rather than silently
 * dropped.
 */
@PublicApiController('/variables')
export class VariablesPublicController {
	@Get('/')
	@ApiKeyScope('variable:list')
	@ApiSummary('Retrieve variables')
	@ApiDescription('Retrieve variables from your instance.')
	@ApiTags(['Variables'])
	@ApiResponse(200, VariableListPublicDto)
	async getVariables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListVariablesQueryDto,
	): Promise<VariableListPublicDto> {
		this.assertLicensed();

		let offset = 0;
		let { limit } = query;

		if (query.cursor) {
			try {
				const decoded = decodeCursor(query.cursor);
				if (!('offset' in decoded)) {
					throw new BadRequestError('An invalid cursor was provided');
				}
				offset = decoded.offset;
				limit = decoded.limit;
			} catch (error) {
				if (error instanceof BadRequestError) throw error;
				throw new BadRequestError('An invalid cursor was provided');
			}
		}

		const variables = await Container.get(VariablesService).getAllForUser(req.user, {
			state: query.state,
			projectId: query.projectId === 'null' ? null : query.projectId,
		});

		return paginateArray(variables, { offset, limit });
	}

	@Post('/')
	@ApiKeyScope('variable:create')
	@ApiSummary('Create a variable')
	@ApiDescription('Create a variable in your instance.')
	@ApiTags(['Variables'])
	@ApiResponse(201)
	async createVariable(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: CreateVariableRequestDto,
	): Promise<void> {
		this.assertLicensed();
		await Container.get(VariablesController).createVariable(req, res, body);
	}

	@Put('/:id')
	@ApiKeyScope('variable:update')
	@ApiSummary('Update a variable')
	@ApiDescription('Update a variable from your instance.')
	@ApiTags(['Variables'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async updateVariable(
		req: AuthenticatedRequest<{ id: string }>,
		res: Response,
		@Param('id') _id: string,
		@Body body: UpdateVariableRequestDto,
	): Promise<void> {
		this.assertLicensed();
		await Container.get(VariablesController).updateVariable(req, res, body);
	}

	@Delete('/:id')
	@ApiKeyScope('variable:delete')
	@ApiSummary('Delete a variable')
	@ApiDescription('Delete a variable from your instance.')
	@ApiTags(['Variables'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteVariable(
		req: AuthenticatedRequest<{ id: string }>,
		_res: Response,
		@Param('id') _id: string,
	): Promise<void> {
		this.assertLicensed();
		await Container.get(VariablesController).deleteVariable(req);
	}

	private assertLicensed(): void {
		if (!Container.get(License).isLicensed(LICENSE_FEATURES.VARIABLES)) {
			throw new ForbiddenError(new FeatureNotLicensedError(LICENSE_FEATURES.VARIABLES).message);
		}
	}
}
