import { ExportProjectsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import type { Readable } from 'node:stream';

import { ImportExportService } from './import-export.service';

@RestController('/import-export')
export class ImportExportController {
	constructor(private readonly importExportService: ImportExportService) {}

	@Post('/export')
	@GlobalScope('project:read')
	@Licensed('feat:packageExport')
	async exportPackage(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: ExportProjectsRequestDto,
	): Promise<Readable> {
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

		return await this.importExportService.exportPackage({
			user: req.user,
			projectIds: body.projectIds,
		});
	}
}
