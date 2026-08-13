import {
	ProjectFileDeletedPublicDto,
	ProjectFileListPublicDto,
	ProjectFilePublicDto,
	PublicApiListProjectFilesQueryDto,
	UpdateProjectFileDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';
import { pipeline } from 'node:stream/promises';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectFileNameConflictError } from '@/modules/file-storage/errors/project-file-name-conflict.error';
import { FileStorageAggregateService } from '@/modules/file-storage/file-storage-aggregate.service';
import { ProjectFileService } from '@/modules/file-storage/file-storage.service';
import type { ProjectFile } from '@/modules/file-storage/project-file.entity';
import { decodeCursor, encodeNextCursor } from '@/public-api/v1/shared/services/pagination.service';

const toPublicFile = (file: ProjectFile): ProjectFilePublicDto => ({
	id: file.id,
	name: file.name,
	mimeType: file.mimeType,
	sizeBytes: file.fileSizeBytes,
	projectId: file.projectId,
	createdAt: file.createdAt.toISOString(),
	updatedAt: file.updatedAt.toISOString(),
});

@PublicApiController('/files')
export class FilesPublicController {
	constructor(
		private readonly fileStorageAggregateService: FileStorageAggregateService,
		private readonly projectFileService: ProjectFileService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	/**
	 * The controller is always mounted, but the module (and with it the
	 * `project_files` entity) may be disabled. For `:fileId` routes the
	 * `@ProjectScope` resolver already 404s inactive modules for non-global
	 * users; this covers global-scoped users and the list route.
	 */
	private assertFileStorageModuleActive(): void {
		if (!this.moduleRegistry.isActive('file-storage')) {
			throw new NotFoundError('File storage is not enabled on this instance');
		}
	}

	@Get('/')
	@ApiKeyScope('file:list')
	@GlobalScope('file:list')
	@ApiSummary('Retrieve files')
	@ApiDescription(
		'Retrieve files from the projects you have access to. Use `filter` (a JSON object, e.g. `{"projectId":"..."}`) to narrow down the results.',
	)
	@ApiTags(['Files'])
	@ApiResponse(200, ProjectFileListPublicDto)
	async getFiles(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: PublicApiListProjectFilesQueryDto,
	): Promise<ProjectFileListPublicDto> {
		this.assertFileStorageModuleActive();

		let { offset, limit } = query;

		if (query.cursor) {
			try {
				const decoded = decodeCursor(query.cursor);
				if (!('offset' in decoded)) {
					throw new BadRequestError('An invalid cursor was provided');
				}
				offset = decoded.offset;
				limit = decoded.limit;
			} catch (error) {
				if (error instanceof BadRequestError) throw error;
				throw new BadRequestError('An invalid cursor was provided');
			}
		}

		const { count, data } = await this.fileStorageAggregateService.getManyAndCount(req.user, {
			skip: offset,
			take: limit,
			filter: query.filter,
			sortBy: query.sortBy,
		});

		return {
			data: data.map(toPublicFile),
			nextCursor: encodeNextCursor({
				offset,
				limit,
				numberOfTotalRecords: count,
			}),
		};
	}

	@Get('/:fileId')
	@ApiKeyScope('file:read')
	@ProjectScope('file:read')
	@ApiSummary('Retrieve a file')
	@ApiDescription('Retrieve the metadata of a file.')
	@ApiTags(['Files'])
	@ApiResponse(200, ProjectFilePublicDto)
	@ApiErrorResponse(404)
	async getFile(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('fileId') fileId: string,
	): Promise<ProjectFilePublicDto> {
		this.assertFileStorageModuleActive();
		return toPublicFile(await this.projectFileService.getFileById(fileId));
	}

	@Get('/:fileId/content')
	@ApiKeyScope('file:read')
	@ProjectScope('file:read')
	@ApiSummary('Download file content')
	@ApiDescription('Download the raw content of a file as an attachment.')
	@ApiTags(['Files'])
	// No response DTO: the registry only `.parse()`s + JSON-serializes a return
	// value, so the handler streams straight to `res` and returns nothing.
	@ApiResponse(200)
	@ApiErrorResponse(404)
	async getFileContent(
		_req: AuthenticatedRequest,
		res: Response,
		@Param('fileId') fileId: string,
	): Promise<void> {
		this.assertFileStorageModuleActive();
		const { projectId } = await this.projectFileService.getFileById(fileId);
		const { file, stream } = await this.projectFileService.download(fileId, projectId);

		res.setHeader('Content-Length', file.fileSizeBytes);
		res.setHeader('Content-Type', file.mimeType);
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

		await pipeline(stream, res);
	}

	@Put('/:fileId')
	@ApiKeyScope('file:update')
	@ProjectScope('file:update')
	@ApiSummary('Rename a file')
	@ApiDescription('Rename a file. The name must be unique within its project.')
	@ApiTags(['Files'])
	@ApiResponse(200, ProjectFilePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateFile(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('fileId') fileId: string,
		@Body body: UpdateProjectFileDto,
	): Promise<ProjectFilePublicDto> {
		this.assertFileStorageModuleActive();
		const { projectId } = await this.projectFileService.getFileById(fileId);

		try {
			return toPublicFile(await this.projectFileService.renameFile(fileId, projectId, body.name));
		} catch (error) {
			if (error instanceof ProjectFileNameConflictError) {
				throw new ConflictError(error.message);
			}
			throw error;
		}
	}

	@Delete('/:fileId')
	@ApiKeyScope('file:delete')
	@ProjectScope('file:delete')
	@ApiSummary('Delete a file')
	@ApiDescription('Delete a file. Its content is reclaimed asynchronously.')
	@ApiTags(['Files'])
	@ApiResponse(200, ProjectFileDeletedPublicDto)
	@ApiErrorResponse(404)
	async deleteFile(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('fileId') fileId: string,
	): Promise<ProjectFileDeletedPublicDto> {
		this.assertFileStorageModuleActive();
		const { projectId } = await this.projectFileService.getFileById(fileId);
		const file = await this.projectFileService.deleteFile(fileId, projectId);
		return { deleted: true, name: file.name };
	}
}
