#!/usr/bin/env node
// Runs on each codespace start. Installs the skills marketplace, starts the worker.
import { execFileSync } from 'node:child_process';

const MARKETPLACE = 'n8n-io/n8n-agent-skills';
const PLUGIN = 'quality@n8n-claude-skills';

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

tryRun('skills repo reachable', 'git', ['ls-remote', `https://github.com/${MARKETPLACE}`, 'HEAD']);

if (tryRun('marketplace add', 'claude', ['plugin', 'marketplace', 'add', MARKETPLACE]))
	tryRun('plugin install', 'claude', ['plugin', 'install', PLUGIN]);

tryRun('worker start', 'tmux', [
	'new-session',
	'-d',
	'-s',
	'agent-worker',
	'bash -lc "export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1 CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1; node /workspaces/n8n/.devcontainer/codespaces/agent-worker.mjs >> /tmp/agent-worker.log 2>&1"',
]);
