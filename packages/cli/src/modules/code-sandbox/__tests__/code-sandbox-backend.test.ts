import type { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { mockLogger } from '@n8n/backend-test-utils';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { TaskCancelledError } from '@/task-runners/errors/task-cancelled.error';

import type { CodeSandboxConfig } from '../code-sandbox.config';
import { CodeSandboxBackend, CodeSandboxInfraError } from '../code-sandbox-backend';
import type { CodeSandboxTimings, TaskTimingRecord } from '../code-sandbox-timings';
import type { BuiltTask, CodeTaskBuilder } from '../code-task-builder';
import { ALLOWED_RPC_METHODS } from '../rpc-handler';
import {
	SandboxFullError,
	SandboxGoneError,
	type Placement,
	type SandboxScopeClient,
} from '../sandbox-scope-client';
import {
	TaskApiError,
	type CodeTaskDoneEvent,
	type CodeTaskErrorEvent,
	type CodeTaskEvent,
	type RpcReply,
} from '../task-api-client';

type RunTask = (
	sandboxId: string,
	spec: { taskId: string },
	inputs: unknown[],
	onEvent: (ev: CodeTaskEvent) => void,
	signal: AbortSignal,
) => Promise<CodeTaskDoneEvent | CodeTaskErrorEvent>;

const rpcEvent: CodeTaskEvent = {
	type: 'rpc',
	callId: 'c1',
	name: 'helpers.httpRequest',
	params: [{ url: 'https://example.com' }],
};
const doneEvent: CodeTaskDoneEvent = {
	type: 'done',
	result: { result: [{ json: { a: 1 } }] },
	outputs: [{ path: 'result.json', size: 10 }],
};

/** Rejects when the signal aborts, like the HTTP client. */
const untilAborted = async (signal: AbortSignal) =>
	await new Promise<never>((_, reject) => {
		signal.addEventListener('abort', () =>
			reject(new TaskApiError('task stream failed: aborted', 0, true)),
		);
	});

type Lang = {
	language: 'javascript' | 'python';
	runtime: string;
	rpcMethods: typeof ALLOWED_RPC_METHODS | readonly [];
};
const JS: Lang = { language: 'javascript', runtime: 'n8n-js', rpcMethods: ALLOWED_RPC_METHODS };
const PY: Lang = { language: 'python', runtime: 'n8n-py', rpcMethods: [] };

function setup(runTask: RunTask, lang: Lang = JS) {
	const posted: Array<{ callId: string; reply: RpcReply }> = [];
	const client = {
		runTask: vi.fn(runTask),
		postRpcResult: vi.fn(async (_s: string, _t: string, callId: string, reply: RpcReply) => {
			posted.push({ callId, reply });
		}),
		deleteTask: vi.fn(async () => {}),
		getOutput: vi.fn(),
	};
	const scopes = { client, forget: vi.fn() } as unknown as SandboxScopeClient;
	const backend = new CodeSandboxBackend(
		mock<CodeSandboxConfig>({
			inlineResultMaxBytes: 1024 * 1024,
			scope: 'execution',
			runtime: 'n8n-js',
			pythonRuntime: 'n8n-py',
		}),
		scopes,
		mock<CodeTaskBuilder>(),
		mock<CodeSandboxTimings>(),
		mock<GlobalConfig>({ deployment: { type: 'default' } }),
		mock<TaskRunnersConfig>({ taskTimeout: 60 }),
		mockLogger(),
	);

	let resolveHelper!: (v: unknown) => void;
	const helperCalls: unknown[][] = [];
	const executeFunctions = mock<IExecuteFunctions>();
	const cancel = new AbortController();
	executeFunctions.getExecutionCancelSignal.mockReturnValue(cancel.signal);
	(executeFunctions as unknown as { helpers: unknown }).helpers = {
		httpRequest: async (...args: unknown[]) => {
			helperCalls.push(args);
			return await new Promise((r) => (resolveHelper = r));
		},
	};
	(executeFunctions as unknown as { logNodeOutput: unknown }).logNodeOutput = vi.fn();

	const placement: Placement = {
		scopeKey: 'e:1',
		name: 'c1-x',
		shard: 0,
		sandboxId: 's1',
		cached: true,
		created: false,
	};
	const built = { inputs: [], bytesInBin: 0 } as unknown as BuiltTask;
	const rec = { attempts: 1, outcome: 'ok' } as TaskTimingRecord;
	const run = async () =>
		await (
			backend as unknown as {
				runOnSandbox: (...args: unknown[]) => Promise<unknown>;
			}
		).runOnSandbox(placement, 't1', built, executeFunctions, rec, lang);

	return {
		run,
		backend,
		executeFunctions,
		client,
		scopes,
		posted,
		rec,
		cancel,
		helperCalls,
		resolveHelper: (v: unknown) => resolveHelper(v),
	};
}

describe('CodeSandboxBackend RPC over the task stream', () => {
	it('answers an rpc event in the background and posts the result', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			// onEvent returned while the helper still runs.
			expect(t.helperCalls).toHaveLength(1);
			expect(t.posted).toHaveLength(0);
			t.resolveHelper({ status: 200 });
			await vi.waitFor(() => expect(t.posted).toHaveLength(1));
			onEvent(doneEvent);
			return doneEvent;
		});

		await expect(t.run()).resolves.toEqual({ result: [{ json: { a: 1 } }] });
		expect(t.helperCalls[0]).toEqual([{ url: 'https://example.com' }]);
		expect(t.posted).toEqual([{ callId: 'c1', reply: { ok: true, data: { status: 200 } } }]);
		expect(t.client.postRpcResult).toHaveBeenCalledWith('s1', 't1', 'c1', expect.anything());
		expect(t.rec.rpc_count).toBe(1);
		expect(t.rec.rpc_post_count).toBe(1);
	});

	it('retries a failed result post one time', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			t.resolveHelper('ok');
			await vi.waitFor(() => expect(t.posted).toHaveLength(1));
			return doneEvent;
		});
		t.client.postRpcResult.mockRejectedValueOnce(new TaskApiError('runner unavailable', 503));

		await expect(t.run()).resolves.toBeDefined();
		expect(t.client.postRpcResult).toHaveBeenCalledTimes(2);
	});

	it('fails the task when the result cannot be sent, and keeps the cached sandbox on an HTTP error', async () => {
		const t = setup(async (_s, _spec, _i, onEvent, signal) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			t.resolveHelper('ok');
			return await untilAborted(signal);
		});
		t.client.postRpcResult.mockRejectedValue(new TaskApiError('runner unavailable', 503));

		const err = await t.run().catch((e: unknown) => e);
		expect(err).toBeInstanceOf(CodeSandboxInfraError);
		expect((err as Error).message).toContain('RPC result could not be sent');
		expect(t.client.postRpcResult).toHaveBeenCalledTimes(2);
		expect(t.scopes.forget).not.toHaveBeenCalled();
	});

	it('forgets the cached sandbox when the result post has a transport error', async () => {
		const t = setup(async (_s, _spec, _i, onEvent, signal) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			t.resolveHelper('ok');
			return await untilAborted(signal);
		});
		t.client.postRpcResult.mockRejectedValue(
			new TaskApiError('rpc result request failed: ECONNREFUSED', 0),
		);

		await expect(t.run()).rejects.toBeInstanceOf(CodeSandboxInfraError);
		expect(t.scopes.forget).toHaveBeenCalledTimes(1);
	});

	it('does not retry a 4xx result post', async () => {
		const t = setup(async (_s, _spec, _i, onEvent, signal) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			t.resolveHelper('ok');
			return await untilAborted(signal);
		});
		t.client.postRpcResult.mockRejectedValue(new TaskApiError('invalid call id', 400));

		await expect(t.run()).rejects.toBeInstanceOf(CodeSandboxInfraError);
		expect(t.client.postRpcResult).toHaveBeenCalledTimes(1);
	});

	it('does not answer an rpc event after a cancel', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			t.cancel.abort();
			onEvent(rpcEvent);
			const ev: CodeTaskErrorEvent = { type: 'error', code: 'cancelled', message: 'cancelled' };
			onEvent(ev);
			return ev;
		});

		await expect(t.run()).rejects.toBeInstanceOf(TaskCancelledError);
		expect(t.client.deleteTask).toHaveBeenCalledWith('s1', 't1');
		expect(t.helperCalls).toHaveLength(0);
		expect(t.client.postRpcResult).not.toHaveBeenCalled();
	});

	it('does not answer an rpc event before accepted', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent(rpcEvent);
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			return doneEvent;
		});

		await expect(t.run()).resolves.toBeDefined();
		expect(t.helperCalls).toHaveLength(0);
	});
});

