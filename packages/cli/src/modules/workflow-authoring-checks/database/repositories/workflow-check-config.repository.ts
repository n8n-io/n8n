import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowCheckConfig } from '../entities/workflow-check-config.entity';

@Service()
export class WorkflowCheckConfigRepository extends Repository<WorkflowCheckConfig> {
	constructor(dataSource: DataSource) {
		super(WorkflowCheckConfig, dataSource.manager);
	}

	async findAllById(): Promise<Map<string, WorkflowCheckConfig>> {
		const rows = await this.find();
		return new Map(rows.map((row) => [row.checkId, row]));
	}

	async upsertConfig(
		checkId: string,
		patch: { enabled?: boolean; severityOverride?: WorkflowCheckConfig['severityOverride'] },
	): Promise<WorkflowCheckConfig> {
		const existing = await this.findOne({ where: { checkId } });
		if (existing) {
			if (patch.enabled !== undefined) existing.enabled = patch.enabled;
			if (patch.severityOverride !== undefined) existing.severityOverride = patch.severityOverride;
			return await this.save(existing);
		}

		const fresh = this.create({
			checkId,
			enabled: patch.enabled ?? true,
			severityOverride: patch.severityOverride ?? null,
		});
		return await this.save(fresh);
	}
}
