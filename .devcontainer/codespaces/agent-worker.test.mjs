import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { openCodeEnvironment, pollOnce, runOpenCode, startSlackProgress } from './agent-worker.mjs';

const turn = {
	turnId: 'turn-1',
	slack: { channel: 'C123', thread_ts: '123.456' },
};

function slackRecorder() {
	const calls = [];
	return {
		calls,
		async call(method, body) {
			calls.push({ method, body });
			return method === 'chat.postMessage' ? { ok: true, ts: '456.789' } : { ok: true };
		},
	};
}

async function waitFor(check) {
	for (let attempt = 0; attempt < 100; attempt++) {
		if (check()) return;
		await sleep(5);
	}
	throw new Error('Condition was not met');
}

function childProcess() {
	const child = new EventEmitter();
	child.pid = 123;
	child.stdin = new PassThrough();
	child.stdout = new PassThrough();
	child.stderr = new PassThrough();
	child.kill = () => {};
	return child;
}

function completedChild(lines) {
	const child = childProcess();
	setImmediate(() => {
		for (const line of lines) child.stdout.write(`${line}\n`);
		child.stdout.end();
		child.stderr.end();
		child.emit('close', 0);
	});
	return child;
}

test('backs off idle polls and resets when work arrives', async () => {
	let interval = 3000;
	const waits = [];
	const turns = [null, null, null, null, null, { turnId: '1' }, { turnId: '2' }];
	const handled = [];
	for (let attempt = 0; attempt < 5; attempt++) {
		interval = await pollOnce(interval, {
			dequeueTurn: async () => turns.shift(),
			handleTurn: async (turn) => handled.push(turn.turnId),
			wait: async (delay) => waits.push(delay),
		});
	}
	assert.deepEqual(waits, [3000, 6000, 12_000, 24_000, 30_000]);
	assert.equal(interval, 30_000);

	interval = await pollOnce(interval, {
		dequeueTurn: async () => turns.shift(),
		handleTurn: async (turn) => handled.push(turn.turnId),
		wait: async (delay) => waits.push(delay),
	});
	interval = await pollOnce(interval, {
		dequeueTurn: async () => turns.shift(),
		handleTurn: async (turn) => handled.push(turn.turnId),
		wait: async (delay) => waits.push(delay),
	});
	assert.equal(interval, 3000);
	assert.deepEqual(handled, ['1', '2']);
	assert.equal(waits.length, 5);
});

test('backs off after a dequeue error', async () => {
	const waits = [];
	const errors = [];
	const interval = await pollOnce(3000, {
		dequeueTurn: async () => {
			throw new Error('unavailable');
		},
		wait: async (delay) => waits.push(delay),
		logError: (error) => errors.push(error),
	});
	assert.equal(interval, 6000);
	assert.deepEqual(waits, [3000]);
	assert.deepEqual(errors, ['poll error: unavailable']);
});

test('resets the interval before handling work', async () => {
	const waits = [];
	const errors = [];
	const interval = await pollOnce(30_000, {
		dequeueTurn: async () => ({ turnId: '1' }),
		handleTurn: async () => {
			throw new Error('failed');
		},
		wait: async (delay) => waits.push(delay),
		logError: (error) => errors.push(error),
	});
	assert.equal(interval, 6000);
	assert.deepEqual(waits, [3000]);
	assert.deepEqual(errors, ['poll error: failed']);
});

test('streams tool progress but excludes reasoning', async () => {
	const slack = slackRecorder();
	const progress = await startSlackProgress(turn, {
		callSlack: slack.call,
		updateInterval: 50,
	});

	progress.event({
		type: 'reasoning',
		sessionID: 'ses_1',
		part: { id: 'prt_reason', type: 'reasoning', text: 'private reasoning' },
	});
	progress.event({
		type: 'tool_use',
		sessionID: 'ses_1',
		part: {
			id: 'prt_tool',
			type: 'tool',
			tool: 'read',
			state: { status: 'completed', title: 'Read worker source' },
		},
	});
	await sleep(100);

	const streamed = slack.calls.find((call) => call.method === 'chat.update')?.body.text;
	assert.match(streamed, /Done: Read worker source/);
	assert.doesNotMatch(streamed, /private reasoning/);
});

test('coalesces Slack updates within the configured interval', async () => {
	const slack = slackRecorder();
	const progress = await startSlackProgress(turn, {
		callSlack: slack.call,
		updateInterval: 50,
	});

	for (const [id, title] of ['One', 'Two', 'Three'].entries()) {
		progress.event({
			type: 'tool_use',
			sessionID: 'ses_1',
			part: {
				id: `prt_${id}`,
				type: 'tool',
				tool: 'read',
				state: { status: 'completed', title },
			},
		});
	}
	await sleep(100);
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 1);

	progress.event({
		type: 'tool_use',
		sessionID: 'ses_1',
		part: {
			id: 'prt_4',
			type: 'tool',
			tool: 'read',
			state: { status: 'completed', title: 'Four' },
		},
	});
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 1);
	await sleep(100);
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 2);
});

