import type { Workspace } from '@n8n/agents';

import {
	InMemoryWorkflowSourceArtifactStore,
	createWorkflowSourceMetadataPath,
	hashWorkflowSource,
} from '../../storage';
import type { InstanceAiContext, WorkflowSourceArtifactStore } from '../../types';
import type { WorkflowSourceArtifact } from '../../workflow-loop/workflow-loop-state';
import { readWorkspaceFile, writeWorkspaceFile } from '../../workspace/workspace-files';

const fallbackStores = new WeakMap<InstanceAiContext, WorkflowSourceArtifactStore>();

export function getWorkflowSourceArtifactStore(
	context: InstanceAiContext,
): WorkflowSourceArtifactStore {
	if (context.workflowSourceArtifactStore) return context.workflowSourceArtifactStore;

	let store = fallbackStores.get(context);
	if (!store) {
		store = new InMemoryWorkflowSourceArtifactStore();
		fallbackStores.set(context, store);
	}
	context.workflowSourceArtifactStore = store;
	return store;
}

export function requireWorkflowSourceWorkspace(context: InstanceAiContext): Workspace {
	if (!context.workspace) {
		throw new Error('Runtime workspace is required for workflow source files.');
	}

	return context.workspace;
}

export async function readWorkflowSourceFile(
	context: InstanceAiContext,
	artifact: WorkflowSourceArtifact,
): Promise<{ source: string; sourceHash: string }> {
	const workspace = requireWorkflowSourceWorkspace(context);
	const source = await readWorkspaceFile(workspace, artifact.filePath, {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
	});

	if (source === null) {
		throw new Error(`Workflow source file not found: ${artifact.filePath}`);
	}

	return { source, sourceHash: hashWorkflowSource(source) };
}

export async function writeWorkflowSourceFile(
	context: InstanceAiContext,
	filePath: string,
	source: string,
): Promise<string> {
	const workspace = requireWorkflowSourceWorkspace(context);
	await writeWorkspaceFile(workspace, filePath, source, {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
	});
	return hashWorkflowSource(source);
}

export async function writeWorkflowSourceMetadataFile(
	context: InstanceAiContext,
	artifact: WorkflowSourceArtifact,
): Promise<void> {
	const workspace = requireWorkflowSourceWorkspace(context);
	await writeWorkspaceFile(
		workspace,
		createWorkflowSourceMetadataPath(artifact.filePath),
		`${JSON.stringify(artifact, null, 2)}\n`,
		{
			logger: context.logger,
			resourceLabel: 'Workflow source metadata file',
		},
	);
}

export function createWorkflowSourceHeader(artifact: WorkflowSourceArtifact): string {
	const lines = [
		'// Instance AI workflow source',
		`// sourceRef: ${artifact.sourceRef}`,
		`// workItemId: ${artifact.workItemId}`,
	];

	if (artifact.taskId) lines.push(`// taskId: ${artifact.taskId}`);
	if (artifact.workflowId) lines.push(`// workflowId: ${artifact.workflowId}`);
	if (artifact.workflowName) lines.push(`// workflowName: ${artifact.workflowName}`);

	return `${lines.join('\n')}\n\n`;
}
