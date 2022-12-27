import * as Db from '@/Db';
import { separate } from '@/utils';
import { RISK_CATEGORIES } from '@/audit/constants';
import { toReportTitle } from '@/audit/utils';
import { reportCredentialsRisk } from '@/audit/risks/credentials.risk';
import { reportDatabaseRisk } from '@/audit/risks/database.risk';
import { reportExecutionRisk } from '@/audit/risks/execution.risk';
import { reportFilesystemRisk } from '@/audit/risks/filesystem.risk';
import { reportInstanceRisk } from '@/audit/risks/instance.risk';
import type { Risk } from '@/audit/types';

export const SYNC_MAP: Record<string, Risk.SyncReportFn> = {
	database: reportDatabaseRisk,
	filesystem: reportFilesystemRisk,
};

export const ASYNC_MAP: Record<string, Risk.AsyncReportFn> = {
	credentials: reportCredentialsRisk,
	execution: reportExecutionRisk,
	instance: reportInstanceRisk,
};

export const isAsync = (c: Risk.Category) => Object.keys(ASYNC_MAP).includes(c);

export async function audit(categories: Risk.Category[] = RISK_CATEGORIES) {
	if (categories.length === 0) categories = RISK_CATEGORIES;

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

	if (reports.length === 0) return null;

	return reports.reduce<Risk.Audit>((acc, cur) => {
		acc[toReportTitle(cur.risk)] = cur;

		return acc;
	}, {});
}
