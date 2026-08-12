#!/usr/bin/env node
// Runs on each codespace start. It wires the private skills marketplace into
// Claude Code (best-effort), then starts the agent worker.
//
// The codespace's own GitHub token can read only n8n-io/n8n, so cloning the
// private marketplace needs CLAUDE_SKILLS_TOKEN (a read-only PAT for
// n8n-io/n8n-claude-skills). If that secret is missing, the skills step is
// skipped. The worker always starts.
import { execFileSync } from 'node:child_process';

const SKILLS_TOKEN = process.env.CLAUDE_SKILLS_TOKEN;
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

if (SKILLS_TOKEN) {
	// Let git clone the private marketplace. The token stays in the git config,
	// not in any command output.
	const base = `https://github.com/${MARKETPLACE}`;
	tryRun('git auth', 'git', [
		'config',
		'--global',
		`url.https://x-access-token:${SKILLS_TOKEN}@github.com/${MARKETPLACE}.insteadOf`,
		base,
	]);
	tryRun('marketplace add', 'claude', ['plugin', 'marketplace', 'add', MARKETPLACE]);
	tryRun('plugin install', 'claude', ['plugin', 'install', PLUGIN]);
	console.log(`skills: attempted install of ${PLUGIN}`);
} else {
	console.log('skills: CLAUDE_SKILLS_TOKEN not set — skipping the skills marketplace');
}

// Start the poll worker, detached, so it survives this script exiting.
tryRun('worker start', 'tmux', [
	'new-session',
	'-d',
	'-s',
	'agent-worker',
	'bash -lc "node /workspaces/n8n/.devcontainer/codespaces/agent-worker.mjs >> /tmp/agent-worker.log 2>&1"',
]);
