import {
	ImportBlockedErrorDto,
	ImportPackageRequestDto,
	ImportPackageSelectionRequestDto,
	ImportResultDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type { ImportResult } from '@/modules/n8n-packages/n8n-packages.types';
import { classifyPackageFailure } from '@/modules/n8n-packages/package-failure-classifier';
import {
	IMPORT_PACKAGE_FIELD_SIZE_BYTES,
	IMPORT_PACKAGE_MAX_PARTS,
	IMPORT_PACKAGE_SELECTION_MAX_PARTS,
} from '@/modules/n8n-packages/utils/import-package-upload';

import {
	IMPORT_409_DESCRIPTION,
	IMPORT_422_DESCRIPTION,
	IMPORT_DESCRIPTION,
	IMPORT_SELECTION_409_DESCRIPTION,
	IMPORT_SELECTION_422_DESCRIPTION,
	IMPORT_SELECTION_DESCRIPTION,
	IMPORT_SELECTION_SUMMARY,
	IMPORT_SUMMARY,
	IMPORT_TAGS,
} from './openapi/n8n-packages.openapi';

function uploadLimits(maxParts: number) {
	const maxFileSizeBytes = Container.get(GlobalConfig).endpoints.payloadSizeMax * 1024 * 1024;
	return {
		fileSize: maxFileSizeBytes,
		files: 1,
		parts: maxParts,
		fieldSize: IMPORT_PACKAGE_FIELD_SIZE_BYTES,
	};
}

@PublicApiController('/n8n-packages')
export class N8nPackagesPublicController {
	constructor(
		private readonly n8nPackagesService: N8nPackagesService,
		private readonly eventService: EventService,
	) {}

	@Post('/import')
	@ApiKeyScope('workflow:import')
	@ApiSummary(IMPORT_SUMMARY)
	@ApiDescription(IMPORT_DESCRIPTION)
	@ApiTags(IMPORT_TAGS)
	@ApiResponse(200, ImportResultDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409, { dto: ImportBlockedErrorDto, description: IMPORT_409_DESCRIPTION })
	@ApiErrorResponse(422, { dto: ImportBlockedErrorDto, description: IMPORT_422_DESCRIPTION })
	async importPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Body({
			mediaType: 'multipart/form-data',
			uploadLimits: () => uploadLimits(IMPORT_PACKAGE_MAX_PARTS),
		})
		body: ImportPackageRequestDto,
	): Promise<ImportResult> {
		const { package: file, bindings, projectId, folderId, ...policies } = body;

		try {
			return await this.n8nPackagesService.importPackage({
				user: req.user,
				apiKeyScopes: req.tokenGrant?.apiKeyScopes,
				projectId,
				folderId,
				bindings: {
					credentials: new Map(Object.entries(bindings.credentials ?? {})),
				},
				packageBuffer: Buffer.from(file.buffer),
				...policies,
			});
		} catch (error) {
			this.eventService.emit('n8n-package-import-failed', {
				user: req.user,
				reason: classifyPackageFailure(error),
				...(projectId ? { projectId } : {}),
				...(folderId ? { folderId } : {}),
			});
			throw error;
		}
	}

	@Post('/import-selection')
	@ApiKeyScope('workflow:import')
	@ApiSummary(IMPORT_SELECTION_SUMMARY)
	@ApiDescription(IMPORT_SELECTION_DESCRIPTION)
	@ApiTags(IMPORT_TAGS)
	@ApiResponse(200, ImportResultDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409, {
		dto: ImportBlockedErrorDto,
		description: IMPORT_SELECTION_409_DESCRIPTION,
	})
	@ApiErrorResponse(422, {
		dto: ImportBlockedErrorDto,
		description: IMPORT_SELECTION_422_DESCRIPTION,
	})
	async importPackageSelection(
		req: AuthenticatedRequest,
		_res: Response,
		@Body({
			mediaType: 'multipart/form-data',
			uploadLimits: () => uploadLimits(IMPORT_PACKAGE_SELECTION_MAX_PARTS),
		})
		body: ImportPackageSelectionRequestDto,
	): Promise<ImportResult> {
		const {
			package: file,
			selectedProjectId,
			selectedWorkflowIds,
			deletedWorkflowIds,
			...policies
		} = body;

		try {
			return await this.n8nPackagesService.importPackageSelection(
				{
					user: req.user,
					apiKeyScopes: req.tokenGrant?.apiKeyScopes,
					packageBuffer: Buffer.from(file.buffer),
					...policies,
				},
				{
					selectedProjectId,
					selectedWorkflowIds,
					...(deletedWorkflowIds !== undefined ? { deletedWorkflowIds } : {}),
				},
			);
		} catch (error) {
			this.eventService.emit('n8n-package-import-failed', {
				user: req.user,
				reason: classifyPackageFailure(error),
			});
			throw error;
		}
	}
}
