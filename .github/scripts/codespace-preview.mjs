#!/usr/bin/env node
// Drives a PR preview instance from CI. `scripts/preview.mjs` does the work; this
// script maps the pull_request event onto one of its operations and reports the
// result back to the PR as a single, edited-in-place comment.
//
//   labeled      -> up       create or start the box, then serve the PR head
//   synchronize  -> refresh  re-serve the new head in the box that already exists
//   unlabeled    -> down     delete the box
//   closed       -> down
//
// `refresh` never creates a box. A box that GitHub already deleted (24 h
// retention) is reported as expired, not as a failure.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { ensureEnvVar, postOrUpdateComment } from './github-helpers.mjs';

export const BOT_MARKER = '<!-- codespace-preview -->';
export const PREVIEW_LABEL = 'codespace-preview';
// Copied from `preview.mjs`, which owns them. They cannot be imported: that module
// runs its command switch on import. They appear in the comment so a reviewer knows
// how long the instance lasts without reading the script.
const IDLE_TIMEOUT = '30 minutes';
const RETENTION_PERIOD = '24 hours';
// Resolved against this file, so the script runs the same from any directory.
const PREVIEW_SCRIPT = fileURLToPath(new URL('../../scripts/preview.mjs', import.meta.url));

/**
 * @param {string} action The pull_request event action.
 * @returns {'up' | 'refresh' | 'down' | undefined}
 */
export function operationFor(action) {
	switch (action) {
		case 'labeled':
			return 'up';
		case 'synchronize':
			return 'refresh';
		case 'unlabeled':
		case 'closed':
			return 'down';
		default:
			return undefined;
	}
}

/**
 * `preview.mjs --json` keeps stdout clean, but a truncated or empty run still has
 * to be told apart from a good one. Read the last JSON object that carries a url.
 *
 * @param {string} stdout
 * @returns {{pr: number, sha: string, codespace: string, url: string, orgVisible: boolean} | undefined}
 */
export function parsePreviewJson(stdout) {
	for (const line of stdout.split('\n').reverse()) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('{')) continue;
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed && typeof parsed.url === 'string') return parsed;
		} catch {}
	}
	return undefined;
}

/**
 * `preview.mjs ls` prints one tab-separated row for each box:
 * `preview/pr-<pr>\t<state>\t<name>\tlast used <iso>`. Compare the whole first
 * field, or PR 3 would match the box for PR 37.
 *
 * @param {string} stdout
 * @param {string | number} pr
 */
export function hasPreviewBox(stdout, pr) {
	return stdout.split('\n').some((line) => line.split('\t')[0]?.trim() === `preview/pr-${pr}`);
}

/**
 * A forwarded Codespaces URL is `https://<codespace>-<port>.app.github.dev`. The
 * trailing dot anchors the match, so a codespace name that ends in digits is safe.
 *
 * @param {string} url
 */
export function portFromUrl(url) {
	return new URL(url).hostname.match(/-(\d+)\./)?.[1];
}

/** @param {{url: string, codespace: string, sha: string, orgVisible: boolean, pr: string | number}} preview */
export function readyComment({ url, codespace, sha, orgVisible, pr }) {
	// A failed port share is not fatal in preview.mjs, so the box can be up while
	// the URL still answers 302 to everyone. Say so instead of implying it works.
	const port = portFromUrl(url);
	const access = orgVisible
		? 'Every n8n org member who is signed in to GitHub can open it.'
		: [
				`**Port ${port} is still private.** The instance runs, but only its owner can`,
				'open the URL. To share it, run:',
				'',
				'```',
				`gh codespace ports visibility ${port}:org -c ${codespace}`,
				'```',
			].join('\n');

	return [
		BOT_MARKER,
		`### Preview instance for \`${sha.slice(0, 7)}\``,
		'',
		`**[Open the preview](${url}/preview-signin)** — one click signs you in.`,
		'',
		'| | |',
		'| --- | --- |',
		`| URL | ${url} |`,
		`| Codespace | \`preview/pr-${pr}\` |`,
		`| Sign in | \`preview@n8n.io\` / \`PreviewInstance1\` |`,
		'',
		access,
		'',
		`The instance sleeps after ${IDLE_TIMEOUT} of no use and is deleted after ${RETENTION_PERIOD}.`,
		`Push a commit to serve it again. Remove the \`${PREVIEW_LABEL}\` label to delete it now.`,
	].join('\n');
}

