import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Response } from 'express';
import multer from 'multer';

import { BadRequestError, NotFoundError } from '@n8n/errors';

import type { UploadedKnowledgeFile } from '@/modules/knowledge/files/knowledge-file.service';
import { KnowledgeUploadError } from '@/modules/knowledge/files/knowledge-upload.error';
import {
	KnowledgeUploadMiddleware,
	cleanupUploadedTempFiles,
	multerFailureReason,
} from '@/modules/knowledge/files/knowledge-upload.middleware';
import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import { Telemetry } from '@/telemetry';

import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';

const knowledgeUploadMiddleware = Container.get(KnowledgeUploadMiddleware);
const KNOWLEDGE_FILES_FIELD = 'files';

@RestController('/projects/:projectId/agents/v2')
export class AgentKnowledgeController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly telemetry: Telemetry,
	) {}

	/** Knowledge base endpoints require the knowledge module and an enabled Agent sandbox. */
	private assertKnowledgeBaseEnabled() {
		if (!this.knowledgeAvailabilityService.isFileKnowledgeEnabled()) {
			throw new NotFoundError('Agent knowledge base is not enabled');
		}
	}

	@Get('/:agentId/files')
	@ProjectScope('agent:read')
	async listFiles(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
	) {
		this.assertKnowledgeBaseEnabled();
		return await this.agentKnowledgeService.listFiles(agentId, projectId);
	}

	@Post('/:agentId/files', {
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
		@Param('agentId') agentId: string,
	) {
		const files = req.files ?? [];
		try {
			this.assertKnowledgeBaseEnabled();
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

			const uploadedFiles = await this.agentKnowledgeService.uploadFiles(agentId, projectId, files);
			this.runtimeCacheService.clearRuntimes(agentId);
			this.trackUploadedFiles(req.user.id, projectId, agentId, uploadedFiles);
			return uploadedFiles.map(({ file }) => file);
		} catch (error) {
			// Multer wrote temp files to disk before this handler ran. The success
			// path hands them to AgentKnowledgeService (which cleans up its own temp
			// files), but these early bail-outs return first, so clean up here.
			await cleanupUploadedTempFiles(files);
			this.trackUploadFailed(req, projectId, agentId, files.length, error);
			throw error;
		}
	}

	@Delete('/:agentId/files/:fileId')
	@ProjectScope('agent:update')
	async deleteFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Param('fileId') fileId: string,
	) {
		this.assertKnowledgeBaseEnabled();

		const deleted = await this.agentKnowledgeService.deleteFile(agentId, projectId, fileId);

		this.runtimeCacheService.clearRuntimes(agentId);

		if (deleted) {
			this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_REMOVED_AGENT_KNOWLEDGE, {
				agent_id: agentId,
				project_id: projectId,
				user_id: req.user.id,
			});
		}

		return { success: true };
	}

	private trackUploadedFiles(
		userId: string,
		projectId: string,
		agentId: string,
		uploadedFiles: UploadedKnowledgeFile[],
	) {
		const files = uploadedFiles.map(({ file, contentHash }) => ({
			...(contentHash === undefined ? {} : { content_hash: contentHash }),
			mime_type: file.mimeType,
			size_bytes: file.fileSizeBytes,
		}));

		const totalBytes = files.reduce((sum, file) => sum + file.size_bytes, 0);

		this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_UPLOADED_AGENT_KNOWLEDGE_FILES, {
			agent_id: agentId,
			project_id: projectId,
			user_id: userId,
			file_count: files.length,
			total_bytes: totalBytes,
			files,
		});
	}

	private trackUploadFailed(
		req: AuthenticatedRequest,
		projectId: string,
		agentId: string,
		fileCount: number,
		error: unknown,
	) {
		// A disabled knowledge base or a missing agent is not a rejected upload.
		if (error instanceof NotFoundError) {
			return;
		}

		const reason = error instanceof KnowledgeUploadError ? error.reason : 'unknown';

		this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_FAILED_AGENT_KNOWLEDGE_UPLOAD, {
			stage: 'server',
			agent_id: agentId,
			project_id: projectId,
			user_id: req.user.id,
			file_count: fileCount,
			reason,
		});
	}
}
