import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core/src/errors/error-reporter';
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
} from './types';
import { BreakingChangeSeverity } from './types';
import { N8N_VERSION } from '../../constants';

import { CacheService } from '@/services/cache/cache.service';

@Service()
export class BreakingChangeService {
	private readonly batchSize = 100;
	private static readonly CACHE_KEY_PREFIX = 'breaking-changes:results:';

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

	private async getAllWorkflowRulesResults(
		workflowLevelRules: IBreakingChangeWorkflowRule[],
	): Promise<DetectionResult[]> {
		const totalWorkflows = await this.workflowRepository.count();
		const allAffectedWorkflows: Map<string, AffectedWorkflow[]> = new Map();
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
			});

			this.logger.debug('Processing batch', {
				skip,
				workflowsInBatch: workflows.length,
			});

			for (const rule of workflowLevelRules) {
				try {
					const ruleId = rule.getMetadata().id;
					for (const workflow of workflows) {
						const workflowDetectionResult = await rule.detectWorkflow(workflow);
						if (workflowDetectionResult.isAffected) {
							const affectedWorkflow = {
								id: workflow.id,
								name: workflow.name,
								active: workflow.active,
								issues: workflowDetectionResult.issues,
							};
							if (!allAffectedWorkflows.has(ruleId)) {
								allAffectedWorkflows.set(ruleId, [affectedWorkflow]);
							} else {
								allAffectedWorkflows.get(ruleId)!.push(affectedWorkflow);
							}
						}
					}
				} catch (error) {
					this.errorReporter.error(error);
					this.logger.error('Rule detection failed', {
						ruleId: rule.getMetadata().id,
						error,
					});
				}
			}
		}

		// Aggregate results
		for (const rule of workflowLevelRules) {
			const workflowResults = allAffectedWorkflows.get(rule.getMetadata().id) || [];
			const isAffected = workflowResults.some((wr) => wr.issues.length > 0);

			if (isAffected) {
				allResults.push({
					ruleId: rule.getMetadata().id,
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
					return await this.detect(targetVersion);
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

		// Get all workflow-level rules results
		const workflowLevelResults = await this.getAllWorkflowRulesResults(workflowLevelRules);

		// Run instance-level rules
		const instanceLevelResults: DetectionResult[] = [];
		for (const rule of instanceLevelRules) {
			try {
				const ruleResult = await rule.detect();
				if (ruleResult.isAffected) {
					instanceLevelResults.push({
						ruleId: rule.getMetadata().id,
						affectedWorkflows: [],
						instanceIssues: ruleResult.instanceIssues,
						recommendations: ruleResult.recommendations,
					});
				}
			} catch (error) {
				this.errorReporter.error(error);
				this.logger.error('Rule detection failed', {
					ruleId: rule.getMetadata().id,
					error,
				});
			}
		}

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
			const rule = rules.find((rule) => rule.getMetadata().id === r.ruleId);
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
