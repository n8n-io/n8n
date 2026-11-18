import {
	WORKFLOW_TRIGGER_CATEGORIES,
	toResourcePath,
	type PageOverviewWorkflow,
	type WorkflowTriggerCategory,
} from '@n8n/api-types';

/** Which workflows the board shows: all, the ones without a page, or the ones of one category. */
export type OverviewFilter = 'all' | 'undocumented' | WorkflowTriggerCategory;

export const OVERVIEW_GROUPINGS = ['project', 'trigger', 'connection'] as const;

/** What makes the sections of the board: the project of a workflow, how it starts, or the credentials that it uses. */
export type OverviewGrouping = (typeof OVERVIEW_GROUPINGS)[number];

/** The groupings of a board of one project. The project grouping has no use there. */
const ONE_PROJECT_GROUPINGS: OverviewGrouping[] = ['trigger', 'connection'];

/** The most cards that a project section shows. */
export const PROJECT_SECTION_CARD_LIMIT = 4;

/**
 * One section of the board. `key` is unique in a board.
 * `total` counts the workflows of the section. `workflows` can hold fewer of them.
 */
export type OverviewSection = { key: string; workflows: PageOverviewWorkflow[]; total: number } & (
	| { kind: 'project'; projectId: string; projectName: string }
	| { kind: 'category'; category: WorkflowTriggerCategory }
	| { kind: 'connection'; credentialType: string }
	| { kind: 'noConnection' }
);

export type OverviewCoverage = {
	documented: number;
	total: number;
	/** The share of documented workflows, from 0 to 100, as an integer. */
	percent: number;
};

export type CategoryCount = { category: WorkflowTriggerCategory; count: number };

const FULL_PERCENT = 100;

export function isDocumented(workflow: PageOverviewWorkflow): boolean {
	return workflow.page !== undefined;
}

/** Counts the workflows that have a page. No workflow gives 0 percent. */
export function toCoverage(workflows: PageOverviewWorkflow[]): OverviewCoverage {
	const documented = workflows.filter(isDocumented).length;
	const total = workflows.length;
	return {
		documented,
		total,
		percent: total === 0 ? 0 : Math.round((documented / total) * FULL_PERCENT),
	};
}

function ofCategory(
	workflows: PageOverviewWorkflow[],
	category: WorkflowTriggerCategory,
): PageOverviewWorkflow[] {
	return workflows.filter((workflow) => workflow.category === category);
}

/** Counts the workflows of each category that has one, in the fixed order of the categories. */
export function toCategoryCounts(workflows: PageOverviewWorkflow[]): CategoryCount[] {
	return WORKFLOW_TRIGGER_CATEGORIES.map((category) => ({
		category,
		count: ofCategory(workflows, category).length,
	})).filter(({ count }) => count > 0);
}

export function filterWorkflows(
	workflows: PageOverviewWorkflow[],
	filter: OverviewFilter,
): PageOverviewWorkflow[] {
	switch (filter) {
		case 'all':
			return workflows;
		case 'undocumented':
			return workflows.filter((workflow) => !isDocumented(workflow));
		default:
			return ofCategory(workflows, filter);
	}
}

/**
 * Lists the groupings that a board offers, the default one first.
 * A board of every project groups by project by default. A board of one project groups by trigger.
 */
export function toOfferedGroupings(projectId: string | undefined): OverviewGrouping[] {
	return projectId === undefined ? [...OVERVIEW_GROUPINGS] : ONE_PROJECT_GROUPINGS;
}

/** Lists the texts of a workflow that a search reads. */
function toSearchableTexts(workflow: PageOverviewWorkflow): string[] {
	return [
		workflow.name,
		workflow.projectName,
		workflow.page?.title ?? '',
		workflow.page?.excerpt ?? '',
	];
}

/**
 * Keeps the workflows whose name, project name, page title or page excerpt contains the query.
 * The case does not count. An empty query keeps every workflow.
 */
