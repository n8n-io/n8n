import { z } from 'zod';

import { Z } from './zod-class';

export const docPageKindSchema = z.enum(['api', 'schedule', 'event', 'agent']);
export type DocPageKind = z.infer<typeof docPageKindSchema>;

export const docPageResourceTypeSchema = z.enum(['workflow', 'agent']);
export type DocPageResourceType = z.infer<typeof docPageResourceTypeSchema>;

/** One schedule rule of a Schedule Trigger node. */
export type DocScheduleRule =
	| {
			every: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
			interval: number;
			/** 0 to 23. Not set for seconds and minutes. */
			hour?: number;
			/** 0 to 59. Not set for seconds and minutes. */
			minute?: number;
			/** 0 is Sunday. Only for weeks. */
			weekdays?: number[];
			/** 1 to 31. Only for months. */
			dayOfMonth?: number;
	  }
	| { cron: string };

/** One enabled entry point of a workflow. Never holds credential data. */
export type DocPageTrigger = { nodeName: string; nodeType: string; typeVersion: number } & (
	| {
			type: 'webhook';
			/** One or more HTTP methods. */
			methods: string[];
			/** The production URL. */
			url: string;
			auth: 'none' | 'basicAuth' | 'headerAuth' | 'jwtAuth';
	  }
	| { type: 'form'; url: string; auth: 'none' | 'basicAuth' }
	| { type: 'chat'; /** Set when the chat is public. */ url: string | null }
	| { type: 'schedule'; rules: DocScheduleRule[] }
	| { type: 'event' }
);

/**
 * Facts that n8n reads from the published workflow or Agent. The LLM does not write them.
 * Child pages have none.
 */
export type DocPageProperties = {
	triggers: DocPageTrigger[];
	agent: { model: string | null; channels: string[] } | null;
};

export type DocPageSummary = {
	/** Null when the resource has no page yet. */
	id: string | null;
	resourceType: DocPageResourceType;
	resourceId: string;
	projectId: string;
	/** The resource name. */
	name: string;
	kind: DocPageKind;
	/** The first 160 characters of the page text. */
	excerpt: string;
	isStale: boolean;
	isPublished: boolean;
	properties: DocPageProperties | null;
};

export type DocPageLink = { id: string; title: string };

export type DocPage = {
	id: string;
	projectId: string;
	parentId: string | null;
	resourceType: DocPageResourceType | null;
	resourceId: string | null;
	kind: DocPageKind | null;
	title: string;
	/** Tiptap JSON document. */
	content: Record<string, unknown> | null;
	markdown: string | null;
	isStale: boolean;
	isPublished: boolean;
	properties: DocPageProperties | null;
	canEdit: boolean;
	/** Root first. The page itself is not in the list. */
	breadcrumb: DocPageLink[];
	children: DocPageLink[];
	updatedAt: string;
};

export type DocOverviewProject = {
	project: { id: string; name: string; type: string };
	/** The top 4 items of the project. */
	items: DocPageSummary[];
};

export const docCheckFindingSchema = z.object({
	/** The exact heading text of the section to replace. */
	heading: z.string(),
	/** One sentence. */
	problem: z.string(),
	/** The full new section, heading included. */
	replacementMarkdown: z.string(),
});
export type DocCheckFinding = z.infer<typeof docCheckFindingSchema>;

export type DocCheckResponse = { findings: DocCheckFinding[] };

export class DocPageSearchQueryDto extends Z.class({
	q: z.string().trim().min(2).max(200),
}) {}

export class EnsureDocPageDto extends Z.class({
	resourceType: docPageResourceTypeSchema,
	resourceId: z.string().min(1).max(64),
}) {}

export class UpdateDocPageDto extends Z.class({
	title: z.string().trim().min(1).max(255).optional(),
	content: z.record(z.string(), z.unknown()).optional(),
}) {}

export class CreateDocChildPageDto extends Z.class({
	title: z.string().trim().min(1).max(255),
}) {}

export class CheckDocPageDto extends Z.class({
	markdown: z.string().max(200_000),
}) {}
