import {
	extractTourSteps,
	isTriggerNodeType,
	toPageExcerpt,
	toTriggerCategory,
	toWorkflowTrigger,
	type PageOverview,
	type PageOverviewExecution,
	type PageOverviewPage,
	type PageOverviewSummary,
	type PageOverviewWorkflow,
} from '@n8n/api-types';

import type { LastExecutionRow } from './page-execution.repository';
import { STICKY_NOTE_NODE_TYPE } from './page-placements';
import type { PageWorkflowLinkRow } from './page-reference.repository';
import type { ProjectWorkflowRow } from './page-workflow.repository';
import type { PageEntity } from './page.entity';
import type { ProjectSummaryRow } from './page.repository';

/** The most node types that the overview gives for one workflow. */
export const PAGE_OVERVIEW_NODE_TYPES_LIMIT = 6;

/** The most credential types that the overview gives for one workflow. */
export const PAGE_OVERVIEW_CREDENTIAL_TYPES_LIMIT = 4;

/** The most characters of a page excerpt on the overview. */
export const PAGE_OVERVIEW_EXCERPT_MAX_LENGTH = 220;

/** A workflow with the pages of its project that link to it or to its nodes. */
export type WorkflowDocumentation = {
	workflow: ProjectWorkflowRow;
	pageCount: number;
	/** The page with the most links. `undefined` means that no page links to the workflow. */
	mainPageId?: string;
};

type MainPageRow = Pick<PageEntity, 'id' | 'title' | 'content' | 'updatedAt'>;

type WorkflowNode = ProjectWorkflowRow['nodes'][number];

type PageChoice = { pageId?: string; linkCount: number };

/** A sticky note and a disabled node do no work in a workflow. */
function doesWork(node: WorkflowNode): boolean {
	return node.type !== STICKY_NOTE_NODE_TYPE && node.disabled !== true;
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}

/** Puts the trigger types first and keeps at most 6 types. */
function toOverviewNodeTypes(nodeTypes: string[]): string[] {
	return [
		...nodeTypes.filter(isTriggerNodeType),
		...nodeTypes.filter((nodeType) => !isTriggerNodeType(nodeType)),
	].slice(0, PAGE_OVERVIEW_NODE_TYPES_LIMIT);
}

/** Lists the distinct credential types that the nodes use, in the order of the workflow. At most 4. */
function toOverviewCredentialTypes(nodes: WorkflowNode[]): string[] {
	return unique(nodes.flatMap((node) => Object.keys(node.credentials ?? {}))).slice(
		0,
		PAGE_OVERVIEW_CREDENTIAL_TYPES_LIMIT,
	);
}

/** Keeps the links to the workflow from the pages of its project. */
function toLinksOfWorkflow(
	workflow: ProjectWorkflowRow,
	links: PageWorkflowLinkRow[],
): PageWorkflowLinkRow[] {
	return links.filter(
		(link) => link.workflowId === workflow.id && link.pageProjectId === workflow.projectId,
	);
}

/** Lists the pages of the links without duplicates, the most recently updated first. */
function toPageIdsNewestFirst(links: PageWorkflowLinkRow[]): string[] {
	return unique(
		links
			.toSorted((a, b) => b.pageUpdatedAt.getTime() - a.pageUpdatedAt.getTime())
			.map((link) => link.pageId),
	);
}

/**
 * Picks the page with the most links. The newest page wins a tie.
 * Returns `undefined` when there is no link.
 */
function toMainPageId(links: PageWorkflowLinkRow[]): string | undefined {
	return toPageIdsNewestFirst(links).reduce<PageChoice>(
		(best, pageId) => {
			const linkCount = links.filter((link) => link.pageId === pageId).length;
			return linkCount > best.linkCount ? { pageId, linkCount } : best;
		},
		{ linkCount: 0 },
	).pageId;
}

/** A page that sums up a project documents no single workflow, so its links do not count. */
export function withoutSummaryLinks(
	links: PageWorkflowLinkRow[],
	summaries: Array<Pick<ProjectSummaryRow, 'id'>>,
): PageWorkflowLinkRow[] {
	const summaryIds = new Set(summaries.map((summary) => summary.id));
	return links.filter((link) => !summaryIds.has(link.pageId));
}

export function toOverviewSummary(summary: ProjectSummaryRow): PageOverviewSummary {
	return {
		id: summary.id,
		title: summary.title,
		version: summary.version,
		isEmpty: summary.content.trim() === '',
	};
}

/** Finds the pages that document each workflow. Only the pages of the project of a workflow count. */
export function toWorkflowDocumentations(
	workflows: ProjectWorkflowRow[],
	links: PageWorkflowLinkRow[],
): WorkflowDocumentation[] {
	return workflows.map((workflow) => {
		const linksOfWorkflow = toLinksOfWorkflow(workflow, links);
		return {
			workflow,
			pageCount: new Set(linksOfWorkflow.map((link) => link.pageId)).size,
			mainPageId: toMainPageId(linksOfWorkflow),
		};
	});
}

/** Lists the main pages of the workflows, without duplicates. */
export function toMainPageIds(documentations: WorkflowDocumentation[]): string[] {
	return unique(documentations.flatMap(({ mainPageId }) => mainPageId ?? []));
}

function toOverviewPage(page: MainPageRow, workflow: ProjectWorkflowRow): PageOverviewPage {
	return {
		id: page.id,
		title: page.title,
		excerpt: toPageExcerpt(page.content, PAGE_OVERVIEW_EXCERPT_MAX_LENGTH),
		hasTour: extractTourSteps(page.content, undefined, workflow.id) !== undefined,
		outdated: workflow.updatedAt.getTime() > page.updatedAt.getTime(),
	};
}

function toOverviewExecution({ status, stoppedAt }: LastExecutionRow): PageOverviewExecution {
	return { status, finishedAt: stoppedAt.toISOString() };
}

function toOverviewWorkflow(
	{ workflow, pageCount, mainPageId }: WorkflowDocumentation,
	mainPages: MainPageRow[],
	lastExecutions: LastExecutionRow[],
): PageOverviewWorkflow {
	const workingNodes = workflow.nodes.filter(doesWork);
	const nodeTypes = unique(workingNodes.map((node) => node.type));
	const mainPage = mainPages.find((page) => page.id === mainPageId);
	const trigger = toWorkflowTrigger(workingNodes);
	const lastExecution = lastExecutions.find((execution) => execution.workflowId === workflow.id);
	return {
		id: workflow.id,
		name: workflow.name,
		projectId: workflow.projectId,
		projectName: workflow.projectName,
		active: workflow.active,
		category: toTriggerCategory(nodeTypes),
		...(trigger ? { trigger } : {}),
		nodeTypes: toOverviewNodeTypes(nodeTypes),
		credentialTypes: toOverviewCredentialTypes(workingNodes),
		...(mainPage ? { page: toOverviewPage(mainPage, workflow) } : {}),
		pageCount,
		...(lastExecution ? { lastExecution: toOverviewExecution(lastExecution) } : {}),
	};
}

/**
 * Builds the overview. A workflow whose main page is not in `mainPages` gets no page.
 * A workflow with no row in `lastExecutions` gets no last execution.
 */
export function toPageOverview(
	documentations: WorkflowDocumentation[],
	mainPages: MainPageRow[],
	lastExecutions: LastExecutionRow[],
): PageOverview {
	return {
		workflows: documentations.map((documentation) =>
			toOverviewWorkflow(documentation, mainPages, lastExecutions),
		),
	};
}
