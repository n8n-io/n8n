#!/usr/bin/env node
// Drives a PR preview instance from CI. `scripts/codespace-preview/preview.mjs` does the work; this
// script maps the pull_request event onto one of its operations and reports the
// result back to the PR as a single, edited-in-place comment.
//
//   labeled      -> up       create or start the box, then serve the PR head
//   synchronize  -> refresh  re-serve the new head in the box that already exists
//   unlabeled    -> down     delete the box
//   closed       -> down
//
// A manual run sets PREVIEW_OPERATION instead, which wins over the event mapping.
//
// `refresh` never creates a box. A box that GitHub already deleted (24 h
// retention) is reported as expired, not as a failure.
//
// `up` and `refresh` take minutes, so the comment goes up before the work starts
// and is edited for each phase and once a minute after that. `preview.mjs --json`
// prints one JSON line per phase on the channel this already parses; the report is
// the line that carries a `url`.
//
// With `--report-cancelled` it posts one body and nothing else. The workflow runs
// that on a cancelled or timed-out job, which kills this process mid-checklist.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { PREVIEW_LABEL_PREFIX } from '../../scripts/codespace-preview/preview-labels.mjs';
import { PREVIEW_PHASES, createLineSplitter, phaseIndex } from '../../scripts/codespace-preview/preview-phases.mjs';
import {
	ensureEnvVar,
	findCommentByMarker,
	postOrUpdateComment,
	updateCommentById,
} from './github-helpers.mjs';

export const BOT_MARKER = '<!-- codespace-preview -->';
// Only a progress body carries this. The cancelled-run step checks for it before it
// writes, so a run cancelled while it was still queued cannot replace a good ready
// comment left by the run before it.
export const PROGRESS_MARKER = '<!-- codespace-preview:progress -->';
export const PREVIEW_LABEL = 'codespace-preview';
// Copied from `preview.mjs`, which owns them, so they move together. They cannot be
// imported: that module runs its command switch on import. They appear in the comment
// so a reviewer knows how long the instance lasts without reading the script.
const IDLE_TIMEOUT = '2 hours';
const RETENTION_PERIOD = '24 hours';
const CODESPACE_ENV_VARIABLE_URL = "https://internal.users.n8n.cloud/form/codespace-environments";
// A slept box comes back with a private port, so every recovery hint points here.
export const WORKFLOW_URL =
	'https://github.com/n8n-io/n8n/actions/workflows/util-codespace-preview.yml';
// What a manual run may ask for. `ls` is absent: it needs no PR and posts no comment.
export const DISPATCH_OPERATIONS = ['up', 'refresh', 'down'];
// Resolved against this file, so the script runs the same from any directory.
const PREVIEW_SCRIPT = fileURLToPath(new URL('../../scripts/codespace-preview/preview.mjs', import.meta.url));
// Often enough to look alive, rarely enough that the edit history stays readable.
const HEARTBEAT_MS = 60_000;

/**
 * A `preview:*` label configures an instance that already exists, so toggling one
 * re-serves the box rather than creating or deleting it.
 *
 * @param {string} action The pull_request event action.
 * @param {string} [label] `github.event.label.name`, for a labeled/unlabeled event.
 * @returns {'up' | 'refresh' | 'down' | undefined}
 */
export function operationFor(action, label) {
	switch (action) {
		case 'labeled':
		case 'unlabeled':
			if (label?.startsWith(PREVIEW_LABEL_PREFIX)) return 'refresh';
			if (label !== PREVIEW_LABEL) return undefined;
			return action === 'labeled' ? 'up' : 'down';
		case 'synchronize':
			return 'refresh';
		case 'closed':
			return 'down';
		default:
			return undefined;
	}
}

/**
 * A manual run says what to do, so its operation wins over the event mapping. An
 * operation that is not one of ours stops here: `preview.mjs` would only print
 * usage and exit 1, which reads as a broken preview rather than a bad input.
 *
 * @param {{action?: string, label?: string, operation?: string}} context
 * @returns {'up' | 'refresh' | 'down' | undefined}
 */
