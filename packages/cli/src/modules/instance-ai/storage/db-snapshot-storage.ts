import type { InstanceAiAgentNode } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { AgentTreeSnapshot } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiRunSnapshotRepository } from '../repositories/instance-ai-run-snapshot.repository';

export interface SaveSnapshotOptions {
	messageGroupId?: string;
	runIds?: string[];
	langsmithRunId?: string;
	langsmithTraceId?: string;
}

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
			langsmithRunId: row.langsmithRunId ?? undefined,
			langsmithTraceId: row.langsmithTraceId ?? undefined,
		};
	}

	async save(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		options: SaveSnapshotOptions = {},
	): Promise<void> {
		const { messageGroupId, runIds, langsmithRunId, langsmithTraceId } = options;
		await this.repo.upsert(
			{
				threadId,
				runId,
				messageGroupId: messageGroupId ?? null,
				runIds: runIds ?? null,
				tree: JSON.stringify(agentTree),
				langsmithRunId: langsmithRunId ?? null,
				langsmithTraceId: langsmithTraceId ?? null,
			},
			['threadId', 'runId'],
		);
	}

	async updateLast(
		threadId: string,
		agentTree: InstanceAiAgentNode,
		runId: string,
		options: SaveSnapshotOptions = {},
	): Promise<void> {
		const { messageGroupId, runIds, langsmithRunId, langsmithTraceId } = options;

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
						// Preserve existing LangSmith IDs if caller didn't provide new ones.
						langsmithRunId: langsmithRunId ?? existing.langsmithRunId,
						langsmithTraceId: langsmithTraceId ?? existing.langsmithTraceId,
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
					langsmithRunId: langsmithRunId ?? byRunId.langsmithRunId,
					langsmithTraceId: langsmithTraceId ?? byRunId.langsmithTraceId,
				},
			);
			return;
		}

		// No existing row — insert
		await this.save(threadId, agentTree, runId, options);
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
			langsmithRunId: r.langsmithRunId ?? undefined,
			langsmithTraceId: r.langsmithTraceId ?? undefined,
		}));
	}

	/**
	 * Resolve the LangSmith root-run anchor for a given responseId
	 * (UI sends `messageGroupId ?? runId`). Prefers the earliest snapshot row
	 * in a message group so feedback attaches to the `message_turn` root run.
	 */
	async findLangsmithAnchor(
		threadId: string,
		responseId: string,
	): Promise<{ langsmithRunId: string; langsmithTraceId: string } | undefined> {
		const byGroup = await this.repo.findOne({
			where: { threadId, messageGroupId: responseId },
			order: { createdAt: 'ASC' },
		});
		const row = byGroup ?? (await this.repo.findOneBy({ threadId, runId: responseId }));
		if (!row?.langsmithRunId || !row.langsmithTraceId) return undefined;
		return { langsmithRunId: row.langsmithRunId, langsmithTraceId: row.langsmithTraceId };
	}
}
