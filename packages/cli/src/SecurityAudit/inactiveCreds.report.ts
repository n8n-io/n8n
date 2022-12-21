/* eslint-disable @typescript-eslint/no-use-before-define */
import { In, LessThanOrEqual } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import config from '@/config';
import * as Db from '@/Db';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { InactiveCredsReport, WorkflowIdsToCredIds as WorkflowsToCreds } from './types';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import { RISKS } from './constants';

export async function reportInactiveCreds(workflows: WorkflowEntity[]) {
	const allCredEntities = await Db.collections.Credentials.find();
	const allCreds = allCredEntities.map((c) => ({ id: c.id.toString(), name: c.name }));
	const { credsInAnyUse, credsInActiveUse, workflowsToCreds } = await getAllCredsInUse(workflows);

	const credsNotInAnyUse = allCreds.filter((c) => !credsInAnyUse.has(c.id));
	const credsNotInActiveUse = allCreds.filter((c) => !credsInActiveUse.has(c.id));

	const days = config.getEnv('security.audit.daysAbandonedWorkflow');
	const credsInAbandonedWorkflows = await getCredsInAbandonedWorfklows(workflowsToCreds, days);

	const credCategories = [credsNotInAnyUse, credsNotInActiveUse, credsInAbandonedWorkflows];

	if (credCategories.every((i) => i.length === 0)) return null;

	const report: InactiveCredsReport = {
		risk: RISKS.INACTIVE_CREDS,
		riskTypes: [],
	};

	const recommendation = 'Consider removing these credentials if you no longer need them.';

	if (credsNotInAnyUse.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any workflow',
			description: [
				'These credentials are not being used in any workflow at all.',
				recommendation,
			].join(' '),
			credentials: credsNotInAnyUse,
		});
	}

	if (credsNotInActiveUse.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any active workflow',
			description: [
				'These credentials are not being used in any active workflow.',
				recommendation,
			].join(' '),
			credentials: credsNotInActiveUse,
		});
	}

	if (credsInAbandonedWorkflows.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any active workflow',
			description: [
				`These credentials are being used in workflows not executed in the past ${days.toString()} days.`,
				recommendation,
			].join(' '),
			credentials: credsInAbandonedWorkflows,
		});
	}

	return report;
}

async function getExecutionsNotInPastDays(days: number) {
	const date = new Date();

	date.setDate(date.getDate() - days);

	const utcDate = DateUtils.mixedDateToUtcDatetimeString(date) as string;

	return Db.collections.Execution.find({
		where: {
			startedAt: LessThanOrEqual(utcDate),
		},
	});
}

/**
 * Get IDs of credentials used in worfklows not executed in past n days.
 */
async function getCredsInAbandonedWorfklows(workflowsToCreds: WorkflowsToCreds, days: number) {
	const executionsNotInPastDays = await getExecutionsNotInPastDays(days);

	const idsOfWorkflowsNotExecutedInPastXDays = executionsNotInPastDays.reduce<Set<string>>(
		(acc, execution) => {
			if (!execution.workflowData?.id) return acc;
			return acc.add(execution.workflowData.id.toString()), acc;
		},
		new Set(),
	);

	const workflowsNotExecutedInPastXDays = await Db.collections.Workflow.find({
		where: { id: In([...idsOfWorkflowsNotExecutedInPastXDays]) },
	});

	return workflowsNotExecutedInPastXDays.reduce<INodeCredentialsDetails[]>((acc, workflow) => {
		workflowsToCreds[workflow.id]?.forEach((cred) => acc.push(cred));

		return acc;
	}, []);
}

async function getAllCredsInUse(workflows: WorkflowEntity[]) {
	const credsInAnyUse = new Set<string>();
	const credsInActiveUse = new Set<string>();
	const workflowsToCreds: WorkflowsToCreds = {};

	// @TODO: Prevent duplicates in array in WorkflowsToCreds

	workflows.forEach((workflow) => {
		workflow.nodes.forEach((node) => {
			if (!node.credentials) return;

			Object.values(node.credentials).forEach((cred) => {
				if (!cred?.id) return;

				credsInAnyUse.add(cred.id.toString());

				if (workflowsToCreds[workflow.id]) {
					workflowsToCreds[workflow.id].push(cred);
				} else {
					workflowsToCreds[workflow.id] = [cred];
				}

				if (!workflow.active) return;

				credsInActiveUse.add(cred.id.toString());
			});
		});
	});

	return { credsInAnyUse, credsInActiveUse, workflowsToCreds };
}
