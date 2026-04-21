/**
 * Consolidated workspace tool — projects, tags, folders, execution cleanup.
 */
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Shared fields (single source of truth for fields used across actions) ───

const workflowIdField = z.string().describe('Workflow ID');
const workflowNameField = z
	.string()
	.optional()
	.describe('Workflow name (for confirmation message)');
const projectIdField = z.string().describe('Project ID');
const folderIdField = z.string().describe('Folder ID');
const folderNameField = z.string().optional().describe('Folder name (for confirmation message)');

// ── Action schemas ──────────────────────────────────────────────────────────

const listProjectsAction = z.object({
	action: z.literal('list-projects').describe('List all projects accessible to the current user'),
});

const listTagsAction = z.object({
	action: z.literal('list-tags').describe('List all available tags'),
});

const tagWorkflowAction = z.object({
	action: z
		.literal('tag-workflow')
		.describe('Assign tags to a workflow, creating missing tags automatically'),
	workflowId: workflowIdField,
	workflowName: workflowNameField,
	tags: z.array(z.string()).min(1).describe('Tag names to assign to the workflow'),
});

const cleanupTestExecutionsAction = z.object({
	action: z
		.literal('cleanup-test-executions')
		.describe('Delete manual/test execution records for a workflow'),
	workflowId: workflowIdField,
	workflowName: workflowNameField,
	olderThanHours: z
		.number()
		.optional()
		.describe('Only delete executions older than this many hours. Defaults to 1.'),
});

const listFoldersAction = z.object({
	action: z.literal('list-folders').describe('List folders in a project'),
	projectId: projectIdField,
});

const createFolderAction = z.object({
	action: z.literal('create-folder').describe('Create a new folder in a project'),
	name: z.string().describe('Name for the new folder'),
	projectId: projectIdField,
	parentFolderId: z
		.string()
		.optional()
		.describe('ID of the parent folder for nesting. Omit for root-level folder.'),
});

const deleteFolderAction = z.object({
	action: z.literal('delete-folder').describe('Delete a folder from a project'),
	folderId: folderIdField,
	folderName: folderNameField,
	projectId: projectIdField,
	transferToFolderId: z
		.string()
		.optional()
		.describe(
			'ID of a folder to move contents into before deletion. If omitted, contents are flattened to project root and archived.',
		),
	transferToFolderName: z
		.string()
		.optional()
		.describe('Name of the transfer folder (for confirmation message)'),
});

const moveWorkflowToFolderAction = z.object({
	action: z.literal('move-workflow-to-folder').describe('Move a workflow into a folder'),
	workflowId: workflowIdField,
	workflowName: workflowNameField,
	folderId: folderIdField,
	folderName: folderNameField,
});

// ── Suspend / resume schemas ────────────────────────────────────────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

// ── Input union ─────────────────────────────────────────────────────────────

function buildInputSchema(context: InstanceAiContext) {
	const baseActions = [
		listProjectsAction,
		listTagsAction,
		tagWorkflowAction,
		cleanupTestExecutionsAction,
	] as const;

	if (context.workspaceService?.listFolders) {
		return sanitizeInputSchema(
			z.discriminatedUnion('action', [
				...baseActions,
				listFoldersAction,
				createFolderAction,
				deleteFolderAction,
				moveWorkflowToFolderAction,
			]),
		);
	}

	return sanitizeInputSchema(z.discriminatedUnion('action', [...baseActions]));
}

type Input = z.infer<ReturnType<typeof buildInputSchema>>;

// ── Suspend/resume helpers ──────────────────────────────────────────────────

type ResumeData = z.infer<typeof resumeSchema> | undefined;
type SuspendFn = ((payload: z.infer<typeof suspendSchema>) => Promise<void>) | undefined;

