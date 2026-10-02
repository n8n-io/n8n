import '../../openapi-extend';

import { z } from 'zod';

import { importBlockingIssueSchema } from './import-blocking-issue.schema';
import { Z } from '../../zod-class';

/**
 * Mirrors `ImportResult` and its nested summary types in
 * `packages/cli/src/modules/n8n-packages/n8n-packages.types.ts` (and the sibling
 * `entities/*` type files it re-exports from). Keep field names, optionality and
 * nullability in lockstep with those TypeScript types — the registry `.parse()`s the
 * real service response against this schema on every successful import.
 */

const importPackageSummarySchema = z.object({
	sourceN8nVersion: z.string(),
	sourceId: z.string(),
	exportedAt: z.string(),
});

const workflowPublishingOutcomeSchema = z.object({
	state: z.enum(['published', 'unpublished', 'unchanged', 'blocked', 'failed']),
	error: z.string().optional(),
	blockedReason: z.enum(['stub-credential', 'missing-node-type']).optional(),
	skippedPublishReason: z.enum(['stub-credential', 'missing-node-type']).optional(),
});

const importedWorkflowSummarySchema = z.object({
	sourceWorkflowId: z.string(),
	localId: z.string(),
	name: z.string(),
	projectId: z.string(),
	parentFolderId: z.string().nullable(),
	activeVersionId: z.string().nullable(),
	isArchived: z.boolean(),
	publishing: workflowPublishingOutcomeSchema,
	status: z.enum(['created', 'updated', 'skipped']),
});

const removedWorkflowSummarySchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	projectId: z.string(),
	parentFolderId: z.string().nullable(),
	deletion: z.enum(['archived', 'deleted']),
});

const removedFolderSummarySchema = z.object({
	folderId: z.string(),
	name: z.string(),
	projectId: z.string(),
	parentFolderId: z.string().nullable(),
});

const importedFolderSummarySchema = z.object({
	sourceFolderId: z.string(),
	localId: z.string(),
	name: z.string(),
	parentFolderId: z.string().nullable(),
	status: z.enum(['created', 'skipped']),
});

const importedProjectSummarySchema = z.object({
	sourceProjectId: z.string(),
	localId: z.string(),
	name: z.string(),
	status: z.enum(['created', 'updated', 'skipped']),
});

const importCredentialSummarySchema = z.object({
	matched: z.array(z.string()),
	stubbed: z.array(z.string()),
});

const importDataTableSummarySchema = z.object({
	matched: z.number(),
	created: z.number(),
});

const importVariableSummarySchema = z.object({
	matched: z.array(z.string()),
	missing: z.array(z.string()),
	created: z.array(z.string()),
	stubbed: z.array(z.string()),
	updated: z.array(z.string()),
});

const importTagSummarySchema = z.object({
	matched: z.array(z.string()),
	created: z.array(z.string()),
	renamed: z.array(z.string()),
	reconciled: z.array(z.string()),
	skipped: z.array(z.string()),
});

const serializedBindingsSchema = z.object({
	workflows: z.record(z.string(), z.string()),
	credentials: z.record(z.string(), z.string()),
});

export const importResultSchema = z.object({
	package: importPackageSummarySchema,
	workflows: z.array(importedWorkflowSummarySchema),
	removedWorkflows: z.array(removedWorkflowSummarySchema),
	removedFolders: z.array(removedFolderSummarySchema),
	folders: z.array(importedFolderSummarySchema),
	projects: z.array(importedProjectSummarySchema),
	bindings: serializedBindingsSchema,
	credentials: importCredentialSummarySchema,
	dataTables: importDataTableSummarySchema,
	variables: importVariableSummarySchema,
	tags: importTagSummarySchema,
});

export class ImportResultDto extends Z.class(importResultSchema.shape) {}

/**
 * Body of the 409/422 responses a blocked import returns: `toImportBlockedError`
 * (`packages/cli/src/modules/n8n-packages/engine/import-blocked.error.ts`) throws a
 * `ConflictError`/`UnprocessableRequestError` carrying `{ issues }` as `meta`, which
 * `serializePublicApiError` (`@n8n/backend-services`) surfaces as `message` + `issues`.
 */
export class ImportBlockedErrorDto extends Z.class({
	message: z.string(),
	issues: z.array(importBlockingIssueSchema),
}) {}
