import { ExportPackageRequestDto, ImportPackageRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import type { Response } from 'express';
import type { Readable } from 'node:stream';

import type { PackageRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiCompositeScope,
	publicApiScope,
} from '../../shared/middlewares/global.middleware';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { resolveImportPackageUpload } from '@/modules/n8n-packages/utils/import-package-upload';

const PACKAGE_EXPORT_SCOPES = 'project:export,workflow:export';

type ExportPackageRequest = AuthenticatedRequest<
	{},
	{},
	{ workflowIds?: string[]; folderIds?: string[]; projectIds?: string[] }
>;

type ImportPackageRequest = PackageRequest.Import & {
	files?: Express.Multer.File[];
};

type N8nPackagesHandlers = {
	exportPackage: PublicAPIEndpoint<ExportPackageRequest>;
	importPackage: PublicAPIEndpoint<ImportPackageRequest>;
};

function assertPackageExportApiKeyScopes(
	req: AuthenticatedRequest,
	workflowIds: string[],
	folderIds: string[],
	projectIds: string[],
) {
	const apiKeyScopes = req.tokenGrant?.apiKeyScopes;
	if (!apiKeyScopes) {
		throw new ForbiddenError('Forbidden');
	}

	const requiredScopes: ApiKeyScope[] = [];
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
}

async function streamPackageExport(res: Response, stream: Readable): Promise<Response> {
	res.setHeader('Content-Type', 'application/gzip');
	res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

	return await new Promise<Response>((resolve, reject) => {
		stream.on('error', reject);
		res.on('finish', () => resolve(res));
		res.on('close', () => {
			if (!res.writableFinished) stream.destroy();
			resolve(res);
		});
		stream.pipe(res);
	});
}

const n8nPackagesHandlers: N8nPackagesHandlers = {
	exportPackage: [
		publicApiCompositeScope(PACKAGE_EXPORT_SCOPES),
		async (req, res) => {
			const payload = ExportPackageRequestDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors.map(({ message }) => message).join('; '));
			}

			const workflowIds = payload.data.workflowIds ?? [];
			const folderIds = payload.data.folderIds ?? [];
			const projectIds = payload.data.projectIds ?? [];

			// A package is either a set of loose workflows/folders or a set of whole projects, not both.
			if (projectIds.length > 0 && (workflowIds.length > 0 || folderIds.length > 0)) {
				throw new BadRequestError('Provide either workflowIds/folderIds or projectIds, not both');
			}

			if (workflowIds.length === 0 && folderIds.length === 0 && projectIds.length === 0) {
				throw new BadRequestError('At least one workflowId, folderId, or projectId is required');
			}

			assertPackageExportApiKeyScopes(req, workflowIds, folderIds, projectIds);

			const stream = await Container.get(N8nPackagesService).exportPackage({
				user: req.user,
				workflowIds,
				folderIds,
				projectIds,
			});

			return await streamPackageExport(res, stream);
		},
	],
	importPackage: [
		publicApiScope('workflow:import'),
		async (req, res) => {
			const packageFile = resolveImportPackageUpload(req);

			const payload = ImportPackageRequestDto.safeParse(req.body ?? {});
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors.map(({ message }) => message).join('; '));
			}

			const result = await Container.get(N8nPackagesService).importPackage({
				user: req.user,
				projectId: payload.data.projectId,
				folderId: payload.data.folderId,
				credentialMatchingMode: payload.data.credentialMatchingMode,
				credentialMissingMode: payload.data.credentialMissingMode,
				credentialBindings: new Map(Object.entries(payload.data.credentialBindings)),
				workflowConflictPolicy: payload.data.workflowConflictPolicy,
				workflowPublishingPolicy: payload.data.workflowPublishingPolicy,
				workflowIdPolicy: payload.data.workflowIdPolicy,
				packageBuffer: packageFile.buffer,
			});
			return res.status(200).json(result);
		},
	],
};

export = n8nPackagesHandlers;
