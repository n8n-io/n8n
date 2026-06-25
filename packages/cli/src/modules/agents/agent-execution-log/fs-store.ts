import { Service } from '@n8n/di';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import fs from 'node:fs/promises';
import path from 'node:path';

import { JsonFileStore } from '@/storage/json-file-store';

import type {
	AgentExecutionLogBundle,
	AgentExecutionLogPayload,
	AgentExecutionLogRef,
	AgentExecutionLogStore,
} from './types';

const AGENT_EXECUTION_LOG_VERSION = 1;

@Service()
export class AgentExecutionLogFsStore implements AgentExecutionLogStore {
	private readonly store: JsonFileStore<
		AgentExecutionLogRef,
		AgentExecutionLogPayload,
		AgentExecutionLogBundle
	>;

	constructor(
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
	) {
		this.store = new JsonFileStore({
			storagePath: this.storageConfig.storagePath,
			resolveFileDir: (ref) => this.resolveLogDir(ref),
			filename: 'log.json',
			serialize: (payload) => JSON.stringify({ ...payload, version: AGENT_EXECUTION_LOG_VERSION }),
			parse: (content) => {
				try {
					return JSON.parse(content) as AgentExecutionLogBundle;
				} catch (error) {
					if (error instanceof SyntaxError) throw error;
					throw new UnexpectedError('Failed to parse agent execution log payload');
				}
			},
			key: (ref) => ref.executionId,
			shouldDropReadManyError: (error) => error instanceof SyntaxError,
			reportError: (error) => this.errorReporter.error(error),
		});
	}

	async write(ref: AgentExecutionLogRef, payload: AgentExecutionLogPayload): Promise<number> {
		return await this.store.write(ref, payload);
	}

	async read(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null> {
		return await this.store.read(ref);
	}

	async readMany(refs: AgentExecutionLogRef[]): Promise<Map<string, AgentExecutionLogBundle>> {
		return await this.store.readMany(refs);
	}

	async delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]): Promise<void> {
		await this.store.delete(ref);
	}

	async deleteByAgentId(agentId: string): Promise<void> {
		await fs.rm(
			path.join(this.storageConfig.storagePath, 'agents', this.encodePathSegment(agentId)),
			{
				recursive: true,
				force: true,
			},
		);
	}

	private resolveLogDir({ agentId, threadId, executionId }: AgentExecutionLogRef) {
		if (!agentId || !threadId || !executionId) {
			throw new UnexpectedError('Cannot resolve agent execution log path without storage metadata');
		}

		return path.join(
			'agents',
			this.encodePathSegment(agentId),
			'threads',
			this.encodePathSegment(threadId),
			'executions',
			this.encodePathSegment(executionId),
		);
	}

	private encodePathSegment(value: string) {
		return encodeURIComponent(value);
	}
}
