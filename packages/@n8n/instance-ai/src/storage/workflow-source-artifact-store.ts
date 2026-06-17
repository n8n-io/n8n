import { createHash } from 'node:crypto';
import { z } from 'zod';

import { getThread, patchThread, type PatchableThreadMemory } from './thread-patch';
import type { WorkflowSourceArtifactStore } from '../types';
import {
	type WorkflowSourceArtifact,
	workflowSourceArtifactSchema,
} from '../workflow-loop/workflow-loop-state';

const METADATA_KEY = 'instanceAiWorkflowSources';

const sourceStorageSchema = z.record(z.string(), workflowSourceArtifactSchema);

function safePathSegment(value: string): string {
	const segment = value
		.trim()
		.replace(/[^A-Za-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return segment || 'workflow';
}

function shortHash(value: string): string {
	return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

export function hashWorkflowSource(source: string): string {
	return createHash('sha256').update(source).digest('hex');
}

export function createWorkflowSourceRef(workItemId: string): string {
	return `wfsrc_${safePathSegment(workItemId)}_${shortHash(workItemId)}`;
}

export function createWorkflowSourceFilePath(input: {
	workItemId: string;
	taskId?: string;
	isSupportingWorkflow?: boolean;
}): string {
	const workItemSegment = safePathSegment(input.workItemId);

	if (input.taskId) {
		const taskSegment = safePathSegment(input.taskId);
		const fileName =
			input.isSupportingWorkflow === true
				? `supporting-${workItemSegment}.workflow.ts`
				: 'main.workflow.ts';
		return `src/workflows/${taskSegment}/${fileName}`;
	}

	return `src/workflows/${workItemSegment}.workflow.ts`;
}

export function createWorkflowSourceMetadataPath(filePath: string): string {
	if (filePath.endsWith('.workflow.ts')) {
		return filePath.slice(0, -'.workflow.ts'.length) + '.metadata.json';
	}

	return `${filePath}.metadata.json`;
}

export class InMemoryWorkflowSourceArtifactStore implements WorkflowSourceArtifactStore {
	private readonly artifacts = new Map<string, WorkflowSourceArtifact>();

	async getBySourceRef(sourceRef: string): Promise<WorkflowSourceArtifact | undefined> {
		return await Promise.resolve(this.artifacts.get(sourceRef));
	}

	async getByWorkItemId(workItemId: string): Promise<WorkflowSourceArtifact | undefined> {
		return await Promise.resolve(
			Array.from(this.artifacts.values()).find((artifact) => artifact.workItemId === workItemId),
		);
	}

	async upsert(artifact: WorkflowSourceArtifact): Promise<void> {
		this.artifacts.set(artifact.sourceRef, artifact);
		await Promise.resolve();
	}

	async updateAfterSave(input: {
		sourceRef: string;
		workflowId: string;
		workflowVersionId: string;
		sourceHash: string;
		workflowName?: string;
	}): Promise<WorkflowSourceArtifact | undefined> {
		const artifact = this.artifacts.get(input.sourceRef);
		if (!artifact) return await Promise.resolve(undefined);

		const updated = updateArtifactAfterSave(artifact, input);
		this.artifacts.set(input.sourceRef, updated);
		return await Promise.resolve(updated);
	}

	async markFailed(input: {
		sourceRef: string;
		sourceHash: string;
		workflowName?: string;
	}): Promise<WorkflowSourceArtifact | undefined> {
		const artifact = this.artifacts.get(input.sourceRef);
		if (!artifact) return await Promise.resolve(undefined);

		const updated = updateArtifactAfterFailure(artifact, input);
		this.artifacts.set(input.sourceRef, updated);
		return await Promise.resolve(updated);
	}
}

export class ThreadWorkflowSourceArtifactStore implements WorkflowSourceArtifactStore {
	constructor(
		private readonly memory: PatchableThreadMemory,
		private readonly threadId: string,
	) {}

	async getBySourceRef(sourceRef: string): Promise<WorkflowSourceArtifact | undefined> {
		const all = await this.loadAll();
		return all[sourceRef];
	}

	async getByWorkItemId(workItemId: string): Promise<WorkflowSourceArtifact | undefined> {
		const all = await this.loadAll();
		return Object.values(all).find((artifact) => artifact.workItemId === workItemId);
	}

	async upsert(artifact: WorkflowSourceArtifact): Promise<void> {
		await patchThread(this.memory, {
			threadId: this.threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				all[artifact.sourceRef] = artifact;
				return { metadata: { ...metadata, [METADATA_KEY]: all } };
			},
		});
	}

	async updateAfterSave(input: {
		sourceRef: string;
		workflowId: string;
		workflowVersionId: string;
		sourceHash: string;
		workflowName?: string;
	}): Promise<WorkflowSourceArtifact | undefined> {
		let updated: WorkflowSourceArtifact | undefined;
		await patchThread(this.memory, {
			threadId: this.threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				const artifact = all[input.sourceRef];
				if (!artifact) return null;

				updated = updateArtifactAfterSave(artifact, input);
				all[input.sourceRef] = updated;
				return { metadata: { ...metadata, [METADATA_KEY]: all } };
			},
		});

		return updated;
	}

	async markFailed(input: {
		sourceRef: string;
		sourceHash: string;
		workflowName?: string;
	}): Promise<WorkflowSourceArtifact | undefined> {
		let updated: WorkflowSourceArtifact | undefined;
		await patchThread(this.memory, {
			threadId: this.threadId,
			update: ({ metadata = {} }) => {
				const all = this.parse(metadata[METADATA_KEY]);
				const artifact = all[input.sourceRef];
				if (!artifact) return null;

				updated = updateArtifactAfterFailure(artifact, input);
				all[input.sourceRef] = updated;
				return { metadata: { ...metadata, [METADATA_KEY]: all } };
			},
		});

		return updated;
	}

	private async loadAll(): Promise<Record<string, WorkflowSourceArtifact>> {
		const thread = await getThread(this.memory, this.threadId);
		if (!thread?.metadata?.[METADATA_KEY]) return {};
		return this.parse(thread.metadata[METADATA_KEY]);
	}

	private parse(raw: unknown): Record<string, WorkflowSourceArtifact> {
		const result = sourceStorageSchema.safeParse(raw);
		return result.success ? result.data : {};
	}
}

function updateArtifactAfterSave(
	artifact: WorkflowSourceArtifact,
	input: {
		workflowId: string;
		workflowVersionId: string;
		sourceHash: string;
		workflowName?: string;
	},
): WorkflowSourceArtifact {
	const now = new Date().toISOString();
	return {
		...artifact,
		workflowId: input.workflowId,
		workflowName: input.workflowName ?? artifact.workflowName,
		sourceHash: input.sourceHash,
		workflowVersionId: input.workflowVersionId,
		lastSuccessfulBuildAt: now,
		updatedAt: now,
	};
}

function updateArtifactAfterFailure(
	artifact: WorkflowSourceArtifact,
	input: {
		sourceHash: string;
		workflowName?: string;
	},
): WorkflowSourceArtifact {
	const now = new Date().toISOString();
	return {
		...artifact,
		workflowName: input.workflowName ?? artifact.workflowName,
		sourceHash: input.sourceHash,
		lastFailedBuildAt: now,
		updatedAt: now,
	};
}
