import { Service } from '@n8n/di';
import { createWriteStream, type WriteStream } from 'node:fs';

import { CodeSandboxConfig } from './code-sandbox.config';

export type TaskOutcome = 'ok' | 'user_error' | 'timeout' | 'cancelled' | 'oom' | 'infra_error';

/** One record per task (`code_sandbox_task`). Times in milliseconds. */
export interface TaskTimingRecord {
	scopeMode: string;
	scopeKey: string;
	sandboxId?: string;
	executionId?: string;
	workflowId?: string;
	nodeId: string;
	taskId: string;
	nodeMode?: string;
	reuseWorkers?: boolean;
	leaseHit?: boolean;
	randomKey?: boolean;
	attempts: number;
	slotWaitMs?: number;
	t_acquire?: number;
	t_create?: number;
	t_channel?: number;
	createTimings?: unknown;
	t_build?: number;
	t_send?: number;
	t_run?: number;
	t_accept_to_done?: number;
	t_outputs?: number;
	t_total?: number;
	overhead?: number;
	daemon?: unknown;
	bytes_task_json?: number;
	bytes_in_bin?: number;
	bytes_out_bin?: number;
	bytes_result?: number;
	bin_in_count?: number;
	bin_out_count?: number;
	rpc_count?: number;
	output_bytes?: number;
	binSentUnused?: boolean;
	sandboxOutOutsideBinary?: number;
	outcome: TaskOutcome;
	error?: string;
}

/** One record per released lease (`code_sandbox_lease`). */
export interface LeaseRecord {
	scopeMode: string;
	scopeKey: string;
	sandboxId: string;
	workflowId?: string;
	createMs?: number;
	channelMs?: number;
	createdAt: number;
	releasedAt: number;
	holdMs: number;
	busyMs: number;
	idleRatio: number;
	taskCount: number;
	executionCount: number;
	maxConcurrentTasks: number;
	slots: number;
	releaseReason: string;
}

/**
 * Writes the measurement records as JSON lines to stdout, and to a file if
 * N8N_CODE_SANDBOX_TIMINGS_PATH is set. The analysis script reads them.
 */
@Service()
export class CodeSandboxTimings {
	private file: WriteStream | undefined;

	constructor(private readonly config: CodeSandboxConfig) {
		if (config.timings && config.timingsFile) {
			this.file = createWriteStream(config.timingsFile, { flags: 'a' });
		}
	}

	task(record: TaskTimingRecord) {
		this.write({ type: 'code_sandbox_task', ts: Date.now(), ...record });
	}

	lease(record: LeaseRecord) {
		this.write({ type: 'code_sandbox_lease', ts: Date.now(), ...record });
	}

	event(name: string, data: Record<string, unknown>) {
		this.write({ type: 'code_sandbox_event', name, ts: Date.now(), ...data });
	}

	private write(record: object) {
		if (!this.config.timings) return;
		const line = JSON.stringify(record) + '\n';
		process.stdout.write(line);
		this.file?.write(line);
	}
}
