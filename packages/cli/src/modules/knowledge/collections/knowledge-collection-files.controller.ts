import type {
	KnowledgeCollectionFileDto,
	KnowledgeCollectionFileListResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';
import multer from 'multer';

import { KnowledgeUploadError } from '../files/knowledge-upload.error';
import {
	KnowledgeUploadMiddleware,
	cleanupUploadedTempFiles,
	multerFailureReason,
} from '../files/knowledge-upload.middleware';
import { KnowledgeCollectionFileService } from './knowledge-collection-file.service';

const knowledgeUploadMiddleware = Container.get(KnowledgeUploadMiddleware);
const KNOWLEDGE_FILES_FIELD = 'files';

/**
 * Collections have no scopes of their own yet, so the agent scopes of the
 * project in the URL decide. To be changed when collections have their own scopes.
 *
 * The scope check of each route runs before multer, so a user who cannot
 * change the collections of the project writes no file to the disk.
 */
@RestController('/projects/:projectId/knowledge/collections')
export class KnowledgeCollectionFilesController {
	constructor(private readonly fileService: KnowledgeCollectionFileService) {}

	@Get('/:collectionId/files')
	@ProjectScope('agent:read')
	async listFiles(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<KnowledgeCollectionFileListResponse> {
		return await this.fileService.listFiles(req.user, { projectId, collectionId });
	}

	@Post('/:collectionId/files', {
		middlewares: [knowledgeUploadMiddleware.array(KNOWLEDGE_FILES_FIELD)],
	})
	@ProjectScope('agent:update')
	async uploadFiles(
		req: AuthenticatedRequest<{ projectId: string }> & {
			files?: Express.Multer.File[];
			fileUploadError?: Error;
		},
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
	): Promise<KnowledgeCollectionFileDto[]> {
		const files = req.files ?? [];
		try {
			if (req.fileUploadError) {
				const error = req.fileUploadError;
				if (error instanceof multer.MulterError) {
					const message = `File upload error: ${knowledgeUploadMiddleware.describeMulterError(error)}`;
					const reason = multerFailureReason(error, KNOWLEDGE_FILES_FIELD);
					throw reason ? new KnowledgeUploadError(message, reason) : new BadRequestError(message);
				}
				throw error;
			}

			if (files.length === 0) {
				throw new BadRequestError('No files uploaded');
			}
		} catch (error) {
			// Multer wrote temp files to disk before this handler ran. The service
			// removes them when it runs, but these bail-outs return first.
			await cleanupUploadedTempFiles(files);
			throw error;
		}

		return await this.fileService.uploadFiles({ user: req.user, projectId, collectionId, files });
	}

	@Delete('/:collectionId/files/:fileId')
	@ProjectScope('agent:update')
	async deleteFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('collectionId') collectionId: string,
		@Param('fileId') fileId: string,
	): Promise<{ success: true }> {
		await this.fileService.deleteFile({ user: req.user, projectId, collectionId, fileId });
		return { success: true };
	}
}
