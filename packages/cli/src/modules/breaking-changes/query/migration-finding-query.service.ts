import type {
	BreakingChangeAffectedWorkflow,
	BreakingChangeLightReportResult,
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
	BreakingChangeVersion,
	BreakingChangeWorkflowIssue,
	BreakingChangeWorkflowRuleResult,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	WorkflowRepository,
	WorkflowStatisticsRepository,
	type WorkflowEntity,
	type WorkflowStatistics,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { ErrorReporter } from 'n8n-core';

import { MigrationRegistry } from '../breaking-changes.migration-registry.service';
import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { MigrationFindingSyncRepository } from '../database/repositories/migration-finding-sync.repository';
import { MigrationFindingRepository } from '../database/repositories/migration-finding.repository';
import { groupNodesByType } from '../group-nodes-by-type';
import { summarizeExecutionStatistics } from '../summarize-execution-statistics';
import {
	isInstanceRule,
	isWorkflowLevelRule,
	type IBreakingChangeBatchWorkflowRule,
	type IBreakingChangeWorkflowRule,
	type WorkflowLevelRule,
} from '../types';
import { N8N_VERSION } from '../../../constants';

type LightWorkflowResult = BreakingChangeLightReportResult['report']['workflowResults'][number];

/**
 * What a reader may see. The instance scope covers every workflow and the
 * instance rules. The workflows scope covers the listed workflows only; the
 * ids are unique, so their number is the reader's workflow total.
 */
export type ReportScope = { kind: 'instance' } | { kind: 'workflows'; workflowIds: string[] };

const workflowFilter = (scope: ReportScope) =>
	scope.kind === 'workflows' ? scope.workflowIds : undefined;

/** The rule fields both report types share. */
type RuleDescription = Omit<BreakingChangeWorkflowRuleResult, 'affectedWorkflows'>;

/** One open or won't fix finding of a workflow, with its rule and the rule's current issues. */
export type WorkflowFinding = RuleDescription & {
	status: MigrationFindingTriageStatus;
	issues: BreakingChangeWorkflowIssue[];
};

/** The same fields the scan loads, so a rule sees the same workflow data on both paths. */
const WORKFLOW_FIELDS = ['name', 'active', 'activeVersionId', 'nodes', 'updatedAt'];

/**
 * Reads the migration report from the `migration_finding` table and shapes it into the
 * current response types. The overview route serves it; the per-rule route switches over
 * in a later change. It never writes: the controller runs the sync service first.
 */
@Service()
export class MigrationFindingQueryService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly migrationRegistry: MigrationRegistry,
		private readonly breakingChangeService: BreakingChangeService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly findingRepository: MigrationFindingRepository,
		private readonly syncRepository: MigrationFindingSyncRepository,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	/**
	 * The overview: one entry per workflow rule with its open and won't fix finding counts,
	 * plus live instance results.
	 */
	async getLightReport(
		targetVersion: BreakingChangeVersion,
		scope: ReportScope,
	): Promise<BreakingChangeLightReportResult> {
		const rules = this.ruleRegistry.getRules(targetVersion);
		const workflowRules = rules.filter(isWorkflowLevelRule);
		const instanceRules = rules.filter(isInstanceRule);
		const filter = workflowFilter(scope);

		const [
			openCounts,
			wontFixCounts,
			totalAffectedWorkflows,
			sync,
			totalWorkflows,
			instanceResults,
		] = await Promise.all([
			this.findingRepository.countOpenByRule(targetVersion, filter, {}),
			this.findingRepository.countWontFixByRule(targetVersion, filter, {}),
			this.findingRepository.countDistinctOpenWorkflows(targetVersion, filter, {}),
			this.syncRepository.getForVersion(targetVersion, {}),
			scope.kind === 'instance' ? this.workflowRepository.count() : scope.workflowIds.length,
			// Instance rules read config and environment, not workflows, so they stay live.
			// They describe the instance, so only the instance scope sees them.
			scope.kind === 'instance'
				? this.breakingChangeService.getAllInstanceRulesResults(instanceRules)
				: [],
		]);
		const openCountByRule = new Map(openCounts.map((row) => [row.ruleId, row.count]));
		const wontFixCountByRule = new Map(wontFixCounts.map((row) => [row.ruleId, row.count]));

		// Today's scan lists only rules that affect at least one workflow. Keep
		// that shape so the overview does not change when it reads from the table.
		// A rule with only won't fix findings stays listed with a count of zero:
		// its detail page is the only place to set them back to open.
		const workflowResults: LightWorkflowResult[] = [];
		for (const rule of workflowRules) {
			const nbAffectedWorkflows = openCountByRule.get(rule.id) ?? 0;
			const nbWontFixWorkflows = wontFixCountByRule.get(rule.id) ?? 0;
			if (nbAffectedWorkflows === 0 && nbWontFixWorkflows === 0) continue;
			workflowResults.push({
				...(await this.describeRule(rule)),
				nbAffectedWorkflows,
				nbWontFixWorkflows,
			});
		}

		return {
			report: {
				// Before the first sync there is nothing to date, so the read time stands in.
				generatedAt: sync?.syncedAt ?? new Date(),
				targetVersion,
				currentVersion: N8N_VERSION,
				instanceResults,
				workflowResults,
			},
			totalWorkflows,
			totalAffectedWorkflows,
			// Kept for the response shape only; the table replaces the cache.
			shouldCache: false,
		};
	}

	/**
	 * The detail of one workflow rule: every open and won't fix finding in scope
	 * with its status, workflow, statistics and issues.
	 */
	async getRuleFindings(
		targetVersion: BreakingChangeVersion,
		ruleId: string,
		scope: ReportScope,
	): Promise<BreakingChangeRuleDetailResult> {
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule || !isWorkflowLevelRule(rule)) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}

		const findings = await this.findingRepository.listTriageableForRule(
			targetVersion,
			ruleId,
			workflowFilter(scope),
			{},
		);
		const workflowIds = findings.map((finding) => finding.workflowId);
		const [workflows, statistics] = await Promise.all([
			this.workflowRepository.findByIds(workflowIds, { fields: WORKFLOW_FIELDS }),
			this.workflowStatisticsRepository.findByWorkflowIds(workflowIds),
		]);
		const statisticsByWorkflow = groupByWorkflowId(statistics);
		// A batch rule decides from all workflows at once, so its issues come from a scan of that rule.
		const issuesByWorkflow =
			'collectWorkflowData' in rule
				? await this.issuesFromScan(targetVersion, rule)
				: await this.issuesFromRecheck(rule, workflows);

		const affectedWorkflows: BreakingChangeRuleDetailWorkflow[] = [];
		for (const finding of findings) {
			affectedWorkflows.push({
				id: finding.workflowId,
				name: finding.workflow.name,
				active: !!finding.workflow.activeVersionId,
				lastUpdatedAt: finding.workflow.updatedAt,
				...summarizeExecutionStatistics(statisticsByWorkflow.get(finding.workflowId) ?? []),
				// A workflow the rule no longer flags stays listed, without issues, until the next sync.
				issues: issuesByWorkflow.get(finding.workflowId) ?? [],
				status: finding.status,
			});
		}

		return { ...(await this.describeRule(rule, affectedWorkflows)), affectedWorkflows };
	}

	/**
	 * The open and won't fix findings of one workflow, oldest first. It reads the
	 * finding table, so a caller that needs a save it just made reflected runs the
	 * sync service's single-workflow re-check first.
	 */
	async getWorkflowFindings(
		targetVersion: BreakingChangeVersion,
		workflowId: string,
	): Promise<WorkflowFinding[]> {
		const [findings, [workflow]] = await Promise.all([
			this.findingRepository.listTriageableForWorkflow(targetVersion, workflowId, {}),
			this.workflowRepository.findByIds([workflowId], { fields: WORKFLOW_FIELDS }),
		]);
		if (!workflow) return [];

		const result: WorkflowFinding[] = [];
		for (const finding of findings) {
			const rule = this.ruleRegistry.getRule(finding.ruleId);
			if (!rule || !isWorkflowLevelRule(rule)) continue;
			// A batch rule decides from all workflows at once, so one workflow has no issue list of its own.
			const issues =
				'detectWorkflow' in rule
					? ((await this.issuesFromRecheck(rule, [workflow])).get(workflow.id) ?? [])
					: [];
			result.push({ ...(await this.describeRule(rule)), status: finding.status, issues });
		}
		return result;
	}

	/** Whether the report has a finding for the workflow in any status, fixed included. */
	async hasWorkflowFindings(
		targetVersion: BreakingChangeVersion,
		workflowId: string,
	): Promise<boolean> {
		const findings = await this.findingRepository.listForWorkflows(targetVersion, [workflowId], {});
		return findings.length > 0;
	}

	private async describeRule(
		rule: WorkflowLevelRule,
		affectedWorkflows: BreakingChangeAffectedWorkflow[] = [],
	): Promise<RuleDescription> {
		const metadata = rule.getMetadata();
		return {
			ruleId: rule.id,
			ruleTitle: metadata.title,
			ruleDescription: metadata.description,
			ruleImpact: metadata.impact,
			ruleDocumentationUrl: metadata.documentationUrl,
			recommendations: await rule.getRecommendations(affectedWorkflows),
			migratable: this.migrationRegistry.has(rule.id),
		};
	}

	/** Issues per workflow id for one batch rule, from a scan of that rule alone. */
	private async issuesFromScan(
		targetVersion: BreakingChangeVersion,
		rule: IBreakingChangeBatchWorkflowRule,
	): Promise<Map<string, BreakingChangeWorkflowIssue[]>> {
		const result = await this.breakingChangeService.detectRule(targetVersion, rule);
		return new Map(
			(result?.affectedWorkflows ?? []).map((workflow) => [workflow.id, workflow.issues]),
		);
	}

	/**
	 * Re-runs one rule on the given workflows for their issue lists, which the table does not store.
	 * A rule that throws for a workflow yields no issues for it.
	 */
	private async issuesFromRecheck(
		rule: IBreakingChangeWorkflowRule,
		workflows: WorkflowEntity[],
	): Promise<Map<string, BreakingChangeWorkflowIssue[]>> {
		const issuesByWorkflow = new Map<string, BreakingChangeWorkflowIssue[]>();
		for (const workflow of workflows) {
			try {
				const result = await rule.detectWorkflow(workflow, groupNodesByType(workflow.nodes));
				issuesByWorkflow.set(workflow.id, result.issues);
			} catch (error) {
				this.logger.warn('Breaking change rule failed for workflow, listing it without issues', {
					ruleId: rule.id,
					workflowId: workflow.id,
				});
				this.errorReporter.error(error, { extra: { ruleId: rule.id, workflowId: workflow.id } });
			}
		}
		return issuesByWorkflow;
	}
}

function groupByWorkflowId(statistics: WorkflowStatistics[]): Map<string, WorkflowStatistics[]> {
	const grouped = new Map<string, WorkflowStatistics[]>();
	for (const statistic of statistics) {
		const existing = grouped.get(statistic.workflowId);
		if (existing) existing.push(statistic);
		else grouped.set(statistic.workflowId, [statistic]);
	}
	return grouped;
}
