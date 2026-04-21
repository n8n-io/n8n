import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { mapConnectionsByDestination } from 'n8n-workflow';

import { WorkflowCheckConfigRepository } from './database/repositories/workflow-check-config.repository';
import type {
	RunWorkflowAuthoringChecksInput,
	WorkflowCheck,
	WorkflowCheckContext,
	WorkflowCheckResult,
} from './workflow-authoring-checks.types';
import { WorkflowCheckRegistry } from './workflow-check-registry.service';

@Service()
export class WorkflowAuthoringChecksService {
	constructor(
		private readonly registry: WorkflowCheckRegistry,
		private readonly configRepository: WorkflowCheckConfigRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('workflow-authoring-checks');
	}

	async runAll(input: RunWorkflowAuthoringChecksInput): Promise<WorkflowCheckResult[]> {
		const checks = this.registry.list();
		if (checks.length === 0) return [];

		const configs = await this.configRepository.findAllById();

		const ctx: WorkflowCheckContext = {
			workflowId: input.workflowId,
			nodes: input.nodes,
			connections: input.connections,
			connectionsByDestination: mapConnectionsByDestination(input.connections),
			settings: input.settings,
			logger: this.logger,
		};

		const results: WorkflowCheckResult[] = [];

		for (const check of checks) {
			const config = configs.get(check.id);
			if (config && !config.enabled) continue;

			const violations = await check.evaluate(ctx);
			if (violations.length === 0) continue;

			results.push({
				checkId: check.id,
				title: check.title,
				severity: config?.severityOverride ?? check.defaultSeverity,
				violations,
			});
		}

		return results;
	}

	async listChecksWithConfig() {
		const checks = this.registry.list();
		const configs = await this.configRepository.findAllById();
		return checks.map((check) => this.toConfigDto(check, configs.get(check.id)));
	}

	async getCheck(checkId: string) {
		const check = this.registry.get(checkId);
		if (!check) return null;
		const config = await this.configRepository.findOne({ where: { checkId } });
		return this.toConfigDto(check, config);
	}

	async updateConfig(
		checkId: string,
		patch: { enabled?: boolean; severityOverride?: 'warning' | 'blocking' | null },
	) {
		const check = this.registry.get(checkId);
		if (!check) return null;
		const updated = await this.configRepository.upsertConfig(checkId, patch);
		return this.toConfigDto(check, updated);
	}

	private toConfigDto(
		check: WorkflowCheck,
		config:
			| { enabled: boolean; severityOverride: 'warning' | 'blocking' | null }
			| null
			| undefined,
	) {
		const severityOverride = config?.severityOverride ?? null;
		const enabled = config?.enabled ?? true;
		return {
			checkId: check.id,
			title: check.title,
			description: check.description,
			defaultSeverity: check.defaultSeverity,
			severityOverride,
			effectiveSeverity: severityOverride ?? check.defaultSeverity,
			enabled,
		};
	}
}
