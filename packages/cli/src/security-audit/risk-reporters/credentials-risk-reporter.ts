import { SecurityConfig } from '@n8n/config';
import { CredentialsRepository, ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import { CREDENTIALS_REPORT } from '@/security-audit/constants';
import type { RiskReporter, Risk } from '@/security-audit/types';

@Service()
export class CredentialsRiskReporter implements RiskReporter {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionDataRepository: ExecutionDataRepository,
		private readonly securityConfig: SecurityConfig,
	) {}

	async report(workflows: IWorkflowBase[]) {
		const days = this.securityConfig.daysAbandonedWorkflow;

		const allExistingCreds = await this.getAllExistingCreds();
		const { credsInAnyUse, credsInActiveUse } = await this.getAllCredsInUse(workflows);
		const recentlyExecutedCreds = await this.getCredsInRecentlyExecutedWorkflows(days);

		const credsNotInAnyUse = allExistingCreds.filter((c) => !credsInAnyUse.has(c.id));
		const credsNotInActiveUse = allExistingCreds.filter((c) => !credsInActiveUse.has(c.id));
		const credsNotRecentlyExecuted = allExistingCreds.filter(
			(c) => !recentlyExecutedCreds.has(c.id),
		);

		const issues = [credsNotInAnyUse, credsNotInActiveUse, credsNotRecentlyExecuted];

		if (issues.every((i) => i.length === 0)) return null;

		const report: Risk.StandardReport = {
			risk: CREDENTIALS_REPORT.RISK,
			sections: [],
		};

		const hint = 'Keeping unused credentials in your instance is an unneeded security risk.';
		const recommendation = 'Consider deleting these credentials if you no longer need them.';

		const sentenceStart = ({ length }: { length: number }) =>
			length > 1 ? 'These credentials are' : 'This credential is';

		if (credsNotInAnyUse.length > 0) {
			report.sections.push({
				title: CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ANY_USE,
				description: [sentenceStart(credsNotInAnyUse), 'not used in any workflow.', hint].join(' '),
				recommendation,
				location: credsNotInAnyUse,
			});
		}

		if (credsNotInActiveUse.length > 0) {
			report.sections.push({
				title: CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_IN_ACTIVE_USE,
				description: [
					sentenceStart(credsNotInActiveUse),
					'not used in active workflows.',
					hint,
				].join(' '),
				recommendation,
				location: credsNotInActiveUse,
			});
		}

		if (credsNotRecentlyExecuted.length > 0) {
			report.sections.push({
				title: CREDENTIALS_REPORT.SECTIONS.CREDS_NOT_RECENTLY_EXECUTED,
				description: [
					sentenceStart(credsNotRecentlyExecuted),
					`not used in recently executed workflows, i.e. workflows executed in the past ${days} days.`,
					hint,
				].join(' '),
				recommendation,
				location: credsNotRecentlyExecuted,
			});
		}

		return report;
	}

	private async getAllCredsInUse(workflows: IWorkflowBase[]) {
		const credsInAnyUse = new Set<string>();
		const credsInActiveUse = new Set<string>();

		workflows.forEach((workflow) => {
			workflow.nodes.forEach((node) => {
				if (!node.credentials) return;

				Object.values(node.credentials).forEach((cred) => {
					if (!cred?.id) return;

					credsInAnyUse.add(cred.id);

					if (workflow.active) credsInActiveUse.add(cred.id);
				});
			});
		});

		return {
			credsInAnyUse,
			credsInActiveUse,
		};
	}

	private async getAllExistingCreds() {
		const credentials = await this.credentialsRepository.find({ select: ['id', 'name'] });

		return credentials.map(({ id, name }) => ({ kind: 'credential' as const, id, name }));
	}

	private async getExecutedWorkflowsInPastDays(days: number): Promise<IWorkflowBase[]> {
		const date = new Date();

		date.setDate(date.getDate() - days);

		const executionIds = await this.executionRepository.getIdsSince(date);

		return await this.executionDataRepository.findByExecutionIds(executionIds);
	}

	/**
	 * Return IDs of credentials in workflows executed in the past n days.
	 */
	private async getCredsInRecentlyExecutedWorkflows(days: number) {
		const executedWorkflows = await this.getExecutedWorkflowsInPastDays(days);

		return executedWorkflows.reduce<Set<string>>((acc, { nodes }) => {
			nodes.forEach((node) => {
				if (node.credentials) {
					Object.values(node.credentials).forEach((c) => {
						if (c.id) acc.add(c.id);
					});
				}
			});

			return acc;
		}, new Set());
	}
}
