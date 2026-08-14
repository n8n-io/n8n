import type { CreateGitConnectionDto, UpdateGitConnectionDto } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

@Service()
export class GitConnectionsPublicApiService {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	async create(input: CreateGitConnectionDto) {
		return await (await this.getService()).create(input);
	}

	async findOne(id: string) {
		return await (await this.getService()).findOne(id);
	}

	async list(offset: number, limit: number) {
		return await (await this.getService()).list(offset, limit);
	}

	async update(id: string, input: UpdateGitConnectionDto) {
		return await (await this.getService()).update(id, input);
	}

	async connect(id: string, branchName?: string) {
		return await (await this.getService()).connect(id, branchName);
	}

	async disconnect(id: string) {
		return await (await this.getService()).disconnect(id);
	}

	async delete(id: string) {
		await (await this.getService()).delete(id);
	}

	private async getService() {
		if (!this.moduleRegistry.isActive('git-connections')) {
			throw new ServiceUnavailableError('Git connections module is not enabled');
		}
		const { GitConnectionsService } = await import(
			'@/modules/git-connections.ee/git-connections.service.js'
		);
		return Container.get(GitConnectionsService);
	}
}