test('replaces progress with the final answer', async () => {
	const calls = [];
	let releaseProgress;
	const callSlack = async (method, body) => {
		calls.push({ method, body });
		if (method === 'chat.postMessage') return { ok: true, ts: '456.789' };
		if (calls.filter((call) => call.method === 'chat.update').length === 1) {
			return await new Promise((resolve) => (releaseProgress = () => resolve({ ok: true })));
		}
		return { ok: true };
	};
	const progress = await startSlackProgress(turn, {
		callSlack,
		updateInterval: 0,
	});
	progress.event({
		type: 'tool_use',
		sessionID: 'ses_1',
		part: {
			id: 'prt_tool',
			type: 'tool',
			tool: 'read',
			state: { status: 'completed', title: 'Read worker source' },
		},
	});
	await waitFor(() => calls.filter((call) => call.method === 'chat.update').length === 1);
	for (const title of ['Second tool', 'Third tool', 'Fourth tool']) {
		progress.event({
			type: 'tool_use',
			sessionID: 'ses_1',
			part: {
				id: title,
				type: 'tool',
				tool: 'read',
				state: { status: 'completed', title },
			},
		});
	}

	const finish = progress.finish('Final answer', 'ses_1', 'box-1');
	await sleep(10);
	assert.equal(calls.filter((call) => call.method === 'chat.update').length, 1);
	releaseProgress();
	await finish;

	assert.deepEqual(calls.at(-1), {
		method: 'chat.update',
		body: {
			channel: 'C123',
			ts: '456.789',
			text: 'Final answer\n\n⟳session:ses_1 ⟳box:box-1',
		},
	});
});

test('streams OpenCode CLI events and resumes an OpenCode session', async () => {
	let invocation;
	let prompt = '';
	const events = [];
	const result = await runOpenCode(
		{
			message: 'Test message',
			sessionId: 'ses_existing',
			cwd: '/workspaces/n8n',
			author: 'Tester',
		},
		(event) => events.push(event),
		() => {},
		{
			spawnProcess(command, args, options) {
				invocation = { command, args, options };
				const child = completedChild([
					JSON.stringify({ type: 'step_start', sessionID: 'ses_existing', part: {} }),
					JSON.stringify({
						type: 'tool_use',
						sessionID: 'ses_existing',
						part: { id: 'prt_1', type: 'tool', tool: 'read', state: { status: 'completed' } },
					}),
					JSON.stringify({
						type: 'text',
						sessionID: 'ses_existing',
						part: { id: 'prt_2', type: 'text', text: 'Completed response' },
					}),
				]);
				child.stdin.on('data', (chunk) => (prompt += chunk));
				return child;
			},
		},
	);

	assert.equal(result.result, 'Completed response');
	assert.equal(result.session_id, 'ses_existing');
	assert.deepEqual(invocation.args, [
		'run',
		'--model',
		'openrouter/openai/gpt-5.6-sol',
		'--format',
		'json',
		'--auto',
		'--session',
		'ses_existing',
	]);
	assert.equal(invocation.options.detached, true);
	assert.match(prompt, /# Request\nTest message/);
	assert.deepEqual(
		events.map((event) => event.type),
		['step_start', 'tool_use', 'text'],
	);
});

test('stops the OpenCode process group at the turn limit', async () => {
	const signals = [];
	let child;
	const run = runOpenCode(
		{ message: 'Test message', cwd: '/workspaces/n8n', author: 'Tester' },
		() => {},
		() => {},
		{
			spawnProcess() {
				child = childProcess();
				return child;
			},
			stopProcess(_child, signal) {
				signals.push(signal);
				if (signal === 'SIGTERM') setImmediate(() => child.emit('close', null));
			},
			killDelay: 5,
			timeout: 1,
		},
	);

	await assert.rejects(run, /The turn passed the 1-millisecond limit/);
	assert.deepEqual(signals, ['SIGTERM']);
});

test('keeps broker credentials out of the OpenCode process', () => {
	const environment = openCodeEnvironment({
		AGENT_WORKER_TOKEN: 'worker',
		N8N_DEQUEUE_URL: 'https://example.com',
		SLACK_BOT_TOKEN: 'slack',
		ANTHROPIC_API_KEY: 'model',
		OPENROUTER_API_KEY: 'openrouter',
		GITHUB_TOKEN: 'github',
	});
	assert.deepEqual(JSON.parse(environment.OPENCODE_CONFIG_CONTENT), {
		provider: { openrouter: { options: { apiKey: '{env:OPENROUTER_API_KEY}' } } },
	});
	delete environment.OPENCODE_CONFIG_CONTENT;
	assert.deepEqual(environment, {
		ANTHROPIC_API_KEY: 'model',
		OPENROUTER_API_KEY: 'openrouter',
		GITHUB_TOKEN: 'github',
	});
});
