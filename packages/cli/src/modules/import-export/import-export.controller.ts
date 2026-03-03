import { ExportProjectsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import multer from 'multer';
import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { ImportExportService } from './import-export.service';
import type { ImportResult } from './import-export.types';

const MAX_PACKAGE_SIZE = 100 * 1024 * 1024; // 100 MB

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_PACKAGE_SIZE },
	fileFilter: (_req, file, cb) => {
		if (
			file.mimetype === 'application/gzip' ||
			file.mimetype === 'application/x-gzip' ||
			file.originalname.endsWith('.n8np')
		) {
			cb(null, true);
		} else {
			cb(new BadRequestError('Only .n8np package files are accepted'));
		}
	},
});

type AuthenticatedRequestWithFile = AuthenticatedRequest & { file?: Express.Multer.File };

@RestController('/import-export')
export class ImportExportController {
	constructor(private readonly importExportService: ImportExportService) {}

	@Post('/export')
	@GlobalScope('project:read')
	// @Licensed('feat:packageExport')
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

	@Post('/import', { middlewares: [upload.single('file')] })
	@GlobalScope('project:create')
	// @Licensed('feat:packageExport')
	async importPackage(req: AuthenticatedRequestWithFile): Promise<ImportResult> {
		if (!req.file) {
			throw new BadRequestError('No file uploaded. Send a .n8np file as multipart form data.');
		}

		return await this.importExportService.importPackage(req.file.buffer, req.user);
	}
}
