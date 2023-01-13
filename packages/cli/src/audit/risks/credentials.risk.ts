import { MoreThanOrEqual } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import * as Db from '@/Db';
import config from '@/config';
import { CREDENTIALS_REPORT } from '@/audit/constants';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { Risk } from '@/audit/types';

async function getAllCredsInUse(workflows: WorkflowEntity[]) {
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

async function getAllExistingCreds() {
	const credentials = await Db.collections.Credentials.find({ select: ['id', 'name'] });

	return credentials.map(({ id, name }) => ({ kind: 'credential' as const, id, name }));
}

async function getExecutionsInPastDays(days: number) {
	const date = new Date();

	date.setDate(date.getDate() - days);

	const utcDate = DateUtils.mixedDateToUtcDatetimeString(date) as string;

	return Db.collections.Execution.find({
		select: ['workflowData'],
		where: {
			startedAt: MoreThanOrEqual(utcDate),
		},
	});
}

/**
 * Return IDs of credentials in workflows executed in the past n days.
 */
async function getCredsInRecentlyExecutedWorkflows(days: number) {
	const recentExecutions = await getExecutionsInPastDays(days);

	return recentExecutions.reduce<Set<string>>((acc, execution) => {
		execution.workflowData?.nodes.forEach((node) => {
			if (node.credentials) {
				Object.values(node.credentials).forEach((c) => {
					if (c.id) acc.add(c.id);
				});
			}
		});

		return acc;
	}, new Set());
}

export async function reportCredentialsRisk(workflows: WorkflowEntity[]) {
	const days = config.getEnv('security.audit.daysAbandonedWorkflow');

	const allExistingCreds = await getAllExistingCreds();
	const { credsInAnyUse, credsInActiveUse } = await getAllCredsInUse(workflows);
	const recentlyExecutedCreds = await getCredsInRecentlyExecutedWorkflows(days);

	const credsNotInAnyUse = allExistingCreds.filter((c) => !credsInAnyUse.has(c.id));
	const credsNotInActiveUse = allExistingCreds.filter((c) => !credsInActiveUse.has(c.id));
	const credsNotRecentlyExecuted = allExistingCreds.filter((c) => !recentlyExecutedCreds.has(c.id));

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
			description: [sentenceStart(credsNotInActiveUse), 'not used in active workflows.', hint].join(
				' ',
			),
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
