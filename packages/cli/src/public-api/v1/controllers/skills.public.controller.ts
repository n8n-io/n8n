import {
	CreateSkillPublicDto,
	ListSkillsPublicQueryDto,
	skillIdParamSchema,
	SkillListPublicDto,
	SkillPublicDto,
	UpdateSkillPublicDto,
	type SkillDetail,
	type SkillListItem,
} from '@n8n/api-types';
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
	Middleware,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import type { NextFunction, Request, Response } from 'express';
import { createHash } from 'node:crypto';

import { SkillService, SkillsGate } from '@/modules/skills';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

@PublicApiController('/skills')
export class SkillsPublicController {
	constructor(
		private readonly skillService: SkillService,
		private readonly skillsGate: SkillsGate,
	) {}

	@Middleware()
	requireSkillsEnabled(_req: Request, res: Response, next: NextFunction) {
		if (!this.skillsGate.isEnabled) {
			res.status(404).json({ message: 'Not Found' });
			return;
		}
		next();
	}

	@Get('/')
	@ApiKeyScope('skill:list')
	@ApiSummary('List skills')
	@ApiDescription(
		'List the skills you can read: instance skills and the skills of your projects. ' +
			'The response is one cursor page: read the next page with the cursor query parameter. ' +
			'Narrow the list to one project with projectId. ' +
			'The source field tells how a skill was created. A synced skill has the source github.',
	)
	@ApiTags(['Skill'])
	@ApiResponse(200, SkillListPublicDto)
	@ApiErrorResponse(404)
	async listSkills(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListSkillsPublicQueryDto,
	): Promise<SkillListPublicDto> {
		const { offset, limit } = resolveOffsetPagination({ cursor: query.cursor, limit: query.limit });

		const { count, data } = await this.skillService.list(req.user, {
			skip: offset,
			take: limit,
			projectId: query.projectId,
		});

		return {
			data: data.map(toSkillListPublicItem),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/:skillId')
	@ApiKeyScope('skill:read')
	@ApiSummary('Retrieve a skill')
	@ApiDescription(
		'Retrieve one skill by ID with the content of its latest version. ' +
			'The source field tells how the skill was created. A synced skill has the source github.',
	)
	@ApiTags(['Skill'])
	@ApiResponse(200, SkillPublicDto)
	@ApiErrorResponse(404)
	async getSkill(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId', skillIdParamSchema) skillId: string,
	): Promise<SkillPublicDto> {
		return toSkillPublicDto(await this.skillService.get(req.user, skillId));
	}

	@Post('/')
	@ApiKeyScope('skill:create')
	@ApiSummary('Create a skill')
	@ApiDescription(
		'Create an instance skill, or a skill in a project you have access to. ' +
			'A project skill needs projectId. A name that another skill in the same scope uses fails with 409.',
	)
	@ApiTags(['Skill'])
	@ApiResponse(201, SkillPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async createSkill(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateSkillPublicDto,
	): Promise<SkillPublicDto> {
		const { name, description, instructions, references, projectId, ...placement } = body;
		const created = await this.skillService.create(
			req.user,
			{
				...placement,
				projectId: projectId ?? undefined,
				skill: { name, description, instructions, references },
			},
			'api',
		);
		return toSkillPublicDto(created);
	}

	@Put('/:skillId')
	@ApiKeyScope('skill:update')
	@ApiSummary('Update a skill')
	@ApiDescription(
		'Replace the skill and save it as the next version. Send the whole skill: ' +
			'the body of the retrieve endpoint is a valid body. Send back the skillHash you read: ' +
			'if the content, the place or the availability of the skill changed since then, ' +
			'the save fails with 409. The server ignores id, source, latestVersion, ' +
			'createdAt and updatedAt. The content of a synced skill is read-only: a change to it fails with 400. Change scope and projectId to move the skill: ' +
			'a move needs the skill:create and skill:delete scopes too.',
	)
	@ApiTags(['Skill'])
	@ApiResponse(200, SkillPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateSkill(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId', skillIdParamSchema) skillId: string,
		@Body body: UpdateSkillPublicDto,
	): Promise<SkillPublicDto> {
		const current = await this.skillService.get(req.user, skillId);
		if (body.skillHash !== toPublicSkillHash(current)) {
			throw new ConflictError(
				'The skill was changed somewhere else. Get it again and send your changes on top.',
			);
		}
		const moves = body.scope !== current.scope || body.projectId !== current.projectId;
		const keyScopes = req.tokenGrant?.apiKeyScopes ?? [];
		if (moves && !(keyScopes.includes('skill:create') && keyScopes.includes('skill:delete'))) {
			throw new ForbiddenError('Moving a skill needs the skill:create and skill:delete scopes');
		}
		await this.skillService.update(
			req.user,
			skillId,
			{
				baseSkillHash: current.skillHash,
				name: body.name,
				description: body.description,
				instructions: body.instructions,
				references: body.references,
				...(moves ? { scope: body.scope, projectId: body.projectId ?? undefined } : {}),
				...(body.availableToAssistant !== current.availableToAssistant
					? { availableToAssistant: body.availableToAssistant }
					: {}),
				...(body.availableToMCP !== current.availableToMCP
					? { availableToMCP: body.availableToMCP }
					: {}),
			},
			'api',
		);
		return toSkillPublicDto(await this.skillService.getAfterWrite(req.user, skillId));
	}

	@Delete('/:skillId')
	@ApiKeyScope('skill:delete')
	@ApiSummary('Delete a skill')
	@ApiDescription(
		'Delete a skill with all its versions. A skill that an agent uses cannot be deleted.',
	)
	@ApiTags(['Skill'])
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async deleteSkill(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId', skillIdParamSchema) skillId: string,
	): Promise<void> {
		await this.skillService.delete(req.user, skillId, 'api');
	}
}

function toSkillListPublicItem(skill: SkillListItem) {
	return {
		id: skill.id,
		name: skill.name,
		description: skill.description,
		scope: skill.scope,
		projectId: skill.projectId,
		source: skill.source,
		latestVersion: skill.latestVersion,
		availableToAssistant: skill.availableToAssistant,
		availableToMCP: skill.availableToMCP,
		createdAt: skill.createdAt,
		updatedAt: skill.updatedAt,
	};
}

function toSkillPublicDto(detail: SkillDetail): SkillPublicDto {
	return {
		...toSkillListPublicItem(detail),
		instructions: detail.skill.instructions,
		references: detail.skill.references ?? [],
		skillHash: toPublicSkillHash(detail),
	};
}

function toPublicSkillHash(detail: SkillDetail): string {
	const { skillHash, scope, projectId, availableToAssistant, availableToMCP } = detail;
	return createHash('sha256')
		.update(JSON.stringify([skillHash, scope, projectId, availableToAssistant, availableToMCP]))
		.digest('hex');
}
