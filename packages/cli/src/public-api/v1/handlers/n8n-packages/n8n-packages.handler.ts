import { ExportWorkflowsRequestDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import type { PackageRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { isLicensed, publicApiScope } from '../../shared/middlewares/global.middleware';

const ACCEPTED_IMPORT_CONTENT_TYPES = new Set(['application/gzip', 'application/octet-stream']);

type ExportWorkflowsRequest = AuthenticatedRequest<{}, {}, { workflowIds: string[] }>;

type N8nPackagesHandlers = {
	exportWorkflows: PublicAPIEndpoint<ExportWorkflowsRequest>;
	importPackage: PublicAPIEndpoint<PackageRequest.Import>;
};

const n8nPackagesHandlers: N8nPackagesHandlers = {
	exportWorkflows: [
		isLicensed(LICENSE_FEATURES.N8N_PACKAGES),
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
		isLicensed(LICENSE_FEATURES.N8N_PACKAGES),
		publicApiScope('workflow:import'),
		async (req, res) => {
			if (!Container.get(GlobalConfig).publicApi.packagesEnabled) {
				throw new NotFoundError('Not Found');
			}

			const contentType = req.headers['content-type']?.toLowerCase().split(';')[0].trim();
			if (!contentType || !ACCEPTED_IMPORT_CONTENT_TYPES.has(contentType)) {
				throw new BadRequestError(
					'Content-Type must be application/gzip or application/octet-stream',
				);
			}

			const query = z
				.object({
					projectId: z.string().trim().min(1).optional(),
					folderId: z.string().trim().min(1).optional(),
				})
				.parse(req.query);

			await req.readRawBody();
			if (!req.rawBody?.length) {
				throw new BadRequestError('Request body is required');
			}

			const result = await Container.get(N8nPackagesService).importPackage({
				user: req.user,
				projectId: query.projectId,
				folderId: query.folderId,
				packageBuffer: req.rawBody,
			});
			return res.status(200).json(result);
		},
	],
};

export = n8nPackagesHandlers;
