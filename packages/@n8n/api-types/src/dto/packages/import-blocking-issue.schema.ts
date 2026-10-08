import '../../openapi-extend';

import { z } from 'zod';

import {
	credentialUnresolvedFieldDocs,
	credentialUnresolvedIssueOpenApi,
	dataTableSchemaOperationOpenApi,
	dataTableUnresolvedFieldDocs,
	dataTableUnresolvedIssueOpenApi,
	folderConflictFieldDocs,
	folderConflictIssueOpenApi,
	folderRemovalForbiddenFieldDocs,
	folderRemovalForbiddenIssueOpenApi,
	missingNodeTypeFieldDocs,
	missingNodeTypeIssueOpenApi,
	policyViolationFieldDocs,
	policyViolationIssueOpenApi,
	projectConflictFieldDocs,
	projectConflictIssueOpenApi,
	tagUnresolvedFieldDocs,
	tagUnresolvedIssueOpenApi,
	variableConflictFieldDocs,
	variableConflictIssueOpenApi,
	variableLimitExceededFieldDocs,
	variableLimitExceededIssueOpenApi,
	variableUnresolvedFieldDocs,
	variableUnresolvedIssueOpenApi,
	workflowArchiveForbiddenFieldDocs,
	workflowArchiveForbiddenIssueOpenApi,
	workflowConflictIssueOpenApi,
	workflowFolderConflictFieldDocs,
	workflowFolderConflictIssueOpenApi,
	workflowIdConflictFieldDocs,
	workflowIdConflictIssueOpenApi,
	workflowLineageConflictIssueOpenApi,
	workflowRemovalConflictFieldDocs,
	workflowRemovalConflictIssueOpenApi,
	workflowRemovalForbiddenFieldDocs,
	workflowRemovalForbiddenIssueOpenApi,
} from './import-blocking-issue.openapi';
import { dataTableColumnTypeSchema } from '../../schemas/data-table.schema';
import { policyViolationSchema } from '../../schemas/policy-violation.schema';

/**
 * A reason an import cannot proceed, matching the `BlockingIssue` union in
 * `packages/cli/src/modules/n8n-packages/n8n-packages.types.ts`. A type-level test in
 * `packages/cli` (`blocking-issue-schema-contract.test.ts`) fails when either side gains, loses, or
 * reshapes a field the other doesn't mirror.
 *
 * Field and schema descriptions live in the sibling `import-blocking-issue.openapi.ts` to keep
 * this file focused on shape.
 */
