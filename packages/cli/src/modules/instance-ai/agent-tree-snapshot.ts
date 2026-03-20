import type { InstanceAiAgentNode } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { InstanceAiRunSnapshotRepository } from './repositories/instance-ai-run-snapshot.repository';

/** Snapshot value stored durably for historical message restore. */
export interface AgentTreeSnapshot {
	tree: InstanceAiAgentNode;
	runId: string;
	messageGroupId?: string;
	runIds?: string[];
}

export class AgentTreeSnapshotStorage {
	constructor(private readonly snapshotRepo: InstanceAiRunSnapshotRepository) {}

	async save(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		const entity = this.snapshotRepo.create({
			id: `snap_${nanoid(10)}`,
			threadId,
			runId,
			messageGroupId: messageGroupId ?? null,
			tree: agentTree,
			runIds: runIds ?? null,
		});
		await this.snapshotRepo.save(entity);
	}

	async updateLast(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		const snapshots = await this.snapshotRepo.find({
			where: { threadId },
			order: { createdAt: 'DESC' },
		});

		const match = snapshots.find((snapshot) =>
			messageGroupId
				? snapshot.messageGroupId === messageGroupId
				: snapshot.runId === runId,
		);

		if (!match) {
			await this.save(threadId, agentTree, runId, messageGroupId, runIds);
			return;
		}

		match.tree = agentTree;
		match.runId = runId;
		match.messageGroupId = messageGroupId ?? match.messageGroupId;
		match.runIds = runIds ?? match.runIds;
		await this.snapshotRepo.save(match);
	}

	async getAll(threadId: string): Promise<AgentTreeSnapshot[]> {
		const snapshots = await this.snapshotRepo.find({
			where: { threadId },
			order: { createdAt: 'ASC' },
		});

		return snapshots.map((snapshot) => ({
			tree: snapshot.tree,
			runId: snapshot.runId,
			...(snapshot.messageGroupId ? { messageGroupId: snapshot.messageGroupId } : {}),
			...(snapshot.runIds ? { runIds: snapshot.runIds } : {}),
		}));
	}
}
