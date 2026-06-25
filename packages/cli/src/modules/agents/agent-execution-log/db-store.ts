import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';

import { AGENT_EXECUTION_LOG_BUNDLE_VERSION } from './constants';
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
		const execution = await repository.findOne({
			where: { id: executionId },
			select: ['id', 'assistantResponse', 'toolCalls', 'timeline', 'error'],
		});

		if (execution) {
			execution.assistantResponse = payload.assistantResponse;
			execution.toolCalls = payload.toolCalls;
			execution.timeline = payload.timeline;
			execution.error = payload.error;
			await repository.save(execution);
		}

		return this.measureBundleBytes(payload);
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

	async delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]) {
		const refs = Array.isArray(ref) ? ref : [ref];
		if (refs.length === 0) return;

		await this.repository.update(
			{ id: In(refs.map((r) => r.executionId)) },
			{ assistantResponse: '', toolCalls: null, timeline: null, error: null },
		);
	}

	private measureBundleBytes(payload: AgentExecutionLogPayload): number {
		return Buffer.byteLength(
			JSON.stringify({ ...payload, version: AGENT_EXECUTION_LOG_BUNDLE_VERSION }),
			'utf-8',
		);
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