const workflowConflictIssueSchema = z
	.object({
		type: z.literal('workflow-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		name: z.string(),
	})
	.openapi(workflowConflictIssueOpenApi);

const workflowLineageConflictIssueSchema = z
	.object({
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
	})
	.openapi(workflowLineageConflictIssueOpenApi);

const workflowIdConflictIssueSchema = z
	.object({
		type: z.literal('workflow-id-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		existingProjectId: z.string().nullable().openapi(workflowIdConflictFieldDocs.existingProjectId),
		isArchived: z.boolean().openapi(workflowIdConflictFieldDocs.isArchived),
		name: z.string(),
	})
	.openapi(workflowIdConflictIssueOpenApi);

const workflowFolderConflictIssueSchema = z
	.object({
		type: z.literal('workflow-folder-conflict'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		existingParentFolderId: z
			.string()
			.nullable()
			.openapi(workflowFolderConflictFieldDocs.existingParentFolderId),
		targetFolderId: z.string().openapi(workflowFolderConflictFieldDocs.targetFolderId),
		name: z.string(),
	})
	.openapi(workflowFolderConflictIssueOpenApi);

const workflowArchiveForbiddenIssueSchema = z
	.object({
		type: z.literal('workflow-archive-forbidden'),
		sourceWorkflowId: z.string(),
		existingWorkflowId: z.string(),
		name: z.string(),
		projectId: z.string().openapi(workflowArchiveForbiddenFieldDocs.projectId),
		transition: z
			.enum(['archive', 'unarchive'])
			.openapi(workflowArchiveForbiddenFieldDocs.transition),
	})
	.openapi(workflowArchiveForbiddenIssueOpenApi);

const credentialUnresolvedIssueSchema = z
	.object({
		type: z.literal('credential-unresolved'),
		kind: z.enum(['not_found', 'unknown_type', 'source_not_found', 'type_mismatch']),
		sourceId: z.string(),
		targetId: z.string().optional().openapi(credentialUnresolvedFieldDocs.targetId),
		expectedType: z.string().optional().openapi(credentialUnresolvedFieldDocs.expectedType),
		actualType: z.string().optional().openapi(credentialUnresolvedFieldDocs.actualType),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi(credentialUnresolvedIssueOpenApi);

const projectConflictIssueSchema = z
	.object({
		type: z.literal('project-conflict'),
		kind: z.literal('fail-policy'),
		sourceProjectId: z.string(),
		name: z.string().openapi(projectConflictFieldDocs.name),
	})
	.openapi(projectConflictIssueOpenApi);

const folderConflictIssueSchema = z
	.object({
		type: z.literal('folder-conflict'),
		kind: z.enum(['parent-mismatch', 'id-in-other-project', 'fail-policy']),
		sourceFolderId: z.string(),
		name: z.string(),
		existingParentFolderId: z
			.string()
			.nullable()
			.optional()
			.openapi(folderConflictFieldDocs.existingParentFolderId),
		expectedParentFolderId: z
			.string()
			.nullable()
			.optional()
			.openapi(folderConflictFieldDocs.expectedParentFolderId),
		existingProjectId: z
			.string()
			.nullable()
			.optional()
			.openapi(folderConflictFieldDocs.existingProjectId),
	})
	.openapi(folderConflictIssueOpenApi);

const workflowRemovalForbiddenIssueSchema = z
	.object({
		type: z.literal('workflow-removal-forbidden'),
		workflowId: z.string(),
		name: z.string(),
		projectId: z.string().openapi(workflowRemovalForbiddenFieldDocs.projectId),
	})
	.openapi(workflowRemovalForbiddenIssueOpenApi);

const workflowRemovalConflictIssueSchema = z
	.object({
		type: z.literal('workflow-removal-conflict'),
		sourceWorkflowId: z.string(),
		workflowId: z.string().openapi(workflowRemovalConflictFieldDocs.workflowId),
		projectId: z.string(),
	})
	.openapi(workflowRemovalConflictIssueOpenApi);

const folderRemovalForbiddenIssueSchema = z
	.object({
		type: z.literal('folder-removal-forbidden'),
		folderId: z.string(),
		name: z.string(),
		projectId: z.string().openapi(folderRemovalForbiddenFieldDocs.projectId),
	})
	.openapi(folderRemovalForbiddenIssueOpenApi);

/** `destructive` operations delete the data in a column. */
const dataTableSchemaOperationSchema = z
	.discriminatedUnion('kind', [
		z.object({
			kind: z.literal('add-column'),
			column: z.string(),
			type: dataTableColumnTypeSchema,
			destructive: z.literal(false),
		}),
		z.object({
			kind: z.literal('remove-column'),
			column: z.string(),
			type: dataTableColumnTypeSchema,
			destructive: z.literal(true),
		}),
		z.object({
			kind: z.literal('change-column-type'),
			column: z.string(),
			from: dataTableColumnTypeSchema,
			to: dataTableColumnTypeSchema,
			destructive: z.literal(true),
		}),
		z.object({
			kind: z.literal('rename-column'),
			from: z.string(),
			to: z.string(),
			destructive: z.literal(false),
		}),
		z.object({
			kind: z.literal('reorder-columns'),
			destructive: z.literal(false),
		}),
		z.object({
			kind: z.literal('rename-table'),
			from: z.string(),
			to: z.string(),
			destructive: z.literal(false),
		}),
	])
	.openapi(dataTableSchemaOperationOpenApi);

const dataTableUnresolvedIssueSchema = z
	.object({
		type: z.literal('data-table-unresolved'),
		kind: z.enum([
			'missing',
			'id-conflict',
			'name-conflict',
			'schema-incompatible',
			'module-disabled',
			'permission-denied',
		]),
		sourceId: z.string().optional().openapi(dataTableUnresolvedFieldDocs.sourceId),
		name: z.string().optional(),
		existingProjectId: z
			.string()
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.existingProjectId),
		missingColumns: z
			.array(z.string())
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.missingColumns),
		typeMismatches: z
			.array(
				z.object({
					column: z.string(),
					expectedType: z.string(),
					actualType: z.string(),
				}),
			)
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.typeMismatches),
		extraColumns: z.array(z.string()).optional().openapi(dataTableUnresolvedFieldDocs.extraColumns),
		overwriteChanges: z
			.array(dataTableSchemaOperationSchema)
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.overwriteChanges),
		missingScope: z
			.enum(['dataTable:create', 'dataTable:update'])
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.missingScope),
		conflictingTableId: z
			.string()
			.optional()
			.openapi(dataTableUnresolvedFieldDocs.conflictingTableId),
		currentName: z.string().optional().openapi(dataTableUnresolvedFieldDocs.currentName),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi(dataTableUnresolvedIssueOpenApi);

const tagUnresolvedIssueSchema = z
	.object({
		type: z.literal('tag-unresolved'),
		kind: z.enum([
			'rename-drift',
			'name-collision',
			'invalid-name',
			'invalid-id',
			'permission-denied',
		]),
		sourceId: z.string().optional().openapi(tagUnresolvedFieldDocs.sourceId),
		name: z.string().optional().openapi(tagUnresolvedFieldDocs.name),
		missingScope: z
			.enum(['tag:create', 'tag:update'])
			.optional()
			.openapi(tagUnresolvedFieldDocs.missingScope),
		existingTagId: z.string().optional().openapi(tagUnresolvedFieldDocs.existingTagId),
		existingName: z.string().optional().openapi(tagUnresolvedFieldDocs.existingName),
		usedByWorkflows: z.array(z.string()).openapi(tagUnresolvedFieldDocs.usedByWorkflows),
	})
	.openapi(tagUnresolvedIssueOpenApi);

const variableUnresolvedIssueSchema = z
	.object({
		type: z.literal('variable-unresolved'),
		name: z.string().openapi(variableUnresolvedFieldDocs.name),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi(variableUnresolvedIssueOpenApi);

const variableConflictIssueSchema = z
	.object({
		type: z.literal('variable-conflict'),
		name: z.string().openapi(variableConflictFieldDocs.name),
		projectId: z.string().optional().openapi(variableConflictFieldDocs.projectId),
		usedByWorkflows: z.array(z.string()),
	})
	.openapi(variableConflictIssueOpenApi);

const variableLimitExceededIssueSchema = z
	.object({
		type: z.literal('variable-limit-exceeded'),
		limit: z.number().int().openapi(variableLimitExceededFieldDocs.limit),
		// Can be negative after a licence downgrade, so no `.nonnegative()`.
		remaining: z.number().int().openapi(variableLimitExceededFieldDocs.remaining),
		requested: z.number().int().openapi(variableLimitExceededFieldDocs.requested),
		names: z.array(z.string()).openapi(variableLimitExceededFieldDocs.names),
		usedByWorkflows: z.array(z.string()).openapi(variableLimitExceededFieldDocs.usedByWorkflows),
	})
	.openapi(variableLimitExceededIssueOpenApi);

const missingNodeTypeIssueSchema = z
	.object({
		type: z.literal('missing-node-type'),
		nodeType: z.string().openapi(missingNodeTypeFieldDocs.nodeType),
		typeVersion: z.number().openapi(missingNodeTypeFieldDocs.typeVersion),
		usedByWorkflows: z.array(z.string()).openapi(missingNodeTypeFieldDocs.usedByWorkflows),
	})
	.openapi(missingNodeTypeIssueOpenApi);

const policyViolationIssueSchema = z
	.object({
		type: z.literal('policy-violation'),
		sourceWorkflowId: z.string().openapi(policyViolationFieldDocs.sourceWorkflowId),
		name: z.string(),
		violations: z.array(policyViolationSchema),
	})
	.openapi(policyViolationIssueOpenApi);

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
