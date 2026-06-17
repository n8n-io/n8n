import { Tool } from '@n8n/agents';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import { z } from 'zod';

import {
	createWorkflowSourceHeader,
	getWorkflowSourceArtifactStore,
	requireWorkflowSourceWorkspace,
	writeWorkflowSourceFile,
	writeWorkflowSourceMetadataFile,
} from './workflow-source-artifacts';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import {
	createWorkflowSourceFilePath,
	createWorkflowSourceMetadataPath,
	createWorkflowSourceRef,
	hashWorkflowSource,
} from '../../storage';
import type { InstanceAiContext } from '../../types';
import type { WorkflowSourceArtifact } from '../../workflow-loop/workflow-loop-state';
import { readWorkspaceFile } from '../../workspace/workspace-files';

const workflowSourceActionSchema = z.discriminatedUnion('action', [
	z
		.object({
			action: z.literal('create'),
			workItemId: z
				.string()
				.optional()
				.describe('Optional stable work item key. Omit for new direct builds.'),
			taskId: z.string().optional(),
			workflowName: z.string().optional(),
			isSupportingWorkflow: z.boolean().optional(),
		})
		.strict(),
	z
		.object({
			action: z.literal('hydrate-from-workflow'),
			workflowId: z.string(),
			workItemId: z.string(),
			taskId: z.string().optional(),
		})
		.strict(),
	z
		.object({
			action: z.literal('get'),
			sourceRef: z.string(),
		})
		.strict(),
]);

export const workflowSourceInputSchema = sanitizeInputSchema(workflowSourceActionSchema);

const workflowSourceOutputSchema = z.object({
	success: z.boolean(),
	sourceRef: z.string().optional(),
	filePath: z.string().optional(),
	metadataFilePath: z.string().optional(),
	sourceHash: z.string().optional(),
	workflowId: z.string().optional(),
	workflowName: z.string().optional(),
	errors: z.array(z.string()).optional(),
});

type WorkflowSourceInput = z.infer<typeof workflowSourceActionSchema>;
type CreateWorkflowSourceInput = Extract<WorkflowSourceInput, { action: 'create' }>;

function getThreadId(context: InstanceAiContext): string {
	return context.workflowBuildContext?.threadId ?? `direct-${context.userId}`;
}

function getRunId(context: InstanceAiContext): string | undefined {
	return context.workflowBuildContext?.runId ?? context.runId;
}

function createOutput(artifact: WorkflowSourceArtifact) {
	return {
		success: true,
		sourceRef: artifact.sourceRef,
		filePath: artifact.filePath,
		metadataFilePath: createWorkflowSourceMetadataPath(artifact.filePath),
		sourceHash: artifact.sourceHash,
		workflowId: artifact.workflowId,
		workflowName: artifact.workflowName,
	};
}

function firstNonEmptyString(...values: Array<string | undefined>): string | undefined {
	return values.find((value) => value !== undefined && value.trim() !== '')?.trim();
}

function resolveCreateWorkItemId(
	context: InstanceAiContext,
	input: CreateWorkflowSourceInput,
): string {
	const workItemId = firstNonEmptyString(
		input.workItemId,
		context.workflowBuildContext?.workItemId,
		input.taskId,
		context.workflowBuildContext?.taskId,
		context.runId,
		input.workflowName,
	);

	if (!workItemId) {
		throw new Error(
			'workflow-source create requires a workItemId, taskId, workflowName, runId, or workflow build context.',
		);
	}

	return workItemId;
}

function createArtifact(
	context: InstanceAiContext,
	input: {
		workItemId: string;
		taskId?: string;
		workflowId?: string;
		workflowName?: string;
		workflowVersionId?: string;
		isSupportingWorkflow?: boolean;
		sourceHash?: string;
	},
): WorkflowSourceArtifact {
	const now = new Date().toISOString();
	const taskId = input.taskId ?? context.workflowBuildContext?.taskId;

	return {
		sourceRef: createWorkflowSourceRef(input.workItemId),
		threadId: getThreadId(context),
		runId: getRunId(context),
		workItemId: input.workItemId,
		taskId,
		workflowId: input.workflowId,
		workflowName: input.workflowName,
		filePath: createWorkflowSourceFilePath({
			workItemId: input.workItemId,
			taskId,
			isSupportingWorkflow: input.isSupportingWorkflow,
		}),
		sourceHash: input.sourceHash ?? hashWorkflowSource(''),
		workflowVersionId: input.workflowVersionId,
		createdAt: now,
		updatedAt: now,
	};
}

