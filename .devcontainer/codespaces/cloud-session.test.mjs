import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const sessionScript = join(repoRoot, 'scripts/cloud-session.mjs');
let fixtureDir;
let invocation = 0;

before(() => {
	fixtureDir = mkdtempSync(join(tmpdir(), 'cloud-session-'));
	const mockGh = join(fixtureDir, 'gh');
	writeFileSync(
		mockGh,
		`#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
const args = process.argv.slice(2);
if (args[0] === 'codespace' && args[1] === 'list') {
	process.stdout.write('[{"name":"test-codespace","state":"Available"}]\\n');
} else {
	writeFileSync(process.env.GH_CAPTURE, JSON.stringify(args));
}
`,
	);
	chmodSync(mockGh, 0o755);
});

after(() => rmSync(fixtureDir, { recursive: true, force: true }));

function runSession(args) {
	const capture = join(fixtureDir, `invocation-${invocation++}.json`);
	const result = spawnSync(process.execPath, [sessionScript, ...args], {
		encoding: 'utf8',
		env: {
			...process.env,
			GH_CAPTURE: capture,
			PATH: `${fixtureDir}:${process.env.PATH}`,
		},
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(readFileSync(capture, 'utf8'));
}

function remoteCommand(args) {
	const invocationArgs = runSession(args);
	assert.deepEqual(invocationArgs.slice(0, 6), [
		'codespace',
		'ssh',
		'-c',
		'test-codespace',
		'--',
		'-t',
	]);
	return invocationArgs[6];
}

test('starts a named OpenCode session in a worktree', () => {
	const command = remoteCommand(['--opencode', 'fix-flaky', '--model', 'test']);

	assert.match(command, /tmux new -As fix-flaky-opencode/);
	assert.match(command, /unset AGENT_WORKER_TOKEN N8N_DEQUEUE_URL SLACK_BOT_TOKEN/);
	assert.match(command, /OPENCODE_CONFIG_CONTENT/);
	assert.match(command, /git -C \/workspaces\/n8n worktree add "\/workspaces\/wt-fix-flaky"/);
	assert.match(command, /cd "\/workspaces\/wt-fix-flaky" && opencode --auto --model test/);
	assert.doesNotMatch(command, /unset OPENROUTER_API_KEY/);
	assert.doesNotMatch(command, /claude plugin/);
});

test('keeps removed credentials out of the login shell', () => {
	const command = remoteCommand(['--shell']);
	const profile = readFileSync(new URL('./codespaces-secrets.sh', import.meta.url), 'utf8');
	const dockerfile = readFileSync(new URL('./Dockerfile', import.meta.url), 'utf8');

	assert.match(command, /tmux new -As agent-shell/);
	assert.match(
		command,
		/unset AGENT_WORKER_TOKEN N8N_DEQUEUE_URL SLACK_BOT_TOKEN; unset OPENROUTER_API_KEY/,
	);
	assert.match(command, /export N8N_SKIP_CODESPACE_SECRETS=1; exec "\$\{SHELL:-\/bin\/bash\}" -l/);
	assert.ok(profile.includes('[ "${N8N_SKIP_CODESPACE_SECRETS:-}" = "1" ] && return'));
	assert.ok(
		dockerfile.includes(
			'RUN echo \'[ "${N8N_SKIP_CODESPACE_SECRETS:-}" = "1" ] || . /usr/local/lib/codespaces-env.sh\'',
		),
	);
	assert.doesNotMatch(command, /claude plugin|OPENCODE_CONFIG_CONTENT/);
});

test('keeps the existing Claude session behavior', () => {
	const command = remoteCommand(['agent', '--model', 'test']);

	assert.match(command, /tmux new -As agent/);
	assert.match(command, /unset OPENROUTER_API_KEY/);
	assert.match(command, /claude plugin marketplace add/);
	assert.match(command, /cd \/workspaces\/n8n && claude --model test/);
	assert.doesNotMatch(command, /OPENCODE_CONFIG_CONTENT|N8N_SKIP_CODESPACE_SECRETS/);
});