function extractCtx(ctx: { agent?: { resumeData?: unknown; suspend?: unknown } }) {
	return {
		resumeData: ctx?.agent?.resumeData as ResumeData,
		suspend: ctx?.agent?.suspend as SuspendFn,
	};
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleListProjects(context: InstanceAiContext) {
	const projects = await context.workspaceService!.listProjects();
	return { projects };
}

async function handleListTags(context: InstanceAiContext) {
	const tags = await context.workspaceService!.listTags();
	return { tags };
}

async function handleTagWorkflow(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'tag-workflow' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const { resumeData, suspend } = extractCtx(ctx);

	if (context.permissions?.tagWorkflow === 'blocked') {
		return { appliedTags: [], denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.tagWorkflow !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Tag workflow "${input.workflowName ?? input.workflowId}" (ID: ${input.workflowId}) with [${input.tags.join(', ')}]?`,
			severity: 'info' as const,
		});
		// suspend() never resolves — this line is unreachable but satisfies the type checker
		return { appliedTags: [] };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { appliedTags: [], denied: true, reason: 'User denied the action' };
	}

	// State 3: Approved or always_allow — execute
	const appliedTags = await context.workspaceService!.tagWorkflow(input.workflowId, input.tags);
	return { appliedTags };
}

async function handleCleanupTestExecutions(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'cleanup-test-executions' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const { resumeData, suspend } = extractCtx(ctx);

	if (context.permissions?.cleanupTestExecutions === 'blocked') {
		return { deletedCount: 0, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.cleanupTestExecutions !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const hours = input.olderThanHours ?? 1;
		await suspend?.({
			requestId: nanoid(),
			message: `Delete test executions for workflow "${input.workflowName ?? input.workflowId}" older than ${hours} hour(s)?`,
			severity: 'warning' as const,
		});
		return { deletedCount: 0 };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { deletedCount: 0, denied: true, reason: 'User denied the action' };
	}

	// State 3: Approved or always_allow — execute
	const result = await context.workspaceService!.cleanupTestExecutions(input.workflowId, {
		olderThanHours: input.olderThanHours,
	});
	return { deletedCount: result.deletedCount };
}

async function handleListFolders(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'list-folders' }>,
) {
	const folders = await context.workspaceService!.listFolders!(input.projectId);
	return { folders };
}

async function handleCreateFolder(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'create-folder' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const { resumeData, suspend } = extractCtx(ctx);

	if (context.permissions?.createFolder === 'blocked') {
		return {
			id: '',
			name: '',
			parentFolderId: null,
			denied: true,
			reason: 'Action blocked by admin',
		};
	}

	const needsApproval = context.permissions?.createFolder !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Create folder "${input.name}" in project "${input.projectId}"?`,
			severity: 'info' as const,
		});
		// suspend() never resolves — this line is unreachable but satisfies the type checker
		return { id: '', name: '', parentFolderId: null };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return {
			id: '',
			name: '',
			parentFolderId: null,
			denied: true,
			reason: 'User denied the action',
		};
	}

	// State 3: Approved or always_allow — execute
	const folder = await context.workspaceService!.createFolder!(
		input.name,
		input.projectId,
		input.parentFolderId,
	);
	return { ...folder };
}

async function handleDeleteFolder(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'delete-folder' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const { resumeData, suspend } = extractCtx(ctx);

	if (context.permissions?.deleteFolder === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteFolder !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const transferNote = input.transferToFolderId
			? ` Contents will be moved to folder "${input.transferToFolderName ?? input.transferToFolderId}".`
			: ' Contents will be flattened to project root and archived.';
		await suspend?.({
			requestId: nanoid(),
			message: `Delete folder "${input.folderName ?? input.folderId}"?${transferNote}`,
			severity: 'destructive' as const,
		});
		// suspend() never resolves — this line is unreachable but satisfies the type checker
		return { success: false };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	// State 3: Approved or always_allow — execute
	await context.workspaceService!.deleteFolder!(
		input.folderId,
		input.projectId,
		input.transferToFolderId,
	);
	return { success: true };
}

async function handleMoveWorkflowToFolder(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'move-workflow-to-folder' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const { resumeData, suspend } = extractCtx(ctx);

	if (context.permissions?.moveWorkflowToFolder === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.moveWorkflowToFolder !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Move workflow "${input.workflowName ?? input.workflowId}" to folder "${input.folderName ?? input.folderId}"?`,
			severity: 'info' as const,
		});
		// suspend() never resolves — this line is unreachable but satisfies the type checker
		return { success: false };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	// State 3: Approved or always_allow — execute
	await context.workspaceService!.moveWorkflowToFolder!(input.workflowId, input.folderId);
	return { success: true };
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createWorkspaceTool(context: InstanceAiContext) {
	if (!context.workspaceService) {
		return createTool({
			id: 'workspace',
			description: 'Workspace management is not available in this environment.',
			inputSchema: z.object({ action: z.string() }),
			// eslint-disable-next-line @typescript-eslint/require-await -- must be async to match execute signature
			execute: async () => {
				return { error: 'Workspace service is not available in this environment.' };
			},
		});
	}

	const inputSchema = buildInputSchema(context);

	return createTool({
		id: 'workspace',
		description: 'Manage workspace resources — projects, tags, folders, and execution cleanup.',
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx) => {
			switch (input.action) {
				case 'list-projects':
					return await handleListProjects(context);
				case 'list-tags':
					return await handleListTags(context);
				case 'tag-workflow':
					return await handleTagWorkflow(context, input, ctx);
				case 'cleanup-test-executions':
					return await handleCleanupTestExecutions(context, input, ctx);
				case 'list-folders':
					return await handleListFolders(context, input);
				case 'create-folder':
					return await handleCreateFolder(context, input, ctx);
				case 'delete-folder':
					return await handleDeleteFolder(context, input, ctx);
				case 'move-workflow-to-folder':
					return await handleMoveWorkflowToFolder(context, input, ctx);
			}
		},
	});
}
