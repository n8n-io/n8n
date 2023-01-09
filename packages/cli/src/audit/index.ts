import * as Db from '@/Db';
import { separate } from '@/utils';
import config from '@/config';
import { RISK_CATEGORIES } from '@/audit/constants';
import { toReportTitle } from '@/audit/utils';
import { reportCredentialsRisk } from '@/audit/risks/credentials.risk';
import { reportDatabaseRisk } from '@/audit/risks/database.risk';
import { reportNodesRisk } from '@/audit/risks/nodes.risk';
import { reportFilesystemRisk } from '@/audit/risks/filesystem.risk';
import { reportInstanceRisk } from '@/audit/risks/instance.risk';
import type { Risk } from '@/audit/types';

export const SYNC_MAP: Record<string, Risk.SyncReportFn> = {
	database: reportDatabaseRisk,
	filesystem: reportFilesystemRisk,
};

export const ASYNC_MAP: Record<string, Risk.AsyncReportFn> = {
	credentials: reportCredentialsRisk,
	nodes: reportNodesRisk,
	instance: reportInstanceRisk,
};

export const isAsync = (c: Risk.Category) => Object.keys(ASYNC_MAP).includes(c);

export async function audit(
	categories: Risk.Category[] = RISK_CATEGORIES,
	daysAbandonedWorkflow?: number,
) {
	if (categories.length === 0) categories = RISK_CATEGORIES;

	const daysFromEnv = config.getEnv('security.audit.daysAbandonedWorkflow');

	if (daysAbandonedWorkflow) {
		config.set('security.audit.daysAbandonedWorkflow', daysAbandonedWorkflow);
	}

	const workflows = await Db.collections.Workflow.find({
		select: ['id', 'name', 'active', 'nodes', 'connections'],
	});

	const [asyncCategories, syncCategories] = separate(categories, isAsync);

	const reports: Risk.Report[] = [];

	if (asyncCategories.length > 0) {
		const promises = asyncCategories.map(async (c) => ASYNC_MAP[c](workflows));
		const asyncReports = await Promise.all(promises);
		asyncReports.forEach((r) => r !== null && reports.push(r));
	}

	if (syncCategories.length > 0) {
		const syncReports = syncCategories.map((c) => SYNC_MAP[c](workflows));
		syncReports.forEach((r) => r !== null && reports.push(r));
	}

	if (daysAbandonedWorkflow) {
		config.set('security.audit.daysAbandonedWorkflow', daysFromEnv); // restore env
	}

	if (reports.length === 0) return []; // trigger empty state

	return reports.reduce<Risk.Audit>((acc, cur) => {
		acc[toReportTitle(cur.risk)] = cur;

		return acc;
	}, {});
}
