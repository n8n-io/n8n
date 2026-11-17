import {
	aiPreferenceIdParamSchema,
	AiPreferenceListPublicDto,
	AiPreferencePublicDto,
	aiPreferenceScopeOf,
	CreateAiPreferencePublicDto,
	ListAiPreferencesPublicQueryDto,
	UpdateAiPreferencePublicDto,
	type AiPreferenceDto,
} from '@n8n/api-types';
import { AiPreferenceService } from '@n8n/backend-services';
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

import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

const tags = ['AiPreference'];

function toAiPreferencePublicDto(preference: AiPreferenceDto): AiPreferencePublicDto {
	return {
		id: preference.id,
		content: preference.content,
		scope: aiPreferenceScopeOf(preference),
		userId: preference.userId,
		projectId: preference.projectId,
		source: preference.source,
		createdAt: preference.createdAt,
		updatedAt: preference.updatedAt,
	};
}

@PublicApiController('/ai-preferences')
export class AiPreferencesPublicController {
	constructor(
		private readonly aiPreferenceService: AiPreferenceService,
		private readonly aiPreferenceSettingsService: AiPreferenceSettingsService,
	) {}

	@Middleware()
	requirePreferencesEnabled(_req: Request, res: Response, next: NextFunction) {
		if (!this.aiPreferenceSettingsService.isEnabled) {
			res.status(404).json({ message: 'Not Found' });
			return;
		}
		next();
	}

	@Get('/')
	@ApiKeyScope('aiPreference:list')
	@ApiSummary('List AI preferences')
	@ApiDescription(
		'List the AI preferences you can read: the instance preferences, your own preferences, ' +
			'and the preferences of the projects where you hold the projectAiPreference:list permission. ' +
			'With the aiPreference:list permission, the list also has the preferences of other users. ' +
			'Filter with scope and projectId. The response is one cursor page: read the next page with the cursor query parameter.',
	)
	@ApiTags(tags)
	@ApiResponse(200, AiPreferenceListPublicDto)
	async listAiPreferences(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListAiPreferencesPublicQueryDto,
	): Promise<AiPreferenceListPublicDto> {
		const { offset, limit } = resolveOffsetPagination({ cursor: query.cursor, limit: query.limit });

		const { count, data } = await this.aiPreferenceService.list(req.user, {
			skip: offset,
			take: limit,
			scope: query.scope,
			projectId: query.projectId,
		});

		return {
			data: data.map(toAiPreferencePublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/')
	@ApiKeyScope('aiPreference:create')
	@ApiSummary('Create an AI preference')
	@ApiDescription(
		'Create an AI preference for yourself (scope user), for a project (scope project, with projectId), ' +
			'or for the whole instance (scope instance). A preference for the instance or for another user ' +
			'needs the aiPreference:create permission. A preference for a project needs the ' +
			'projectAiPreference:create permission in that project. Each scope holds at most 50 preferences, ' +
			'and two preferences in one scope cannot have the same text.',
	)
	@ApiTags(tags)
	@ApiResponse(201, AiPreferencePublicDto)
	@ApiErrorResponse(409)
	async createAiPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateAiPreferencePublicDto,
	): Promise<AiPreferencePublicDto> {
		return toAiPreferencePublicDto(await this.aiPreferenceService.create(req.user, body, 'ui'));
	}

	@Patch('/:preferenceId')
	@ApiKeyScope('aiPreference:update')
	@ApiSummary('Update an AI preference')
	@ApiDescription(
		'Replace the text of an AI preference. Send scope to move the preference to another scope: ' +
			'a move needs the delete permission on the old scope and the create permission on the new one. ' +
			'Without scope, the preference stays where it is. ' +
			'A user preference names its user in userId, and a project preference names its project in projectId.',
	)
	@ApiTags(tags)
	@ApiResponse(200, AiPreferencePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateAiPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('preferenceId', aiPreferenceIdParamSchema) preferenceId: string,
		@Body body: UpdateAiPreferencePublicDto,
	): Promise<AiPreferencePublicDto> {
		return toAiPreferencePublicDto(
			await this.aiPreferenceService.update(req.user, preferenceId, body),
		);
	}

	@Delete('/:preferenceId')
	@ApiKeyScope('aiPreference:delete')
	@ApiSummary('Delete an AI preference')
	@ApiDescription('Delete an AI preference.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteAiPreference(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('preferenceId', aiPreferenceIdParamSchema) preferenceId: string,
	): Promise<void> {
		await this.aiPreferenceService.delete(req.user, preferenceId);
	}
}
