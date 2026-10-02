import '../../openapi-extend';

import { z } from 'zod';

import { policyViolationSchema } from '../../schemas/policy-violation.schema';

/**
 * A reason an import cannot proceed, matching the `BlockingIssue` union in
 * `packages/cli/src/modules/n8n-packages/n8n-packages.types.ts`. Keep this schema in
 * lockstep with that type: every field name, optionality and nullability here must mirror
 * the TypeScript source exactly, since the registry `.parse()`s real service output against
 * it on every blocked import.
 */

const workflowConflictIssueSchema = z.object({
	type: z.literal('workflow-conflict'),
	sourceWorkflowId: z.string(),
	existingWorkflowId: z.string(),
	name: z.string(),
});

const workflowLineageConflictIssueSchema = z.object({
	type: z.literal('workflow-lineage-conflict'),
	sourceWorkflowId: z.string(),
	projectId: z.string(),
	existingWorkflows: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			isArchived: z.boolean(),
		}),
	),
});

const workflowIdConflictIssueSchema = z.object({
	type: z.literal('workflow-id-conflict'),
	sourceWorkflowId: z.string(),
	existingWorkflowId: z.string(),
	existingProjectId: z.string().nullable(),
	isArchived: z.boolean(),
	name: z.string(),
});

const workflowFolderConflictIssueSchema = z.object({
	type: z.literal('workflow-folder-conflict'),
	sourceWorkflowId: z.string(),
	existingWorkflowId: z.string(),
	existingParentFolderId: z.string().nullable(),
	targetFolderId: z.string(),
	name: z.string(),
});

const workflowArchiveForbiddenIssueSchema = z.object({
	type: z.literal('workflow-archive-forbidden'),
	sourceWorkflowId: z.string(),
	existingWorkflowId: z.string(),
	name: z.string(),
	projectId: z.string(),
	transition: z.enum(['archive', 'unarchive']),
});

const credentialUnresolvedIssueSchema = z.object({
	type: z.literal('credential-unresolved'),
	kind: z.enum(['not_found', 'unknown_type', 'source_not_found', 'type_mismatch']),
	sourceId: z.string(),
	targetId: z.string().optional(),
	expectedType: z.string().optional(),
	actualType: z.string().optional(),
	usedByWorkflows: z.array(z.string()),
});

const projectConflictIssueSchema = z.object({
	type: z.literal('project-conflict'),
	kind: z.literal('fail-policy'),
	sourceProjectId: z.string(),
	name: z.string(),
});

const folderConflictIssueSchema = z.object({
	type: z.literal('folder-conflict'),
	kind: z.enum(['parent-mismatch', 'id-in-other-project', 'fail-policy']),
	sourceFolderId: z.string(),
	name: z.string(),
	existingParentFolderId: z.string().nullable().optional(),
	expectedParentFolderId: z.string().nullable().optional(),
	existingProjectId: z.string().nullable().optional(),
});

const workflowRemovalForbiddenIssueSchema = z.object({
	type: z.literal('workflow-removal-forbidden'),
	workflowId: z.string(),
	name: z.string(),
	projectId: z.string(),
});

const workflowRemovalConflictIssueSchema = z.object({
	type: z.literal('workflow-removal-conflict'),
	sourceWorkflowId: z.string(),
	workflowId: z.string(),
	projectId: z.string(),
});

const folderRemovalForbiddenIssueSchema = z.object({
	type: z.literal('folder-removal-forbidden'),
	folderId: z.string(),
	name: z.string(),
	projectId: z.string(),
});

const dataTableUnresolvedIssueSchema = z.object({
	type: z.literal('data-table-unresolved'),
	kind: z.enum([
		'missing',
		'id-conflict',
		'name-conflict',
		'schema-incompatible',
		'module-disabled',
		'permission-denied',
	]),
	sourceId: z.string().optional(),
	name: z.string().optional(),
	existingProjectId: z.string().optional(),
	missingColumns: z.array(z.string()).optional(),
	typeMismatches: z
		.array(
			z.object({
				column: z.string(),
				expectedType: z.string(),
				actualType: z.string(),
			}),
		)
		.optional(),
	extraColumns: z.array(z.string()).optional(),
	usedByWorkflows: z.array(z.string()),
});

const tagUnresolvedIssueSchema = z.object({
	type: z.literal('tag-unresolved'),
	kind: z.enum([
		'rename-drift',
		'name-collision',
		'invalid-name',
		'invalid-id',
		'permission-denied',
	]),
	sourceId: z.string().optional(),
	name: z.string().optional(),
	missingScope: z.enum(['tag:create', 'tag:update']).optional(),
	existingTagId: z.string().optional(),
	existingName: z.string().optional(),
	usedByWorkflows: z.array(z.string()),
});

const variableUnresolvedIssueSchema = z.object({
	type: z.literal('variable-unresolved'),
	name: z.string(),
	usedByWorkflows: z.array(z.string()),
});

const variableConflictIssueSchema = z.object({
	type: z.literal('variable-conflict'),
	name: z.string(),
	projectId: z.string().optional(),
	usedByWorkflows: z.array(z.string()),
});

const variableLimitExceededIssueSchema = z.object({
	type: z.literal('variable-limit-exceeded'),
	limit: z.number(),
	remaining: z.number(),
	requested: z.number(),
	names: z.array(z.string()),
	usedByWorkflows: z.array(z.string()),
});

const missingNodeTypeIssueSchema = z.object({
	type: z.literal('missing-node-type'),
	nodeType: z.string(),
	typeVersion: z.number(),
	usedByWorkflows: z.array(z.string()),
});

const policyViolationIssueSchema = z.object({
	type: z.literal('policy-violation'),
	sourceWorkflowId: z.string(),
	name: z.string(),
	violations: z.array(policyViolationSchema),
});

export const importBlockingIssueSchema = z
	.discriminatedUnion('type', [
		workflowConflictIssueSchema,
		workflowLineageConflictIssueSchema,
		workflowIdConflictIssueSchema,
		workflowFolderConflictIssueSchema,
		workflowArchiveForbiddenIssueSchema,
		credentialUnresolvedIssueSchema,
		projectConflictIssueSchema,
		folderConflictIssueSchema,
		workflowRemovalForbiddenIssueSchema,
		workflowRemovalConflictIssueSchema,
		folderRemovalForbiddenIssueSchema,
		dataTableUnresolvedIssueSchema,
		tagUnresolvedIssueSchema,
		variableUnresolvedIssueSchema,
		variableConflictIssueSchema,
		variableLimitExceededIssueSchema,
		missingNodeTypeIssueSchema,
		policyViolationIssueSchema,
	])
	.openapi('ImportBlockingIssue');

export type ImportBlockingIssue = z.infer<typeof importBlockingIssueSchema>;
