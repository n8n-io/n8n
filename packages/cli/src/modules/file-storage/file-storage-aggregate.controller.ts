import { ListProjectFilesQueryDto, ProjectFileSignedQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { getHtmlSandboxCSP } from 'n8n-core';

import { ProjectFileNotFoundError } from './errors/project-file-not-found.error';
import { FileSigningService } from './file-signing.service';
import { FileStorageAggregateService } from './file-storage-aggregate.service';
import { ProjectFileService } from './file-storage.service';

/**
 * Cross-project surface for /home/files. Deliberately `/files`, not
 * `/files-global`: the data-table aggregate's `-global` suffix is a rename
 * artifact (from `/data-stores-global`), the prefix is free, and `/files` is
 * also the natural home for the Phase 2 signed-download route.
 */
@RestController('/files')
export class FileStorageAggregateController {
	constructor(
		private readonly fileStorageAggregateService: FileStorageAggregateService,
		private readonly projectFileService: ProjectFileService,
		private readonly fileSigningService: FileSigningService,
	) {}

	/**
	 * Download route for `$files(...).url` signed URLs. The short-lived JWT is
	 * the entire authorization (mirroring `/binary-data/signed`), so the route
	 * skips auth: workflow-run consumers (e.g. an HTTP Request node fetching
	 * the URL) carry no session.
	 */
	@Get('/signed', { skipAuth: true })
	async downloadSigned(_req: Request, res: Response, @Query { token }: ProjectFileSignedQueryDto) {
		try {
			const fileId = this.fileSigningService.validateSignedToken(token);
			const file = await this.projectFileService.getFileById(fileId);
			const { stream } = await this.projectFileService.download(fileId, file.projectId);

			res.setHeader('Content-Length', file.fileSizeBytes);
			res.setHeader('Content-Type', file.mimeType);
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${encodeURIComponent(file.name)}"`,
			);

			return stream;
		} catch (error) {
			// A token that outlives its file (deleted, or lost to a replace race)
			if (error instanceof ProjectFileNotFoundError) return res.status(404).end();
			if (error instanceof JsonWebTokenError) return res.status(400).end(error.message);
			throw error;
		}
	}

	@Get('/')
	@GlobalScope('file:list')
	async listFiles(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListProjectFilesQueryDto,
	) {
		const { count, data } = await this.fileStorageAggregateService.getManyAndCount(
			req.user,
			payload,
		);
		return {
			count,
			data: data.map((file) => ({
				id: file.id,
				name: file.name,
				mimeType: file.mimeType,
				sizeBytes: file.fileSizeBytes,
				projectId: file.projectId,
				project: file.project
					? { id: file.project.id, name: file.project.name, type: file.project.type }
					: undefined,
				createdAt: file.createdAt,
				updatedAt: file.updatedAt,
			})),
		};
	}

	@Get('/limits')
	@GlobalScope('file:list')
	async getFileStorageSize(_req: AuthenticatedRequest) {
		return await this.projectFileService.getFileStorageSize();
	}
}