export function resolveOperation({ action, label, operation }) {
	if (operation) return DISPATCH_OPERATIONS.includes(operation) ? operation : undefined;
	return operationFor(action ?? '', label);
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
		`If you need to modify the environment variables of this instance, navigate to ${CODESPACE_ENV_VARIABLE_URL}?pr=${pr} and submit them.`,
		'The instance will refresh and apply your variables.',
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
		`A box that slept comes back private, so wake it with [the preview workflow](${WORKFLOW_URL})`,
		'(`Run workflow` → this PR number → `up`), or by pushing a commit.',
		`Remove the \`${PREVIEW_LABEL}\` label to delete it now.`,
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
		`Run [the preview workflow](${WORKFLOW_URL}) with \`up\` to get a new one.`,
	].join('\n');
}

/**
 * `4m 12s`, for a comment that is read while it counts. Anything unusable reads as
 * `0s`: a wrong duration in a status line is worse than a boring one.
 *
 * @param {number} ms
 */
export function formatElapsed(ms) {
	const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);

	if (hours) return `${hours}h ${minutes}m`;
	if (minutes) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
	return `${seconds}s`;
}

/**
 * The instance URL out of a body a previous run left. A refresh replaces the ready
 * comment with a checklist, so without this the PR loses the URL for several
 * minutes. Reads the URL row `readyComment` writes.
 *
 * @param {string} body
 */
export function previewUrlFromBody(body) {
	return body.match(/^\| URL \| (\S+) \|$/m)?.[1];
}

/**
 * One line of a `preview.mjs --json` run that reports a phase rather than the final
 * result. A report carries a `url`; a progress line never does.
 *
 * @param {string} line
 * @returns {{phase: string, detail?: string, sha?: string, codespace?: string} | undefined}
 */
export function parseProgressLine(line) {
	const trimmed = line.trim();
	if (!trimmed.startsWith('{')) return undefined;
	try {
		const parsed = JSON.parse(trimmed);
		if (parsed && typeof parsed.phase === 'string' && parsed.url === undefined) return parsed;
	} catch {}
	return undefined;
}

/**
 * The checklist, while the box is being set up. Pure: the caller passes the clock,
 * so this renders the same body twice.
 *
 * @param {{
 *   pr: string | number,
 *   operation: 'up' | 'refresh',
 *   runUrl: string,
 *   sha?: string,
 *   phase?: string,
 *   detail?: string,
 *   previousUrl?: string,
 *   startedAt: number,
 *   phaseStartedAt: number,
 *   now: number,
 * }} state
 */
export function progressComment({
	pr,
	operation,
	runUrl,
	sha,
	phase,
	detail,
	previousUrl,
	startedAt,
	phaseStartedAt,
	now,
}) {
	// Everything before the current phase is done. Going by position rather than by
	// the phases actually seen keeps the list right when one never reports — an old
	// PR head has no in-box emitter.
	const current = phaseIndex(phase);
	const inPhaseMs = now - phaseStartedAt;

	const steps = PREVIEW_PHASES.map((step, index) => {
		if (index < current) return `- [x] ${step.label}`;
		if (index !== current) return `- [ ] ${step.label}`;
		return `- [ ] **${step.label}**${detail ? ` — ${detail}` : ''} · ${formatElapsed(inPhaseMs)}`;
	});

	const slow = PREVIEW_PHASES[current]?.slowAfterMs;
	const target = sha ? `\`${sha.slice(0, 7)}\`` : `PR #${pr}`;

	return [
		BOT_MARKER,
		PROGRESS_MARKER,
		`### Preview instance ${operation === 'refresh' ? 'updating to' : 'starting for'} ${target}`,
		'',
		'Setting up the box. This usually takes a few minutes.',
		'',
		...steps,
		...(slow && inPhaseMs > slow
			? ['', `> ${PREVIEW_PHASES[current].label} is taking longer than usual.`]
			: []),
		// A refresh stops the old backend before it rebuilds, so the URL is down for
		// the rest of this run. Keep it on the PR anyway: it is the same URL when the
		// run finishes, and losing it for several minutes is worse than saying so.
		...(previousUrl
			? ['', `The URL does not change: ${previousUrl}. It stops answering until this finishes.`]
			: []),
		'',
		`Elapsed ${formatElapsed(now - startedAt)} · updated ${new Date(now).toISOString().slice(11, 19)} UTC · [live log](${runUrl})`,
	].join('\n');
}