describe('CodeSandboxBackend rejections before accepted', () => {
	it('maps a 429 to SandboxFullError and stops the upload', async () => {
		let uploadSignal: AbortSignal | undefined;
		const t = setup(async (_s, _spec, _i, _onEvent, signal) => {
			uploadSignal = signal;
			throw new TaskApiError('no free slot', 429);
		});
		await expect(t.run()).rejects.toBeInstanceOf(SandboxFullError);
		expect(uploadSignal?.aborted).toBe(true);
		expect(t.scopes.forget).not.toHaveBeenCalled();
	});

	it.each([410, 404])('maps a %d to SandboxGoneError', async (status) => {
		const t = setup(async () => {
			throw new TaskApiError('gone', status);
		});
		await expect(t.run()).rejects.toBeInstanceOf(SandboxGoneError);
	});

	it('fails without a retry when the stream breaks before accepted', async () => {
		const t = setup(async () => {
			throw new TaskApiError('task request failed: ECONNRESET', 0);
		});
		await expect(t.run()).rejects.toBeInstanceOf(CodeSandboxInfraError);
		expect(t.scopes.forget).toHaveBeenCalledTimes(1);
	});

	it('fails the task when no terminal event comes after a cancel', async () => {
		vi.useFakeTimers();
		try {
			const t = setup(async (_s, _spec, _i, onEvent, signal) => {
				onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
				t.cancel.abort();
				return await untilAborted(signal);
			});
			const result = t.run().catch((e: unknown) => e);
			await vi.advanceTimersByTimeAsync(2_500);
			expect(await result).toBeInstanceOf(TaskCancelledError);
			expect(t.client.deleteTask).toHaveBeenCalledWith('s1', 't1');
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('CodeSandboxBackend Python tasks', () => {
	it('gives Python tasks their own scope key', () => {
		const { backend } = setup(async () => doneEvent);
		expect(backend.scopeKey('1', 'n', 'w', 'python').key).toBe('e:1:py');
		expect(backend.scopeKey('1', 'n', 'w', 'javascript').key).toBe('e:1');
	});

	it('refuses RPC calls of a Python task', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			onEvent(rpcEvent);
			await vi.waitFor(() => expect(t.posted).toHaveLength(1));
			return doneEvent;
		}, PY);

		await expect(t.run()).resolves.toBeDefined();
		expect(t.helperCalls).toHaveLength(0);
		expect(t.posted[0].reply).toEqual({ ok: false, error: { message: 'Method not allowed' } });
	});

	it('logs the print output of a failed Python task and keeps it out of the error', async () => {
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			return {
				type: 'error',
				code: 'user_error',
				message: 'user code threw an error',
				userError: { message: 'boom', description: '', printArgs: [["'a'", '1', { x: 1 }], 'bad'] },
			};
		}, PY);

		const err = await t.run().catch((e: unknown) => e);
		expect((err as { payload: unknown }).payload).toEqual({ message: 'boom', description: '' });
		expect(
			(t.executeFunctions as unknown as { logNodeOutput: unknown }).logNodeOutput,
		).toHaveBeenCalledWith("'a'", '1');
	});

	it('does not store output binaries of a Python task', async () => {
		const done: CodeTaskDoneEvent = {
			type: 'done',
			result: {
				result: [
					{
						json: {},
						binary: { data: { id: 'sandbox-out:00000000-0000-4000-8000-000000000000' } },
					},
				],
				printArgs: [],
			},
			outputs: [{ path: 'result.json', size: 10 }],
		};
		const t = setup(async (_s, _spec, _i, onEvent) => {
			onEvent({ type: 'accepted', taskId: 't1', slot: 0 });
			return done;
		}, PY);

		await expect(t.run()).resolves.toEqual(done.result);
		expect(t.client.getOutput).not.toHaveBeenCalled();
	});
});