/** @param {{pr: string | number}} context */
export function downComment({ pr }) {
	return [
		BOT_MARKER,
		`### Preview instance deleted`,
		'',
		`The preview box for PR #${pr} is gone. Add the \`${PREVIEW_LABEL}\` label to get a new one.`,
	].join('\n');
}

/** @param {{pr: string | number}} context */
export function expiredComment({ pr }) {
	return [
		BOT_MARKER,
		`### Preview instance expired`,
		'',
		`The preview box for PR #${pr} no longer exists — GitHub deletes one after ${RETENTION_PERIOD}.`,
		`Remove and add the \`${PREVIEW_LABEL}\` label to get a new one.`,
	].join('\n');
}

/** @param {{operation: string, runUrl: string, message: string}} context */
export function failureComment({ operation, runUrl, message }) {
	return [
		BOT_MARKER,
		`### Preview instance failed`,
		'',
		`\`preview ${operation}\` did not finish: ${message}`,
		'',
		`See [the workflow run](${runUrl}) for the full log. Remove and add the \`${PREVIEW_LABEL}\` label to try again.`,
	].join('\n');
}

/**
 * Progress and the in-box build log go to stderr, so they stream into the job log
 * live. Only the JSON line is captured.
 *
 * @param {readonly string[]} args
 */
function runPreview(args) {
	const result = spawnSync('node', [PREVIEW_SCRIPT, ...args], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'inherit'],
	});
	if (result.error) throw result.error;
	return { status: result.status, stdout: result.stdout ?? '' };
}

async function main() {
	const pr = ensureEnvVar('PULL_REQUEST_NUMBER');
	const action = ensureEnvVar('EVENT_ACTION');
	const runUrl = ensureEnvVar('RUN_URL');

	const operation = operationFor(action);
	if (!operation) {
		console.log(`No preview operation for a "${action}" event — nothing to do.`);
		return;
	}

	try {
		if (operation === 'refresh') {
			const list = runPreview(['ls']);
			if (list.status !== 0) throw new Error(`\`preview ls\` exited ${list.status}`);
			if (!hasPreviewBox(list.stdout, pr)) {
				console.log(`No preview box for PR #${pr} — reporting it as expired.`);
				await postOrUpdateComment(Number(pr), expiredComment({ pr }), BOT_MARKER);
				return;
			}
		}

		const { status, stdout } = runPreview([operation, pr, '--json']);
		if (status !== 0) throw new Error(`\`preview ${operation}\` exited ${status}`);

		if (operation === 'down') {
			await postOrUpdateComment(Number(pr), downComment({ pr }), BOT_MARKER);
			return;
		}

		const preview = parsePreviewJson(stdout);
		if (!preview) throw new Error(`\`preview ${operation}\` printed no preview details`);

		console.log(`Preview for PR #${pr}: ${preview.url}`);
		await postOrUpdateComment(Number(pr), readyComment({ ...preview, pr }), BOT_MARKER);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`::error::Preview ${operation} failed for PR #${pr}: ${message}`);
		// Report the failure on the PR too: a label that looks inert is worse than a
		// label that says what went wrong.
		await postOrUpdateComment(
			Number(pr),
			failureComment({ operation, runUrl, message }),
			BOT_MARKER,
		);
		process.exitCode = 1;
	}
}

// Importable for tests without running the orchestration.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
