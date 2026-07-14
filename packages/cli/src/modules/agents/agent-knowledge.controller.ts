import { AgentsConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import { Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import {
	AgentUploadMiddleware,
	cleanupUploadedTempFiles,
	describeMulterError,
} from './agent-upload.middleware';

const agentUploadMiddleware = Container.get(AgentUploadMiddleware);

@RestController('/projects/:projectId/agents/v2')
export class AgentKnowledgeController {
	constructor(
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly agentsConfig: AgentsConfig,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
	) {}

	/** Knowledge base endpoints are gated behind Daytona sandbox env vars. */
	private assertKnowledgeBaseEnabled() {
		if (!isAgentKnowledgeBaseEnabled(this.agentsConfig)) {
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
		middlewares: [agentUploadMiddleware.array('files')],
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
					throw new BadRequestError(`File upload error: ${describeMulterError(error)}`);
				}
				throw error;
			}

			if (files.length === 0) {
				throw new BadRequestError('No files uploaded');
			}

			const uploadedFiles = await this.agentKnowledgeService.uploadFiles(agentId, projectId, files);
			this.runtimeCacheService.clearRuntimes(agentId);
			return uploadedFiles;
		} catch (error) {
			// Multer wrote temp files to disk before this handler ran. The success
			// path hands them to AgentKnowledgeService (which cleans up its own temp
			// files), but these early bail-outs return first, so clean up here.
			await cleanupUploadedTempFiles(files);
			throw error;
		}
	}

	@Delete('/:agentId/files/:fileId')
	@ProjectScope('agent:update')
	async deleteFile(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('agentId') agentId: string,
		@Param('fileId') fileId: string,
	) {
		this.assertKnowledgeBaseEnabled();
		await this.agentKnowledgeService.deleteFile(agentId, projectId, fileId);
		this.runtimeCacheService.clearRuntimes(agentId);
		return { success: true };
	}
}
