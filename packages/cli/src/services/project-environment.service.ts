import type { CreateEnvironmentDto, UpdateEnvironmentDto } from '@n8n/api-types';
import { ProjectEnvironment, ProjectEnvironmentRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ProjectEnvironmentService {
	constructor(private readonly environmentRepository: ProjectEnvironmentRepository) {}

	async getEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
		return await this.environmentRepository.findAllByProject(projectId);
	}

	async createEnvironment(
		projectId: string,
		dto: CreateEnvironmentDto,
	): Promise<ProjectEnvironment> {
		const environment = this.environmentRepository.create({ projectId, name: dto.name });
		return await this.environmentRepository.save(environment);
	}

	async updateEnvironment(
		projectId: string,
		envId: string,
		dto: UpdateEnvironmentDto,
	): Promise<ProjectEnvironment> {
		const environment = await this.environmentRepository.findOne({
			where: { id: envId, projectId },
		});

		if (!environment) {
			throw new NotFoundError('Environment not found');
		}

		environment.name = dto.name;
		return await this.environmentRepository.save(environment);
	}

	async deleteEnvironment(projectId: string, envId: string): Promise<void> {
		const environment = await this.environmentRepository.findOne({
			where: { id: envId, projectId },
		});

		if (!environment) {
			throw new NotFoundError('Environment not found');
		}

		await this.environmentRepository.remove(environment);
	}
}
