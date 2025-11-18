import {
	BreakingChangeAffectedWorkflow,
	BreakingChangeInstanceRuleResult,
	BreakingChangeReportResult,
	BreakingChangeVersion,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { INode } from 'n8n-workflow';

import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { allRules, RuleInstances } from './rules';
import type { IBreakingChangeWorkflowRule, IBreakingChangeInstanceRule } from './types';
import { N8N_VERSION } from '../../constants';

import { CacheService } from '@/services/cache/cache.service';

@Service()
export class BreakingChangeService {
	private readonly batchSize = 100;
	private static readonly CACHE_KEY_PREFIX = 'breaking-changes:results:';
	private readonly ongoingDetections = new Map<
		BreakingChangeVersion,
		Promise<BreakingChangeReportResult>
	>();

	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly cacheService: CacheService,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
		this.registerRules();
	}

	registerRules() {
		const rulesServices: RuleInstances[] = allRules.map((rule) =>
			Container.get<RuleInstances>(rule),
		);
		this.ruleRegistry.registerAll(rulesServices);
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
						ruleSeverity: rule.getMetadata().severity,
						ruleDocumentationUrl: rule.getMetadata().documentationUrl,
						instanceIssues: ruleResult.instanceIssues,
						recommendations: ruleResult.recommendations,
					});
				}
			} catch (error) {
				console.log('error', error);
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
		return instanceLevelResults;
	}

	private async getAllWorkflowRulesResults(
		workflowLevelRules: IBreakingChangeWorkflowRule[],
		totalWorkflows: number,
	): Promise<BreakingChangeWorkflowRuleResult[]> {
		const allAffectedWorkflowsByRule: Map<string, BreakingChangeAffectedWorkflow[]> = new Map();
		const allResults: BreakingChangeWorkflowRuleResult[] = [];

		this.logger.debug('Processing workflows in batches', {
			totalWorkflows,
			batchSize: this.batchSize,
		});

		// Process workflows in batches
		for (let skip = 0; skip < totalWorkflows; skip += this.batchSize) {
			const workflows = await this.workflowRepository.find({
				select: ['id', 'name', 'active', 'activeVersionId', 'nodes', 'updatedAt', 'statistics'],
				skip,
				take: this.batchSize,
				order: { id: 'ASC' },
				relations: {
					statistics: true,
				},
			});

			this.logger.debug('Processing batch', {
				skip,
				workflowsInBatch: workflows.length,
			});

			for (const workflow of workflows) {
				const nodesGroupedByType: Map<string, INode[]> = new Map();
				for (const node of workflow.nodes) {
					if (!nodesGroupedByType.has(node.type)) {
						nodesGroupedByType.set(node.type, []);
					}
					nodesGroupedByType.get(node.type)!.push(node);
				}
				for (const rule of workflowLevelRules) {
					const workflowDetectionResult = await rule.detectWorkflow(workflow, nodesGroupedByType);
					if (workflowDetectionResult.isAffected) {
						const affectedWorkflow: BreakingChangeAffectedWorkflow = {
							id: workflow.id,
							name: workflow.name,
							active: !!workflow.activeVersionId,
							issues: workflowDetectionResult.issues,
							numberOfExecutions: workflow.statistics.reduce(
								(acc, cur) => acc + (cur.count || 0),
								0,
							),
							lastExecutedAt: workflow.statistics.sort(
								(a, b) => b.latestEvent.getTime() - a.latestEvent.getTime(),
							)[0]?.latestEvent,
							lastUpdatedAt: workflow.updatedAt,
						};
						if (!allAffectedWorkflowsByRule.has(rule.id)) {
							allAffectedWorkflowsByRule.set(rule.id, [affectedWorkflow]);
						} else {
							allAffectedWorkflowsByRule.get(rule.id)!.push(affectedWorkflow);
						}
					}
				}
			}
		}

		// Aggregate results
		for (const rule of workflowLevelRules) {
			const workflowResults = allAffectedWorkflowsByRule.get(rule.id) || [];
			const isAffected = workflowResults.some((wr) => wr.issues.length > 0);

			if (isAffected) {
				allResults.push({
					ruleId: rule.id,
					ruleTitle: rule.getMetadata().title,
					ruleDescription: rule.getMetadata().description,
					ruleSeverity: rule.getMetadata().severity,
					ruleDocumentationUrl: rule.getMetadata().documentationUrl,
					affectedWorkflows: workflowResults,
					recommendations: await rule.getRecommendations(workflowResults),
				});
			}
		}
		return allResults;
	}

	async refreshDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeReportResult> {
		await this.cacheService.delete(`${BreakingChangeService.CACHE_KEY_PREFIX}_${targetVersion}`);
		return await this.getDetectionResults(targetVersion);
	}

	async getDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<BreakingChangeReportResult> {
		// Check if there's already an ongoing detection for this version
		const existingDetection = this.ongoingDetections.get(targetVersion);
		if (existingDetection) {
			this.logger.debug('Reusing ongoing detection', { targetVersion });
			return await existingDetection;
		}

		const cacheKey = `${BreakingChangeService.CACHE_KEY_PREFIX}_${targetVersion}`;

		// Start a new detection and store the promise
		const detectionPromise: Promise<BreakingChangeReportResult> = new Promise((resolve) => {
			void (async () => {
				// Check cache first
				const cachedResult = await this.cacheService.get<BreakingChangeReportResult>(cacheKey);
				if (cachedResult) {
					this.logger.debug('Using cached breaking change detection results', {
						targetVersion,
					});
					return resolve(cachedResult);
				}

				// Perform detection
				const detectionResult = await this.detect(targetVersion);
				return resolve(detectionResult);
			})();
		});
		this.ongoingDetections.set(targetVersion, detectionPromise);

		try {
			const result = await detectionPromise;
			// Store in cache if detection took significant time
			if (result.shouldCache) {
				await this.cacheService.set(cacheKey, result);
			}
			return result;
		} finally {
			// Clean up the promise after completion (success or failure)
			this.ongoingDetections.delete(targetVersion);
		}
	}

	private shouldCacheDetection(durationMs: number): boolean {
		return durationMs > Time.seconds.toMilliseconds * 10;
	}

	async detect(targetVersion: BreakingChangeVersion): Promise<BreakingChangeReportResult> {
		const startTime = Date.now();
		this.logger.debug('Starting breaking change detection', { targetVersion });

		const rules = this.ruleRegistry.getRules(targetVersion);

		const workflowLevelRules = rules.filter((rule) => 'detectWorkflow' in rule);
		const instanceLevelRules = rules.filter((rule) => 'detect' in rule);

		const totalWorkflows = await this.workflowRepository.count();

		const [instanceLevelResults, workflowLevelResults] = await Promise.all([
			this.getAllInstanceRulesResults(instanceLevelRules),
			this.getAllWorkflowRulesResults(workflowLevelRules, totalWorkflows),
		]);

		const report = this.createDetectionReport(
			targetVersion,
			instanceLevelResults,
			workflowLevelResults,
		);

		const duration = Date.now() - startTime;
		this.logger.debug('Breaking change detection completed', {
			duration,
		});

		return {
			report,
			totalWorkflows,
			shouldCache: this.shouldCacheDetection(duration),
		};
	}

	async getDetectionReportForRule(
		ruleId: string,
	): Promise<BreakingChangeInstanceRuleResult | BreakingChangeWorkflowRuleResult | undefined> {
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule) {
			return undefined;
		}

		if ('detectWorkflow' in rule) {
			const totalWorkflows = await this.workflowRepository.count();
			return (await this.getAllWorkflowRulesResults([rule], totalWorkflows))[0];
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
