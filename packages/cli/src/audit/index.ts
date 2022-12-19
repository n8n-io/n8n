import * as Db from '@/Db';
import { separate } from '@/utils';
import { RISK_CATEGORIES, ASYNC_MAP, SYNC_MAP } from '@/audit/constants';
import { isAsync, toReportTitle } from '@/audit/utils';
import type { Risk } from '@/audit/types';

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
