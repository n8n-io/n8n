import { isAuthenticatedRequest, type AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, Param, Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError, UnauthenticatedError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { RequestHandler, Response } from 'express';
import multer from 'multer';

import { reportError, sendErrorResponse } from '@/response-helper';

import { KnowledgeUploadError } from '../files/knowledge-upload.error';
import {
	KnowledgeUploadMiddleware,
	cleanupUploadedTempFiles,
	multerFailureReason,
} from '../files/knowledge-upload.middleware';
import { KnowledgeCollectionFileService } from './knowledge-collection-file.service';
import { KnowledgeCollectionService } from './knowledge-collection.service';

const knowledgeUploadMiddleware = Container.get(KnowledgeUploadMiddleware);
const KNOWLEDGE_FILES_FIELD = 'files';

/**
 * Checks the collection before multer runs, so a user who cannot change the
 * collection gets that answer first and no file reaches the disk.
 */
const requireCollectionUpdate: RequestHandler = async (req, res, next) => {
	const { collectionId } = req.params;
	try {
		if (!isAuthenticatedRequest(req)) {
			throw new UnauthenticatedError();
		}
		await Container.get(KnowledgeCollectionService).getForUser(
			req.user,
			collectionId,
			'agent:update',
		);
	} catch (e) {
		const error = ensureError(e);
		reportError(error);
		sendErrorResponse(res, error);
		return;
	}
	next();
};

/**
 * The routes carry no scope decorator: the service checks the scope of the
 * user on the home project of the collection.
 */
@RestController('/knowledge-collections')
export class KnowledgeCollectionFilesController {
	constructor(private readonly fileService: KnowledgeCollectionFileService) {}

	@Get('/:collectionId/files')
	async listFiles(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('collectionId') collectionId: string,
	) {
		return await this.fileService.listFiles(req.user, collectionId);
	}

	@Post('/:collectionId/files', {
		middlewares: [requireCollectionUpdate, knowledgeUploadMiddleware.array(KNOWLEDGE_FILES_FIELD)],
	})
	async uploadFiles(
		req: AuthenticatedRequest & {
			files?: Express.Multer.File[];
			fileUploadError?: Error;
		},
		_res: Response,
		@Param('collectionId') collectionId: string,
	) {
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

		return await this.fileService.uploadFiles(req.user, collectionId, files);
	}

	@Delete('/:collectionId/files/:fileId')
	async deleteFile(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('collectionId') collectionId: string,
		@Param('fileId') fileId: string,
	) {
		await this.fileService.deleteFile(req.user, collectionId, fileId);
		return { success: true };
	}
}
