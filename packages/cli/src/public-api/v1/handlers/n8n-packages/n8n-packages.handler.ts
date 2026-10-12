import { ExportPackageRequestDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '@/modules/n8n-packages/entities/package-export.errors';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type { ExportPackageResult } from '@/modules/n8n-packages/n8n-packages.types';
import { classifyPackageFailure } from '@/modules/n8n-packages/package-failure-classifier';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiCompositeScope } from '../../shared/middlewares/global.middleware';

const PACKAGE_EXPORT_SCOPES = 'project:export,workflow:export,agent:export';

/** Header carrying the JSON-serialized true per-entity counts of the exported package. */
const EXPORT_COUNTS_HEADER = 'X-N8n-Export-Counts';

type ExportPackageRequest = AuthenticatedRequest<{}, {}, ExportPackageRequestDto>;

type N8nPackagesHandlers = {
	exportPackage: PublicAPIEndpoint<ExportPackageRequest>;
};

function assertPackageExportApiKeyScopes(
	req: AuthenticatedRequest,
	agentIds: string[],
	workflowIds: string[],
	folderIds: string[],
	projectIds: string[],
): string[] {
	const apiKeyScopes = req.tokenGrant?.apiKeyScopes;
	if (!apiKeyScopes) {
		throw new ForbiddenError('Forbidden');
	}

	const requiredScopes: ApiKeyScope[] = [];
	if (agentIds.length > 0) {
		requiredScopes.push('agent:export');
	}
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

async function streamPackageExport(
	res: Response,
	{ stream, counts }: ExportPackageResult,
): Promise<Response> {
	res.setHeader('Content-Type', 'application/gzip');
	res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');
	res.setHeader(EXPORT_COUNTS_HEADER, JSON.stringify(counts));
	// Cross-origin browser clients can only read the counts header if it's exposed.
	res.setHeader('Access-Control-Expose-Headers', EXPORT_COUNTS_HEADER);

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
			let agentIds: string[] = [];
			let workflowIds: string[] = [];
			let folderIds: string[] = [];
			let projectIds: string[] = [];
			let includeVariableValues: boolean = true;

			try {
				const payload = ExportPackageRequestDto.safeParse(req.body);
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors.map(({ message }) => message).join('; '));
				}

				agentIds = payload.data.agentIds ?? [];
				workflowIds = payload.data.workflowIds ?? [];
				folderIds = payload.data.folderIds ?? [];
				projectIds = payload.data.projectIds ?? [];
				includeVariableValues = payload.data.includeVariableValues;

				const hasLooseSelection = [agentIds, workflowIds, folderIds].some((ids) => ids.length > 0);
				if (projectIds.length > 0 && hasLooseSelection) {
					throw new BadRequestError(
						'Provide either agentIds/workflowIds/folderIds or projectIds, not both',
					);
				}

				if (!hasLooseSelection && projectIds.length === 0) {
					throw new BadRequestError(
						'At least one agentId, workflowId, folderId, or projectId is required',
					);
				}

				const apiKeyScopes = assertPackageExportApiKeyScopes(
					req,
					agentIds,
					workflowIds,
					folderIds,
					projectIds,
				);

				const exportResult = await Container.get(N8nPackagesService).exportPackage({
					user: req.user,
					agentIds,
					workflowIds,
					folderIds,
					projectIds,
					includeVariableValues,
					canExportVariableValues: apiKeyScopes.includes('variable:list'),
					includeTags: payload.data.includeTags,
					dependencyPolicy: payload.data.dependencyPolicy,
					versionPolicy: payload.data.versionPolicy,
					credentialExportPolicy: payload.data.credentialExportPolicy,
					includeArchivedWorkflows: payload.data.includeArchivedWorkflows,
				});

				return await streamPackageExport(res, exportResult);
			} catch (error) {
				Container.get(EventService).emit('n8n-package-export-failed', {
					user: req.user,
					reason: classifyPackageFailure(error),
					...(agentIds.length ? { agentIds } : {}),
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
		},
	],
};

export = n8nPackagesHandlers;
