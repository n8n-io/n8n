import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core/src/errors/error-reporter';
import { strict as assert } from 'node:assert';

import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { allRules, RuleInstances } from './rules';
import type {
	DetectionReport,
	DetectionOptions,
	BreakingChangeVersion,
	DetectionResult,
	IBreakingChangeRule,
} from './types';
import { BreakingChangeSeverity } from './types';

import { N8N_VERSION } from '@/constants';

@Service()
export class BreakingChangeService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = logger.scoped('breaking-changes');
		this.registerRules();
	}

	registerRules() {
		const rulesServices: RuleInstances[] = allRules.map((Rule) =>
			Container.get<RuleInstances>(Rule),
		);
		this.ruleRegistry.registerAll(rulesServices);
	}

	async detect(
		targetVersion: BreakingChangeVersion,
		options: DetectionOptions = {},
	): Promise<DetectionReport> {
		const startTime = Date.now();
		this.logger.info('Starting breaking change detection', { targetVersion, options });

		const rules = this.ruleRegistry.getRules(targetVersion);
		const workflows = await this.workflowRepository.find({
			select: ['id', 'name', 'active', 'nodes'],
		});

		const results = await Promise.all(
			rules.map(async (rule) => {
				try {
					return await rule.detect({ workflows });
				} catch (error) {
					this.errorReporter.error(error);
					this.logger.error('Rule detection failed', {
						ruleId: rule.getMetadata().id,
						error,
					});
					return null;
				}
			}),
		);

		const validResults = results.filter((r) => r !== null);
		const report = this.createDetectionReport(targetVersion, validResults, rules);

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
		validResults: DetectionResult[],
		rules: IBreakingChangeRule[],
	): DetectionReport {
		const affectedResults = validResults.filter((r) => r.isAffected);

		const criticalIssues = affectedResults.filter((r) => {
			const rule = rules.find((rule) => rule.getMetadata().id === r.ruleId);
			assert(rule);

			return rule.getMetadata().severity === BreakingChangeSeverity.critical;
		}).length;

		return {
			generatedAt: new Date(),
			targetVersion,
			currentVersion: N8N_VERSION,
			summary: {
				totalIssues: affectedResults.length,
				criticalIssues,
			},
			results: validResults,
		};
	}
}
