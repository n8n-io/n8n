#!/usr/bin/env node
// Runs on each Codespace start. Installs the skills and harness, then starts the worker.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { installAgentHarness } from '../../scripts/agent-harness.mjs';
import { MARKETPLACE, PLUGINS } from './plugins.mjs';

const STATUS_FILE = '/tmp/post-start-status.json';

// Claude Code stages the marketplace clone here before renaming it to the cache dir.
// A clone that dies partway has been seen to leave the staging path in a state that
// fails the next clone ("cannot copy ... File exists"), so clear it before retrying.
const MARKETPLACE_STAGING = join(
	homedir(),
	'.claude/plugins/marketplaces',
	MARKETPLACE.replace('/', '-'),
);

// The codespace clones over HTTPS and has no SSH key. The loader defaults to SSH
// for "owner/repo", so it must prefer HTTPS or the private clone fails.
process.env.CLAUDE_CODE_PLUGIN_PREFER_HTTPS = '1';
process.env.CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE = '1';

function tryRun(label, cmd, args) {
	try {
		execFileSync(cmd, args, { stdio: 'inherit' });
		return true;
	} catch (error) {
		console.error(`${label}: ${error.message}`);
		return false;
	}
}

// Both commands are idempotent and exit 0 when the marketplace or plugin is already
// present, so a healthy start re-runs them cheaply and only a real failure retries.
function addMarketplace() {
	const add = (label) => tryRun(label, 'claude', ['plugin', 'marketplace', 'add', MARKETPLACE]);
	if (add('marketplace add')) return true;

	console.error(`marketplace add: clearing ${MARKETPLACE_STAGING} and retrying once`);
	try {
		rmSync(MARKETPLACE_STAGING, { recursive: true, force: true });
	} catch (error) {
		console.error(`marketplace staging cleanup: ${error.message}`);
		return false;
	}
	return add('marketplace add (retry)');
}

tryRun('skills repo reachable', 'git', ['ls-remote', `https://github.com/${MARKETPLACE}`, 'HEAD']);

const installed = [];
const failed = [];
if (addMarketplace()) {
	for (const plugin of PLUGINS) {
		const ok = tryRun(`plugin install ${plugin}`, 'claude', ['plugin', 'install', plugin]);
		(ok ? installed : failed).push(plugin);
	}
} else {
	failed.push(...PLUGINS);
}

// A skipped install is otherwise invisible until someone misses a skill mid-session.
if (failed.length > 0) {
	console.error(`\n!! SKILLS NOT INSTALLED: ${failed.join(', ')}`);
	console.error('!! Sessions start without them. Retry with:');
	console.error('!!   node /workspaces/n8n/.devcontainer/codespaces/post-start.mjs\n');
}
// Runs before the worker starts: a turn it dequeues may target one of these
// worktrees. Nothing else runs in them at container start, so this is the moment to
// drop the ones whose PR is merged or closed, or that idled for a week untouched.
// Dirty trees, unpushed commits and open PRs are kept. Report: /tmp/post-start.log.
const worktreesCleaned = tryRun('worktree cleanup', 'node', [
	'/workspaces/n8n/scripts/worktree-clean.mjs',
	'--yes',
]);

let harness;
try {
	const result = installAgentHarness();
	harness = { status: 'active', version: result.version, cacheHit: result.cacheHit };
} catch (error) {
	harness = { status: 'unavailable', error: error.message };
	console.error(`agent harness: ${error.message}`);
}

const workerStarted =
	harness.status === 'active' &&
	tryRun('worker start', 'tmux', [
		'new-session',
		'-d',
		'-s',
		'agent-worker',
		'bash -lc ". /usr/local/lib/codespaces-env.sh; export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1 CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1; node /workspaces/n8n/.devcontainer/codespaces/agent-worker.mjs >> /tmp/agent-worker.log 2>&1"',
	]);

if (!workerStarted && harness.status !== 'active') {
	console.error('worker start: skipped because the pinned agent harness is unavailable');
}

writeFileSync(
	STATUS_FILE,
	JSON.stringify({ installed, failed, harness, workerStarted, worktreesCleaned }, null, 2),
);