export function searchWorkflows(
	workflows: PageOverviewWorkflow[],
	query: string,
): PageOverviewWorkflow[] {
	const needle = query.trim().toLowerCase();
	return workflows.filter((workflow) =>
		toSearchableTexts(workflow).some((text) => text.toLowerCase().includes(needle)),
	);
}

function toSection<Kind extends object>(
	key: string,
	workflows: PageOverviewWorkflow[],
	kind: Kind,
): Kind & { key: string; workflows: PageOverviewWorkflow[]; total: number } {
	return { ...kind, key, workflows, total: workflows.length };
}

/** Puts the documented workflows first and keeps the order inside each group. */
function documentedFirst(workflows: PageOverviewWorkflow[]): PageOverviewWorkflow[] {
	return [
		...workflows.filter(isDocumented),
		...workflows.filter((workflow) => !isDocumented(workflow)),
	];
}

/**
 * Gives one section for each project, by project name.
 * A section shows at most 4 workflows, the documented ones first. `total` counts all of them.
 */
function toProjectSections(workflows: PageOverviewWorkflow[]): OverviewSection[] {
	const projectNamesById = new Map(
		workflows.map((workflow) => [workflow.projectId, workflow.projectName]),
	);
	return [...projectNamesById]
		.toSorted(([, a], [, b]) => a.localeCompare(b))
		.map(([projectId, projectName]): OverviewSection => {
			const ofProject = workflows.filter((workflow) => workflow.projectId === projectId);
			return {
				key: `project:${projectId}`,
				kind: 'project',
				projectId,
				projectName,
				workflows: documentedFirst(ofProject).slice(0, PROJECT_SECTION_CARD_LIMIT),
				total: ofProject.length,
			};
		});
}

/** Gives one section for each category that has a workflow, in the fixed order of the categories. */
function toCategorySections(workflows: PageOverviewWorkflow[]): OverviewSection[] {
	return WORKFLOW_TRIGGER_CATEGORIES.map(
		(category): OverviewSection =>
			toSection(`category:${category}`, ofCategory(workflows, category), {
				kind: 'category' as const,
				category,
			}),
	);
}

/**
 * Gives one section for each credential type, by name, then the workflows that use no credential.
 * A workflow shows in the section of each of its credential types.
 */
function toConnectionSections(workflows: PageOverviewWorkflow[]): OverviewSection[] {
	const credentialTypes = [
		...new Set(workflows.flatMap((workflow) => workflow.credentialTypes)),
	].toSorted((a, b) => a.localeCompare(b));
	return [
		...credentialTypes.map(
			(credentialType): OverviewSection =>
				toSection(
					`connection:${credentialType}`,
					workflows.filter((workflow) => workflow.credentialTypes.includes(credentialType)),
					{ kind: 'connection' as const, credentialType },
				),
		),
		toSection(
			'noConnection',
			workflows.filter((workflow) => workflow.credentialTypes.length === 0),
			{ kind: 'noConnection' as const },
		),
	];
}

/** Groups the workflows into the sections of the board. A section without a workflow is left out. */
export function toSections(
	workflows: PageOverviewWorkflow[],
	grouping: OverviewGrouping,
): OverviewSection[] {
	const toGroupedSections: Record<
		OverviewGrouping,
		(grouped: PageOverviewWorkflow[]) => OverviewSection[]
	> = {
		project: toProjectSections,
		trigger: toCategorySections,
		connection: toConnectionSections,
	};
	return toGroupedSections[grouping](workflows).filter((section) => section.total > 0);
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/[\\[\]]/g, '\\$&');
}

/** Builds the first content of the page that documents a workflow: a link to that workflow. */
export function toWorkflowPageContent(workflow: Pick<PageOverviewWorkflow, 'id' | 'name'>): string {
	const path = toResourcePath({ resourceType: 'workflow', resourceId: workflow.id });
	return `Workflow: [${escapeMarkdownLinkText(workflow.name)}](${path})\n\n`;
}
