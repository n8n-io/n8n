import { z } from 'zod';

import type { PageOverviewTrigger, WorkflowTriggerCategory } from '../utils/page-overview';

export const PAGE_RESOURCE_TYPES = ['workflow', 'node', 'page', 'credential', 'dataTable'] as const;

export type PageResourceType = (typeof PAGE_RESOURCE_TYPES)[number];

/** A node has no identity outside its workflow, so a node reference also carries the workflow. */
export type PageNodeReference = { resourceType: 'node'; resourceId: string; workflowId: string };

export type PageResourceReference =
	| PageNodeReference
	| { resourceType: Exclude<PageResourceType, 'node'>; resourceId: string };

export const PAGE_TITLE_MAX_LENGTH = 255;
export const PAGE_CONTENT_MAX_LENGTH = 500_000;

export const pageTitleSchema = z.string().trim().min(1).max(PAGE_TITLE_MAX_LENGTH);
export const pageContentSchema = z.string().max(PAGE_CONTENT_MAX_LENGTH);

/** A page without its content. */
export type PageSummary = {
	id: string;
	projectId: string;
	title: string;
	/** Grows by one on each saved change. A client sends it back to prove that it edited the latest version. */
	version: number;
	createdAt: string;
	updatedAt: string;
};

export type Page = PageSummary & {
	/** Markdown. A reference to an n8n resource is a link to its editor path. */
	content: string;
};

/** A page in a list that spans projects. */
export type PageListItem = PageSummary & { projectName: string };

/** The pages that link to one node of a workflow, the most recently updated first. */
export type PageNodeReferences = { nodeId: string; pages: PageSummary[] };

/** A sticky note of a workflow that shows a page. */
export type PageWorkflowPlacement = {
	workflowId: string;
	workflowName: string;
	nodeId: string;
	nodeName: string;
};

/** Where a page is used: the pages that link to it, and the sticky notes that show it. */
export type PageBacklinks = { pages: PageSummary[]; workflows: PageWorkflowPlacement[] };

/** The page that documents a workflow on the documentation overview. */
export type PageOverviewPage = {
	id: string;
	title: string;
	/** The plain text of the first paragraph of the page. */
	excerpt: string;
	/** True when the page links to at least one node of the workflow. */
	hasTour: boolean;
	/** True when the workflow was updated after the page. */
	outdated: boolean;
};

/** The most recent finished execution of a workflow that succeeded or failed. */
export type PageOverviewExecution = { status: 'success' | 'error'; finishedAt: string };

/** One workflow of a project, with the page that documents it. */
export type PageOverviewWorkflow = {
	id: string;
	name: string;
	projectId: string;
	projectName: string;
	active: boolean;
	category: WorkflowTriggerCategory;
	/** The key fact of the trigger. Absent when the category has none or when it cannot be read. */
	trigger?: PageOverviewTrigger;
	/** The distinct node type names in the order of the workflow, the triggers first. At most 6. */
	nodeTypes: string[];
	/** The distinct credential type names of the nodes, in the order of the workflow. At most 4. */
	credentialTypes: string[];
	/** The page of the same project with the most links to the workflow or its nodes. The newest wins a tie. */
	page?: PageOverviewPage;
	/** How many pages of the same project link to the workflow or its nodes. */
	pageCount: number;
	lastExecution?: PageOverviewExecution;
};

/** The page that sums up a project on the documentation overview. */
export type PageOverviewSummary = {
	id: string;
	title: string;
	version: number;
	/** True when the page has no text. */
	isEmpty: boolean;
};

/** The workflows that are not archived, by name. */
export type PageOverview = {
	workflows: PageOverviewWorkflow[];
	/** The page that sums up the project. Only the overview of one project that has such a page gives it. */
	summary?: PageOverviewSummary;
};
