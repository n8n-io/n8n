/* eslint-disable @typescript-eslint/no-use-before-define */
import { In, LessThanOrEqual } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';

import config from '@/config';
import * as Db from '@/Db';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { SQL_NODES } from './constants';
import type { InactiveCredsReport, RiskySqlWorkflow, WorkflowIdsToCredIds } from './types';

// ----------------------------------
//     SQL injection risk report
// ----------------------------------

export async function generateSqlInjectionRiskReport(workflows: WorkflowEntity[]) {
	const riskySqlWorkflows = workflows.reduce<RiskySqlWorkflow[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (
				SQL_NODES.includes(node.type) &&
				node.parameters !== undefined &&
				node.parameters.operation === 'executeQuery' &&
				typeof node.parameters.query === 'string' &&
				node.parameters.query.startsWith('=')
			) {
				acc.push({
					workflowId: workflow.id.toString(),
					workflowName: workflow.name,
					nodeId: node.id,
					nodeName: node.name,
					nodeType: node.type,
				});
			}
		});

		return acc;
	}, []);

	if (riskySqlWorkflows.length === 0) return null;

	return {
		risk: 'SQL injection risk',
		description:
			'These workflows contain at least one SQL node whose "Execute Query" field contains an expression. Building a query with an expression that evaluates arbitrary data may lead to a SQL injection attack. Consider validating the input used to build the query.',
		workflows: riskySqlWorkflows,
	};
}

async function getAllCredsInUse(workflows: WorkflowEntity[]) {
	const credsInAnyUse = new Set(); // regardless of active state
	const credsInActiveUse = new Set();
	const workflowIdsToCredIds: Record<string, Set<string>> = {};

	workflows.forEach((workflow) => {
		workflow.nodes.forEach((node) => {
			if (!node.credentials) return;

			Object.values(node.credentials).forEach((cred) => {
				if (!cred?.id) return;

				credsInAnyUse.add(cred.id.toString());

				if (workflowIdsToCredIds[workflow.id]) {
					workflowIdsToCredIds[workflow.id].add(cred.id);
				} else {
					workflowIdsToCredIds[workflow.id] = new Set(cred.id);
				}

				if (!workflow.active) return;

				credsInActiveUse.add(cred.id.toString());
			});
		});
	});

	return { credsInAnyUse, credsInActiveUse, workflowIdsToCredIds };
}

// ----------------------------------
//       Inactive creds report
// ----------------------------------

export async function generateInactiveCredsReport(workflows: WorkflowEntity[]) {
	const allCredEntities = await Db.collections.Credentials.find();
	const allCreds = allCredEntities.map((cred) => cred.id.toString());
	const { credsInAnyUse, credsInActiveUse, workflowIdsToCredIds } = await getAllCredsInUse(
		workflows,
	);

	const credsNotInAnyUse = allCreds.filter((x) => !credsInAnyUse.has(x));
	const credsNotInActiveUse = allCreds.filter((x) => !credsInActiveUse.has(x));

	const days = config.getEnv('security.audit.daysAbandonedWorkflow');
	const credsInAbandonedWorkflows = await getCredsInAbandonedWorfklows(workflowIdsToCredIds, days);

	const credCategories = [credsNotInAnyUse, credsNotInActiveUse, credsInAbandonedWorkflows];

	if (credCategories.every((i) => i.length === 0)) return null;

	const report: InactiveCredsReport = {
		risk: 'Inactive credentials',
		riskTypes: [],
	};

	// @TODO: More info on creds (not only IDs)

	const recommendation = 'Consider removing these credentials if you no longer need them.';

	if (credsNotInAnyUse.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any workflow',
			description: [
				'These credentials are not being used in any workflow at all.',
				recommendation,
			].join(' '),
			credentialIds: credsNotInAnyUse,
		});
	}

	if (credsNotInActiveUse.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any active workflow',
			description: [
				'These credentials are not being used in any active workflow.',
				recommendation,
			].join(' '),
			credentialIds: credsNotInActiveUse,
		});
	}

	if (credsInAbandonedWorkflows.length > 0) {
		report.riskTypes.push({
			riskType: 'Credentials not used in any active workflow',
			description: [
				`These credentials are being used in workflows not executed in the past ${days.toString()} days.`,
				recommendation,
			].join(' '),
			credentialIds: credsInAbandonedWorkflows,
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
async function getCredsInAbandonedWorfklows(map: WorkflowIdsToCredIds, days: number) {
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

	const credsOf = workflowsNotExecutedInPastXDays.reduce<Set<string>>((acc, workflow) => {
		return map[workflow.id]?.forEach((credId) => acc.add(credId)), acc;
	}, new Set());

	return Array.from(credsOf);
}
