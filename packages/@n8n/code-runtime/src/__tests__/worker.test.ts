import type { DataRequestResponse, JSExecSettings } from '@n8n/task-runner';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import type { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import type { INodeExecutionData } from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes } from 'n8n-workflow';

import type { CodeTaskFile, CodeTaskResultFile } from '../types';

const workerPath = path.resolve(__dirname, '../../dist/entry.js');
// WORKER_ARGS (JSON array) replaces the node arguments, for example to start
// from the startup snapshot: ["--snapshot-blob", "snapshot.blob", "<runtime dir>"].
const workerArgs = process.env.WORKER_ARGS
	? (JSON.parse(process.env.WORKER_ARGS) as string[])
	: [workerPath];

type WorkerMessage = {
	type: string;
	callId?: string;
	name?: string;
	params?: unknown[];
	error?: Record<string, unknown>;
	timings?: Record<string, number>;
};

interface WorkerRun {
	final: WorkerMessage;
	stdout: string;
	stderr: string;
	result?: CodeTaskResultFile;
	dir: string;
}

const dirs: string[] = [];
afterAll(async () => {
	await Promise.all(dirs.map(async (d) => await rm(d, { recursive: true, force: true })));
});

async function runWorker(
	task: Omit<CodeTaskFile, 'taskId'>,
	files: Record<string, string | Buffer> = {},
	onRpc: (m: WorkerMessage) => { ok: boolean; data?: unknown; error?: unknown } = () => ({
		ok: false,
		error: { message: 'no rpc' },
	}),
): Promise<WorkerRun> {
	const dir = await mkdtemp(path.join(tmpdir(), 'code-runtime-'));
	dirs.push(dir);
	await mkdir(path.join(dir, 'in', 'bin'), { recursive: true });
	await mkdir(path.join(dir, 'out', 'bin'), { recursive: true });
	await writeFile(path.join(dir, 'in', 'task.json'), JSON.stringify({ taskId: 't', ...task }));
	for (const [name, content] of Object.entries(files)) {
		await writeFile(path.join(dir, 'in', name), content);
	}

	const child = spawn(process.execPath, workerArgs, {
		cwd: dir,
		stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
		env: { PATH: process.env.PATH, HOME: dir, NODE_ENV: 'production' },
	});
	const ctrl = child.stdio[3] as Socket;
	let stdout = '';
	let stderr = '';
	child.stdout!.on('data', (c: Buffer) => (stdout += c.toString()));
	child.stderr!.on('data', (c: Buffer) => (stderr += c.toString()));

	const final = await new Promise<WorkerMessage>((resolve, reject) => {
		let buf = '';
		child.on('exit', (code) => reject(new Error(`worker exited ${code}: ${stderr}`)));
		ctrl.on('data', (chunk: Buffer) => {
			buf += chunk.toString();
			let nl = buf.indexOf('\n');
			while (nl !== -1) {
				const msg = JSON.parse(buf.slice(0, nl)) as WorkerMessage;
				buf = buf.slice(nl + 1);
				if (msg.type === 'ready') {
					ctrl.write(
						JSON.stringify({ type: 'start', taskId: 't', dir, deadline: Date.now() + 10000 }) +
							'\n',
					);
				} else if (msg.type === 'rpc') {
					ctrl.write(
						JSON.stringify({ type: 'rpc_result', callId: msg.callId, ...onRpc(msg) }) + '\n',
					);
				} else if (msg.type === 'done' || msg.type === 'error') {
					resolve(msg);
				}
				nl = buf.indexOf('\n');
			}
		});
	});
	await new Promise((r) => child.once('exit', r));
	const resultPath = path.join(dir, 'out', 'result.json');
	const result = existsSync(resultPath)
		? (JSON.parse(await readFile(resultPath, 'utf-8')) as CodeTaskResultFile)
		: undefined;
	return { final, stdout, stderr, result, dir };
}

function settings(
	code: string,
	nodeMode: JSExecSettings['nodeMode'],
	extra: Partial<JSExecSettings> = {},
) {
	return {
		code,
		nodeMode,
		workflowMode: 'manual',
		continueOnFail: false,
		...extra,
	} as JSExecSettings;
}

