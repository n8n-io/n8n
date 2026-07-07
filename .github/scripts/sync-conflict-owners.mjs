#!/usr/bin/env node
/**
 * Attributes a master→3.x sync conflict to the authors of the breaking commits.
 *
 * Since 3.x = master + breaking commits, the commits that diverged 3.x are exactly
 * `<base>..HEAD` (where <base> is the fetched master SHA). Scoped to the conflicted
 * files, those are the commits responsible for the conflict; their GitHub authors are
 * who to nudge. Must run while the merge is unresolved — HEAD still at the pre-merge
 * 3.x tip and unmerged paths present in the index.
 *
 * Emits a JSON object to stdout: { ownersCsv, slack, body }.
 *
 * Usage:
 *   node .github/scripts/sync-conflict-owners.mjs --base <masterSha> --sync-branch <name>
 *
 * Env: GITHUB_REPOSITORY (owner/repo), GH_TOKEN or GITHUB_TOKEN (for the commits API).
 * Requires Node 18+ (global fetch).
 */

import { execFileSync } from 'node:child_process';

export function runGit(args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

// Files with unresolved conflicts in the current (in-progress) merge.
export function conflictedFiles(git = runGit) {
	const out = git(['diff', '--name-only', '--diff-filter=U']);
	return out ? out.split('\n').filter(Boolean) : [];
}

// Unique SHAs of the 3.x-only (breaking) commits that touched the given files.
export function breakingShas(base, files, git = runGit) {
	const shas = new Set();
	for (const file of files) {
		const out = git(['log', `${base}..HEAD`, '--format=%H', '--', file]);
		for (const sha of out.split('\n').filter(Boolean)) shas.add(sha);
	}
	return [...shas];
}

// Resolve a commit SHA to its GitHub login, or null for bots / unlinked accounts.
export async function resolveLogin(repo, sha, token, fetchFn = fetch) {
	const res = await fetchFn(`https://api.github.com/repos/${repo}/commits/${sha}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'n8n-sync-conflict-owners',
		},
	});
	if (!res.ok) return null;
	const body = await res.json();
	const author = body.author;
	// `author` is the linked GitHub account (null when the commit email matches none).
	// Skip bots per our bot-detection convention (type, not a `[bot]` name match).
	if (!author || author.type === 'Bot' || !author.login) return null;
	return author.login;
}

// Build the conflict-PR body, reviewer CSV, and Slack owner line.
export function buildOutputs({ syncBranch, files, owners }) {
	const filesMd = files.map((f) => `- \`${f}\``).join('\n') || '_none detected_';
	const ownersMd = owners.length
		? owners.map((o) => `- @${o}`).join('\n')
		: '_Could not auto-attribute — review the conflicted files manually._';
	const slack = owners.length
		? `Likely owners (GitHub): ${owners.map((o) => `@${o}`).join(' ')}`
		: 'Could not auto-attribute owners.';
	const body = [
		`Automated \`master\`→\`3.x\` sync hit a merge conflict. Resolve the conflict markers on \`${syncBranch}\`, then merge this PR. **Daily syncs are paused until it is merged.**`,
		'',
		'### Conflicted files',
		filesMd,
		'',
		'### Likely owners',
		'Authors of the 3.x commits touching the conflicted files, requested as reviewers:',
		ownersMd,
	].join('\n');
	return { ownersCsv: owners.join(','), slack, body };
}

function getArg(name) {
	const i = process.argv.indexOf(`--${name}`);
	return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

async function main() {
	const base = getArg('base');
	const syncBranch = getArg('sync-branch') ?? 'sync/master-to-3x';
	const repo = process.env.GITHUB_REPOSITORY;
	const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

	if (!base) throw new Error('--base <masterSha> is required');
	if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	const files = conflictedFiles();
	const shas = breakingShas(base, files);

	const logins = new Set();
	for (const sha of shas) {
		const login = await resolveLogin(repo, sha, token);
		if (login) logins.add(login);
	}
	const owners = [...logins].sort();

	process.stdout.write(JSON.stringify(buildOutputs({ syncBranch, files, owners })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	});
}