/** @param {{pr: string | number, operation: string, runUrl: string}} context */
export function cancelledComment({ pr, operation, runUrl }) {
	return [
		BOT_MARKER,
		`### Preview instance run stopped`,
		'',
		`The \`preview ${operation}\` run for PR #${pr} was cancelled or timed out, so the`,
		'instance is in an unknown state. The box can still exist.',
		'',
		`Run [the preview workflow](${WORKFLOW_URL}) with \`up\` to finish the job, or \`down\` to delete the box.`,
		`See [the workflow run](${runUrl}) for how far it got.`,
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
		`See [the workflow run](${runUrl}) for the full log.`,
		`Run [the preview workflow](${WORKFLOW_URL}) with \`${operation}\` to try again.`,
	].join('\n');
}

/**
 * Human progress and the in-box build log go to stderr, so they stream into the job
 * log live. Only stdout is captured, and its phase lines are handed over as they
 * arrive — a run this long has to report itself while it runs, not at the end.
 *
 * @param {readonly string[]} args
 * @param {{onProgress?: (progress: {phase: string, detail?: string, sha?: string}) => void}} [hooks]
 * @returns {Promise<{status: number | null, stdout: string}>}
 */
function runPreview(args, { onProgress } = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn('node', [PREVIEW_SCRIPT, ...args], {
			stdio: ['ignore', 'pipe', 'inherit'],
		});
		const splitLines = createLineSplitter();
		let stdout = '';

		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			// Kept whole for `parsePreviewJson`, which reads the report off the end.
			stdout += chunk;
			if (!onProgress) return;
			for (const line of splitLines(chunk)) {
				const progress = parseProgressLine(line);
				if (progress) onProgress(progress);
			}
		});

		child.on('error', reject);
		child.on('close', (status) => resolve({ status, stdout }));
	});
}

/**
 * Keeps the checklist on the PR current while `preview.mjs` runs: one edit for each
 * phase, plus a heartbeat so a long phase still looks alive.
 *
 * @param {{pr: string, operation: 'up' | 'refresh', runUrl: string, previousUrl?: string, commentId?: number}} context
 */
function createProgressReporter({ pr, operation, runUrl, previousUrl, commentId }) {
	const startedAt = Date.now();
	let phaseStartedAt = startedAt;
	let id = commentId;
	let phase;
	let detail;
	let sha;
	let writes = Promise.resolve();

	// One chain, so two edits never overlap, and every failure is swallowed: this
	// Octokit carries no retry plugin, and a status edit must not fail a preview that
	// is otherwise fine. Resetting the chain keeps one failure from poisoning the next.
	function push() {
		writes = writes
			.then(async () => {
				const body = progressComment({
					pr,
					operation,
					runUrl,
					sha,
					phase,
					detail,
					previousUrl,
					startedAt,
					phaseStartedAt,
					now: Date.now(),
				});
				// Hold the id from the first write: paginating every comment on the PR
				// once a minute would be the expensive part of a heartbeat.
				if (id === undefined) id = await postOrUpdateComment(Number(pr), body, BOT_MARKER);
				else await updateCommentById(id, body);
			})
			.catch((error) => {
				console.log(`::warning::Could not update the preview comment: ${error.message}`);
			});
		return writes;
	}

	const timer = setInterval(push, HEARTBEAT_MS);
	timer.unref();

	return {
		start: push,
		/** @param {{phase: string, detail?: string, sha?: string}} progress */
		onProgress(progress) {
			if (progress.sha) sha = progress.sha;
			if (progress.phase === phase && progress.detail === detail) return;
			phase = progress.phase;
			detail = progress.detail;
			phaseStartedAt = Date.now();
			push();
		},
		/** Drains the queue, so the final body of the run is always the last write. */
		async stop() {
			clearInterval(timer);
			await writes;
		},
	};
}

