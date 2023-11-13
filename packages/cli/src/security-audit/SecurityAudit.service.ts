import Container, { Service } from 'typedi';

import config from '@/config';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

import { RISK_CATEGORIES } from '@/security-audit/constants';
import { toReportTitle } from '@/security-audit/utils';
import type { Risk, RiskReporter } from '@/security-audit/types';

@Service()
export class SecurityAuditService {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	private reporters: {
		[name: string]: RiskReporter;
	} = {};

	async run(categories: Risk.Category[] = RISK_CATEGORIES, daysAbandonedWorkflow?: number) {
		if (categories.length === 0) categories = RISK_CATEGORIES;

		await this.initReporters(categories);

		const daysFromEnv = config.getEnv('security.audit.daysAbandonedWorkflow');

		if (daysAbandonedWorkflow) {
			config.set('security.audit.daysAbandonedWorkflow', daysAbandonedWorkflow);
		}

		const workflows = await this.workflowRepository.find({
			select: ['id', 'name', 'active', 'nodes', 'connections'],
		});

		const promises = categories.map(async (c) => this.reporters[c].report(workflows));

		const reports = (await Promise.all(promises)).filter((r): r is Risk.Report => r !== null);

		if (daysAbandonedWorkflow) {
			config.set('security.audit.daysAbandonedWorkflow', daysFromEnv); // restore env
		}

		if (reports.length === 0) return []; // trigger empty state

		return reports.reduce<Risk.Audit>((acc, cur) => {
			acc[toReportTitle(cur.risk)] = cur;

			return acc;
		}, {});
	}

	async initReporters(categories: Risk.Category[]) {
		for (const category of categories) {
			const className = category.charAt(0).toUpperCase() + category.slice(1) + 'RiskReporter';

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const RiskReporterModule = await import(`@/security-audit/risk-reporters/${className}`);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const RiskReporterClass = RiskReporterModule[className] as { new (): RiskReporter };

			this.reporters[category] = Container.get(RiskReporterClass);
		}
	}
}
