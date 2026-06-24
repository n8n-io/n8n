import type {
	CreateEnvironmentDto,
	UpdateEnvironmentDto,
	UpsertCredentialBindingsDto,
} from '@n8n/api-types';
import {
	CredentialsRepository,
	EnvironmentCredentialBinding,
	EnvironmentCredentialBindingRepository,
	ProjectEnvironment,
	ProjectEnvironmentRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { In } from '@n8n/typeorm';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

export interface MissingBinding {
	credentialId: string;
	credentialName: string;
}

@Service()
export class ProjectEnvironmentService {
	constructor(
		private readonly environmentRepository: ProjectEnvironmentRepository,
		private readonly bindingRepository: EnvironmentCredentialBindingRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
	) {}

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

	async getCredentialBindings(environmentId: string): Promise<EnvironmentCredentialBinding[]> {
		return await this.bindingRepository.findAllByEnvironment(environmentId);
	}

	async replaceCredentialBindings(
		projectId: string,
		environmentId: string,
		dto: UpsertCredentialBindingsDto,
	): Promise<EnvironmentCredentialBinding[]> {
		if (dto.bindings.length > 0) {
			const allIds = dto.bindings.flatMap(
				(b: { sourceCredentialId: string; targetCredentialId: string }) => [
					b.sourceCredentialId,
					b.targetCredentialId,
				],
			);
			const uniqueIds = [...new Set(allIds)];

			const owned = await this.sharedCredentialsRepository.find({
				where: { projectId, credentialsId: In(uniqueIds) },
				select: ['credentialsId'],
			});
			const ownedIds = new Set(owned.map((s) => s.credentialsId));

			const unauthorized = uniqueIds.find((id) => !ownedIds.has(id));
			if (unauthorized !== undefined) {
				throw new BadRequestError(
					`Credential ${String(unauthorized)} does not belong to project ${projectId}`,
				);
			}
		}

		const bindingsArray: Array<{ sourceCredentialId: string; targetCredentialId: string }> =
			dto.bindings.map((b: { sourceCredentialId: string; targetCredentialId: string }) => ({
				sourceCredentialId: b.sourceCredentialId,
				targetCredentialId: b.targetCredentialId,
			}));
		await this.bindingRepository.replaceAll(environmentId, bindingsArray);
		return await this.bindingRepository.findAllByEnvironment(environmentId);
	}

	async validateEnvironmentBindingsForPublish(
		environmentId: string,
		nodes: INode[],
	): Promise<{ valid: boolean; missingBindings: MissingBinding[] }> {
		const enabledNodes = nodes.filter((n) => !n.disabled);

		const credentialIds = new Set<string>();
		for (const node of enabledNodes) {
			for (const cred of Object.values(node.credentials ?? {})) {
				if (cred.id) credentialIds.add(cred.id);
			}
		}

		if (credentialIds.size === 0) {
			return { valid: true, missingBindings: [] };
		}

		const bindings = await this.bindingRepository.findAllByEnvironment(environmentId);
		const boundSourceIds = new Set(
			bindings.map((b: EnvironmentCredentialBinding) => b.sourceCredentialId),
		);

		const unboundIds = [...credentialIds].filter((id) => !boundSourceIds.has(id));
		if (unboundIds.length === 0) {
			return { valid: true, missingBindings: [] };
		}

		const credentials = await this.credentialsRepository.find({
			where: { id: In(unboundIds) },
			select: ['id', 'name'],
		});

		return {
			valid: false,
			missingBindings: credentials.map((c) => ({ credentialId: c.id, credentialName: c.name })),
		};
	}
}
