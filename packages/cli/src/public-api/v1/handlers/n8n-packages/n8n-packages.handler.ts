import { ExportWorkflowsRequestDto, ImportPackageRequestDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { resolveImportPackageUpload } from '@/modules/n8n-packages/utils/import-package-upload';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import type { PackageRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope } from '../../shared/middlewares/global.middleware';

type ExportWorkflowsRequest = AuthenticatedRequest<{}, {}, { workflowIds: string[] }>;

type ImportPackageRequest = PackageRequest.Import & {
	files?: Express.Multer.File[];
};

type N8nPackagesHandlers = {
	exportWorkflows: PublicAPIEndpoint<ExportWorkflowsRequest>;
	importPackage: PublicAPIEndpoint<ImportPackageRequest>;
};

const n8nPackagesHandlers: N8nPackagesHandlers = {
	exportWorkflows: [
		publicApiScope('workflow:export'),
		async (req, res) => {
			if (!Container.get(GlobalConfig).publicApi.packagesEnabled) {
				throw new NotFoundError('Not Found');
			}

			const payload = ExportWorkflowsRequestDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors.map(({ message }) => message).join('; '));
			}

			const stream = await Container.get(N8nPackagesService).exportWorkflows({
				user: req.user,
				workflowIds: payload.data.workflowIds,
			});

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
		},
	],
	importPackage: [
		publicApiScope('workflow:import'),
		async (req, res) => {
			if (!Container.get(GlobalConfig).publicApi.packagesEnabled) {
				throw new NotFoundError('Not Found');
			}

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
