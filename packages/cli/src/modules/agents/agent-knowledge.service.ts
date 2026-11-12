import type { AgentFileDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import {
	KnowledgeFileService,
	type UploadedKnowledgeFile,
} from '@/modules/knowledge/files/knowledge-file.service';
import { cleanupUploadedTempFiles } from '@/modules/knowledge/files/knowledge-upload.middleware';
import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import type { KnowledgeConsumerScope } from '@/modules/knowledge/knowledge-consumer-scope';

import { AgentKnowledgeMirrorService } from './agent-knowledge-mirror.service';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import { AgentProjectDeletionRepository } from './repositories/agent-project-deletion.repository';
import { AgentRepository } from './repositories/agent.repository';
import { assertAgentNotArchived } from './utils/agent-draft.utils';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

/**
 * The agent-facing entry point for uploaded-file knowledge. It checks that the
 * knowledge module is active and that the agent belongs to the project, then
 * delegates to the knowledge module with an agent scope. It keeps the sandbox
 * warm-up and teardown side effects until the retrieval layer moves too.
 */
@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly knowledgeFileService: KnowledgeFileService,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly agentKnowledgeMirrorService: AgentKnowledgeMirrorService,
		private readonly knowledgeAvailabilityService: KnowledgeAvailabilityService,
		private readonly projectDeletion: AgentProjectDeletionRepository,
		private readonly logger: Logger,
	) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<UploadedKnowledgeFile[]> {
		let scope: KnowledgeConsumerScope;
		try {
			scope = await this.scopeFor(agentId, projectId, { forWrite: true });
		} catch (error) {
			// The knowledge module removes the temp files it receives; these never reach it.
			await cleanupUploadedTempFiles(files);
			throw error;
		}

		const uploadedFiles = await this.knowledgeFileService.uploadFiles(
			scope,
			files,
			// Each row insert waits for, and blocks, the deletion of the project.
			async (write) => await this.projectDeletion.withWritableProject(projectId, write),
		);

		this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);

		return uploadedFiles;
	}

	async listFiles(agentId: string, projectId: string): Promise<AgentFileDto[]> {
		const scope = await this.scopeFor(agentId, projectId);
		return await this.knowledgeFileService.listFiles(scope);
	}

	async warmKnowledgeSandbox(agentId: string, projectId: string): Promise<void> {
		const scope = await this.scopeFor(agentId, projectId);
		if (!(await this.knowledgeFileService.hasFiles(scope))) return;

		await this.agentSandboxRuntimeService.warmKnowledgeSandbox(projectId, agentId);
	}

	/** Returns false when the agent has no file with this id, so nothing was deleted. */
	async deleteFile(agentId: string, projectId: string, fileId: string): Promise<boolean> {
		const scope = await this.scopeFor(agentId, projectId, { forWrite: true });

		const deleted = await this.knowledgeFileService.deleteFile(scope, fileId);
		if (!deleted) {
			return false;
		}

		if (await this.knowledgeFileService.hasFiles(scope)) {
			this.agentKnowledgeMirrorService.prewarmMirrorInBackground(projectId, agentId);
		} else {
			await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(projectId, agentId);
		}

		return true;
	}

	/**
	 * Cleanup for the agent and project deletion cascades. With the knowledge
	 * module off its entity is not registered, so the rows cannot be read: the
	 * database cascade still removes them with the agent, but their stored bytes
	 * stay (see the knowledge module AGENTS.md).
	 */
	async deleteAllFilesForAgent(projectId: string, agentId: string): Promise<void> {
		if (!this.knowledgeAvailabilityService.isModuleActive()) {
			this.logger.warn(
				'Knowledge module is inactive, so the stored knowledge file bytes of the deleted agent are kept',
				{ agentId },
			);
			return;
		}

		await this.knowledgeFileService.deleteAll({ kind: 'agent', projectId, agentId });
	}

	/** Best-effort passthrough for agent/project deletion; never throws. */
	async destroyKnowledgeSandbox(projectId: string, agentId: string): Promise<void> {
		await this.agentSandboxRuntimeService.destroyKnowledgeSandbox(projectId, agentId);
	}

	/** The scope of a feature call: the module must be active and the agent must be in the project. */
	private async scopeFor(
		agentId: string,
		projectId: string,
		{ forWrite = false }: { forWrite?: boolean } = {},
	): Promise<KnowledgeConsumerScope> {
		this.knowledgeAvailabilityService.assertModuleActive();
		const agent = await getAgentOrThrow(this.agentRepository, agentId, projectId);
		if (forWrite) assertAgentNotArchived(agent);
		return { kind: 'agent', projectId, agentId };
	}
}