function newData(items: INodeExecutionData[]): DataRequestResponse {
	const code = {
		id: 'code-id',
		name: 'Code',
		parameters: {},
		position: [0, 0] as [number, number],
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
	};
	const trigger = {
		...code,
		id: 'trigger-id',
		name: 'Trigger',
		type: 'n8n-nodes-base.manualTrigger',
	};
	return {
		workflow: {
			id: 'wf',
			name: 'wf',
			active: false,
			connections: {
				Trigger: { main: [[{ node: 'Code', type: NodeConnectionTypes.Main, index: 0 }]] },
			},
			nodes: [trigger, code],
		},
		inputData: { main: [items] },
		node: code,
		runExecutionData: createRunExecutionData({
			resultData: {
				runData: {
					Trigger: [
						{
							startTime: 0,
							executionTime: 0,
							executionIndex: 0,
							executionStatus: 'success',
							source: [],
							data: { main: [items] },
						},
					],
				},
				pinData: {},
				lastNodeExecuted: 'Trigger',
			},
		}),
		runIndex: 0,
		itemIndex: 0,
		activeNodeName: 'Code',
		contextNodeName: 'Code',
		defaultReturnRunIndex: -1,
		siblingParameters: {},
		mode: 'manual',
		selfData: {},
		envProviderState: { env: {}, isEnvAccessBlocked: true, isProcessAvailable: true },
		additionalData: {
			executionId: 'exec-id',
			instanceBaseUrl: '',
			restApiUrl: '',
			formWaitingBaseUrl: 'http://form-waiting',
			webhookBaseUrl: 'http://webhook',
			webhookTestBaseUrl: 'http://webhook-test',
			webhookWaitingBaseUrl: 'http://webhook-waiting',
			variables: {},
		},
		connectionInputSource: { main: [{ previousNode: 'Trigger', previousNodeOutput: 0 }] },
	};
}