/**
 * A cancelled or timed-out job kills this process mid-checklist, so the workflow
 * runs it again just to say so. Only over a progress body: a run cancelled while it
 * was queued never started work, and must leave a ready comment alone.
 *
 * @param {string} pr
 * @param {string} operation
 * @param {string} runUrl
 */
async function reportCancelled(pr, operation, runUrl) {
	const existing = await findCommentByMarker(Number(pr), BOT_MARKER);
	if (!existing?.body.includes(PROGRESS_MARKER)) {
		console.log('The preview comment is not a checklist — leaving it as it is.');
		return;
	}
	await updateCommentById(existing.id, cancelledComment({ pr, operation, runUrl }));
}

async function main() {
	const pr = ensureEnvVar('PULL_REQUEST_NUMBER');
	const runUrl = ensureEnvVar('RUN_URL');
	const requested = process.env.PREVIEW_OPERATION;
	// A manual run carries no event action, so it cannot be required there.
	const action = requested ? '' : ensureEnvVar('EVENT_ACTION');
	const label = process.env.LABEL_NAME;

	// The dispatch input is free text. Refuse a non-number before anything tries to
	// comment on it: postOrUpdateComment(NaN) 404s inside the catch below and
	// reports that instead of the real cause.
	if (!/^\d+$/.test(pr)) {
		console.error(`::error::PULL_REQUEST_NUMBER must be a number, got "${pr}".`);
		process.exitCode = 1;
		return;
	}

	const operation = resolveOperation({ action, label, operation: requested });
	if (!operation) {
		console.log(
			`No preview operation for action="${action}" label="${label ?? ''}" operation="${requested ?? ''}" — nothing to do.`,
		);
		return;
	}

	if (process.argv.includes('--report-cancelled')) {
		await reportCancelled(pr, operation, runUrl);
		return;
	}

	try {
		if (operation === 'refresh') {
			const list = await runPreview(['ls']);
			if (list.status !== 0) throw new Error(`\`preview ls\` exited ${list.status}`);
			if (!hasPreviewBox(list.stdout, pr)) {
				console.log(`No preview box for PR #${pr} — reporting it as expired.`);
				await postOrUpdateComment(Number(pr), expiredComment({ pr }), BOT_MARKER);
				return;
			}
		}

		if (operation === 'down') {
			const { status } = await runPreview([operation, pr, '--json']);
			if (status !== 0) throw new Error(`\`preview ${operation}\` exited ${status}`);
			await postOrUpdateComment(Number(pr), downComment({ pr }), BOT_MARKER);
			return;
		}

		// A checklist only earns its place in front of work that takes minutes. It also
		// goes up after the `refresh` check above, so a box that is already gone never
		// flashes a checklist before the expired body replaces it.
		const existing = await findCommentByMarker(Number(pr), BOT_MARKER);
		const reporter = createProgressReporter({
			pr,
			operation,
			runUrl,
			previousUrl: previewUrlFromBody(existing?.body ?? ''),
			commentId: existing?.id,
		});
		await reporter.start();

		let status;
		let stdout;
		try {
			({ status, stdout } = await runPreview([operation, pr, '--json'], {
				onProgress: reporter.onProgress,
			}));
		} finally {
			await reporter.stop();
		}
		if (status !== 0) throw new Error(`\`preview ${operation}\` exited ${status}`);

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
