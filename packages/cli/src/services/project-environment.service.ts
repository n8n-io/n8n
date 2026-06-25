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
	SharedWorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { In } from '@n8n/typeorm';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

export interface MissingBinding {
	nodeId: string;
	credentialType: string;
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
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
		return await this.environmentRepository.findAllByProject(projectId);
	}

	async hasEnvironments(projectId: string): Promise<boolean> {
		const count = await this.environmentRepository.count({ where: { projectId } });
		return count > 0;
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

	async getCredentialBindings(
		environmentId: string,
		workflowId: string,
	): Promise<EnvironmentCredentialBinding[]> {
		return await this.bindingRepository.findAllByEnvironment(environmentId, workflowId);
	}

	async replaceCredentialBindings(
		projectId: string,
		environmentId: string,
		workflowId: string,
		dto: UpsertCredentialBindingsDto,
	): Promise<EnvironmentCredentialBinding[]> {
		if (dto.bindings.length > 0) {
			const targetIds = [...new Set(dto.bindings.map((b) => b.targetCredentialId))];

			const owned = await this.sharedCredentialsRepository.find({
				where: { projectId, credentialsId: In(targetIds) },
				select: ['credentialsId'],
			});
			const ownedIds = new Set(owned.map((s) => s.credentialsId));

			const unauthorized = targetIds.find((id) => !ownedIds.has(id));
			if (unauthorized !== undefined) {
				throw new BadRequestError(
					`Credential ${String(unauthorized)} does not belong to project ${projectId}`,
				);
			}
		}

		const bindingsArray = dto.bindings.map((b) => ({
			nodeId: b.nodeId,
			credentialType: b.credentialType,
			targetCredentialId: b.targetCredentialId,
		}));
		await this.bindingRepository.replaceAll(environmentId, workflowId, bindingsArray);
		return await this.bindingRepository.findAllByEnvironment(environmentId, workflowId);
	}

	async initializeEnvironments(projectId: string): Promise<ProjectEnvironment[]> {
		const existing = await this.environmentRepository.findAllByProject(projectId);
		if (existing.length > 0) {
			throw new ConflictError('Environments already exist for this project');
		}

		const dev = await this.environmentRepository.save(
			this.environmentRepository.create({ projectId, name: 'Dev' }),
		);
		const prod = await this.environmentRepository.save(
			this.environmentRepository.create({ projectId, name: 'Prod' }),
		);

		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId, role: 'workflow:owner' },
			relations: { workflow: true },
		});

		const allBindings: Array<{
			workflowId: string;
			environmentId: string;
			nodeId: string;
			credentialType: string;
			targetCredentialId: string;
		}> = [];

		for (const { workflow } of sharedWorkflows) {
			if (!workflow) continue;
			for (const node of workflow.nodes) {
				for (const [credType, cred] of Object.entries(node.credentials ?? {})) {
					if (!cred.id) continue;
					allBindings.push(
						{
							workflowId: workflow.id,
							environmentId: dev.id,
							nodeId: node.id,
							credentialType: credType,
							targetCredentialId: cred.id,
						},
						{
							workflowId: workflow.id,
							environmentId: prod.id,
							nodeId: node.id,
							credentialType: credType,
							targetCredentialId: cred.id,
						},
					);
				}
			}
		}

		if (allBindings.length > 0) {
			await this.bindingRepository.insert(allBindings);
		}

		return [dev, prod];
	}

	async validateEnvironmentBindingsForPublish(
		environmentId: string,
		workflowId: string,
		nodes: INode[],
	): Promise<{ valid: boolean; missingBindings: MissingBinding[] }> {
		const enabledNodes = nodes.filter((n) => !n.disabled);

		// Collect every (nodeId, credentialType) slot that needs a binding
		const credentialSlots: Array<{ nodeId: string; credentialType: string; credentialId: string }> =
			[];
		for (const node of enabledNodes) {
			for (const [credType, cred] of Object.entries(node.credentials ?? {})) {
				if (cred.id)
					credentialSlots.push({
						nodeId: node.id,
						credentialType: credType,
						credentialId: cred.id,
					});
			}
		}

		if (credentialSlots.length === 0) {
			return { valid: true, missingBindings: [] };
		}

		const bindings = await this.bindingRepository.findAllByEnvironment(environmentId, workflowId);
		const boundSlotKeys = new Set(
			bindings.map((b: EnvironmentCredentialBinding) => `${b.nodeId}:${b.credentialType}`),
		);

		const unboundSlots = credentialSlots.filter(
			(s) => !boundSlotKeys.has(`${s.nodeId}:${s.credentialType}`),
		);
		if (unboundSlots.length === 0) {
			return { valid: true, missingBindings: [] };
		}

		const unboundCredentialIds = [...new Set(unboundSlots.map((s) => s.credentialId))];
		const credentials = await this.credentialsRepository.find({
			where: { id: In(unboundCredentialIds) },
			select: ['id', 'name'],
		});
		const credentialNameById = new Map(credentials.map((c) => [c.id, c.name]));

		return {
			valid: false,
			missingBindings: unboundSlots.map((s) => ({
				nodeId: s.nodeId,
				credentialType: s.credentialType,
				credentialId: s.credentialId,
				credentialName: credentialNameById.get(s.credentialId) ?? s.credentialId,
			})),
		};
	}
}
