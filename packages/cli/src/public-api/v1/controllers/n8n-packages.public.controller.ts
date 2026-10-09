import {
	ExportPackageRequestDto,
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
	type BinaryResult,
} from '@n8n/decorators';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '@/modules/n8n-packages/entities/package-export.errors';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type { ExportPackageResult, ImportResult } from '@/modules/n8n-packages/n8n-packages.types';
import { classifyPackageFailure } from '@/modules/n8n-packages/package-failure-classifier';
import {
	IMPORT_PACKAGE_FIELD_SIZE_BYTES,
	IMPORT_PACKAGE_MAX_PARTS,
	IMPORT_PACKAGE_SELECTION_MAX_PARTS,
} from '@/modules/n8n-packages/utils/import-package-upload';

import {
	EXPORT_200_DESCRIPTION,
	EXPORT_COUNTS_HEADER_DESCRIPTION,
	EXPORT_DESCRIPTION,
	EXPORT_SUMMARY,
	IMPORT_409_DESCRIPTION,
	IMPORT_422_DESCRIPTION,
	IMPORT_DESCRIPTION,
	IMPORT_SELECTION_409_DESCRIPTION,
	IMPORT_SELECTION_422_DESCRIPTION,
	IMPORT_SELECTION_DESCRIPTION,
	IMPORT_SELECTION_SUMMARY,
	IMPORT_SUMMARY,
	PACKAGE_TAGS,
} from './openapi/n8n-packages.openapi';

/** Header carrying the JSON-serialized true per-entity counts of the exported package. */
const EXPORT_COUNTS_HEADER = 'X-N8n-Export-Counts';

function uploadLimits(maxParts: number) {
	const maxFileSizeBytes = Container.get(GlobalConfig).endpoints.payloadSizeMax * 1024 * 1024;
	return {
		fileSize: maxFileSizeBytes,
		files: 1,
		parts: maxParts,
		fieldSize: IMPORT_PACKAGE_FIELD_SIZE_BYTES,
	};
}

function assertPackageExportApiKeyScopes(
	apiKeyScopes: string[] | undefined,
	workflowIds: string[],
	folderIds: string[],
	projectIds: string[],
): string[] {
	if (!apiKeyScopes) {
		throw new ForbiddenError('Forbidden');
	}

	const requiredScopes: string[] = [];
	// Folders are exported as a workflow-organization concern, so they share the workflow:export scope.
	if (workflowIds.length > 0 || folderIds.length > 0) {
		requiredScopes.push('workflow:export');
	}
	if (projectIds.length > 0) {
		requiredScopes.push('project:export');
	}

	for (const scope of requiredScopes) {
		if (!apiKeyScopes.includes(scope)) {
			throw new ForbiddenError('Forbidden');
		}
	}

	return apiKeyScopes;
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
	@ApiTags(PACKAGE_TAGS)
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
	@ApiTags(PACKAGE_TAGS)
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
					deletedWorkflowIds,
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

	@Post('/export')
	@ApiKeyScope({ anyOf: ['project:export', 'workflow:export'] })
	@ApiSummary(EXPORT_SUMMARY)
	@ApiDescription(EXPORT_DESCRIPTION)
	@ApiTags(PACKAGE_TAGS)
	@ApiResponse(200, {
		mediaType: 'application/gzip',
		description: EXPORT_200_DESCRIPTION,
		headers: { [EXPORT_COUNTS_HEADER]: { description: EXPORT_COUNTS_HEADER_DESCRIPTION } },
	})
	@ApiErrorResponse(404)
	async exportPackage(
		req: AuthenticatedRequest,
		_res: Response,
		@Body({ required: true }) body: ExportPackageRequestDto,
	): Promise<BinaryResult> {
		const { workflowIds = [], folderIds = [], projectIds = [] } = body;

		let exportResult: ExportPackageResult;

		try {
			// A package is either a set of loose workflows/folders or a set of whole projects, not both.
			if (projectIds.length > 0 && (workflowIds.length > 0 || folderIds.length > 0)) {
				throw new BadRequestError('Provide either workflowIds/folderIds or projectIds, not both');
			}

			if (workflowIds.length === 0 && folderIds.length === 0 && projectIds.length === 0) {
				throw new BadRequestError('At least one workflowId, folderId, or projectId is required');
			}

			const apiKeyScopes = assertPackageExportApiKeyScopes(
				req.tokenGrant?.apiKeyScopes,
				workflowIds,
				folderIds,
				projectIds,
			);

			exportResult = await this.n8nPackagesService.exportPackage({
				user: req.user,
				workflowIds,
				folderIds,
				projectIds,
				includeVariableValues: body.includeVariableValues,
				canExportVariableValues: apiKeyScopes.includes('variable:list'),
				includeTags: body.includeTags,
				missingWorkflowDependencyPolicy: body.missingWorkflowDependencyPolicy,
				workflowVersionPolicy: body.workflowVersionPolicy,
				credentialExportPolicy: body.credentialExportPolicy,
				includeArchivedWorkflows: body.includeArchivedWorkflows,
			});
		} catch (error) {
			this.eventService.emit('n8n-package-export-failed', {
				user: req.user,
				reason: classifyPackageFailure(error),
				...(workflowIds.length ? { workflowIds } : {}),
				...(folderIds.length ? { folderIds } : {}),
				...(projectIds.length ? { projectIds } : {}),
			});

			if (
				error instanceof PackageEntityAccessDeniedError ||
				error instanceof PackageEntityNotFoundError
			) {
				throw new UserError(error.message, { description: error.description });
			}
			throw error;
		}

		return {
			body: exportResult.stream,
			headers: {
				'Content-Disposition': 'attachment; filename="export.n8np"',
				[EXPORT_COUNTS_HEADER]: JSON.stringify(exportResult.counts),
				// Cross-origin browser clients can only read the counts header if it is exposed.
				'Access-Control-Expose-Headers': EXPORT_COUNTS_HEADER,
			},
		};
	}
}
