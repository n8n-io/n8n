#!/usr/bin/env node
/**
 * Syncs the master branch into the long-lived 3.x branch.
 *
 * During the v3 development window, master carries normal feature work (behind
 * opt-in flags) and 3.x is "master + breaking-change commits". This script
 * fast-forwards 3.x when possible, falls back to a three-way merge when 3.x has
 * diverged, and — when a merge conflict occurs — opens a draft conflict PR,
 * attributing it to the authors of the breaking commits. No further syncs run
 * until that PR is resolved and merged (see the halt gate below).
 *
 * Runs from a checkout of the 3.x branch (fetch-depth 0). Assumes credentials
 * are NOT persisted by checkout — pushes go through an explicit token URL.
 *
 * On conflict, emits `conflict_pr` and `conflict_owners` to $GITHUB_OUTPUT so a
 * downstream job can post to Slack.
 *
 * Env: GH_TOKEN (installation token with contents/pull-requests/issues write),
 *      GITHUB_REPOSITORY (owner/repo, auto-provided by Actions).
 * Requires Node 18+ (global fetch) and the `gh` CLI on PATH.
 *
 * See .github/DEVELOPING_V3.md for the full v3 development model.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { conflictedFiles, breakingShas, resolveLogins, buildOutputs } from './sync-conflict-owners.mjs';

export const TARGET_BRANCH = '3.x';
export const SYNC_BRANCH = 'sync/master-to-3x';
export const CONFLICT_LABEL = 'automation:v3-sync';

const BOT_NAME = 'n8n-assistant[bot]';
const BOT_EMAIL = 'n8n-assistant[bot]@users.noreply.github.com';

// Real command runners. Each takes an args array and returns trimmed stdout,
// throwing on a non-zero exit (mirrors `set -e`). Injectable for tests.
const runGit = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
const runGh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();

// True when a previous conflict PR is still open — the halt gate.
export function hasOpenConflictPr(gh, label = CONFLICT_LABEL) {
	const out = gh(['pr', 'list', '--state', 'open', '--label', label, '--json', 'number']);
	return JSON.parse(out || '[]').length > 0;
}

// Attempt the merge. `git merge` fast-forwards when 3.x has not diverged and
// does a three-way merge otherwise; a non-zero exit means a conflict.
export function tryMerge(git, masterSha, log = console.log) {
	try {
		git(['merge', '--no-edit', masterSha]);
		return true;
	} catch (error) {
		// Surface the merge output (conflict summary) before falling back.
		if (error.stdout) log(String(error.stdout).trim());
		return false;
	}
}

// Append key=value lines to $GITHUB_OUTPUT (no-op when running outside Actions).
export function writeGithubOutput(obj, env = process.env) {
	const path = env.GITHUB_OUTPUT;
	if (!path) return;
	const lines = Object.entries(obj)
		.map(([k, v]) => `${k}=${v ?? ''}`)
		.join('\n');
	appendFileSync(path, lines + '\n', 'utf8');
}

/**
 * Record the conflicted state on the sync branch and open a draft PR, attributing
 * it to the authors of the 3.x breaking commits touching the conflicted files.
 * Runs while the merge is unresolved (HEAD still at the pre-merge 3.x tip,
 * unmerged paths present) — before committing below.
 *
 * @returns {Promise<{ prUrl: string, ownersSlack: string }>}
 */
export async function openConflictPr({ git, gh, repo, token, masterSha, pushUrl, fetchFn = fetch, log = console.log }) {
	const files = conflictedFiles(git);
	const shas = breakingShas(masterSha, files, git);

	// Degrade gracefully: a transient API failure should still open the PR
	// (unattributed) rather than fail the whole sync.
	let owners = [];
	try {
		owners = await resolveLogins(repo, shas, token, fetchFn);
	} catch (error) {
		log(`warning: could not resolve owners: ${error.message}`);
	}

	const { ownersCsv, slack, body } = buildOutputs({ syncBranch: SYNC_BRANCH, files, owners });

	// Record the conflicted state (with markers) on the PR branch so it can be
	// resolved in review, mirroring the backport conflict convention.
	git(['add', '-A']);
	git(['commit', '--no-edit']);
	git(['push', '--force', pushUrl, `HEAD:refs/heads/${SYNC_BRANCH}`]);

	// Ensure the label exists (idempotent), then open the draft conflict PR.
	gh(['label', 'create', CONFLICT_LABEL, '--color', 'B60205', '--description', 'master→3.x sync conflict', '--force']);
	const prUrl = gh([
		'pr', 'create', '--draft',
		'--base', TARGET_BRANCH,
		'--head', SYNC_BRANCH,
		'--label', CONFLICT_LABEL,
		'--title', 'chore: Resolve master→3.x sync conflict',
		'--body', body,
	]);

	// Request owners as reviewers (best-effort: the API rejects the PR author
	// and non-collaborators, so a failure here must not fail the sync).
	if (ownersCsv) {
		try {
			gh(['pr', 'edit', prUrl, '--add-reviewer', ownersCsv]);
		} catch {
			log(`::warning::could not request some reviewers: ${ownersCsv}`);
		}
	}

	return { prUrl, ownersSlack: slack };
}

export async function sync({
	git = runGit,
	gh = runGh,
	env = process.env,
	fetchFn = fetch,
	log = console.log,
} = {}) {
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	const repo = env.GITHUB_REPOSITORY;
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');
	if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');

	// Authenticated push URL (credentials are not persisted by checkout).
	const pushUrl = `https://x-access-token:${token}@github.com/${repo}.git`;

	// Halt gate: if a previous conflict PR is still open, do nothing until it is
	// resolved and merged.
	if (hasOpenConflictPr(gh)) {
		log(`An open '${CONFLICT_LABEL}' conflict PR exists; skipping sync until it is resolved and merged.`);
		return;
	}

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);

	git(['fetch', 'origin', 'master']);
	// Pin to the fetched SHA — a command-line refspec doesn't reliably update the
	// origin/master tracking ref, so FETCH_HEAD is the unambiguous target.
	const masterSha = git(['rev-parse', 'FETCH_HEAD']);

	if (tryMerge(git, masterSha, log)) {
		git(['push', pushUrl, `HEAD:${TARGET_BRANCH}`]);
		log('Synced master into 3.x.');
		return;
	}

	log('Merge conflict encountered — attributing owners and opening a conflict PR.');
	const { prUrl, ownersSlack } = await openConflictPr({ git, gh, repo, token, masterSha, pushUrl, fetchFn, log });
	writeGithubOutput({ conflict_pr: prUrl, conflict_owners: ownersSlack }, env);
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	sync().catch((error) => {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	});
}
