import {
	BatchDeleteProjectFilesDto,
	ListProjectFilesQueryDto,
	ProjectFileContentQueryDto,
	UpdateProjectFileDto,
	UploadProjectFileQueryDto,
	ViewableMimeTypes,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	ProjectScope,
	Put,
	Query,
	RestController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NextFunction, Response } from 'express';
import multer from 'multer';
import { getHtmlSandboxCSP } from 'n8n-core';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { ProjectService } from '@/services/project.service.ee';

import { FileStorageValidationError } from './errors/file-storage-validation.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileService } from './file-storage.service';
import { MulterUploadMiddleware } from './multer-upload-middleware';
import type { ProjectFile } from './project-file.entity';
import { AuthenticatedRequestWithFile } from './types';

const uploadMiddleware = Container.get(MulterUploadMiddleware);

const toResponse = (file: ProjectFile) => ({
	id: file.id,
	name: file.name,
	mimeType: file.mimeType,
	sizeBytes: file.fileSizeBytes,
	projectId: file.projectId,
	createdAt: file.createdAt,
	updatedAt: file.updatedAt,
});

@RestController('/projects/:projectId/files')
export class FileStorageController {
	constructor(
		private readonly projectFileService: ProjectFileService,
		private readonly projectService: ProjectService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	private checkInstanceWriteAccess(): void {
		const preferences = this.sourceControlPreferencesService.getPreferences();
		if (preferences.branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify files on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private handleFileOperationError(e: unknown): never {
		if (e instanceof ProjectFileNameConflictError) {
			throw new ConflictError(e.message);
		}
		if (e instanceof FileStorageValidationError) {
			throw new BadRequestError(e.message);
		}
		if (e instanceof ResponseError) {
			throw e;
		}
		if (e instanceof Error) {
			throw new InternalServerError(e.message, e);
		}
		throw e;
	}

	private receivedFile(req: AuthenticatedRequestWithFile): Express.Multer.File {
		if (req.fileUploadError) {
			const error = req.fileUploadError;
			if (error instanceof multer.MulterError) {
				throw new BadRequestError(`File upload error: ${error.message}`);
			} else if (error instanceof BadRequestError) {
				throw error;
			} else {
				throw new BadRequestError('File upload failed');
			}
		}

		if (!req.file) {
			throw new BadRequestError('No file uploaded');
		}

		return req.file;
	}

	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			const { projectId } = req.params;
			await this.projectService.getProject(projectId);
			next();
		} catch {
			res.status(404).send('Project not found');
			return;
		}
	}

	@Get('/')
	@ProjectScope('file:listProject')
	async listProjectFiles(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Query payload: ListProjectFilesQueryDto,
	) {
		const providedFilter = payload?.filter ?? {};
		const { count, data } = await this.projectFileService.getManyAndCount({
			...payload,
			filter: { ...providedFilter, projectId: req.params.projectId },
		});
		return { count, data: data.map(toResponse) };
	}

	@Post('/', { middlewares: [uploadMiddleware.single('file')] })
	@ProjectScope('file:create')
	async uploadFile(
		req: AuthenticatedRequestWithFile<{ projectId: string }>,
		_res: Response,
		@Query query: UploadProjectFileQueryDto,
	) {
		this.checkInstanceWriteAccess();
		const file = this.receivedFile(req);

		try {
			const created = await this.projectFileService.uploadFromPath(
				req.params.projectId,
				file.path,
				{
					name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
					mimeType: file.mimetype,
				},
				query.conflict,
			);
			return toResponse(created);
		} catch (e: unknown) {
			this.handleFileOperationError(e);
		}
	}

	@Get('/:fileId')
	@ProjectScope('file:read')
	async getFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
	) {
		return toResponse(await this.projectFileService.getFileInProject(fileId, req.params.projectId));
	}

	@Get('/:fileId/content')
	@ProjectScope('file:read')
	async getFileContent(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Param('fileId') fileId: string,
		@Query query: ProjectFileContentQueryDto,
	) {
		const { file, stream } = await this.projectFileService.download(fileId, req.params.projectId);

		if (
			query.action === 'view' &&
			(!file.mimeType || !ViewableMimeTypes.includes(file.mimeType.toLowerCase()))
		) {
			stream.destroy();
			throw new BadRequestError('Content not viewable');
		}

		res.setHeader('Content-Length', file.fileSizeBytes);
		res.setHeader('Content-Type', file.mimeType);
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		if (query.action === 'download') {
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${encodeURIComponent(file.name)}"`,
			);
		}

		return stream;
	}

	@Put('/:fileId/content', { middlewares: [uploadMiddleware.single('file')] })
	@ProjectScope('file:update')
	async replaceFileContent(
		req: AuthenticatedRequestWithFile<{ projectId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
	) {
		this.checkInstanceWriteAccess();
		const file = this.receivedFile(req);

		try {
			const updated = await this.projectFileService.replaceContentFromPath(
				fileId,
				req.params.projectId,
				file.path,
				file.mimetype,
			);
			return toResponse(updated);
		} catch (e: unknown) {
			this.handleFileOperationError(e);
		}
	}

	@Patch('/:fileId')
	@ProjectScope('file:update')
	async renameFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
		@Body dto: UpdateProjectFileDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return toResponse(
				await this.projectFileService.renameFile(fileId, req.params.projectId, dto.name),
			);
		} catch (e: unknown) {
			this.handleFileOperationError(e);
		}
	}

	@Delete('/:fileId')
	@ProjectScope('file:delete')
	async deleteFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
	) {
		this.checkInstanceWriteAccess();
		const file = await this.projectFileService.deleteFile(fileId, req.params.projectId);
		return { deleted: true, name: file.name };
	}

	// A body on DELETE is dropped by some proxies, so bulk delete is a POST.
	@Post('/batch-delete')
	@ProjectScope('file:delete')
	async batchDeleteFiles(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: BatchDeleteProjectFilesDto,
	) {
		this.checkInstanceWriteAccess();
		await this.projectFileService.deleteFiles(dto.fileIds, req.params.projectId);
		return { deleted: true, count: dto.fileIds.length };
	}
}
