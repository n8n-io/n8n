import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';

import {
	AGENT_EXECUTION_LOG_BUNDLE_VERSION,
	measureAgentExecutionLogBundleBytes,
} from './constants';
import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './types';

@Service()
export class DbStore implements AgentExecutionLogStore {
	constructor(private readonly repository: AgentExecutionRepository) {}

	async write(
		{ executionId }: AgentExecutionLogRef,
		payload: AgentExecutionLogPayload,
		tx?: EntityManager,
	): Promise<number> {
		const repository = this.getRepository(tx);
		const update: QueryDeepPartialEntity<AgentExecution> = {
			assistantResponse: payload.assistantResponse,
			// TypeORM's update type cannot express @JsonColumn values with unknown nested fields.
			toolCalls: payload.toolCalls as QueryDeepPartialEntity<AgentExecution>['toolCalls'],
			timeline: payload.timeline as QueryDeepPartialEntity<AgentExecution>['timeline'],
			error: payload.error,
		};
		const result = await repository.update({ id: executionId }, update);

		if (result.affected === 0) {
			throw new UnexpectedError('Agent execution row is missing while writing log payload', {
				extra: { executionId },
			});
		}

		return measureAgentExecutionLogBundleBytes(payload);
	}

	async read(
		{ executionId }: AgentExecutionLogRef,
		tx?: EntityManager,
	): Promise<AgentExecutionLogBundle | null> {
		const result = await this.getRepository(tx).findOne({
			where: { id: executionId },
			select: ['assistantResponse', 'toolCalls', 'timeline', 'error'],
		});

		if (!result) return null;

		return { ...this.toPayload(result), version: AGENT_EXECUTION_LOG_BUNDLE_VERSION };
	}

	async readMany(refs: AgentExecutionLogRef[]) {
		const bundles = new Map<string, AgentExecutionLogBundle>();
		if (refs.length === 0) return bundles;

		const rows = await this.repository.find({
			where: refs.map((ref) => ({ id: ref.executionId })),
			select: ['id', 'assistantResponse', 'toolCalls', 'timeline', 'error'],
		});

		for (const row of rows) {
			bundles.set(row.id, {
				...this.toPayload(row),
				version: AGENT_EXECUTION_LOG_BUNDLE_VERSION,
			});
		}

		return bundles;
	}

	private toPayload(
		row: Pick<AgentExecution, 'assistantResponse' | 'toolCalls' | 'timeline' | 'error'>,
	): AgentExecutionLogPayload {
		return {
			assistantResponse: row.assistantResponse,
			toolCalls: row.toolCalls,
			timeline: row.timeline,
			error: row.error,
		};
	}

	private getRepository(tx?: EntityManager) {
		return tx ? tx.getRepository(AgentExecution) : this.repository;
	}
}
