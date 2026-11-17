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
	Patch,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

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
			'Narrow the list to one project with projectId.',
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
	@ApiDescription('Retrieve one skill by ID with the content of its latest version.')
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
			'A project skill needs projectId.',
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
		return toSkillPublicDto(await this.skillService.create(req.user, body));
	}

	@Patch('/:skillId')
	@ApiKeyScope('skill:update')
	@ApiSummary('Update a skill')
	@ApiDescription(
		'Save the changes as the next version of the skill. Fields you leave out keep their value. ' +
			'Send the skillHash of the version you read as baseSkillHash: a save based on an older ' +
			'version fails with 409. Set scope and projectId to move the skill.',
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
		await this.skillService.update(req.user, skillId, body);
		return toSkillPublicDto(await this.skillService.get(req.user, skillId));
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
		await this.skillService.delete(req.user, skillId);
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
		skillHash: detail.skillHash,
	};
}
