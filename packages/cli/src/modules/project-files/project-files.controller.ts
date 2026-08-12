import type { ProjectFileListResponse, ProjectFileResponse } from '@n8n/api-types';
import {
	ListProjectFilesQueryDto,
	RenameProjectFileDto,
	UploadProjectFileQueryDto,
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
	Query,
	RestController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { NextFunction, Response } from 'express';
import multer from 'multer';
import { BinaryDataConfig } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { unlink } from 'node:fs/promises';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { ProjectFileConcurrentModificationError } from './errors/project-file-concurrent-modification.error';
import { ProjectFileNameConflictError } from './errors/project-file-name-conflict.error';
import { ProjectFileQuotaExceededError } from './errors/project-file-quota-exceeded.error';
import { ProjectFileTooLargeError } from './errors/project-file-too-large.error';
import { ProjectFileResponseService } from './project-file-response.service';
import { ProjectFileUploadMiddleware } from './project-file-upload.middleware';
import { ProjectFileService } from './project-file.service';
import type { ProjectFileRequestWithFile } from './project-files.types';

const uploadMiddleware = Container.get(ProjectFileUploadMiddleware);

@RestController('/projects/:projectId/files')
export class ProjectFilesController {
	constructor(
		private readonly projectFileService: ProjectFileService,
		private readonly responseService: ProjectFileResponseService,
		private readonly projectService: ProjectService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly telemetry: Telemetry,
	) {}

	/** Resolved before the scope check so an unknown project is 404, not 403. */
	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			await this.projectService.getProject(req.params.projectId);
			next();
		} catch {
			res.status(404).send('Project not found');
		}
	}

	@Get('/')
	@ProjectScope('projectFile:listProject')
	async listFiles(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Query query: ListProjectFilesQueryDto,
	): Promise<ProjectFileListResponse> {
		const { projectId } = req.params;
		const { count, data } = await this.projectFileService.list(projectId, {
			take: query.take,
			skip: query.skip,
			search: query.search,
		});

		return {
			count,
			data: await this.responseService.toResponses(data),
			usage: await this.projectFileService.getUsage(projectId),
		};
	}

	@Post('/', { middlewares: [uploadMiddleware.single('file')] })
	@ProjectScope('projectFile:create')
	async uploadFile(
		req: ProjectFileRequestWithFile,
		res: Response,
		@Query query: UploadProjectFileQueryDto,
	): Promise<ProjectFileResponse> {
		this.checkInstanceWriteAccess();

		if (req.fileUploadError) throw this.toUploadError(req.fileUploadError);
		if (!req.file) throw new BadRequestError('No file uploaded');

		const { projectId } = req.params;
		const { file } = req;

		try {
			const {
				file: stored,
				overwritten,
				projectType,
			} = await this.projectFileService.store(
				projectId,
				{ type: 'user', userId: req.user.id },
				{
					name: file.originalname,
					mimeType: file.mimetype,
					sizeBytes: file.size,
					source: { type: 'path', path: file.path },
				},
				{ overwrite: query.overwrite },
			);

			this.telemetry.track(TELEMETRY_EVENT.PROJECT_FILES.USER_UPLOADED_PROJECT_FILE, {
				user_id: req.user.id,
				project_id: projectId,
				project_type: projectType,
				mime_type: stored.mimeType,
				file_size_bytes: stored.fileSizeBytes,
				overwrote_existing: overwritten,
				n8n_binary_data_mode: this.binaryDataConfig.mode,
			});

			res.status(201);

			return await this.responseService.toResponse(stored);
		} catch (error) {
			throw this.toResponseError(error);
		} finally {
			// The staged copy is redundant once the bytes are in binary data storage.
			// The cleanup service only exists for files a crash leaves behind.
			await unlink(file.path).catch(() => {});
		}
	}

	@Get('/:fileId/content')
	@ProjectScope('projectFile:read')
	async downloadFile(
		req: AuthenticatedRequest<{ projectId: string; fileId: string }>,
		res: Response,
		@Param('fileId') fileId: string,
	) {
		const { file, stream } = await this.projectFileService.getAsStream(
			req.params.projectId,
			fileId,
		);

		res.setHeader('Content-Type', file.mimeType);
		res.setHeader('Content-Length', file.fileSizeBytes);
		// Always an attachment: there is no vetted inline-view path, and rendering
		// user-uploaded content on the n8n origin would be stored XSS.
		res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

		return stream;
	}

	@Patch('/:fileId')
	@ProjectScope('projectFile:update')
	async renameFile(
		req: AuthenticatedRequest<{ projectId: string; fileId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
		@Body dto: RenameProjectFileDto,
	): Promise<ProjectFileResponse> {
		this.checkInstanceWriteAccess();

		try {
			const renamed = await this.projectFileService.rename(req.params.projectId, fileId, dto.name, {
				type: 'user',
				userId: req.user.id,
			});

			return await this.responseService.toResponse(renamed);
		} catch (error) {
			throw this.toResponseError(error);
		}
	}

	@Delete('/:fileId')
	@ProjectScope('projectFile:delete')
	async deleteFile(
		req: AuthenticatedRequest<{ projectId: string; fileId: string }>,
		_res: Response,
		@Param('fileId') fileId: string,
	): Promise<{ success: true }> {
		this.checkInstanceWriteAccess();

		await this.projectFileService.delete(req.params.projectId, fileId);

		return { success: true };
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	private checkInstanceWriteAccess(): void {
		if (this.sourceControlPreferencesService.getPreferences().branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify project files on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	/** Multer rejects before the handler runs, so its errors are translated here. */
	private toUploadError(error: Error): ResponseError {
		if (error instanceof multer.MulterError) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				return new ContentTooLargeError('File exceeds the maximum allowed size');
			}
			return new BadRequestError(`File upload error: ${error.message}`);
		}

		return new BadRequestError('File upload failed');
	}

	/** Maps the service's domain errors onto HTTP status codes. */
	private toResponseError(error: unknown): unknown {
		if (error instanceof ResponseError) return error;

		if (
			error instanceof ProjectFileNameConflictError ||
			error instanceof ProjectFileConcurrentModificationError
		) {
			return new ConflictError(error.message);
		}

		if (
			error instanceof ProjectFileTooLargeError ||
			error instanceof ProjectFileQuotaExceededError
		) {
			return new ContentTooLargeError(error.message);
		}

		if (error instanceof UserError) return new BadRequestError(error.message);

		return error;
	}
}
