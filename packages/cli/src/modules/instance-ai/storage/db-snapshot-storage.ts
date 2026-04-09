import type { InstanceAiAgentNode } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { AgentTreeSnapshot } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiRunSnapshotRepository } from '../repositories/instance-ai-run-snapshot.repository';

@Service()
export class DbSnapshotStorage {
	constructor(private readonly repo: InstanceAiRunSnapshotRepository) {}

	async getLatest(
		threadId: string,
		options: { messageGroupId?: string; runId?: string } = {},
	): Promise<AgentTreeSnapshot | undefined> {
		const { messageGroupId, runId } = options;

		const row = messageGroupId
			? await this.repo.findOne({
					where: { threadId, messageGroupId },
					order: { createdAt: 'DESC' },
				})
			: runId
				? await this.repo.findOne({
						where: { threadId, runId },
						order: { createdAt: 'DESC' },
					})
				: await this.repo.findOne({
						where: { threadId },
						order: { createdAt: 'DESC' },
					});

		if (!row) return undefined;

		return {
			tree: jsonParse<InstanceAiAgentNode>(row.tree),
			runId: row.runId,
			messageGroupId: row.messageGroupId ?? undefined,
			runIds: row.runIds ?? undefined,
		};
	}

	async save(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		await this.repo.upsert(
			{
				threadId,
				runId,
				messageGroupId: messageGroupId ?? null,
				runIds: runIds ?? null,
				tree: JSON.stringify(agentTree),
			},
			['threadId', 'runId'],
		);
	}

	async updateLast(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		messageGroupId?: string,
		runIds?: string[],
	): Promise<void> {
		// Prefer lookup by messageGroupId when available
		if (messageGroupId) {
			const existing = await this.repo.findOne({
				where: { threadId, messageGroupId },
				order: { createdAt: 'DESC' },
			});
			if (existing) {
				await this.repo.update(
					{ threadId: existing.threadId, runId: existing.runId },
					{
						runId,
						tree: JSON.stringify(agentTree),
						messageGroupId,
						runIds: runIds ?? existing.runIds,
					},
				);
				return;
			}
		}

		// Fall back to runId lookup
		const byRunId = await this.repo.findOneBy({ threadId, runId });
		if (byRunId) {
			await this.repo.update(
				{ threadId, runId },
				{
					tree: JSON.stringify(agentTree),
					messageGroupId: messageGroupId ?? byRunId.messageGroupId,
					runIds: runIds ?? byRunId.runIds,
				},
			);
			return;
		}

		// No existing row — insert
		await this.save(threadId, agentTree, runId, messageGroupId, runIds);
	}

	async getAll(threadId: string): Promise<AgentTreeSnapshot[]> {
		const rows = await this.repo.find({
			where: { threadId },
			order: { createdAt: 'ASC' },
		});
		return rows.map((r) => ({
			tree: jsonParse<InstanceAiAgentNode>(r.tree),
			runId: r.runId,
			messageGroupId: r.messageGroupId ?? undefined,
			runIds: r.runIds ?? undefined,
		}));
	}
}
