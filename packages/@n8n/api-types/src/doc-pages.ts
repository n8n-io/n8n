import { z } from 'zod';

import { Z } from './zod-class';

export const docPageKindSchema = z.enum(['api', 'schedule', 'event', 'agent']);
export type DocPageKind = z.infer<typeof docPageKindSchema>;

export const docPageResourceTypeSchema = z.enum(['workflow', 'agent']);
export type DocPageResourceType = z.infer<typeof docPageResourceTypeSchema>;

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