async function ensureCreatedSourceFile(
	context: InstanceAiContext,
	artifact: WorkflowSourceArtifact,
): Promise<WorkflowSourceArtifact> {
	const workspace = requireWorkflowSourceWorkspace(context);
	const existing = await readWorkspaceFile(workspace, artifact.filePath, {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
	});

	if (existing !== null) {
		return {
			...artifact,
			sourceHash: hashWorkflowSource(existing),
			updatedAt: new Date().toISOString(),
		};
	}

	const source = createWorkflowSourceHeader(artifact);
	const sourceHash = await writeWorkflowSourceFile(context, artifact.filePath, source);
	return {
		...artifact,
		sourceHash,
		updatedAt: new Date().toISOString(),
	};
}

async function handleCreate(context: InstanceAiContext, input: CreateWorkflowSourceInput) {
	const store = getWorkflowSourceArtifactStore(context);
	const workItemId = resolveCreateWorkItemId(context, input);
	const existing = await store.getByWorkItemId(workItemId);
	const artifact = await ensureCreatedSourceFile(
		context,
		existing ??
			createArtifact(context, {
				...input,
				workItemId,
			}),
	);

	await store.upsert(artifact);
	await writeWorkflowSourceMetadataFile(context, artifact);
	return createOutput(artifact);
}

async function handleHydrateFromWorkflow(
	context: InstanceAiContext,
	input: Extract<WorkflowSourceInput, { action: 'hydrate-from-workflow' }>,
) {
	const store = getWorkflowSourceArtifactStore(context);
	const snapshot = await context.workflowService.getWorkflowSnapshot(input.workflowId);
	const workflowName = snapshot.json.name || 'workflow';
	const existing = await store.getByWorkItemId(input.workItemId);
	const artifact = {
		...(existing ??
			createArtifact(context, {
				workItemId: input.workItemId,
				taskId: input.taskId,
				workflowId: input.workflowId,
				workflowName,
				workflowVersionId: snapshot.versionId,
			})),
		workflowId: input.workflowId,
		workflowName,
		workflowVersionId: snapshot.versionId,
		updatedAt: new Date().toISOString(),
	};
	const source = `${createWorkflowSourceHeader(artifact)}${generateWorkflowCode(snapshot.json)}`;
	const sourceHash = await writeWorkflowSourceFile(context, artifact.filePath, source);
	const hydrated = {
		...artifact,
		sourceHash,
	};

	await store.upsert(hydrated);
	await writeWorkflowSourceMetadataFile(context, hydrated);
	return createOutput(hydrated);
}

async function handleGet(
	context: InstanceAiContext,
	input: Extract<WorkflowSourceInput, { action: 'get' }>,
) {
	const store = getWorkflowSourceArtifactStore(context);
	const artifact = await store.getBySourceRef(input.sourceRef);
	if (!artifact) {
		return { success: false, errors: [`Unknown workflow sourceRef: ${input.sourceRef}`] };
	}

	const workspace = requireWorkflowSourceWorkspace(context);
	const source = await readWorkspaceFile(workspace, artifact.filePath, {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
	});
	if (source === null) {
		return {
			success: false,
			sourceRef: artifact.sourceRef,
			filePath: artifact.filePath,
			errors: [`Workflow source file not found: ${artifact.filePath}`],
		};
	}

	const updated = {
		...artifact,
		sourceHash: hashWorkflowSource(source),
		updatedAt: new Date().toISOString(),
	};
	await store.upsert(updated);
	await writeWorkflowSourceMetadataFile(context, updated);
	return createOutput(updated);
}

export function createWorkflowSourceTool(context: InstanceAiContext) {
	return new Tool('workflow-source')
		.description(
			'Create, hydrate, or inspect a file-backed workflow source artifact. ' +
				'Use this before build-workflow; edit the returned filePath with workspace file tools.',
		)
		.input(workflowSourceInputSchema)
		.output(workflowSourceOutputSchema)
		.handler(async (input) => {
			const parsed = workflowSourceActionSchema.safeParse(input);
			if (!parsed.success) {
				return {
					success: false,
					errors: parsed.error.issues.map((issue) => issue.message),
				};
			}

			const actionInput = parsed.data;

			try {
				switch (actionInput.action) {
					case 'create':
						return await handleCreate(context, actionInput);
					case 'hydrate-from-workflow':
						return await handleHydrateFromWorkflow(context, actionInput);
					case 'get':
						return await handleGet(context, actionInput);
				}
			} catch (error) {
				return {
					success: false,
					errors: [error instanceof Error ? error.message : String(error)],
				};
			}
		})
		.build();
}
