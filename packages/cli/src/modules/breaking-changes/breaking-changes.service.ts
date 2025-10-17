import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { N8N_VERSION } from '@/constants';

import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { allRules, RuleInstances } from './rules';
import type { DetectionReport, DetectionOptions, BreakingChangeVersion } from './types';
import { BreakingChangeSeverity } from './types';

@Service()
export class BreakingChangeService {
	constructor(
		private readonly ruleRegistry: RuleRegistry,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('breaking-changes');
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

		const results = await Promise.all(
			rules.map(async (rule) => {
				try {
					return await rule.detect();
				} catch (error) {
					this.logger.error('Rule detection failed', {
						ruleId: rule.getMetadata().id,
						error,
					});
					return null;
				}
			}),
		);

		const validResults = results.filter((r) => r !== null);
		const affectedResults = validResults.filter((r) => r.isAffected);

		const criticalIssues = affectedResults.filter((r) => {
			const rule = rules.find((rule) => rule.getMetadata().id === r.ruleId);
			return rule?.getMetadata().severity === BreakingChangeSeverity.CRITICAL;
		}).length;

		const report: DetectionReport = {
			generatedAt: new Date(),
			targetVersion,
			currentVersion: N8N_VERSION,
			summary: {
				totalIssues: affectedResults.length,
				criticalIssues,
			},

			results: validResults,
		};

		const duration = Date.now() - startTime;
		this.logger.info('Breaking change detection completed', {
			duration,
			totalIssues: report.summary.totalIssues,
			criticalIssues: report.summary.criticalIssues,
		});

		return report;
	}
}
