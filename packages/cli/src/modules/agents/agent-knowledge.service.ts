import type { AgentFileDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { unlink } from 'node:fs/promises';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentKnowledgeService {
	constructor(private readonly agentRepository: AgentRepository) {}

	async uploadFiles(
		agentId: string,
		projectId: string,
		files: Express.Multer.File[],
	): Promise<AgentFileDto[]> {
		try {
			await this.ensureAgentBelongsToProject(agentId, projectId);
			return [];
		} finally {
			await this.cleanupUploadTempFiles(files);
		}
	}

	async listFiles(agentId: string, projectId: string): Promise<AgentFileDto[]> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
		return [];
	}

	async deleteFile(agentId: string, projectId: string, _fileId: string): Promise<void> {
		await this.ensureAgentBelongsToProject(agentId, projectId);
	}

	async deleteAllFilesForAgent(_agentId: string): Promise<void> {
		// No-op until Daytona volume-backed storage is implemented.
	}

	private async ensureAgentBelongsToProject(agentId: string, projectId: string) {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	private async cleanupUploadTempFiles(files: Express.Multer.File[]) {
		await Promise.all(files.map(async (file) => await this.cleanupUploadTempFile(file)));
	}

	private async cleanupUploadTempFile(file: Express.Multer.File) {
		if (!file.path) return;

		await unlink(file.path).catch(() => {});
	}
}
