import type { MigrationFindingTriageStatus } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { MigrationFindingRepository } from '../database/repositories/migration-finding.repository';
import { isWorkflowLevelRule } from '../types';

/** Applies the status a user picks for a finding in the migration report. */
@Service()
export class MigrationFindingTriageService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly findingRepository: MigrationFindingRepository,
	) {}

	/**
	 * Sets the status of the finding of one workflow rule on one workflow. The
	 * rule decides the target version, as on the rule detail route.
	 */
	async setStatus(
		ruleId: string,
		workflowId: string,
		status: MigrationFindingTriageStatus,
	): Promise<void> {
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule || !isWorkflowLevelRule(rule)) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}

		const version = rule.getMetadata().version;
		const updated = await this.findingRepository.setTriageStatus(
			version,
			ruleId,
			workflowId,
			status,
			{},
		);
		// No finding, or the scan already moved it to a status a user cannot change.
		if (!updated) {
			throw new NotFoundError(
				`Finding of rule '${ruleId}' for workflow '${workflowId}' not found.`,
			);
		}
	}
}
