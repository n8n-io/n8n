import {
	WORKFLOW_TRIGGER_CATEGORIES,
	toResourcePath,
	type PageOverviewWorkflow,
	type WorkflowTriggerCategory,
} from '@n8n/api-types';

/** The most cards that a project section shows. */
export const PROJECT_SECTION_CARD_LIMIT = 4;

/**
 * One section of the board. `key` is unique in a board.
 * `total` counts the workflows of the section. `workflows` can hold fewer of them.
 */
export type OverviewSection = { key: string; workflows: PageOverviewWorkflow[]; total: number } & (
	| { kind: 'project'; projectId: string; projectName: string }
	| { kind: 'category'; category: WorkflowTriggerCategory }
);

export function isDocumented(workflow: PageOverviewWorkflow): boolean {
	return workflow.page !== undefined;
}

function ofCategory(
	workflows: PageOverviewWorkflow[],
	category: WorkflowTriggerCategory,
): PageOverviewWorkflow[] {
	return workflows.filter((workflow) => workflow.category === category);
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

/** Gives one section for each category, in the fixed order of the categories. */
function toCategorySections(workflows: PageOverviewWorkflow[]): OverviewSection[] {
	return WORKFLOW_TRIGGER_CATEGORIES.map((category): OverviewSection => {
		const ofThisCategory = ofCategory(workflows, category);
		return {
			key: `category:${category}`,
			kind: 'category',
			category,
			workflows: ofThisCategory,
			total: ofThisCategory.length,
		};
	});
}

/**
 * Groups the workflows into the sections of the board. A section without a workflow is left out.
 * A board of one project groups by how a workflow starts. A board of every project groups by project.
 */
export function toSections(
	workflows: PageOverviewWorkflow[],
	projectId: string | undefined,
): OverviewSection[] {
	const sections =
		projectId === undefined ? toProjectSections(workflows) : toCategorySections(workflows);
	return sections.filter((section) => section.total > 0);
}

function escapeMarkdownLinkText(text: string): string {
	return text.replace(/[\\[\]]/g, '\\$&');
}

/** Builds the first content of the page that documents a workflow: a link to that workflow. */
export function toWorkflowPageContent(workflow: Pick<PageOverviewWorkflow, 'id' | 'name'>): string {
	const path = toResourcePath({ resourceType: 'workflow', resourceId: workflow.id });
	return `Workflow: [${escapeMarkdownLinkText(workflow.name)}](${path})\n\n`;
}
