import { Service } from '@n8n/di';
import { OperationalError } from '@n8n/errors';
import { SandboxServiceError, type CreateCodeSandboxOptions } from '@n8n/sandbox-client';
import { LruCache } from '@n8n/utils/lru-cache';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

import { CodeSandboxClient } from './code-sandbox-client';
import type { ScopeKey } from './scope-key';
import type { CodeTaskOutcome } from './task-outcome';

export type SandboxOptions = Omit<CreateCodeSandboxOptions, 'name'>;

export interface CodeTask {
	taskId: string;
	taskInput: Buffer;
	signal?: AbortSignal;
}

const MAX_SANDBOXES_PER_SCOPE = 4;
const FULL_WAIT_DEADLINE_MS = 30_000;
const FULL_RETRY_DELAY_MS = 200;
const CACHE_SIZE = 1_000;

export class CodeSandboxesFullError extends OperationalError {
	constructor() {
		super('All code sandboxes of the scope stayed full');
	}
}

@Service()
export class ScopeClient {
	private readonly sandboxIds = new LruCache<string, string>(CACHE_SIZE);

	private readonly lastShards = new LruCache<string, number>(CACHE_SIZE);

	constructor(
		private readonly client: CodeSandboxClient,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async runTask(
		scopeKey: ScopeKey,
		options: SandboxOptions,
		task: CodeTask,
	): Promise<CodeTaskOutcome> {
		const deadline = Date.now() + FULL_WAIT_DEADLINE_MS;
		const firstShard = this.lastShards.get(scopeKey.value) ?? 0;

		while (true) {
			for (let i = 0; i < MAX_SANDBOXES_PER_SCOPE; i++) {
				task.signal?.throwIfAborted();
				if (Date.now() >= deadline) throw new CodeSandboxesFullError();

				const shard = (firstShard + i) % MAX_SANDBOXES_PER_SCOPE;
				const outcome = await this.runOnShard(
					this.sandboxName(scopeKey, options, shard),
					options,
					task,
				);
				if (outcome !== 'full') {
					this.lastShards.set(scopeKey.value, shard);
					return outcome;
				}
			}

			await sleep(FULL_RETRY_DELAY_MS, undefined, { signal: task.signal });
		}
	}

	private async runOnShard(
		name: string,
		options: SandboxOptions,
		task: CodeTask,
	): Promise<CodeTaskOutcome | 'full'> {
		try {
			const sandboxId = this.sandboxIds.get(name) ?? (await this.createSandbox(name, options));
			return await this.runOrFull(sandboxId, task);
		} catch (error) {
			// The sandbox is deleted or draining, so create a new sandbox for this name
			if (!hasStatus(error, 404) && !hasStatus(error, 410)) throw error;
		}

		return await this.runOrFull(await this.createSandbox(name, options), task);
	}

	private async createSandbox(name: string, options: SandboxOptions) {
		const { id } = await this.client.getOrCreateSandbox({ ...options, name });
		this.sandboxIds.set(name, id);
		return id;
	}

	private async runOrFull(sandboxId: string, task: CodeTask): Promise<CodeTaskOutcome | 'full'> {
		try {
			return await this.client.runTask(sandboxId, task.taskId, task.taskInput, task.signal);
		} catch (error) {
			if (hasStatus(error, 429)) return 'full';
			throw error;
		}
	}

	private sandboxName(scopeKey: ScopeKey, options: SandboxOptions, shard: number) {
		const { runtime, runtimeVersion, maxConcurrency, memoryMb, idleTimeoutMs, maxAgeMs } = options;
		const parts = [
			this.instanceSettings.instanceId,
			scopeKey.value,
			runtime,
			runtimeVersion,
			maxConcurrency,
			memoryMb,
			idleTimeoutMs,
			maxAgeMs,
			shard,
		];
		return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
	}
}

function hasStatus(error: unknown, status: number) {
	return error instanceof SandboxServiceError && error.status === status;
}
