import { Service } from '@n8n/di';
import type { CheckpointStore, SerializableAgentState } from '@n8n/instance-ai';
import { LessThan, type EntityManager } from '@n8n/typeorm';
import { UnexpectedError, jsonParse } from 'n8n-workflow';

import { InstanceAiCheckpoint } from '../entities/instance-ai-checkpoint.entity';
import { InstanceAiCheckpointRepository } from '../repositories/instance-ai-checkpoint.repository';

function isSerializableAgentState(value: unknown): value is SerializableAgentState {
	return (
		typeof value === 'object' &&
		value !== null &&
		'status' in value &&
		'messageList' in value &&
		'pendingToolCalls' in value
	);
}

function parseState(entity: InstanceAiCheckpoint): SerializableAgentState {
	const parsed: unknown = jsonParse(entity.state);
	if (!isSerializableAgentState(parsed)) {
		throw new UnexpectedError('Invalid Instance AI checkpoint state', {
			extra: { key: entity.key },
		});
	}
	return parsed;
}

@Service()
export class TypeORMAgentCheckpointStore implements CheckpointStore {
	private readonly loadQueues = new Map<string, Promise<SerializableAgentState | undefined>>();

	constructor(private readonly checkpointRepo: InstanceAiCheckpointRepository) {}

	async save(key: string, state: SerializableAgentState): Promise<void> {
		const threadId = state.persistence?.threadId;
		if (!threadId) {
			throw new UnexpectedError('Instance AI checkpoint state is missing a thread id', {
				extra: { key },
			});
		}

		const checkpoint = this.checkpointRepo.create({
			key,
			runId: this.getRunId(key),
			threadId,
			resourceId: state.persistence?.resourceId ?? null,
			state: JSON.stringify(state),
		});

		await this.checkpointRepo.save(checkpoint);
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		return await this.serializeLoad(key, async () => await this.loadAndDelete(key));
	}

	async delete(key: string): Promise<void> {
		await this.checkpointRepo.delete({ key });
	}

	async deleteOlderThan(olderThan: Date): Promise<number> {
		const result = await this.checkpointRepo.delete({ updatedAt: LessThan(olderThan) });
		return result.affected ?? 0;
	}

	private async loadAndDelete(key: string): Promise<SerializableAgentState | undefined> {
		return await this.checkpointRepo.manager.transaction(async (manager) => {
			const repo = manager.getRepository(InstanceAiCheckpoint);
			const checkpoint = await repo.findOne({
				where: { key },
				...(this.supportsPessimisticWriteLock(manager)
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (!checkpoint) return undefined;

			const result = await repo.delete({ key });
			if (result.affected === 0) return undefined;
			return parseState(checkpoint);
		});
	}

	private getRunId(key: string): string | null {
		const separatorIndex = key.lastIndexOf(':');
		if (separatorIndex < 0 || separatorIndex === key.length - 1) return null;
		return key.slice(separatorIndex + 1);
	}

	private supportsPessimisticWriteLock(manager: EntityManager): boolean {
		return manager.connection.options.type === 'postgres';
	}

	private async serializeLoad(
		key: string,
		load: () => Promise<SerializableAgentState | undefined>,
	): Promise<SerializableAgentState | undefined> {
		const previous = this.loadQueues.get(key) ?? Promise.resolve(undefined);
		const next = previous.catch(() => undefined).then(load);
		this.loadQueues.set(key, next);

		try {
			return await next;
		} finally {
			if (this.loadQueues.get(key) === next) {
				this.loadQueues.delete(key);
			}
		}
	}
}
