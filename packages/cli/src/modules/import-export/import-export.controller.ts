import { ExportWorkflowsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Licensed, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import type { Readable } from 'node:stream';

import { ImportExportService } from './import-export.service';

@RestController('/import-export')
export class ImportExportController {
	constructor(private readonly importExportService: ImportExportService) {}

	@Post('/export/workflows')
	@Licensed('feat:packageExport')
	async exportWorkflows(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: ExportWorkflowsRequestDto,
	): Promise<Readable> {
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

		return await this.importExportService.exportWorkflows({
			user: req.user,
			workflowIds: body.workflowIds,
		});
	}
}
