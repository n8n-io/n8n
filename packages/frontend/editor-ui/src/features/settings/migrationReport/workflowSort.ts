import type { BreakingChangeRuleDetailWorkflow } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import orderBy from 'lodash/orderBy';
import { ownerLabel } from './workflowLabels';

type Row = BreakingChangeRuleDetailWorkflow;

export interface SortBy {
	id: string;
	desc: boolean;
}

/** The options of the Sort select. Each option sets one column and direction. */
export const SORT_OPTIONS: Array<SortBy & { value: string; labelKey: BaseTextKey }> = [
	{
		value: 'mostRuns',
		id: 'numberOfExecutions',
		desc: true,
		labelKey: 'settings.migrationReport.detail.sort.mostRuns',
	},
	{
		value: 'fewestRuns',
		id: 'numberOfExecutions',
		desc: false,
		labelKey: 'settings.migrationReport.detail.sort.fewestRuns',
	},
	{
		value: 'lastRun',
		id: 'lastExecutedAt',
		desc: true,
		labelKey: 'settings.migrationReport.detail.sort.lastRun',
	},
	{
		value: 'lastUpdated',
		id: 'lastUpdatedAt',
		desc: true,
		labelKey: 'settings.migrationReport.detail.sort.lastUpdated',
	},
	{
		value: 'nameAsc',
		id: 'name',
		desc: false,
		labelKey: 'settings.migrationReport.detail.sort.nameAsc',
	},
	{
		value: 'nameDesc',
		id: 'name',
		desc: true,
		labelKey: 'settings.migrationReport.detail.sort.nameDesc',
	},
];

// A column header can also sort the table. A sort that no option describes
// leaves the select empty, and the header shows the sort.
export function sortOptionFor(sortBy: SortBy[]): string | undefined {
	const current = sortBy[0];
	if (!current) return undefined;
	return SORT_OPTIONS.find((option) => option.id === current.id && option.desc === current.desc)
		?.value;
}

export function sortWorkflows(rows: Row[], sortBy: SortBy[], unassignedLabel: string): Row[] {
	if (!sortBy.length) return rows;

	// The owner cell shows a label, so it sorts by that label and not by the owner object.
	// Dates come from JSON as strings, and a workflow that never ran has no date.
	// A timestamp sorts them right, with a missing date as the oldest.
	const sortValues: Record<string, (row: Row) => string | number> = {
		owner: (row) => ownerLabel(row, unassignedLabel),
		lastExecutedAt: (row) => (row.lastExecutedAt ? new Date(row.lastExecutedAt).getTime() : 0),
		lastUpdatedAt: (row) => new Date(row.lastUpdatedAt).getTime(),
		name: (row) => row.name.toLowerCase(),
	};

	const { id, desc } = sortBy[0];
	return orderBy(rows, [sortValues[id] ?? id], [desc ? 'desc' : 'asc']);
}
