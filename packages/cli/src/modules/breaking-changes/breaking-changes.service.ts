import type { BreakingChangeAffectedWorkflow } from '@n8n/api-types';
import {
	BreakingChangeInstanceRuleResult,
	BreakingChangeReportResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { WorkflowRepository, WorkflowStatisticsRepository } from '@n8n/db';
import { BreakingChangeRuleMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { ErrorReporter } from 'n8n-core';

import { CacheService } from '@n8n/backend-services';

import { MigrationRegistry } from './breaking-changes.migration-registry.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { groupNodesByType } from './group-nodes-by-type';
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
 * is incomplete for those pairs. The public report type does not carry this field.
 */
export interface BreakingChangeDetectionResult extends BreakingChangeReportResult {
	failedChecks: FailedRuleCheck[];
}

interface WorkflowRulesScan {
	results: BreakingChangeWorkflowRuleResult[];
	failedChecks: FailedRuleCheck[];
}

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
	private static readonly REPORT_DURATION_CACHE_THRESHOLD = Time.seconds.toMilliseconds * 2;
	private static readonly CACHE_KEY_PREFIX = 'breaking-changes:results:';
	private readonly ongoingDetections = new Map<
		BreakingChangeVersion,
		Promise<BreakingChangeReportResult>
	>();
	/**
	 * In-flight scans per version. Batch rules keep state between `reset()` and
	 * `produceReport()`, so two scans of one version must never overlap.
	 */
	private readonly ongoingScans = new Map<
		BreakingChangeVersion,
		Promise<BreakingChangeDetectionResult>
	>();

	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly migrationRegistry: MigrationRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly cacheService: CacheService,
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
	): Promise<WorkflowRulesScan> {
		const allAffectedWorkflowsByRule: Map<string, BreakingChangeAffectedWorkflow[]> = new Map();
		const workflowMetadataMap: Map<string, WorkflowMetadata> = new Map();
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
				select: ['id', 'name', 'active', 'activeVersionId', 'nodes', 'updatedAt'],
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

			for (const workflow of workflows) {
				const nodesGroupedByType = groupNodesByType(workflow.nodes);
				const statistics = statisticsByWorkflowId.get(workflow.id) ?? [];

				const workflowMetadata: WorkflowMetadata = {
					name: workflow.name,
					active: !!workflow.activeVersionId,
					numberOfExecutions: statistics.reduce((acc, cur) => acc + (cur.count || 0), 0),
					lastExecutedAt: statistics.sort(
						(a, b) => b.latestEvent.getTime() - a.latestEvent.getTime(),
					)[0]?.latestEvent,
					lastUpdatedAt: workflow.updatedAt,
				};
				workflowMetadataMap.set(workflow.id, workflowMetadata);

				for (const rule of workflowLevelRules) {
					let result: WorkflowDetectionReport;
					try {
						result = await rule.detectWorkflow(workflow, nodesGroupedByType);
					} catch (error) {
						this.reportRuleError(error, rule.id, workflow.id);
						failedChecks.push({ ruleId: rule.id, workflowId: workflow.id });
						continue;
					}
					if (result.isAffected) {
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
			}
		}

		const regularResults = await this.aggregateRegularRuleResults(
			workflowLevelRules,
			allAffectedWorkflowsByRule,
		);
		const batchResults = await this.aggregateBatchRuleResults(batchRules, workflowMetadataMap);

		return { results: regularResults.concat(batchResults), failedChecks };
	}

	async refreshDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeReportResult> {
		await this.cacheService.delete(this.getCacheKey(targetVersion));
		return await this.getDetectionResults(targetVersion);
	}

	async getDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeReportResult> {
		return await this.shareInFlight(
			this.ongoingDetections,
			targetVersion,
			async () => await this.detectWithCache(targetVersion),
		);
	}

	/** Joins the promise already in `inFlight` for the version, or starts and registers a new one. */
	private async shareInFlight<T>(
		inFlight: Map<BreakingChangeVersion, Promise<T>>,
		targetVersion: BreakingChangeVersion,
		start: () => Promise<T>,
	): Promise<T> {
		const existing = inFlight.get(targetVersion);
		if (existing) {
			this.logger.debug('Reusing ongoing detection', { targetVersion });
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

	// The rule set changes with every release, so a report from an older build is stale.
	// The n8n version in the key rotates the entry on deploy; the old key ages out by TTL.
	private getCacheKey(targetVersion: BreakingChangeVersion): string {
		return `${BreakingChangeService.CACHE_KEY_PREFIX}${N8N_VERSION}:${targetVersion}`;
	}

	private async detectWithCache(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeReportResult> {
		const cacheKey = this.getCacheKey(targetVersion);

		const cachedResult = await this.cacheService.get<BreakingChangeReportResult>(cacheKey);
		if (cachedResult) {
			this.logger.debug('Using cached breaking change detection results', { targetVersion });
			return cachedResult;
		}

		// The public report type has no `failedChecks`, so the field is dropped here.
		const { report, totalWorkflows, shouldCache } = await this.detect(targetVersion);
		const result: BreakingChangeReportResult = { report, totalWorkflows, shouldCache };
		if (result.shouldCache) {
			await this.cacheService.set(cacheKey, result);
		}
		return result;
	}

	private reportRuleError(error: unknown, ruleId: string, workflowId: string) {
		this.logger.warn('Breaking change rule failed for workflow, skipping', { ruleId, workflowId });
		this.errorReporter.error(error, { extra: { ruleId, workflowId } });
	}

	private shouldCacheDetection(durationMs: number): boolean {
		return durationMs > BreakingChangeService.REPORT_DURATION_CACHE_THRESHOLD;
	}

	/** Runs a full, uncached scan. Concurrent calls for one version share a single scan. */
	async detect(targetVersion: BreakingChangeVersion): Promise<BreakingChangeDetectionResult> {
		return await this.shareInFlight(
			this.ongoingScans,
			targetVersion,
			async () => await this.runScan(targetVersion),
		);
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
			this.getAllWorkflowRulesResults(workflowLevelRules, batchWorkflowRules, totalWorkflows),
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
			shouldCache: this.shouldCacheDetection(duration),
			failedChecks: workflowScan.failedChecks,
		};
	}

	async getDetectionReportForRule(
		ruleId: string,
	): Promise<BreakingChangeInstanceRuleResult | BreakingChangeWorkflowRuleResult | undefined> {
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule) {
			return undefined;
		}

		const totalWorkflows = await this.workflowRepository.count();

		if ('detectWorkflow' in rule) {
			return (await this.getAllWorkflowRulesResults([rule], [], totalWorkflows)).results[0];
		}
		if ('collectWorkflowData' in rule) {
			return (await this.getAllWorkflowRulesResults([], [rule], totalWorkflows)).results[0];
		}
		return (await this.getAllInstanceRulesResults([rule]))[0];
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
