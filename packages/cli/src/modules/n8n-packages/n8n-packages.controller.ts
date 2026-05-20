import { ExportWorkflowsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import type { Readable } from 'node:stream';

import { N8nPackagesService } from './n8n-packages.service';

@RestController('/n8n-packages')
export class N8nPackagesController {
	constructor(private readonly packagesService: N8nPackagesService) {}

	@Post('/export')
	@Licensed('feat:n8nPackages')
	@GlobalScope('workflow:export')
	async exportWorkflows(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: ExportWorkflowsRequestDto,
	): Promise<Readable> {
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

		return await this.packagesService.exportWorkflows({
			user: req.user,
			workflowIds: body.workflowIds,
		});
	}
}