// The tests start dist/worker.js. Run `pnpm build` first.
describe('code runtime worker', () => {
	it('runs runCode tasks with additional properties', async () => {
		const run = await runWorker({
			settings: settings('return items.length', 'runCode', {
				additionalProperties: { items: [1, 2, 3] },
			}),
			data: null,
			binaries: [],
		});
		expect(run.final.error?.message ?? 'ok').toBe('ok');
		expect(run.result?.result).toBe(3);
	});

	it('runs once for all items with the data proxy and native console', async () => {
		const run = await runWorker({
			settings: settings(
				"console.log('hello', 42); console.error('warn'); return $input.all().map(i => ({ json: { v: i.json.v * 2, first: $('Trigger').first().json.v } }))",
				'runOnceForAllItems',
			),
			data: newData([{ json: { v: 1 } }, { json: { v: 2 } }]),
			binaries: [],
		});
		expect(run.final.error?.message ?? 'ok').toBe('ok');
		expect(run.result?.result).toEqual([
			{ json: { v: 2, first: 1 } },
			{ json: { v: 4, first: 1 } },
		]);
		expect(run.stdout).toBe('hello 42\n');
		expect(run.stderr).toBe('warn\n');
	});

	it('runs once for each item in a chunk', async () => {
		const run = await runWorker({
			settings: settings('return { json: { v: $json.v + 1 } }', 'runOnceForEachItem', {
				chunk: { startIndex: 1, count: 1 },
			}),
			data: {
				...newData([{ json: { v: 10 } }, { json: { v: 20 } }]),
				inputData: { main: [[{ json: { v: 20 } }]] },
			},
			binaries: [],
		});
		expect(run.result?.result).toEqual([{ json: { v: 21 }, pairedItem: { item: 1 } }]);
	});

	it('reports user errors with the line number like the task runner', async () => {
		const run = await runWorker({
			settings: settings('const a = 1;\nnull.x;\nreturn []', 'runOnceForAllItems'),
			data: newData([{ json: {} }]),
			binaries: [],
		});
		expect(run.final.type).toBe('error');
		expect(run.final.error?.message).toBe("Cannot read properties of null (reading 'x') [line 2]");
		expect(run.final.error?.description).toBe('TypeError');
	});

	it('returns continueOnFail errors as items', async () => {
		const run = await runWorker({
			settings: settings("throw new Error('nope')", 'runOnceForAllItems', { continueOnFail: true }),
			data: newData([{ json: {} }]),
			binaries: [],
		});
		expect(run.result?.result).toEqual([{ json: { error: 'nope [line 1]' } }]);
	});

	it('calls httpRequest over RPC and decodes buffers', async () => {
		const calls: WorkerMessage[] = [];
		const run = await runWorker(
			{
				settings: settings(
					"const r = await helpers.httpRequest({ url: 'http://x' }); const b = await helpers.httpRequest({ url: 'http://b' }); return [{ json: { r, b: b.toString() } }]",
					'runOnceForAllItems',
				),
				data: newData([{ json: {} }]),
				binaries: [],
			},
			{},
			(m) => {
				calls.push(m);
				const url = (m.params![0] as { url: string }).url;
				return url === 'http://b'
					? { ok: true, data: { type: 'Buffer', data: [104, 105] } }
					: { ok: true, data: { status: 'ok' } };
			},
		);
		expect(run.final.error?.message ?? 'ok').toBe('ok');
		expect(calls.map((c) => c.name)).toEqual(['helpers.httpRequest', 'helpers.httpRequest']);
		expect(run.result?.result).toEqual([{ json: { r: { status: 'ok' }, b: 'hi' } }]);
		expect(run.final.timings?.rpcCount).toBe(2);
	});

	it('passes RPC errors to the user code', async () => {
		const run = await runWorker(
			{
				settings: settings(
					"try { await helpers.httpRequest({ url: 'http://10.0.0.1' }) } catch (e) { return [{ json: { m: e.message, c: e.httpCode } }] }",
					'runOnceForAllItems',
				),
				data: newData([{ json: {} }]),
				binaries: [],
			},
			{},
			() => ({ ok: false, error: { message: 'blocked by SSRF protection', httpCode: '403' } }),
		);
		expect(run.result?.result).toEqual([{ json: { m: 'blocked by SSRF protection', c: '403' } }]);
	});

	it('reads staged binaries and writes output binaries', async () => {
		const items: INodeExecutionData[] = [
			{
				json: {},
				binary: {
					data: {
						id: 'filesystem-v2:abc',
						data: 'filesystem-v2',
						mimeType: 'text/plain',
						fileName: 'a.txt',
					},
				},
			},
		];
		const run = await runWorker(
			{
				settings: settings(
					"const buf = await helpers.getBinaryDataBuffer(0, 'data'); const meta = helpers.assertBinaryData(0, 'data'); const out = await helpers.prepareBinaryData(Buffer.from(buf.toString().toUpperCase()), 'b.txt'); return [{ json: { n: meta.fileName }, binary: { out } }]",
					'runOnceForAllItems',
				),
				data: newData(items),
				binaries: [{ itemIndex: 0, property: 'data', path: 'bin/0', id: 'filesystem-v2:abc' }],
			},
			{ 'bin/0': 'hello' },
		);
		expect(run.final.error?.message ?? 'ok').toBe('ok');
		const out = (run.result!.result as INodeExecutionData[])[0].binary!.out;
		expect(out.id).toMatch(/^sandbox-out:/);
		expect(out.fileName).toBe('b.txt');
		const uuid = out.id!.slice('sandbox-out:'.length);
		expect(run.result?.binaries?.[uuid]).toEqual({ fileName: 'b.txt' });
		expect(await readFile(path.join(run.dir, 'out', 'bin', uuid), 'utf-8')).toBe('HELLO');
		expect(run.final.timings?.binaryReads).toBe(1);
	});

	it('has no language guards', async () => {
		const run = await runWorker({
			settings: settings(
				"const fs = require('fs'); return [{ json: { e: eval('1+1'), f: new Function('return 3')(), fs: typeof fs.readFileSync, p: typeof process.pid, env: Object.keys(process.env).filter(k => !k.startsWith('__')).sort() } }]",
				'runOnceForAllItems',
			),
			data: newData([{ json: {} }]),
			binaries: [],
		});
		expect(run.result?.result).toEqual([
			{ json: { e: 2, f: 3, fs: 'function', p: 'number', env: ['HOME', 'NODE_ENV', 'PATH'] } },
		]);
	});

	it('writes static data and custom data back', async () => {
		const run = await runWorker({
			settings: settings(
				"const s = $getWorkflowStaticData('global'); s.count = 1; $execution.customData.set('k', 'v'); return []",
				'runOnceForAllItems',
			),
			data: newData([{ json: {} }]),
			binaries: [],
		});
		expect(run.final.error?.message ?? 'ok').toBe('ok');
		expect(run.result?.customData).toEqual({ k: 'v' });
		expect(run.result?.staticData).toMatchObject({ global: { count: 1 } });
		expect(await readdir(path.join(run.dir, 'out'))).toContain('result.json');
	});
});

