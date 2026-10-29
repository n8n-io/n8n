import type { BreakingChangeAffectedWorkflow } from '@n8n/api-types';
import {
	BreakingChangeInstanceRuleResult,
	BreakingChangeReportResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	WorkflowHistoryRepository,
	WorkflowRepository,
	WorkflowStatisticsRepository,
	type WorkflowEntity,
} from '@n8n/db';
import { BreakingChangeRuleMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import { MigrationRegistry } from './breaking-changes.migration-registry.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { groupNodesByType } from './group-nodes-by-type';
import { summarizeExecutionStatistics } from './summarize-execution-statistics';
import type {
	IBreakingChangeBatchWorkflowRule,
	IBreakingChangeInstanceRule,
	IBreakingChangeRule,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from './types';
import { N8N_VERSION } from '../../constants';

/** One rule check on one workflow that threw, so its result is unknown. */
export interface FailedRuleCheck {
	ruleId: string;
	workflowId: string;
}

/**
 * Result of one full scan. `failedChecks` lists the rule checks that threw, so the report
 * is incomplete for those pairs. The public report type does not carry this field, and the
 * scan does not decide caching: the finding table replaced the report cache.
 */
export interface BreakingChangeDetectionResult
	extends Omit<BreakingChangeReportResult, 'shouldCache'> {
	failedChecks: FailedRuleCheck[];
	publishedHits: WorkflowRuleHit[];
}

/** One rule that fired on one workflow. */
export interface WorkflowRuleHit {
	ruleId: string;
	workflowId: string;
}

/**
 * The report covers the latest version of each workflow. `publishedHits` covers the
 * published version, only for workflows whose latest version is ahead of it: for the
 * others, both versions are the same or nothing is published. A pair in `failedChecks`
 * has no hit because a check on either version threw.
 */
interface WorkflowRulesScan {
	results: BreakingChangeWorkflowRuleResult[];
	publishedHits: WorkflowRuleHit[];
	failedChecks: FailedRuleCheck[];
}

/** Result of re-checking one workflow. `publishedHits` is as in a full scan. */
export interface WorkflowHitsResult {
	hits: WorkflowRuleHit[];
	publishedHits: WorkflowRuleHit[];
	failedChecks: FailedRuleCheck[];
}

const WORKFLOW_FIELDS: Array<keyof WorkflowEntity> = [
	'id',
	'name',
	'active',
	'activeVersionId',
	'versionId',
	'nodes',
	'updatedAt',
];

interface WorkflowMetadata {
	name: string;
	active: boolean;
	numberOfExecutions: number;
	lastExecutedAt?: Date;
	lastUpdatedAt: Date;
}

@Service()
export class BreakingChangeService {
	private readonly batchSize = 100;
	/** In-flight full scans per version, so concurrent callers share one run. */
	private readonly ongoingScans = new Map<
		BreakingChangeVersion,
		Promise<BreakingChangeDetectionResult>
	>();
	/**
	 * The last scan started per version, full or single-rule. Batch rules keep state between
	 * `reset()` and `produceReport()`, so a new scan of a version waits for the previous one.
	 */
	private readonly scanChains = new Map<BreakingChangeVersion, Promise<void>>();

	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly migrationRegistry: MigrationRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
	}

	registerRules() {
		const ruleMetadata = Container.get(BreakingChangeRuleMetadata);
		const ruleInstances = ruleMetadata
			.getEntries()
			.map((entry) => Container.get(entry.class) as IBreakingChangeRule);
		this.ruleRegistry.registerAll(ruleInstances);
	}

	async getAllInstanceRulesResults(
		instanceLevelRules: IBreakingChangeInstanceRule[],
	): Promise<BreakingChangeInstanceRuleResult[]> {
		const instanceLevelResults: BreakingChangeInstanceRuleResult[] = [];
		for (const rule of instanceLevelRules) {
			try {
				const ruleResult = await rule.detect();
				if (ruleResult.isAffected) {
					instanceLevelResults.push({
						ruleId: rule.id,
						ruleTitle: rule.getMetadata().title,
						ruleDescription: rule.getMetadata().description,
						ruleImpact: rule.getMetadata().impact,
						ruleDocumentationUrl: rule.getMetadata().documentationUrl,
						instanceIssues: ruleResult.instanceIssues,
						recommendations: ruleResult.recommendations,
						migratable: this.migrationRegistry.has(rule.id),
					});
				}
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
		return instanceLevelResults;
	}

	private async aggregateRegularRuleResults(
		workflowLevelRules: IBreakingChangeWorkflowRule[],
		allAffectedWorkflowsByRule: Map<string, BreakingChangeAffectedWorkflow[]>,
	): Promise<BreakingChangeWorkflowRuleResult[]> {
		const results: BreakingChangeWorkflowRuleResult[] = [];
		for (const rule of workflowLevelRules) {
			const workflowResults = allAffectedWorkflowsByRule.get(rule.id) ?? [];
			const isAffected = workflowResults.some((wr) => wr.issues.length > 0);

			if (isAffected) {
				results.push({
					ruleId: rule.id,
					ruleTitle: rule.getMetadata().title,
					ruleDescription: rule.getMetadata().description,
					ruleImpact: rule.getMetadata().impact,
					ruleDocumentationUrl: rule.getMetadata().documentationUrl,
					affectedWorkflows: workflowResults,
					recommendations: await rule.getRecommendations(workflowResults),
					migratable: this.migrationRegistry.has(rule.id),
				});
			}
		}
		return results;
	}

	private async aggregateBatchRuleResults(
		batchRules: IBreakingChangeBatchWorkflowRule[],
		workflowMetadataMap: Map<string, WorkflowMetadata>,
	): Promise<BreakingChangeWorkflowRuleResult[]> {
		const results: BreakingChangeWorkflowRuleResult[] = [];
		for (const rule of batchRules) {
			const batchReport = await rule.produceReport();
			if (batchReport.affectedWorkflows.length === 0) {
				continue;
			}

			const affectedWorkflows: BreakingChangeAffectedWorkflow[] = [];
			for (const affected of batchReport.affectedWorkflows) {
				const metadata = workflowMetadataMap.get(affected.workflowId);
				if (!metadata) {
					this.logger.warn('Workflow metadata not found for batch rule result', {
						workflowId: affected.workflowId,
						ruleId: rule.id,
					});
					continue;
				}

				affectedWorkflows.push({
					id: affected.workflowId,
					name: metadata.name,
					active: metadata.active,
					issues: affected.issues,
					numberOfExecutions: metadata.numberOfExecutions,
					lastExecutedAt: metadata.lastExecutedAt,
					lastUpdatedAt: metadata.lastUpdatedAt,
				});
			}

			if (affectedWorkflows.length > 0) {
				results.push({
					ruleId: rule.id,
					ruleTitle: rule.getMetadata().title,
					ruleDescription: rule.getMetadata().description,
					ruleImpact: rule.getMetadata().impact,
					ruleDocumentationUrl: rule.getMetadata().documentationUrl,
					affectedWorkflows,
					recommendations: await rule.getRecommendations(affectedWorkflows),
					migratable: this.migrationRegistry.has(rule.id),
				});
			}
		}
		return results;
	}

	private async getAllWorkflowRulesResults(
		workflowLevelRules: IBreakingChangeWorkflowRule[],
		batchRules: IBreakingChangeBatchWorkflowRule[],
		totalWorkflows: number,
		scanPublished: boolean,
	): Promise<WorkflowRulesScan> {
		const allAffectedWorkflowsByRule: Map<string, BreakingChangeAffectedWorkflow[]> = new Map();
		const workflowMetadataMap: Map<string, WorkflowMetadata> = new Map();
		const publishedHits: WorkflowRuleHit[] = [];
		const failedChecks: FailedRuleCheck[] = [];

		// Reset batch rules internal state before processing
		batchRules.forEach((rule) => rule.reset());

		this.logger.debug('Processing workflows in batches', {
			totalWorkflows,
			batchSize: this.batchSize,
			regularRulesCount: workflowLevelRules.length,
			batchRulesCount: batchRules.length,
		});

		for (let skip = 0; skip < totalWorkflows; skip += this.batchSize) {
			const workflows = await this.workflowRepository.find({
				select: WORKFLOW_FIELDS,
				skip,
				take: this.batchSize,
				order: { id: 'ASC' },
			});

			this.logger.debug('Processing batch', { skip, workflowsInBatch: workflows.length });

			// Load statistics separately for all workflows in this batch
			const workflowIds = workflows.map((w) => w.id);
			const allStatistics = await this.workflowStatisticsRepository.find({
				where: { workflowId: In(workflowIds) },
			});

			// Group statistics by workflowId
			const statisticsByWorkflowId = new Map<string, typeof allStatistics>();
			for (const stat of allStatistics) {
				if (!stat.workflowId) continue;
				const existing = statisticsByWorkflowId.get(stat.workflowId);
				if (existing) {
					existing.push(stat);
				} else {
					statisticsByWorkflowId.set(stat.workflowId, [stat]);
				}
			}

			const publishedNodes = scanPublished
				? await this.loadPublishedNodes(workflows)
				: new Map<string, INode[]>();

			for (const workflow of workflows) {
				const nodesGroupedByType = groupNodesByType(workflow.nodes);
				const statistics = statisticsByWorkflowId.get(workflow.id) ?? [];

				const workflowMetadata: WorkflowMetadata = {
					name: workflow.name,
					active: !!workflow.activeVersionId,
					...summarizeExecutionStatistics(statistics),
					lastUpdatedAt: workflow.updatedAt,
				};
				workflowMetadataMap.set(workflow.id, workflowMetadata);

				const cleanRules: IBreakingChangeWorkflowRule[] = [];
				for (const rule of workflowLevelRules) {
					const result = await this.runWorkflowRule(
						rule,
						workflow,
						nodesGroupedByType,
						failedChecks,
					);
					if (result?.isAffected) {
						const affectedWorkflow: BreakingChangeAffectedWorkflow = {
							id: workflow.id,
							issues: result.issues,
							...workflowMetadata,
						};
						const existing = allAffectedWorkflowsByRule.get(rule.id);
						if (existing) {
							existing.push(affectedWorkflow);
						} else {
							allAffectedWorkflowsByRule.set(rule.id, [affectedWorkflow]);
						}
					} else if (result) {
						cleanRules.push(rule);
					}
				}

				for (const rule of batchRules) {
					try {
						await rule.collectWorkflowData(workflow, nodesGroupedByType);
					} catch (error) {
						this.reportRuleError(error, rule.id, workflow.id);
						failedChecks.push({ ruleId: rule.id, workflowId: workflow.id });
					}
				}

				const nodes = publishedNodes.get(workflow.id);
				if (nodes) {
					publishedHits.push(
						...(await this.detectPublishedHits(cleanRules, workflow, nodes, failedChecks)),
					);
				}
			}
		}

		const regularResults = await this.aggregateRegularRuleResults(
			workflowLevelRules,
			allAffectedWorkflowsByRule,
		);
		const batchResults = await this.aggregateBatchRuleResults(batchRules, workflowMetadataMap);

		return { results: regularResults.concat(batchResults), publishedHits, failedChecks };
	}

	/**
	 * The published nodes of each workflow whose latest version is ahead of the
	 * published one. The other workflows are absent, so they are scanned only once.
	 */
	private async loadPublishedNodes(workflows: WorkflowEntity[]): Promise<Map<string, INode[]>> {
		const workflowIdByVersionId = new Map<string, string>();
		for (const { id, activeVersionId, versionId } of workflows) {
			if (activeVersionId && activeVersionId !== versionId) {
				workflowIdByVersionId.set(activeVersionId, id);
			}
		}

		const nodesByWorkflowId = new Map<string, INode[]>();
		if (workflowIdByVersionId.size === 0) return nodesByWorkflowId;

		const versions = await this.workflowHistoryRepository.findNodesByVersionIds([
			...workflowIdByVersionId.keys(),
		]);
		for (const { versionId, nodes } of versions) {
			const workflowId = workflowIdByVersionId.get(versionId);
			if (workflowId) nodesByWorkflowId.set(workflowId, nodes);
		}
		return nodesByWorkflowId;
	}

	/**
	 * Runs the given rules on the published version of a workflow. Callers pass only
	 * the rules the latest version passed: a hit there decides the finding anyway,
	 * and a check that threw leaves the pair undecided.
	 * ponytail: batch rules judge the latest version only. A batch rule reads every
	 * workflow at once, so covering the published versions needs a second batch pass.
	 */
	private async detectPublishedHits(
		rules: IBreakingChangeWorkflowRule[],
		workflow: WorkflowEntity,
		publishedNodes: INode[],
		failedChecks: FailedRuleCheck[],
	): Promise<WorkflowRuleHit[]> {
		const published = { ...workflow, nodes: publishedNodes };
		const nodesGroupedByType = groupNodesByType(publishedNodes);
		const hits: WorkflowRuleHit[] = [];
		for (const rule of rules) {
			const result = await this.runWorkflowRule(rule, published, nodesGroupedByType, failedChecks);
			if (result?.isAffected) hits.push({ ruleId: rule.id, workflowId: workflow.id });
		}
		return hits;
	}

	/** Joins the promise already in `inFlight` for the version, or starts and registers a new one. */
	private async shareInFlight<T>(
		inFlight: Map<BreakingChangeVersion, Promise<T>>,
		targetVersion: BreakingChangeVersion,
		start: () => Promise<T>,
	): Promise<T> {
		const existing = inFlight.get(targetVersion);
		if (existing) {
			this.logger.debug('Reusing ongoing scan', { targetVersion });
			return await existing;
		}

		const promise = start();
		inFlight.set(targetVersion, promise);
		try {
			return await promise;
		} finally {
			inFlight.delete(targetVersion);
		}
	}

	/** Runs one rule on one workflow. A check that throws is reported and added to `failedChecks`. */
	private async runWorkflowRule(
		rule: IBreakingChangeWorkflowRule,
		workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
		failedChecks: FailedRuleCheck[],
	): Promise<WorkflowDetectionReport | undefined> {
		try {
			return await rule.detectWorkflow(workflow, nodesGroupedByType);
		} catch (error) {
			this.reportRuleError(error, rule.id, workflow.id);
			failedChecks.push({ ruleId: rule.id, workflowId: workflow.id });
			return undefined;
		}
	}

	private reportRuleError(error: unknown, ruleId: string, workflowId: string) {
		this.logger.warn('Breaking change rule failed for workflow, skipping', { ruleId, workflowId });
		this.errorReporter.error(error, { extra: { ruleId, workflowId } });
	}

	/**
	 * Re-checks one workflow against the workflow-level rules of a version.
	 * Batch rules need every workflow to produce a result, so they are skipped here.
	 * A workflow that no longer exists yields no hits.
	 */
	async detectWorkflowHits(
		targetVersion: BreakingChangeVersion,
		workflowId: string,
	): Promise<WorkflowHitsResult> {
		const workflow = await this.workflowRepository.findOne({
			select: WORKFLOW_FIELDS,
			where: { id: workflowId },
		});
		if (!workflow) return { hits: [], publishedHits: [], failedChecks: [] };

		const workflowLevelRules = this.ruleRegistry
			.getRules(targetVersion)
			.filter((rule): rule is IBreakingChangeWorkflowRule => 'detectWorkflow' in rule);
		const nodesGroupedByType = groupNodesByType(workflow.nodes);

		const hits: WorkflowRuleHit[] = [];
		const cleanRules: IBreakingChangeWorkflowRule[] = [];
		const failedChecks: FailedRuleCheck[] = [];
		for (const rule of workflowLevelRules) {
			const result = await this.runWorkflowRule(rule, workflow, nodesGroupedByType, failedChecks);
			if (result?.isAffected) hits.push({ ruleId: rule.id, workflowId });
			else if (result) cleanRules.push(rule);
		}

		const publishedNodes = (await this.loadPublishedNodes([workflow])).get(workflowId);
		const publishedHits = publishedNodes
			? await this.detectPublishedHits(cleanRules, workflow, publishedNodes, failedChecks)
			: [];

		return { hits, publishedHits, failedChecks };
	}

	/** Runs a full, uncached scan. Concurrent calls for one version share a single scan. */
	async detect(targetVersion: BreakingChangeVersion): Promise<BreakingChangeDetectionResult> {
		return await this.shareInFlight(
			this.ongoingScans,
			targetVersion,
			async () =>
				await this.runAfterPreviousScan(
					targetVersion,
					async () => await this.runScan(targetVersion),
				),
		);
	}

	/**
	 * Scans the workflows for one rule only. Returns `undefined` when the rule affects none.
	 * A full scan in flight already covers the rule, so the result comes from that scan.
	 * Otherwise the scan runs alone, and a full scan requested meanwhile waits for it:
	 * a full scan can serve a single-rule request, but not the reverse.
	 */
	async detectRule(
		targetVersion: BreakingChangeVersion,
		rule: IBreakingChangeWorkflowRule | IBreakingChangeBatchWorkflowRule,
	): Promise<BreakingChangeWorkflowRuleResult | undefined> {
		const fullScan = this.ongoingScans.get(targetVersion);
		if (fullScan) {
			this.logger.debug('Taking the rule result from the ongoing detection', {
				targetVersion,
				ruleId: rule.id,
			});
			const { report } = await fullScan;
			return report.workflowResults.find((result) => result.ruleId === rule.id);
		}

		return await this.runAfterPreviousScan(targetVersion, async () => {
			const totalWorkflows = await this.workflowRepository.count();
			const scan =
				'detectWorkflow' in rule
					? await this.getAllWorkflowRulesResults([rule], [], totalWorkflows, false)
					: await this.getAllWorkflowRulesResults([], [rule], totalWorkflows, false);
			return scan.results[0];
		});
	}

	/** Starts `scan` once the previous scan of the version, if any, has ended. */
	private async runAfterPreviousScan<T>(
		targetVersion: BreakingChangeVersion,
		scan: () => Promise<T>,
	): Promise<T> {
		const previous = this.scanChains.get(targetVersion) ?? Promise.resolve();
		const run = previous.then(scan);
		// The chain entry never rejects, so a failed scan does not block the next one.
		const settled = run.then(
			() => {},
			() => {},
		);
		this.scanChains.set(targetVersion, settled);
		try {
			return await run;
		} finally {
			if (this.scanChains.get(targetVersion) === settled) this.scanChains.delete(targetVersion);
		}
	}

	private async runScan(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeDetectionResult> {
		const startTime = Date.now();
		this.logger.debug('Starting breaking change detection', { targetVersion });

		const rules = this.ruleRegistry.getRules(targetVersion);

		const workflowLevelRules = rules.filter(
			(rule): rule is IBreakingChangeWorkflowRule => 'detectWorkflow' in rule,
		);
		const batchWorkflowRules = rules.filter(
			(rule): rule is IBreakingChangeBatchWorkflowRule => 'collectWorkflowData' in rule,
		);
		const instanceLevelRules = rules.filter(
			(rule): rule is IBreakingChangeInstanceRule => 'detect' in rule,
		);

		const totalWorkflows = await this.workflowRepository.count();

		const [instanceLevelResults, workflowScan] = await Promise.all([
			this.getAllInstanceRulesResults(instanceLevelRules),
			this.getAllWorkflowRulesResults(workflowLevelRules, batchWorkflowRules, totalWorkflows, true),
		]);

		const report = this.createDetectionReport(
			targetVersion,
			instanceLevelResults,
			workflowScan.results,
		);

		const duration = Date.now() - startTime;
		this.logger.debug('Breaking change detection completed', {
			duration,
		});

		return {
			report,
			totalWorkflows,
			failedChecks: workflowScan.failedChecks,
			publishedHits: workflowScan.publishedHits,
		};
	}

	private createDetectionReport(
		targetVersion: BreakingChangeVersion,
		instanceResults: BreakingChangeInstanceRuleResult[],
		workflowResults: BreakingChangeWorkflowRuleResult[],
	): BreakingChangeReportResult['report'] {
		return {
			generatedAt: new Date(),
			targetVersion,
			currentVersion: N8N_VERSION,
			workflowResults,
			instanceResults,
		};
	}
}
