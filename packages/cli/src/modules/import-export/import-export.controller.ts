import {
	ExportFoldersRequestDto,
	ExportProjectsRequestDto,
	ExportWorkflowsRequestDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import multer from 'multer';
import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AnalyzePackageResult } from './import-export.service';
import { ImportExportService } from './import-export.service';
import type {
	ImportBindings,
	ImportMode,
	ImportRequest,
	ImportResult,
} from './import-export.types';

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

type AuthenticatedRequestWithFile = AuthenticatedRequest & {
	file?: Express.Multer.File;
	body: Record<string, unknown>;
};

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
			type: 'projects',
			user: req.user,
			projectIds: body.projectIds,
			includeVariableValues: body.includeVariableValues,
		});
	}

	@Post('/export/workflows')
	@GlobalScope('workflow:read')
	// @Licensed('feat:packageExport')
	async exportWorkflows(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: ExportWorkflowsRequestDto,
	): Promise<Readable> {
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

		return await this.importExportService.exportPackage({
			type: 'workflows',
			user: req.user,
			workflowIds: body.workflowIds,
			includeVariableValues: body.includeVariableValues,
		});
	}

	@Post('/export/folders')
	@GlobalScope('workflow:read')
	// @Licensed('feat:packageExport')
	async exportFolders(
		req: AuthenticatedRequest,
		res: Response,
		@Body body: ExportFoldersRequestDto,
	): Promise<Readable> {
		res.setHeader('Content-Type', 'application/gzip');
		res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');

		return await this.importExportService.exportPackage({
			type: 'folders',
			user: req.user,
			folderIds: body.folderIds,
			includeVariableValues: body.includeVariableValues,
		});
	}

	@Post('/analyze', { middlewares: [upload.single('file')] })
	@GlobalScope('project:read')
	// @Licensed('feat:packageExport')
	async analyzePackage(req: AuthenticatedRequestWithFile): Promise<AnalyzePackageResult> {
		if (!req.file) {
			throw new BadRequestError('No file uploaded. Send a .n8np file as multipart form data.');
		}

		return await this.importExportService.analyzePackage(req.file.buffer);
	}

	@Post('/import', { middlewares: [upload.single('file')] })
	@GlobalScope('project:create')
	// @Licensed('feat:packageExport')
	async importPackage(req: AuthenticatedRequestWithFile): Promise<ImportResult> {
		if (!req.file) {
			throw new BadRequestError('No file uploaded. Send a .n8np file as multipart form data.');
		}

		const targetProjectId =
			typeof req.body?.targetProjectId === 'string' ? req.body.targetProjectId : undefined;

		let bindings: ImportBindings | undefined;
		if (typeof req.body?.bindings === 'string') {
			try {
				bindings = JSON.parse(req.body.bindings) as ImportBindings;
			} catch {
				throw new BadRequestError('Invalid JSON in "bindings" field');
			}
		}

		const forceFlag = typeof req.body?.force === 'string' && req.body.force === 'true';

		const mode: ImportMode = forceFlag
			? 'force'
			: typeof req.body?.mode === 'string' && ['strict', 'auto', 'force'].includes(req.body.mode)
				? (req.body.mode as ImportMode)
				: 'auto';

		const createCredentialStubs =
			typeof req.body?.createCredentialStubs === 'string'
				? req.body.createCredentialStubs === 'true'
				: typeof req.body?.withCredentialStubs === 'string'
					? req.body.withCredentialStubs === 'true'
					: false;

		const withVariableValues =
			typeof req.body?.withVariableValues === 'string'
				? req.body.withVariableValues !== 'false'
				: true;

		const overwriteVariableValues =
			typeof req.body?.overwriteVariableValues === 'string'
				? req.body.overwriteVariableValues === 'true'
				: false;

		const importRequest: ImportRequest = {
			user: req.user,
			targetProjectId,
			bindings,
			mode,
			createCredentialStubs,
			withVariableValues,
			overwriteVariableValues,
		};

		return await this.importExportService.importPackage(req.file.buffer, importRequest);
	}
}
