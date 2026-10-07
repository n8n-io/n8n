import { ImportBlockedErrorDto, ImportPackageRequestDto, ImportResultDto } from '@n8n/api-types';
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
} from '@/modules/n8n-packages/utils/import-package-upload';

const tags = ['N8nPackage'];

function uploadLimits(maxParts: number) {
	const maxFileSizeBytes = Container.get(GlobalConfig).endpoints.payloadSizeMax * 1024 * 1024;
	return {
		fileSize: maxFileSizeBytes,
		files: 1,
		parts: maxParts,
		fieldSize: IMPORT_PACKAGE_FIELD_SIZE_BYTES,
	};
}

const IMPORT_SUMMARY = 'Beta: Import an n8n package into a project';
const IMPORT_DESCRIPTION =
	'**Beta** — breaking changes may still occur without major version bump. ' +
	'Imports a gzip-compressed tar package (`.n8np`) into the target project. Send the archive ' +
	'as the multipart field `package`. Optional routing uses form fields `projectId` and ' +
	'`folderId` (omit or send empty for defaults). Every optional mode/policy field (credential, ' +
	'workflow, project, folder, data table, variable, and tag) takes its default when omitted; ' +
	'the one non-fixed default is `folderConflictPolicy`, which follows `projectConflictPolicy` ' +
	'on a project package. The required `workflowConflictPolicy` field controls what happens ' +
	'when a package workflow matches an existing workflow by source id in the target project. ' +
	'Maximum upload size is `N8N_ENDPOINTS_PAYLOAD_SIZE_MAX` MB (default 16). The package must ' +
	'declare its manifest at `manifest.json` and include every file the manifest references. ' +
	'Credential references are resolved before any workflow is written.';

const IMPORT_409_DESCRIPTION =
	'Import blocked by at least one conflict among the issues — a workflow source-id conflict, ' +
	'a folder conflict, a tag conflict (rename drift or name collision), a data table conflict ' +
	'(id owned by another project, or a name that another table in the project has), a variable ' +
	'whose bundled value differs from the resolved target, or a selected destination also named ' +
	'for deletion.';
const IMPORT_422_DESCRIPTION =
	'Import blocked by non-conflict issues only — for example unresolved credentials or ' +
	'variables, node types this instance does not have, a delete the caller may not perform, or ' +
	'variable stubs whose creation would exceed the instance variable quota.';

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
	@ApiTags(tags)
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
}
