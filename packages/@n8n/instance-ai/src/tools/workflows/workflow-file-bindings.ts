import { createHash } from 'node:crypto';
import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';
import { readWorkspaceFile } from '../../workspace/workspace-files';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';

const METADATA_KEY = 'instanceAiWorkflowSourceFiles';

const workflowSourceFileBindingSchema = z.object({
	filePath: z.string(),
	workflowId: z.string().optional(),
	workflowVersionId: z.string().optional(),
	workflowChecksum: z.string().optional(),
	sourceHash: z.string().optional(),
});

const workflowSourceFileBindingsSchema = z.record(z.string(), workflowSourceFileBindingSchema);

export type WorkflowSourceFileBinding = z.infer<typeof workflowSourceFileBindingSchema>;

const fallbackBindings = new WeakMap<InstanceAiContext, Map<string, WorkflowSourceFileBinding>>();

export function hashWorkflowSource(source: string): string {
	return createHash('sha256').update(source).digest('hex');
}

export function normalizeWorkflowSourceFilePath(filePath: string): string {
	return normalizeWorkspaceRelativePath(filePath, { resourceLabel: 'Workflow source file' });
}

function parseBindings(raw: unknown): Record<string, WorkflowSourceFileBinding> {
	const parsed = workflowSourceFileBindingsSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

function getFallbackBindings(context: InstanceAiContext): Map<string, WorkflowSourceFileBinding> {
	let bindings = fallbackBindings.get(context);
	if (!bindings) {
		bindings = new Map();
		fallbackBindings.set(context, bindings);
	}

	return bindings;
}

async function readThreadBindings(
	context: InstanceAiContext,
): Promise<Record<string, WorkflowSourceFileBinding> | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return parseBindings(thread?.metadata?.[METADATA_KEY]);
	} catch (error) {
		context.logger?.debug('Failed to read workflow source file bindings from thread metadata', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

export async function getWorkflowSourceFileBinding(
	context: InstanceAiContext,
	filePath: string,
): Promise<WorkflowSourceFileBinding | undefined> {
	const normalizedFilePath = normalizeWorkflowSourceFilePath(filePath);
	const threadBindings = await readThreadBindings(context);
	if (threadBindings) {
		return (
			threadBindings[normalizedFilePath] ?? getFallbackBindings(context).get(normalizedFilePath)
		);
	}

	return getFallbackBindings(context).get(normalizedFilePath);
}

export async function saveWorkflowSourceFileBinding(
	context: InstanceAiContext,
	binding: WorkflowSourceFileBinding,
): Promise<WorkflowSourceFileBinding> {
	const normalizedBinding = {
		...binding,
		filePath: normalizeWorkflowSourceFilePath(binding.filePath),
	};

	if (context.threadMemory && context.threadId) {
		try {
			const updatedThread = await patchThread(context.threadMemory, {
				threadId: context.threadId,
				update: ({ metadata = {} }) => {
					const bindings = parseBindings(metadata[METADATA_KEY]);
					bindings[normalizedBinding.filePath] = normalizedBinding;
					return { metadata: { ...metadata, [METADATA_KEY]: bindings } };
				},
			});
			if (updatedThread) return normalizedBinding;
		} catch (error) {
			context.logger?.warn('Failed to persist workflow source file binding to thread metadata', {
				filePath: normalizedBinding.filePath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	getFallbackBindings(context).set(normalizedBinding.filePath, normalizedBinding);
	return normalizedBinding;
}

/** Bind a source file to an existing workflow, seeding version/checksum for stale-save detection. */
export async function bindSourceFileToExistingWorkflow(
	context: InstanceAiContext,
	binding: WorkflowSourceFileBinding,
	workflowId: string,
): Promise<WorkflowSourceFileBinding> {
	const workflow = await context.workflowService.get(workflowId);
	return await saveWorkflowSourceFileBinding(context, {
		...binding,
		workflowId,
		workflowVersionId: workflow.versionId,
		...(workflow.checksum ? { workflowChecksum: workflow.checksum } : {}),
	});
}

/** Refresh binding checksum/version from the workflow's current DB state. */
export async function refreshWorkflowSourceFileBindingFromWorkflow(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	const workflow = await context.workflowService.get(workflowId);
	await refreshWorkflowSourceFileBindingFromSave(context, workflowId, {
		versionId: workflow.versionId,
		checksum: workflow.checksum,
	});
}

/** Refresh the binding checksum/version after an agent-side DB patch outside build-workflow. */
export async function refreshWorkflowSourceFileBindingFromSave(
	context: InstanceAiContext,
	workflowId: string,
	saved: { versionId: string; checksum?: string },
): Promise<void> {
	const threadBindings = await readThreadBindings(context);
	const fallback = getFallbackBindings(context);
	const entries: WorkflowSourceFileBinding[] = [];

	if (threadBindings) {
		for (const binding of Object.values(threadBindings)) {
			if (binding.workflowId === workflowId) entries.push(binding);
		}
	}
	for (const binding of fallback.values()) {
		if (
			binding.workflowId === workflowId &&
			!entries.some((e) => e.filePath === binding.filePath)
		) {
			entries.push(binding);
		}
	}

	for (const binding of entries) {
		const nextBinding: WorkflowSourceFileBinding = {
			...binding,
			workflowVersionId: saved.versionId,
		};
		if (saved.checksum !== undefined) {
			nextBinding.workflowChecksum = saved.checksum;
		} else {
			delete nextBinding.workflowChecksum;
		}
		await saveWorkflowSourceFileBinding(context, nextBinding);
	}
}

export async function readWorkflowSourceFile(
	context: InstanceAiContext,
	filePath: string,
): Promise<{ source: string; sourceHash: string }> {
	if (!context.workspace) {
		throw new Error('Runtime workspace is required for workflow source files.');
	}

	const normalizedFilePath = normalizeWorkflowSourceFilePath(filePath);
	const source = await readWorkspaceFile(context.workspace, normalizedFilePath, {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
	});

	if (source === null) {
		throw new Error(`Workflow source file not found: ${normalizedFilePath}`);
	}

	return { source, sourceHash: hashWorkflowSource(source) };
}
