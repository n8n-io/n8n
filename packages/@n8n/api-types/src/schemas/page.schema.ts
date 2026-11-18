import { z } from 'zod';

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
