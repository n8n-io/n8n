import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError, mapConnectionsByDestination } from 'n8n-workflow';

import { WorkflowCheckRepository } from './database/repositories/workflow-check.repository';
import type { WorkflowCheck } from './database/entities/workflow-check.entity';
import type { WorkflowCheckTypeKey } from './workflow-authoring-checks.constants';
import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowAuthoringCheckSeverity,
	WorkflowCheckContext,
	WorkflowCheckResult,
	WorkflowCheckType,
} from './workflow-authoring-checks.types';
import { WorkflowCheckRegistry } from './workflow-check-registry.service';

export interface CreateWorkflowCheckInstanceInput {
	name: string;
	type: string;
	config: Record<string, unknown>;
	severity: WorkflowAuthoringCheckSeverity;
	enabled?: boolean;
}

export interface UpdateWorkflowCheckInstanceInput {
	name?: string;
	config?: Record<string, unknown>;
	severity?: WorkflowAuthoringCheckSeverity;
	enabled?: boolean;
}

export interface WorkflowCheckInstanceDto {
	id: string;
	name: string;
	type: string;
	typeTitle: string;
	config: Record<string, unknown>;
	enabled: boolean;
	severity: WorkflowAuthoringCheckSeverity;
}

export interface WorkflowCheckTypeInfoDto {
	type: string;
	title: string;
	description: string;
	defaultSeverity: WorkflowAuthoringCheckSeverity;
	configSchema: WorkflowCheckType['configSchema'];
}

@Service()
export class WorkflowAuthoringChecksService {
	constructor(
		private readonly registry: WorkflowCheckRegistry,
		private readonly repository: WorkflowCheckRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('workflow-authoring-checks');
	}

	async runAll(input: RunWorkflowAuthoringChecksInput): Promise<WorkflowCheckResult[]> {
		const instances = await this.repository.findAllOrdered();
		const enabled = instances.filter((i) => i.enabled);
		if (enabled.length === 0) return [];

		const ctx: WorkflowCheckContext = {
			workflowId: input.workflowId,
			nodes: input.nodes,
			connections: input.connections,
			connectionsByDestination: mapConnectionsByDestination(input.connections),
			settings: input.settings,
			logger: this.logger,
		};

		const results: WorkflowCheckResult[] = [];

		for (const instance of enabled) {
			const type = this.registry.getType(instance.type);
			if (!type) {
				this.logger.warn('Skipping workflow check with unknown type', {
					instanceId: instance.id,
					type: instance.type,
				});
				continue;
			}

			try {
				type.validateConfig(instance.config);
			} catch (error) {
				this.logger.warn('Skipping workflow check with invalid config', {
					instanceId: instance.id,
					type: instance.type,
					error: error instanceof Error ? error.message : String(error),
				});
				continue;
			}

			const violations = await type.evaluate(ctx, instance.config);
			if (violations.length === 0) continue;

			results.push({
				checkInstanceId: instance.id,
				type: instance.type,
				name: instance.name,
				severity: instance.severity,
				violations,
			});
		}

		return results;
	}

	listTypes(): WorkflowCheckTypeInfoDto[] {
		return this.registry.listTypes().map((t) => ({
			type: t.type,
			title: t.title,
			description: t.description,
			defaultSeverity: t.defaultSeverity,
			configSchema: t.configSchema,
		}));
	}

	async listInstances(): Promise<WorkflowCheckInstanceDto[]> {
		const instances = await this.repository.findAllOrdered();
		return instances.map((i) => this.toDto(i));
	}

	async createInstance(input: CreateWorkflowCheckInstanceInput): Promise<WorkflowCheckInstanceDto> {
		const type = this.requireType(input.type);
		this.validateConfigOrThrow(type, input.config);
		const created = await this.repository.createInstance({
			name: input.name,
			type: type.type,
			config: input.config,
			severity: input.severity,
			enabled: input.enabled,
		});
		return this.toDto(created);
	}

	async updateInstance(
		id: string,
		patch: UpdateWorkflowCheckInstanceInput,
	): Promise<WorkflowCheckInstanceDto | null> {
		const existing = await this.repository.findOne({ where: { id } });
		if (!existing) return null;

		if (patch.config !== undefined) {
			const type = this.requireType(existing.type);
			this.validateConfigOrThrow(type, patch.config);
		}

		const updated = await this.repository.updateInstance(id, {
			name: patch.name,
			config: patch.config,
			severity: patch.severity,
			enabled: patch.enabled,
		});
		return updated ? this.toDto(updated) : null;
	}

	async deleteInstance(id: string): Promise<boolean> {
		return await this.repository.deleteById(id);
	}

	private toDto(instance: WorkflowCheck): WorkflowCheckInstanceDto {
		const type = this.registry.getType(instance.type);
		return {
			id: instance.id,
			name: instance.name,
			type: instance.type,
			typeTitle: type?.title ?? instance.type,
			config: instance.config,
			enabled: instance.enabled,
			severity: instance.severity,
		};
	}

	private requireType(typeKey: string): WorkflowCheckType {
		const type = this.registry.getType(typeKey as WorkflowCheckTypeKey);
		if (!type) {
			throw new UserError(`Unknown workflow check type: ${typeKey}`);
		}
		return type;
	}

	private validateConfigOrThrow(type: WorkflowCheckType, config: unknown): unknown {
		try {
			return type.validateConfig(config);
		} catch (error) {
			if (error instanceof UserError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new UserError(`Invalid config for check type "${type.type}": ${message}`);
		}
	}
}