describe('shared worker (reuse mode)', () => {
	type SharedMessage = WorkerMessage & {
		taskId?: string;
		stream?: string;
		text?: string;
	};

	async function taskDir(task: Omit<CodeTaskFile, 'taskId'>) {
		const dir = await mkdtemp(path.join(tmpdir(), 'code-runtime-shared-'));
		dirs.push(dir);
		await mkdir(path.join(dir, 'in'), { recursive: true });
		await mkdir(path.join(dir, 'out', 'bin'), { recursive: true });
		await writeFile(path.join(dir, 'in', 'task.json'), JSON.stringify({ taskId: 't', ...task }));
		return dir;
	}

	const runCode = async (code: string, additionalProperties: Record<string, unknown> = {}) =>
		await taskDir({
			settings: settings(code, 'runCode', { additionalProperties }),
			data: null,
			binaries: [],
		});

	async function readResult(dir: string) {
		return JSON.parse(
			await readFile(path.join(dir, 'out', 'result.json'), 'utf-8'),
		) as CodeTaskResultFile;
	}

	/** Starts one worker and gives helpers to run tasks in it. */
	async function sharedWorker() {
		const child = spawn(process.execPath, workerArgs, {
			stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
			env: { PATH: process.env.PATH, NODE_ENV: 'production' },
		});
		const ctrl = child.stdio[3] as Socket;
		let rawStdout = '';
		child.stdout!.on('data', (c: Buffer) => (rawStdout += c.toString()));
		const output = new Map<string, string>();
		const terminal = new Map<string, (m: SharedMessage) => void>();
		let onReady: () => void = () => {};
		const ready = new Promise<void>((r) => (onReady = r));
		let buf = '';
		ctrl.on('data', (chunk: Buffer) => {
			buf += chunk.toString();
			let nl = buf.indexOf('\n');
			while (nl !== -1) {
				const msg = JSON.parse(buf.slice(0, nl)) as SharedMessage;
				buf = buf.slice(nl + 1);
				if (msg.type === 'ready') onReady();
				else if (msg.type === 'output') {
					output.set(msg.taskId!, (output.get(msg.taskId!) ?? '') + msg.text);
				} else if (['done', 'error', 'cancelled'].includes(msg.type)) {
					terminal.get(msg.taskId!)?.(msg);
				}
				nl = buf.indexOf('\n');
			}
		});
		await ready;
		const send = (m: object) => ctrl.write(JSON.stringify(m) + '\n');
		const run = async (taskId: string, dir: string) => {
			const end = new Promise<SharedMessage>((r) => terminal.set(taskId, r));
			send({ type: 'start', taskId, dir, deadline: Date.now() + 10_000, shared: true });
			return await end;
		};
		const cancel = async (taskId: string) => {
			const end = new Promise<SharedMessage>((r) => terminal.set(taskId, r));
			send({ type: 'cancel', taskId });
			return await end;
		};
		return { child, run, cancel, output, rawStdout: () => rawStdout };
	}

	it('runs tasks at the same time in one process, each with its own built-ins and output', async () => {
		const w = await sharedWorker();
		const code =
			'await new Promise((r) => setTimeout(r, 200)); console.log(name); leaked = name; return [name, this.name, process.pid]';
		const [dirA, dirB] = await Promise.all([
			runCode(code, { name: 'A' }),
			runCode(code, { name: 'B' }),
		]);
		const start = Date.now();
		const [a, b] = await Promise.all([w.run('a', dirA), w.run('b', dirB)]);
		expect(Date.now() - start).toBeLessThan(380);
		expect([a.type, b.type]).toEqual(['done', 'done']);
		const resA = await readResult(dirA);
		const resB = await readResult(dirB);
		expect(resA.result).toEqual(['A', 'A', w.child.pid]);
		expect(resB.result).toEqual(['B', 'B', w.child.pid]);
		expect(w.output.get('a')).toBe('A\n');
		expect(w.output.get('b')).toBe('B\n');
		expect(w.rawStdout()).toBe('');

		// No task runs any more, so the globals of the tasks are gone.
		const dirC = await runCode('return [typeof leaked, typeof name]');
		expect((await w.run('c', dirC)).timings?.workerTasks).toBe(3);
		expect((await readResult(dirC)).result).toEqual(['undefined', 'undefined']);
		w.child.kill();
	});

	it('splits long output', async () => {
		const w = await sharedWorker();
		const dir = await runCode("console.log('😀'.repeat(20000)); return 1");
		expect((await w.run('l', dir)).type).toBe('done');
		expect(w.output.get('l')).toBe('😀'.repeat(20000) + '\n');
		w.child.kill();
	});

	it('gives each task its own data proxy', async () => {
		const w = await sharedWorker();
		const code =
			'await new Promise((r) => setTimeout(r, 50)); return $input.all().map((i) => ({ json: { v: i.json.v * 2 } }))';
		const dirs2 = await Promise.all(
			[1, 2].map(
				async (v) =>
					await taskDir({
						settings: settings(code, 'runOnceForAllItems'),
						data: newData([{ json: { v } }]),
						binaries: [],
					}),
			),
		);
		await Promise.all(dirs2.map(async (d, i) => await w.run(`p${i}`, d)));
		expect((await readResult(dirs2[0])).result).toEqual([{ json: { v: 2 } }]);
		expect((await readResult(dirs2[1])).result).toEqual([{ json: { v: 4 } }]);

		const dirErr = await taskDir({
			settings: settings('const a = 1;\nnull.x;\nreturn []', 'runOnceForAllItems'),
			data: newData([{ json: {} }]),
			binaries: [],
		});
		const failed = await w.run('e', dirErr);
		expect(failed.error?.message).toBe("Cannot read properties of null (reading 'x') [line 2]");
		w.child.kill();
	});

	it('drops a cancelled task and keeps running', async () => {
		const w = await sharedWorker();
		const dirHang = await runCode("await new Promise(() => {}); console.log('never')");
		const hang = w.run('h', dirHang);
		expect((await w.cancel('h')).type).toBe('cancelled');
		void hang;
		const dirNext = await runCode('return process.pid');
		expect((await w.run('n', dirNext)).type).toBe('done');
		expect((await readResult(dirNext)).result).toBe(w.child.pid);
		w.child.kill();
	});

	it('fails only the task of an uncaught error or an unhandled rejection', async () => {
		const w = await sharedWorker();
		const slow = await runCode(
			"await new Promise((r) => setTimeout(r, 300)); console.log('still here'); return 'ok'",
		);
		const slowRun = w.run('s', slow);
		const timer = await runCode(
			"setTimeout(() => { throw new Error('late') }, 10); await new Promise((r) => setTimeout(r, 200)); return 1",
		);
		const rejection = await runCode(
			"Promise.reject(new Error('rej')); await new Promise((r) => setTimeout(r, 200)); return 1",
		);
		const [t, r] = await Promise.all([w.run('t', timer), w.run('r', rejection)]);
		expect(t.type).toBe('error');
		expect(t.error?.message).toContain('late');
		expect(r.type).toBe('error');
		expect(r.error?.message).toContain('rej');
		expect((await slowRun).type).toBe('done');
		expect(w.output.get('s')).toBe('still here\n');
		expect(w.child.exitCode).toBeNull();
		w.child.kill();
	});
});
