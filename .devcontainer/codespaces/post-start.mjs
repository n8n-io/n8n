#!/usr/bin/env node
// Runs on each codespace start. It installs the private skills marketplace into
// Claude Code (best-effort), then starts the agent worker.
//
// The codespace's own GitHub token is granted read access to the marketplace
// repo via customizations.codespaces.repositories in devcontainer.json (each
// user authorizes it once at codespace creation). So git — and Claude Code's
// clone — read it with the codespace's normal auth, no extra token. If a user
// did not authorize it, the clone fails and the skills step is skipped. The
// worker always starts.
import { execFileSync } from 'node:child_process';

const MARKETPLACE = 'n8n-io/n8n-claude-skills';
const PLUGIN = 'quality@n8n-claude-skills';

function tryRun(label, cmd, args) {
	try {
		execFileSync(cmd, args, { stdio: 'inherit' });
		return true;
	} catch (error) {
		console.error(`${label}: ${error.message}`);
		return false;
	}
}

if (tryRun('marketplace add', 'claude', ['plugin', 'marketplace', 'add', MARKETPLACE]))
	tryRun('plugin install', 'claude', ['plugin', 'install', PLUGIN]);

// Start the poll worker, detached, so it survives this script exiting.
tryRun('worker start', 'tmux', [
	'new-session',
	'-d',
	'-s',
	'agent-worker',
	'bash -lc "node /workspaces/n8n/.devcontainer/codespaces/agent-worker.mjs >> /tmp/agent-worker.log 2>&1"',
]);
