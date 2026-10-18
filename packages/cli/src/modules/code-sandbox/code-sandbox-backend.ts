import { Logger } from '@n8n/backend-common';
import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { JSExecSettings, TaskData } from '@n8n/task-runner';
import { createResultError, createResultOk, type Result } from '@n8n/utils/result';
import { nanoid } from 'nanoid';
import type {
	EnvProviderState,
	IBinaryData,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { TaskCancelledError } from '@/task-runners/errors/task-cancelled.error';
import { TaskRunnerOomError } from '@/task-runners/errors/task-runner-oom-error';
import { TaskRunnerExecutionTimeoutError } from '@/task-runners/task-broker/errors/task-runner-execution-timeout.error';

import { CodeSandboxConfig } from './code-sandbox.config';
import {
	CodeSandboxTimings,
	type TaskOutcome,
	type TaskTimingRecord,
} from './code-sandbox-timings';
import { CodeTaskBuilder, type BuiltTask } from './code-task-builder';
import { RpcHandler } from './rpc-handler';
import { SandboxLeaseManager, type Lease } from './sandbox-lease-manager';
import {
	readAll,
	TaskApiError,
	type CodeTaskDoneEvent,
	type CodeTaskErrorEvent,
	type CodeTaskEvent,
	type CodeTaskRpcEvent,
	type RpcReply,
} from './task-api-client';

const SANDBOX_OUT_PREFIX = 'sandbox-out:';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** After a cancel, wait this long for the terminal event before the lease counts as broken. */
const CANCEL_GRACE_MS = 2_000;
/**
 * Time until the `accepted` event: a fixed part plus the upload at 10 MB/s.
 * Without it, a request to a sandbox that died silently hangs for minutes.
 */
const ACCEPT_TIMEOUT_BASE_MS = 30_000;
const ACCEPT_TIMEOUT_BYTES_PER_MS = 10_000;

/** The content of `out/result.json`. Same shape as in @n8n/code-runtime. */
interface CodeTaskResultFile {
	result: unknown;
	customData?: Record<string, string>;
	staticData?: IDataObject;
	binaries?: Record<string, { fileName?: string; mimeType?: string }>;
}

/** An infrastructure failure of the code sandbox (not a user error). */
export class CodeSandboxInfraError extends UnexpectedError {}

/** A failure before the worker had the task. The task can run on another lease. */
class RetryableTaskError extends Error {
	constructor(readonly original: Error) {
		super(original.message);
	}
}

/** Splits a stream of text chunks into lines. */
class LineSplitter {
	private pending = '';

	constructor(private readonly emit: (line: string) => void) {}

	push(data: string) {
		this.pending += data;
		let nl = this.pending.indexOf('\n');
		while (nl !== -1) {
			this.emit(this.pending.slice(0, nl));
			this.pending = this.pending.slice(nl + 1);
			nl = this.pending.indexOf('\n');
		}
	}

	flush() {
		if (this.pending) this.emit(this.pending);
		this.pending = '';
	}
}

/**
 * Runs JavaScript Code tasks in code sandboxes of the sandbox service. It
 * replaces `TaskRequester.startTask` for `javascript` jobs when
 * N8N_CODE_EXECUTION_BACKEND=sandbox, and returns the same result shape.
 */
@Service()
export class CodeSandboxBackend {
	constructor(
		private readonly config: CodeSandboxConfig,
		private readonly leases: SandboxLeaseManager,
		private readonly builder: CodeTaskBuilder,
		private readonly timings: CodeSandboxTimings,
		private readonly globalConfig: GlobalConfig,
		private readonly taskRunnersConfig: TaskRunnersConfig,
		private readonly logger: Logger,
	) {}

	scopeKey(
		executionId: string | undefined,
		nodeId: string | undefined,
		workflowId: string | undefined,
	): { key: string; random: boolean } {
		switch (this.config.scope) {
			case 'node':
				if (executionId && nodeId) return { key: `n:${executionId}:${nodeId}`, random: false };
				break;
			case 'execution':
				if (executionId) return { key: `e:${executionId}`, random: false };
				break;
			case 'workflow':
				if (workflowId) return { key: `w:${workflowId}`, random: false };
				break;
		}
		return { key: `r:${nanoid()}`, random: true };
	}

	async runTask<TData, TError>(
		additionalData: IWorkflowExecuteAdditionalData,
		_jobType: string,
		settings: unknown,
		executeFunctions: IExecuteFunctions,
		inputData: ITaskDataConnections,
		node: INode,
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		siblingParameters: INodeParameters,
		mode: WorkflowExecuteMode,
		envProviderState: EnvProviderState,
		executeData?: IExecuteData,
	): Promise<Result<TData, TError>> {
		const t0 = performance.now();
		const execSettings = settings as JSExecSettings;
		const executionId = additionalData.executionId;
		const taskId = `t_${nanoid()}`;
		const { key, random } = this.scopeKey(executionId, node.id, workflow.id);
		const rec: TaskTimingRecord = {
			scopeMode: this.config.scope,
			scopeKey: key,
			executionId,
			workflowId: workflow.id,
			nodeId: node.id,
			taskId,
			nodeMode: execSettings.nodeMode,
			reuseWorkers: this.config.reuseWorkers,
			randomKey: random,
			attempts: 0,
			outcome: 'ok',
		};

		const taskData: TaskData = {
			workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			node,
			executeFunctions,
			itemIndex,
			siblingParameters,
			mode,
			envProviderState,
			executeData,
			defaultReturnRunIndex: -1,
			selfData: {},
			contextNodeName: activeNodeName,
			activeNodeName,
			additionalData,
		};

		try {
			const tBuild = performance.now();
			const built = this.builder.build(taskId, execSettings, taskData);
			rec.t_build = ms(performance.now() - tBuild);
			rec.bytes_task_json = built.bytesTaskJson;
			rec.bin_in_count = built.binaryCount;
			rec.bytes_in_bin = built.bytesInBin;

			const resultFile = await this.runWithRetry(
				key,
				executionId,
				workflow.id,
				random,
				taskId,
				built,
				executeFunctions,
				rec,
			);

			// Same as TaskRequester.startTask.
			if (resultFile.customData) {
				for (const [k, v] of Object.entries(resultFile.customData)) {
					runExecutionData.resultData.metadata ??= {};
					runExecutionData.resultData.metadata[k] = v;
				}
			}
			if (resultFile.staticData) workflow.overrideStaticData(resultFile.staticData);

			return createResultOk(resultFile.result as TData);
		} catch (e) {
			rec.outcome = outcomeOf(e);
			rec.error =
				e instanceof UserErrorPayload
					? JSON.stringify(e.payload).slice(0, 500)
					: (e as Error).message;
			return createResultError((e instanceof UserErrorPayload ? e.payload : e) as TError);
		} finally {
			rec.t_total = ms(performance.now() - t0);
			const run = rec.t_run ?? 0;
			rec.overhead = rec.t_total - run;
			this.timings.task(rec);
		}
	}

	private async runWithRetry(
		key: string,
		executionId: string | undefined,
		workflowId: string | undefined,
		random: boolean,
		taskId: string,
		built: BuiltTask,
		executeFunctions: IExecuteFunctions,
		rec: TaskTimingRecord,
	): Promise<CodeTaskResultFile> {
		for (;;) {
			rec.attempts++;
			const tAcquire = performance.now();
			let lease: Lease;
			try {
				const acq = await this.leases.acquire(key, executionId, workflowId);
				lease = acq.lease;
				rec.leaseHit = acq.leaseHit;
				rec.slotWaitMs = acq.slotWaitMs;
				if (acq.createdForTask) {
					rec.t_create = lease.createMs;
					rec.createTimings = lease.createTimings;
				}
			} catch (e) {
				if (rec.attempts === 1) {
					this.logger.warn('Code sandbox acquire failed, retrying', {
						error: (e as Error).message,
					});
					continue;
				}
				throw new CodeSandboxInfraError(`Could not get a code sandbox: ${(e as Error).message}`, {
					cause: e,
				});
			}
			rec.t_acquire = ms(performance.now() - tAcquire);
			rec.sandboxId = lease.sandboxId;

			try {
				return await this.runOnLease(lease, key, taskId, built, executeFunctions, rec);
			} catch (e) {
				if (e instanceof RetryableTaskError) {
					if (rec.attempts === 1) {
						this.logger.warn('Code task failed before it was accepted, retrying', {
							sandboxId: lease.sandboxId,
							error: e.message,
						});
						continue;
					}
					throw new CodeSandboxInfraError(`Code task failed: ${e.message}`, { cause: e.original });
				}
				throw e;
			} finally {
				this.leases.onTaskEnd(lease);
				if (random) this.leases.releaseUnused(lease, 'execution_end');
			}
		}
	}

	private async runOnLease(
		lease: Lease,
		key: string,
		taskId: string,
		built: BuiltTask,
		executeFunctions: IExecuteFunctions,
		rec: TaskTimingRecord,
	): Promise<CodeTaskResultFile> {
		if (lease.scopeKey !== key) {
			throw new UnexpectedError('A lease took a task of another scope key', {
				extra: { leaseKey: lease.scopeKey, taskKey: key },
			});
		}
		const client = this.leases.client;
		const sandboxId = lease.sandboxId;
		const timeoutMs = this.taskRunnersConfig.taskTimeout * 1000;
		const rpc = new RpcHandler(executeFunctions);
		const controller = new AbortController();
		let brokenReason: string | undefined;
		let cancelling: 'timeout' | 'cancelled' | undefined;
		let accepted = false;
		let tAccepted = 0;
		let timeoutTimer: NodeJS.Timeout | undefined;
		let graceTimer: NodeJS.Timeout | undefined;
		let acceptTimedOut = false;
		const acceptTimer = setTimeout(
			() => {
				acceptTimedOut = true;
				controller.abort();
			},
			ACCEPT_TIMEOUT_BASE_MS + built.bytesInBin / ACCEPT_TIMEOUT_BYTES_PER_MS,
		);
		let outputBytes = 0;

		const log = (line: string) => {
			const ctx = executeFunctions as unknown as { logNodeOutput?: (...args: unknown[]) => void };
			ctx.logNodeOutput?.(line);
		};
		const stdout = new LineSplitter(log);
		const stderr = new LineSplitter(log);

		const cancelTask = (why: 'timeout' | 'cancelled') => {
			if (cancelling) return;
			cancelling = why;
			client.deleteTask(sandboxId, taskId).catch(() => {});
			graceTimer = setTimeout(() => {
				this.leases.markBroken(lease, `no terminal event ${CANCEL_GRACE_MS} ms after cancel`);
			}, CANCEL_GRACE_MS);
		};
		const onBroken = (reason: string) => {
			brokenReason = reason;
			controller.abort();
		};

		// RPC calls run in the background: the stream must be read while a
		// helper runs, and calls can run at the same time.
		let rpcFailure: Error | undefined;
		let terminalSeen = false;
		rec.t_rpc_post = 0;
		rec.rpc_post_count = 0;
		const postRpcResult = async (ev: CodeTaskRpcEvent, reply: RpcReply) => {
			const tPost = performance.now();
			try {
				await client.postRpcResult(sandboxId, taskId, ev.callId, reply);
			} catch (e) {
				// A 4xx is a bug. Do not retry it.
				if (e instanceof TaskApiError && e.status >= 400 && e.status < 500) throw e;
				await client.postRpcResult(sandboxId, taskId, ev.callId, reply);
			} finally {
				rec.t_rpc_post = (rec.t_rpc_post ?? 0) + ms(performance.now() - tPost);
				rec.rpc_post_count = (rec.rpc_post_count ?? 0) + 1;
			}
		};
		const answerRpc = async (ev: CodeTaskRpcEvent) => {
			const reply = await rpc.handleCall(ev);
			// The task ended while the helper ran. The daemon would answer 404.
			if (controller.signal.aborted || cancelling || terminalSeen) return;
			try {
				await postRpcResult(ev, reply);
			} catch (e) {
				if (rpcFailure || controller.signal.aborted) return;
				this.logger.warn('Code task RPC result could not be sent', {
					sandboxId,
					error: (e as Error).message,
				});
				rpcFailure = e as Error;
				controller.abort();
			}
		};
		const cancelSignal = executeFunctions.getExecutionCancelSignal?.();
		const onCancel = () => (accepted ? cancelTask('cancelled') : controller.abort());

		lease.onBroken.add(onBroken);
		cancelSignal?.addEventListener('abort', onCancel);

		const tSend = performance.now();
		const onEvent = (ev: CodeTaskEvent) => {
			switch (ev.type) {
				case 'accepted':
					accepted = true;
					clearTimeout(acceptTimer);
					tAccepted = performance.now();
					rec.t_send = ms(tAccepted - tSend);
					timeoutTimer = setTimeout(() => cancelTask('timeout'), timeoutMs);
					break;
				case 'stdout':
					outputBytes += ev.data.length;
					stdout.push(ev.data);
					break;
				case 'stderr':
					outputBytes += ev.data.length;
					stderr.push(ev.data);
					break;
				case 'rpc':
					if (!accepted || cancelling) break;
					answerRpc(ev).catch((e: unknown) => {
						this.logger.warn('Code task RPC call failed', { error: (e as Error).message });
					});
					break;
				case 'done':
				case 'error':
					terminalSeen = true;
					break;
			}
		};

		let terminal: CodeTaskDoneEvent | CodeTaskErrorEvent;
		try {
			if (cancelSignal?.aborted) throw new TaskCancelledError('Execution was cancelled');
			terminal = await client.runTask(
				sandboxId,
				{ taskId, timeoutMs, inlineResultMaxBytes: this.config.inlineResultMaxBytes },
				built.inputs,
				onEvent,
				controller.signal,
			);
		} catch (e) {
			if (e instanceof TaskCancelledError) throw e;
			if (cancelSignal?.aborted && !accepted)
				throw new TaskCancelledError('Execution was cancelled');
			// The lease broke after a cancel that got no terminal event.
			if (cancelling === 'timeout') {
				throw new TaskRunnerExecutionTimeoutError({
					taskTimeout: this.taskRunnersConfig.taskTimeout,
					isSelfHosted: this.globalConfig.deployment.type !== 'cloud',
					mode: 'external',
				});
			}
			if (cancelling === 'cancelled') throw new TaskCancelledError('Execution was cancelled');
			if (rpcFailure && !brokenReason) {
				// A transport error (status 0) means the path to the sandbox is
				// gone. An HTTP error status or another error does not.
				if (rpcFailure instanceof TaskApiError && rpcFailure.status === 0) {
					this.leases.markBroken(lease, `RPC result failed: ${rpcFailure.message}`);
				}
				throw new CodeSandboxInfraError('Code task failed: RPC result could not be sent', {
					cause: rpcFailure,
				});
			}
			const reason =
				brokenReason ?? (acceptTimedOut ? 'no accepted event in time' : (e as Error).message);
			if (!accepted) {
				this.leases.markBroken(lease, reason);
				throw new RetryableTaskError(e as Error);
			}
			if (!(e instanceof TaskApiError) || brokenReason) this.leases.markBroken(lease, reason);
			throw new CodeSandboxInfraError(`Code task failed: ${reason}`, { cause: e });
		} finally {
			clearTimeout(acceptTimer);
			if (timeoutTimer) clearTimeout(timeoutTimer);
			if (graceTimer) clearTimeout(graceTimer);
			cancelSignal?.removeEventListener('abort', onCancel);
			lease.onBroken.delete(onBroken);
			stdout.flush();
			stderr.flush();
			rec.rpc_count = rpc.rpcCount;
			rec.output_bytes = outputBytes;
		}

		rec.t_accept_to_done = accepted ? ms(performance.now() - tAccepted) : undefined;
		rec.daemon = terminal.timings;
		rec.t_run = terminal.timings?.worker?.run;
		if (terminal.timings?.worker && rec.bin_in_count) {
			rec.binSentUnused = (terminal.timings.worker.binaryReads ?? 0) === 0;
		}

		if (terminal.type === 'error') {
			throw this.toTaskError(terminal, accepted, cancelling, lease);
		}

		const tOutputs = performance.now();
		try {
			const resultEntry = terminal.outputs?.find((o) => o.path === 'result.json');
			rec.bytes_result = resultEntry?.size;
			let resultFile = terminal.result as CodeTaskResultFile | null;
			if (!resultFile) {
				if (!resultEntry) throw new CodeSandboxInfraError('The task wrote no result.json');
				const text = await readAll(await client.getOutput(sandboxId, taskId, 'result.json'));
				resultFile = JSON.parse(text) as CodeTaskResultFile;
			}
			await this.storeOutputBinaries(sandboxId, taskId, resultFile, executeFunctions, rec);
			return resultFile;
		} finally {
			rec.t_outputs = ms(performance.now() - tOutputs);
			client.deleteTask(sandboxId, taskId).catch(() => {});
		}
	}

	private toTaskError(
		ev: CodeTaskErrorEvent,
		accepted: boolean,
		cancelling: 'timeout' | 'cancelled' | undefined,
		lease: Lease,
	): Error {
		const isSelfHosted = this.globalConfig.deployment.type !== 'cloud';
		const code = ev.code === 'cancelled' && cancelling === 'timeout' ? 'timeout' : ev.code;
		switch (code) {
			case 'user_error':
				return new UserErrorPayload(ev.userError ?? { message: ev.message });
			case 'timeout':
				return new TaskRunnerExecutionTimeoutError({
					taskTimeout: this.taskRunnersConfig.taskTimeout,
					isSelfHosted,
					mode: 'external',
				});
			case 'cancelled':
				return new TaskCancelledError('Execution was cancelled');
			case 'oom':
				return new TaskRunnerOomError(lease.sandboxId, !isSelfHosted);
			default:
				if (!accepted) {
					this.leases.markBroken(lease, ev.message);
					return new RetryableTaskError(new CodeSandboxInfraError(ev.message));
				}
				return new CodeSandboxInfraError(`Code task failed (${ev.code}): ${ev.message}`);
		}
	}

	/**
	 * Stores the binaries that the task wrote. The runtime returned them with
	 * `sandbox-out:<uuid>` ids. n8n streams each file into its binary data
	 * service and replaces the object in the item.
	 */
	private async storeOutputBinaries(
		sandboxId: string,
		taskId: string,
		resultFile: CodeTaskResultFile,
		executeFunctions: IExecuteFunctions,
		rec: TaskTimingRecord,
	) {
		const result = resultFile.result;
		const items: unknown[] = Array.isArray(result)
			? result
			: result && typeof result === 'object'
				? [result]
				: [];
		let stored = 0;
		let bytes = 0;
		for (const item of items) {
			const binary = (item as INodeExecutionData | null)?.binary;
			if (!binary || typeof binary !== 'object') continue;
			for (const [property, meta] of Object.entries(binary)) {
				const id = (meta as IBinaryData | null)?.id;
				if (typeof id !== 'string' || !id.startsWith(SANDBOX_OUT_PREFIX)) continue;
				const uuid = id.slice(SANDBOX_OUT_PREFIX.length);
				if (!UUID_REGEX.test(uuid))
					throw new CodeSandboxInfraError(`Invalid output binary id ${id}`);
				const info = resultFile.binaries?.[uuid] ?? {};
				const stream = await this.leases.client.getOutput(sandboxId, taskId, `bin/${uuid}`);
				const fileName = meta.fileName ?? info.fileName;
				const data = await executeFunctions.helpers.prepareBinaryData(
					stream,
					fileName,
					info.mimeType,
				);
				binary[property] = { ...data, ...(fileName ? { fileName } : {}) };
				bytes += data.bytes ?? 0;
				stored++;
			}
		}
		rec.bin_out_count = stored;
		rec.bytes_out_bin = bytes;
		// The stored binaries have new ids now, so what is left is outside a binary field.
		const outside = countSandboxOutStrings(result);
		if (outside > 0) rec.sandboxOutOutsideBinary = outside;
	}
}

/** A user error from the task. Returned as the plain object, like the task runner. */
class UserErrorPayload extends Error {
	constructor(readonly payload: unknown) {
		super('user error');
	}
}

function outcomeOf(e: unknown): TaskOutcome {
	if (e instanceof UserErrorPayload) return 'user_error';
	if (e instanceof TaskRunnerExecutionTimeoutError) return 'timeout';
	if (e instanceof TaskCancelledError) return 'cancelled';
	if (e instanceof TaskRunnerOomError) return 'oom';
	return 'infra_error';
}

function ms(v: number) {
	return Math.round(v);
}

/** Counts strings that start with the sandbox-out prefix, anywhere in the value. */
function countSandboxOutStrings(value: unknown, depth = 0): number {
	if (depth > 64) return 0;
	if (typeof value === 'string') return value.startsWith(SANDBOX_OUT_PREFIX) ? 1 : 0;
	if (Array.isArray(value)) {
		let n = 0;
		for (const v of value) n += countSandboxOutStrings(v, depth + 1);
		return n;
	}
	if (value && typeof value === 'object') {
		let n = 0;
		for (const v of Object.values(value)) n += countSandboxOutStrings(v, depth + 1);
		return n;
	}
	return 0;
}
