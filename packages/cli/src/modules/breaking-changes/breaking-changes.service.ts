import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { INode } from 'n8n-workflow';
import { strict as assert } from 'node:assert';

import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { allRules, RuleInstances } from './rules';
import type {
	DetectionReport,
	BreakingChangeVersion,
	DetectionResult,
	IBreakingChangeRule,
	AffectedWorkflow,
	IBreakingChangeWorkflowRule,
	IBreakingChangeInstanceRule,
} from './types';
import { BreakingChangeSeverity } from './types';
import { N8N_VERSION } from '../../constants';

import { CacheService } from '@/services/cache/cache.service';

@Service()
export class BreakingChangeService {
	private readonly batchSize = 100;
	private static readonly CACHE_KEY_PREFIX = 'breaking-changes:results:';
	private readonly ongoingDetections = new Map<BreakingChangeVersion, Promise<DetectionReport>>();

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
	): Promise<DetectionResult[]> {
		const instanceLevelResults: DetectionResult[] = [];
		for (const rule of instanceLevelRules) {
			try {
				const ruleResult = await rule.detect();
				if (ruleResult.isAffected) {
					instanceLevelResults.push({
						ruleId: rule.id,
						affectedWorkflows: [],
						instanceIssues: ruleResult.instanceIssues,
						recommendations: ruleResult.recommendations,
					});
				}
			} catch (error) {
				this.errorReporter.error(error, { shouldBeLogged: true });
			}
		}
		return instanceLevelResults;
	}

	private async getAllWorkflowRulesResults(
		workflowLevelRules: IBreakingChangeWorkflowRule[],
	): Promise<DetectionResult[]> {
		const totalWorkflows = await this.workflowRepository.count();
		const allAffectedWorkflowsByRule: Map<string, AffectedWorkflow[]> = new Map();
		const allResults: DetectionResult[] = [];

		this.logger.info('Processing workflows in batches', {
			totalWorkflows,
			batchSize: this.batchSize,
		});

		// Process workflows in batches
		for (let skip = 0; skip < totalWorkflows; skip += this.batchSize) {
			const workflows = await this.workflowRepository.find({
				select: ['id', 'name', 'active', 'nodes'],
				skip,
				take: this.batchSize,
				order: { id: 'ASC' },
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
						const affectedWorkflow = {
							id: workflow.id,
							name: workflow.name,
							active: workflow.active,
							issues: workflowDetectionResult.issues,
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
					affectedWorkflows: workflowResults,
					instanceIssues: [],
					recommendations: await rule.getRecommendations(workflowResults),
				});
			}
		}
		return allResults;
	}

	async refreshDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<DetectionReport | undefined> {
		await this.cacheService.deleteFromHash(BreakingChangeService.CACHE_KEY_PREFIX, targetVersion);
		return await this.getDetectionResults(targetVersion);
	}

	async getDetectionResults(
		targetVersion: BreakingChangeVersion,
	): Promise<DetectionReport | undefined> {
		return await this.cacheService.getHashValue<DetectionReport>(
			BreakingChangeService.CACHE_KEY_PREFIX,
			targetVersion,
			{
				refreshFn: async () => {
					// Check if there's already an ongoing detection for this version
					const existingDetection = this.ongoingDetections.get(targetVersion);
					if (existingDetection) {
						this.logger.debug('Reusing ongoing detection', { targetVersion });
						return await existingDetection;
					}

					// Start a new detection and store the promise
					const detectionPromise = this.detect(targetVersion);
					this.ongoingDetections.set(targetVersion, detectionPromise);

					try {
						return await detectionPromise;
					} finally {
						// Clean up the promise after completion (success or failure)
						this.ongoingDetections.delete(targetVersion);
					}
				},
			},
		);
	}

	async detect(targetVersion: BreakingChangeVersion): Promise<DetectionReport> {
		const startTime = Date.now();
		this.logger.info('Starting breaking change detection', { targetVersion });

		const rules = this.ruleRegistry.getRules(targetVersion);

		const workflowLevelRules = rules.filter((rule) => 'detectWorkflow' in rule);
		const instanceLevelRules = rules.filter((rule) => 'detect' in rule);

		const [instanceLevelResults, workflowLevelResults] = await Promise.all([
			this.getAllInstanceRulesResults(instanceLevelRules),
			this.getAllWorkflowRulesResults(workflowLevelRules),
		]);

		const report = this.createDetectionReport(
			targetVersion,
			instanceLevelResults.concat(workflowLevelResults),
			rules,
		);

		const duration = Date.now() - startTime;
		this.logger.info('Breaking change detection completed', {
			duration,
			totalIssues: report.summary.totalIssues,
			criticalIssues: report.summary.criticalIssues,
		});

		return report;
	}

	private createDetectionReport(
		targetVersion: BreakingChangeVersion,
		results: DetectionResult[],
		rules: IBreakingChangeRule[],
	): DetectionReport {
		const criticalIssues = results.filter((r) => {
			const rule = rules.find((rule) => rule.id === r.ruleId);
			assert(rule);

			return rule.getMetadata().severity === BreakingChangeSeverity.critical;
		}).length;

		return {
			generatedAt: new Date(),
			targetVersion,
			currentVersion: N8N_VERSION,
			summary: {
				totalIssues: results.length,
				criticalIssues,
			},
			results,
		};
	}
}
