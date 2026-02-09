import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ExecutionQuotaConfig } from '../entities/execution-quota-config';

@Service()
export class ExecutionQuotaConfigRepository extends Repository<ExecutionQuotaConfig> {
	constructor(dataSource: DataSource) {
		super(ExecutionQuotaConfig, dataSource.manager);
	}

	/** Get all enabled configs for a project (project-level quotas) */
	async findByProject(projectId: string): Promise<ExecutionQuotaConfig[]> {
		return await this.find({
			where: { projectId, workflowId: undefined, enabled: true },
		});
	}

	/** Get all enabled configs for a workflow */
	async findByWorkflow(workflowId: string): Promise<ExecutionQuotaConfig[]> {
		return await this.find({
			where: { workflowId, enabled: true },
		});
	}

	/** Get all enabled configs */
	async getAllEnabled(): Promise<ExecutionQuotaConfig[]> {
		return await this.find({ where: { enabled: true } });
	}

	/**
	 * Get all configs applicable to a workflow execution:
	 * - Project-level configs (projectId matches, workflowId is null)
	 * - Workflow-level configs (workflowId matches)
	 */
	async findApplicableConfigs(
		projectId: string,
		workflowId: string,
	): Promise<ExecutionQuotaConfig[]> {
		return await this.createQueryBuilder('config')
			.where('config.enabled = :enabled', { enabled: true })
			.andWhere(
				'(config.projectId = :projectId AND config.workflowId IS NULL) OR config.workflowId = :workflowId',
				{ projectId, workflowId },
			)
			.getMany();
	}
}
