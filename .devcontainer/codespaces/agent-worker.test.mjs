import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

import { openCodeEnvironment, runOpenCode, startSlackProgress } from './agent-worker.mjs';

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

function childProcess(lines, code = 0, close = true) {
	const child = new EventEmitter();
	child.pid = 123;
	child.stdin = new PassThrough();
	child.stdout = new PassThrough();
	child.stderr = new PassThrough();
	child.kill = () => {};
	if (close)
		setImmediate(() => {
			for (const line of lines) child.stdout.write(`${line}\n`);
			child.stdout.end();
			child.stderr.end();
			child.emit('close', code);
		});
	return child;
}

test('streams text and tool progress but excludes reasoning', async () => {
	const slack = slackRecorder();
	const progress = await startSlackProgress(turn, {
		token: 'test',
		callSlack: slack.call,
		updateInterval: 50,
	});

	progress.event('ses_1', {
		type: 'reasoning',
		sessionID: 'ses_1',
		part: { id: 'prt_reason', type: 'reasoning', text: 'private reasoning' },
	});
	progress.event('ses_1', {
		type: 'tool_use',
		sessionID: 'ses_1',
		part: {
			id: 'prt_tool',
			type: 'tool',
			tool: 'read',
			state: { status: 'completed', title: 'Read worker source' },
		},
	});
	progress.event('ses_1', {
		type: 'text',
		sessionID: 'ses_1',
		part: { id: 'prt_text', type: 'text', text: 'Visible answer' },
	});
	await sleep(100);

	const streamed = slack.calls.find((call) => call.method === 'chat.update')?.body.text;
	assert.match(streamed, /Done: Read worker source/);
	assert.match(streamed, /Visible answer/);
	assert.doesNotMatch(streamed, /private reasoning|must stay hidden/);
});

test('coalesces Slack updates within the configured interval', async () => {
	const slack = slackRecorder();
	const progress = await startSlackProgress(turn, {
		token: 'test',
		callSlack: slack.call,
		updateInterval: 50,
	});

	for (const text of ['One', 'Two', 'Three']) {
		progress.event('ses_1', {
			type: 'text',
			sessionID: 'ses_1',
			part: { id: 'prt_text', type: 'text', text },
		});
	}
	await sleep(100);
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 1);

	progress.event('ses_1', {
		type: 'text',
		sessionID: 'ses_1',
		part: { id: 'prt_text_2', type: 'text', text: 'Four' },
	});
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 1);
	await sleep(100);
	assert.equal(slack.calls.filter((call) => call.method === 'chat.update').length, 2);
});

test('replaces progress with the final answer', async () => {
	const slack = slackRecorder();
	const progress = await startSlackProgress(turn, {
		token: 'test',
		callSlack: slack.call,
		updateInterval: 50,
	});
	progress.event('ses_1', {
		type: 'tool_use',
		sessionID: 'ses_1',
		part: {
			id: 'prt_tool',
			type: 'tool',
			tool: 'read',
			state: { status: 'completed', title: 'Read worker source' },
		},
	});
	await waitFor(() => slack.calls.filter((call) => call.method === 'chat.update').length === 1);
	const firstUpdateAt = Date.now();

	await progress.finish('Final answer');

	assert.deepEqual(slack.calls.at(-1), {
		method: 'chat.update',
		body: { channel: 'C123', ts: '456.789', text: 'Final answer' },
	});
	assert.ok(Date.now() - firstUpdateAt >= 40);
});

test('streams OpenCode CLI events and resumes an OpenCode session', async () => {
	let invocation;
	let prompt = '';
	const events = [];
	const result = await runOpenCode(
		{
			turnId: 'turn-1',
			message: 'Test message',
			sessionId: 'ses_existing',
			cwd: '/workspaces/n8n',
			author: 'Tester',
		},
		(_sessionId, event) => events.push(event),
		() => {},
		{
			spawnProcess(command, args, options) {
				invocation = { command, args, options };
				const child = childProcess([
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

test('starts a new OpenCode session when the previous session used another harness', async () => {
	let args;
	let sessionId;
	const result = await runOpenCode(
		{
			message: 'Test message',
			sessionId: 'legacy-session-id',
			cwd: '/workspaces/n8n',
			author: 'Tester',
		},
		() => {},
		(id) => (sessionId = id),
		{
			spawnProcess(_command, processArgs) {
				args = processArgs;
				return childProcess([
					JSON.stringify({
						type: 'text',
						sessionID: 'ses_new',
						part: { id: 'prt_1', type: 'text', text: 'New session response' },
					}),
				]);
			},
		},
	);

	assert.deepEqual(args, ['run', '--format', 'json', '--auto']);
	assert.equal(sessionId, 'ses_new');
	assert.equal(result.session_id, 'ses_new');
});

test('starts a new session when a saved OpenCode session is missing', async () => {
	let invocations = 0;
	const result = await runOpenCode(
		{
			message: 'Test message',
			sessionId: 'ses_missing',
			cwd: '/workspaces/n8n',
			author: 'Tester',
		},
		() => {},
		() => {},
		{
			spawnProcess() {
				invocations++;
				if (invocations === 1) {
					const child = childProcess([], 1);
					child.stderr.write('Session not found');
					return child;
				}
				return childProcess([
					JSON.stringify({
						type: 'text',
						sessionID: 'ses_replacement',
						part: { id: 'prt_1', type: 'text', text: 'Replacement session response' },
					}),
				]);
			},
		},
	);

	assert.equal(invocations, 2);
	assert.equal(result.session_id, 'ses_replacement');
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
				child = childProcess([], 0, false);
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

	await assert.rejects(run, /timed out after 1ms/);
	await sleep(10);
	assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
});

test('keeps broker credentials out of the OpenCode process', () => {
	assert.deepEqual(
		openCodeEnvironment({
			AGENT_WORKER_TOKEN: 'worker',
			N8N_DEQUEUE_URL: 'https://example.com',
			SLACK_BOT_TOKEN: 'slack',
			ANTHROPIC_API_KEY: 'model',
			GITHUB_TOKEN: 'github',
		}),
		{ ANTHROPIC_API_KEY: 'model', GITHUB_TOKEN: 'github' },
	);
});
