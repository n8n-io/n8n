import type { BreakingChangeRuleDetailWorkflow } from '@n8n/api-types';
import orderBy from 'lodash/orderBy';
import { PERSONAL_PROJECTS } from './workflowFilters';

type Row = BreakingChangeRuleDetailWorkflow;

export interface FilterOption {
	id: string;
	label: string;
}

export function ownerLabel(workflow: Row, unassignedLabel: string): string {
	const owner = workflow.owner;
	const fullName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ');
	return fullName || owner?.email || unassignedLabel;
}

// Personal projects show as one "Personal" label, the Owner column names the person.
export function projectLabel(workflow: Row, personalLabel: string): string {
	if (workflow.homeProjectType === 'personal') return personalLabel;
	return workflow.homeProjectName ?? '—';
}

/** The owners of the listed workflows, for the owner filter. */
export function buildOwnerFilterOptions(rows: Row[], unassignedLabel: string): FilterOption[] {
	const owners = new Map<string, string>();
	for (const row of rows) {
		if (row.owner) owners.set(row.owner.id, ownerLabel(row, unassignedLabel));
	}
	return orderBy(
		[...owners].map(([id, label]) => ({ id, label })),
		[(owner) => owner.label.toLowerCase()],
	);
}

/** The projects of the listed workflows, for the project filter. Personal projects share one option. */
export function buildProjectFilterOptions(rows: Row[], personalLabel: string): FilterOption[] {
	const projects = new Map<string, string>();
	let hasPersonal = false;
	for (const row of rows) {
		if (row.homeProjectType === 'personal') hasPersonal = true;
		else if (row.homeProjectType === 'team' && row.homeProjectId) {
			projects.set(row.homeProjectId, row.homeProjectName ?? row.homeProjectId);
		}
	}
	const teamOptions = orderBy(
		[...projects].map(([id, label]) => ({ id, label })),
		[(project) => project.label.toLowerCase()],
	);
	if (!hasPersonal) return teamOptions;
	return [{ id: PERSONAL_PROJECTS, label: personalLabel }, ...teamOptions];
}
