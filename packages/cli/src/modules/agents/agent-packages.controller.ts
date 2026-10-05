import { ExportPackageRequestDto, ImportPackageRequestDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, ProjectScope, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError, UnsupportedMediaTypeError } from '@n8n/errors';
import type { Response } from 'express';
import multer from 'multer';

import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { classifyPackageFailure } from '@/modules/n8n-packages/package-failure-classifier';
import {
	createN8nPackageMulterOptions,
	resolveImportPackageUpload,
} from '@/modules/n8n-packages/utils/import-package-upload';
import { streamPackageExport } from '@/modules/n8n-packages/utils/stream-package-export';
import { toPublicApiError } from '@/public-api/media-types/request-body/multipart.request-body';

import { AgentsService } from './agents.service';

@RestController('/projects/:projectId/agents/v2')
export class AgentPackagesController {
	constructor(
		private readonly agents: AgentsService,
		private readonly packages: N8nPackagesService,
		private readonly events: EventService,
		private readonly config: GlobalConfig,
	) {}

	@Post('/:agentId/package')
	@ProjectScope('agent:export')
	async exportPackage(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
		res: Response,
		@Body options: ExportPackageRequestDto,
	) {
		const { projectId, agentId } = req.params;
		try {
			if (!(await this.agents.findById(agentId, projectId))) {
				throw new NotFoundError('Agent not found in this project');
			}
			const result = await this.packages.exportPackage({
				...options,
				user: req.user,
				// The route selects the agent. Dependencies use the shared package policies.
				agentIds: [agentId],
				workflowIds: undefined,
				folderIds: undefined,
				projectIds: undefined,
			});
			return await streamPackageExport(res, result);
		} catch (error) {
			this.events.emit('n8n-package-export-failed', {
				user: req.user,
				agentIds: [agentId],
				reason: classifyPackageFailure(error),
			});
			throw error;
		}
	}

	@Post('/package')
	@ProjectScope('agent:import')
	async importPackage(req: AuthenticatedRequest<{ projectId: string }>, res: Response) {
		const { projectId } = req.params;
		try {
			if (!req.is('multipart/form-data')) {
				throw new UnsupportedMediaTypeError('Upload an n8n package as multipart/form-data');
			}
			const parse = multer(createN8nPackageMulterOptions(this.config)).any();
			await new Promise<void>((resolve, reject) => {
				void parse(req, res, (error: unknown) => {
					if (error) reject(toPublicApiError(error));
					else resolve();
				});
			});
			const file = resolveImportPackageUpload(req);
			const parsed = ImportPackageRequestDto.safeParse(req.body);
			if (!parsed.success) {
				throw new BadRequestError(parsed.error.errors.map(({ message }) => message).join('; '));
			}
			return await this.packages.importPackage({
				...parsed.data,
				user: req.user,
				projectId,
				packageBuffer: file.buffer,
				bindings: {
					credentials: new Map(Object.entries(parsed.data.bindings.credentials ?? {})),
				},
			});
		} catch (error) {
			this.events.emit('n8n-package-import-failed', {
				user: req.user,
				projectId,
				reason: classifyPackageFailure(error),
			});
			throw error;
		}
	}
}
