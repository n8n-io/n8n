import type { Memory } from '@mastra/memory';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { instanceAiAgentNodeSchema } from '@n8n/api-types';
import { z } from 'zod';

import { patchThread } from './thread-patch';

const SNAPSHOTS_KEY = 'instanceAiRunSnapshots';

export interface AgentTreeSnapshot {
	tree: InstanceAiAgentNode;
	runId: string;
	messageGroupId?: string;
	runIds?: string[];
}

const agentTreeSnapshotSchema = z.object({
	tree: instanceAiAgentNodeSchema,
	runId: z.string(),
	messageGroupId: z.string().optional(),
	runIds: z.array(z.string()).optional(),
});

const snapshotsArraySchema = z.array(agentTreeSnapshotSchema);

function parseSnapshots(raw: unknown): AgentTreeSnapshot[] {
	const result = snapshotsArraySchema.safeParse(raw);
	if (!result.success) return [];
	return result.data;
}

function findLastSnapshotIndex(
	snapshots: AgentTreeSnapshot[],
	predicate: (snapshot: AgentTreeSnapshot) => boolean,
): number {
	for (let i = snapshots.length - 1; i >= 0; i--) {
		if (predicate(snapshots[i])) return i;
	}
	return -1;
}

export class AgentTreeSnapshotStorage {
	constructor(private readonly memory: Memory) {}

	async save(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const existing = parseSnapshots(metadata[SNAPSHOTS_KEY]);
				const snapshot: AgentTreeSnapshot = { tree: agentTree, runId, messageGroupId, runIds };
				return {
					metadata: {
						...metadata,
						[SNAPSHOTS_KEY]: [...existing, snapshot],
					},
				};
			},
		});
	}

	async updateLast(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const existing = parseSnapshots(metadata[SNAPSHOTS_KEY]);
				let index = messageGroupId
					? findLastSnapshotIndex(
							existing,
							(snapshot) => snapshot.messageGroupId === messageGroupId,
						)
					: -1;
				if (index < 0) {
					index = findLastSnapshotIndex(existing, (snapshot) => snapshot.runId === runId);
				}

				if (index >= 0) {
					existing[index] = {
						tree: agentTree,
						runId,
						messageGroupId: messageGroupId ?? existing[index].messageGroupId,
						runIds: runIds ?? existing[index].runIds,
					};
				} else {
					existing.push({ tree: agentTree, runId, messageGroupId, runIds });
				}

				return {
					metadata: {
						...metadata,
						[SNAPSHOTS_KEY]: existing,
					},
				};
			},
		});
	}

	async getAll(threadId: string): Promise<AgentTreeSnapshot[]> {
		const thread = await this.memory.getThreadById({ threadId });
		return parseSnapshots(thread?.metadata?.[SNAPSHOTS_KEY]);
	}
}
