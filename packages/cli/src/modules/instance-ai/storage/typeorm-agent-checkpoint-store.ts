import { Service } from '@n8n/di';
import type { CheckpointStore, SerializableAgentState } from '@n8n/instance-ai';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

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
	const parsed = jsonParse<unknown>(entity.state);
	if (!isSerializableAgentState(parsed)) {
		throw new UnexpectedError('Invalid Instance AI checkpoint state', {
			extra: { key: entity.key },
		});
	}
	return parsed;
}

@Service()
export class TypeORMAgentCheckpointStore implements CheckpointStore {
	constructor(private readonly checkpointRepo: InstanceAiCheckpointRepository) {}

	async save(key: string, state: SerializableAgentState): Promise<void> {
		const checkpoint = this.checkpointRepo.create({
			key,
			runId: this.getRunId(key),
			threadId: state.persistence?.threadId ?? null,
			resourceId: state.persistence?.resourceId ?? null,
			state: JSON.stringify(state),
		});

		await this.checkpointRepo.save(checkpoint);
	}

	async load(key: string): Promise<SerializableAgentState | undefined> {
		return await this.checkpointRepo.manager.transaction(async (manager) => {
			const repo = manager.getRepository(InstanceAiCheckpoint);
			const checkpoint = await repo.findOne({ where: { key } });
			if (!checkpoint) return undefined;

			await repo.delete({ key });
			return parseState(checkpoint);
		});
	}

	async delete(key: string): Promise<void> {
		await this.checkpointRepo.delete({ key });
	}

	private getRunId(key: string): string | null {
		const separatorIndex = key.lastIndexOf(':');
		if (separatorIndex < 0 || separatorIndex === key.length - 1) return null;
		return key.slice(separatorIndex + 1);
	}
}
