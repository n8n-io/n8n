import { TASK_INPUT_PATH, TASK_RESULT_PATH } from '@n8n/code-task-contract';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { duplexPair } from 'node:stream';

import { MAX_CONTROL_MESSAGE_BYTES } from '../control-protocol';
import { serveTasks } from '../runtime';
import { newTaskInput } from './fixtures';

let workDir: string;

beforeEach(async () => {
	workDir = await mkdtemp(join(tmpdir(), 'code-runtime-js-'));
});

afterEach(async () => {
	await rm(workDir, { recursive: true, force: true });
});

/** Writes a task folder as the daemon does: the input file in `in`, an empty `out`. */
async function writeTaskDir(taskId: string, taskInput: unknown) {
	const dir = join(workDir, taskId);
	await mkdir(join(dir, 'in'), { recursive: true });
	await mkdir(join(dir, 'out'));
	await writeFile(join(dir, 'in', TASK_INPUT_PATH), JSON.stringify(taskInput));
	return dir;
}

async function readResult(dir: string): Promise<unknown> {
	return JSON.parse(await readFile(join(dir, 'out', TASK_RESULT_PATH), 'utf8'));
}

/** Starts the runtime on one end of a socket pair, and returns the end of the daemon. */
function startDaemonSide() {
	const [daemonEnd, runtimeEnd] = duplexPair();
	serveTasks(runtimeEnd);
	const lines = createInterface({ input: daemonEnd })[Symbol.asyncIterator]();

	return {
		start: (taskId: string, dir: string) =>
			daemonEnd.write(`${JSON.stringify({ type: 'start', taskId, dir })}\n`),
		nextLine: async () => {
			const { value } = await lines.next();
			return value as string;
		},
		nextMessage: async () => {
			const { value } = await lines.next();
			return JSON.parse(value as string) as unknown;
		},
	};
}

describe('serveTasks', () => {
	it('reports ready, runs a task, writes the result file and reports done', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir(
			't1',
			newTaskInput('console.log("hi"); return items.map((item) => item.json.a)', [
				{ json: { a: 1 } },
			]),
		);

		expect(await daemon.nextMessage()).toEqual({ type: 'ready' });
		daemon.start('t1', dir);

		expect(await daemon.nextMessage()).toEqual({ type: 'done', taskId: 't1' });
		expect(await readResult(dir)).toEqual({
			version: 1,
			status: 'success',
			result: [1],
			console: { entries: [["'hi'"]] },
		});
	});

	it('reports a user error and keeps the console output in the result file', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir(
			't1',
			newTaskInput('console.log(1);\nthrow new RangeError("Too far")'),
		);

		await daemon.nextMessage();
		daemon.start('t1', dir);

		expect(await daemon.nextMessage()).toMatchObject({
			type: 'error',
			taskId: 't1',
			error: { message: 'Too far [line 2]', description: 'RangeError', lineNumber: 2 },
		});
		expect(await readResult(dir)).toMatchObject({
			status: 'error',
			error: { message: 'Too far [line 2]' },
			console: { entries: [['1']] },
		});
	});

	it('reports an error for a result that JSON cannot hold', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir('t1', newTaskInput('const a = {}; a.self = a; return [a]'));

		await daemon.nextMessage();
		daemon.start('t1', dir);

		const message = {
			type: 'error',
			taskId: 't1',
			error: { message: expect.stringContaining('circular structure') },
		};
		expect(await daemon.nextMessage()).toMatchObject(message);
		expect(await readResult(dir)).toMatchObject({ status: 'error', error: message.error });
	});

	it('reports an error without a result file for an invalid task input', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir('t1', { ...newTaskInput('return []'), version: 2 });

		await daemon.nextMessage();
		daemon.start('t1', dir);

		expect(await daemon.nextMessage()).toMatchObject({
			type: 'error',
			taskId: 't1',
			error: { message: expect.stringContaining('Unsupported version 2') },
		});
		await expect(readResult(dir)).rejects.toThrow('ENOENT');
	});

	it('cuts an error that does not fit in a control message, and keeps it whole in the result file', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir('t1', newTaskInput('throw new Error("x".repeat(1024 * 1024))'));

		await daemon.nextMessage();
		daemon.start('t1', dir);

		const line = await daemon.nextLine();
		expect(Buffer.byteLength(`${line}\n`)).toBeLessThanOrEqual(MAX_CONTROL_MESSAGE_BYTES);
		expect(JSON.parse(line)).toMatchObject({ type: 'error', taskId: 't1' });
		const result = (await readResult(dir)) as { error: { message: string } };
		expect(result.error.message).toHaveLength(1024 * 1024 + ' [line 1]'.length);
	});

	it('keeps the JSON of an n8n error, as its toJSON method shapes it', async () => {
		const daemon = startDaemonSide();
		const dir = await writeTaskDir('t1', newTaskInput("return $('Missing').all()"));

		await daemon.nextMessage();
		daemon.start('t1', dir);

		// The toJSON method of an n8n error leaves out the stack
		const message = (await daemon.nextMessage()) as { error: Record<string, unknown> };
		expect(message.error).not.toHaveProperty('stack');
	});

	it('reports an error that throws on every access, and keeps serving tasks', async () => {
		const daemon = startDaemonSide();
		const bad = await writeTaskDir(
			'bad',
			newTaskInput('throw { get message() { throw Object.create(null) } }'),
		);
		const good = await writeTaskDir('good', newTaskInput('return []'));

		await daemon.nextMessage();
		daemon.start('bad', bad);

		expect(await daemon.nextMessage()).toEqual({
			type: 'error',
			taskId: 'bad',
			error: { message: 'Unknown error' },
		});
		daemon.start('good', good);
		expect(await daemon.nextMessage()).toEqual({ type: 'done', taskId: 'good' });
	});

	it('runs tasks at the same time and reports each by its task ID', async () => {
		const daemon = startDaemonSide();
		const slow = await writeTaskDir(
			'slow',
			newTaskInput('await new Promise((resolve) => setTimeout(resolve, 100)); return []'),
		);
		const fast = await writeTaskDir('fast', newTaskInput('return []'));

		await daemon.nextMessage();
		daemon.start('slow', slow);
		daemon.start('fast', fast);

		expect(await daemon.nextMessage()).toEqual({ type: 'done', taskId: 'fast' });
		expect(await daemon.nextMessage()).toEqual({ type: 'done', taskId: 'slow' });
	});
});
