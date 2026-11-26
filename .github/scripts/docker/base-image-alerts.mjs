#!/usr/bin/env node
/**
 * Plans the Slack alerts of a base image refresh run from the result of
 * base-image-candidates.mjs.
 *
 * An alert tells the Security team that the refresh needs a person: a
 * publisher check failed, a publish time stays missing, a version update is
 * necessary, a finding stays fixable for 7 days without a new digest, a
 * manual run skipped the 24-hour gate, a refresh PR has failed checks, the
 * daily or the review PR stays open for 48 hours, or a chain stops for 48
 * hours after master published its images. The state file of the last run keeps the
 * first time that a run saw each finding, and the last time of each alert. An
 * alert repeats every 7 days while its cause stays. A failed publisher check
 * alerts on each run.
 *
 * Usage: node base-image-alerts.mjs --candidates <json> --state-out <json>
 *   --text <file> [--state <json>] [--actor <login>] [--manual]
 * Writes alert=true|false to $GITHUB_OUTPUT, and the alert text to
 * $GITHUB_STEP_SUMMARY.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import {
	CHAIN,
	bakeFileAt,
	contains,
	github,
	isRefreshCommit,
	planPins,
	resolveDigest,
} from './base-image-chain-pr.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REPEAT_MS = 7 * DAY_MS;
export const STALE_MS = 7 * DAY_MS;
export const WAIT_MS = 2 * DAY_MS;

const REFRESH_BRANCH = 'base-image-refresh/';
export const DAILY_BRANCH = `${REFRESH_BRANCH}daily`;
export const REVIEW_BRANCH = `${REFRESH_BRANCH}review`;

/** The run summary lists all the findings. An alert lists the first ones. */
const MAX_LISTED = 10;

/**
 * PYTHON_IMAGE only feeds the runners image, which runs `apk upgrade` at build
 * time. So a finding there that has a fix is already fixed in the release image.
 * The scan reads only OS packages, so a version update does not remove more.
 */
const UPGRADED_AT_BUILD = new Set(['PYTHON_IMAGE']);

const digestOf = (ref) => ref.split('@')[1].slice(0, 'sha256:'.length + 12);

const unique = (findings) => [
	...new Map(findings.map((finding) => [`${finding.id} ${finding.pkg}`, finding])).values(),
];

/**
 * The alerts of one run, and the state for the next run. `state` is the state
 * of the last run, or an empty object. `prs` are the open refresh PRs, and
 * `chains` the newest publish of each chain workflow (see collectChains).
 */
export function planAlerts(results, state, { now, manual = false, actor, prs = [], chains = [] }) {
	const iso = new Date(now).toISOString();
	const lastAlert = state.lastAlert ?? {};
	const next = { findings: {}, noPublishTime: {}, lastAlert: {} };
	const alerts = [];

	// Repeats an alert every 7 days while its cause stays.
	const due = (key) => {
		const last = lastAlert[key];
		if (last && now - Date.parse(last) < REPEAT_MS) {
			next.lastAlert[key] = last;
			return false;
		}
		next.lastAlert[key] = iso;
		return true;
	};

	for (const result of results) {
		const { source } = result;

		if (result.status === 'unverified') {
			const error = result.publisher?.error ? `: ${result.publisher.error}` : '';
			alerts.push(
				`\`${source}\`: the publisher check failed for \`${digestOf(result.newest)}…\`${error}. The refresh opens no PR for it.`,
			);
		}

		// Count by source: the newest digest can change from run to run.
		if (result.status === 'no-publish-time') {
			const runs = (state.noPublishTime?.[source] ?? 0) + 1;
			next.noPublishTime[source] = runs;
			if (runs >= 2 && due(`no-publish-time ${source}`)) {
				alerts.push(
					`\`${source}\`: \`${digestOf(result.newest)}…\` has no publish time after ${runs} runs. It stays out of the PRs.`,
				);
			}
		}

		if (result.status === 'ready' && result.gateSkipped && manual) {
			alerts.push(
				`\`${source}\`: a manual run${actor ? ` by @${actor}` : ''} skipped the 24-hour gate for \`${digestOf(result.newest)}…\`. The pin is in the review PR.`,
			);
		}

		if (UPGRADED_AT_BUILD.has(source)) continue;

		if (
			result.status === 'version-update' &&
			due(`version-update ${source} ${result.versionUpdate.ref}`)
		) {
			const removed = unique(
				result.versionUpdate.platforms.flatMap((platform) => platform.removed),
			);
			alerts.push(
				`\`${source}\`: version update needed. \`${result.versionUpdate.ref.split('@')[0]}\` removes ${removed.length} finding${removed.length === 1 ? '' : 's'}. A person updates the version.`,
			);
		}

		// A finding is stale when the newest digest still has it 7 days after a run first saw it.
		// The version-update alert already covers a source that a newer patch fixes.
		const stale = new Map();
		for (const finding of unique(result.platforms.flatMap((platform) => platform.remaining))) {
			const key = `${source} ${finding.id} ${finding.pkg}`;
			const firstSeen = state.findings?.[key] ?? iso;
			next.findings[key] = firstSeen;
			if (result.status === 'version-update' || now - Date.parse(firstSeen) < STALE_MS) continue;
			if (!due(`stale ${key}`)) continue;
			const entry = stale.get(finding.id) ?? { ...finding, packages: [] };
			entry.packages.push(finding.pkg);
			stale.set(finding.id, entry);
		}
		if (stale.size > 0) {
			const list = [...stale.values()]
				.slice(0, MAX_LISTED)
				.map((finding) => `${finding.id} (${finding.severity}: ${finding.packages.join(', ')})`);
			const more = stale.size > MAX_LISTED ? ` and ${stale.size - MAX_LISTED} more` : '';
			alerts.push(
				`\`${source}\`: ${stale.size} finding${stale.size === 1 ? '' : 's'} fixable for 7 days or more without a new digest: ${list.join(', ')}${more}.`,
			);
		}
	}

	for (const pr of prs) {
		const link = `<${pr.url}|#${pr.number}>`;
		if (pr.failedChecks.length > 0 && due(`failed-checks ${pr.number}`)) {
			alerts.push(`${link} has failed checks: ${pr.failedChecks.join(', ')}.`);
		}
		// The chain alert below covers the chain PRs.
		const open = now - Date.parse(pr.createdAt);
		const days = Math.floor(open / DAY_MS);
		if (open < WAIT_MS) continue;
		if (pr.branch === REVIEW_BRANCH && due(`open ${pr.number}`)) {
			alerts.push(`${link} waits for a review. It is open for ${days} days.`);
		} else if (pr.branch === DAILY_BRANCH && due(`open ${pr.number}`)) {
			alerts.push(`${link} is open for ${days} days without a merge.`);
		}
	}

	for (const chain of chains) {
		if (chain.lagging.length === 0 || now - Date.parse(chain.publishedAt) < WAIT_MS) continue;
		if (!due(`chain ${chain.workflow} ${chain.sha}`)) continue;
		alerts.push(
			`The chain stopped: \`${chain.workflow}\` published \`${chain.sha.slice(0, 7)}\` more than 48 hours ago (<${chain.runUrl}|run>), but ${chain.lagging.map((name) => `\`${name}\``).join(', ')} still pin older images.`,
		);
	}

	return { alerts, state: next };
}

const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure', 'action_required']);

const json = async (path) => await (await github(path, 'application/vnd.github+json')).json();

/** The branches of the refresh PRs: see sec-base-image-refresh.yml. */
const REFRESH_BRANCHES = [
	DAILY_BRANCH,
	REVIEW_BRANCH,
	...Object.keys(CHAIN).map(
		(workflow) => `${REFRESH_BRANCH}chain-${workflow.replace(/\.yml$/, '')}`,
	),
];

/** The open refresh PRs, with the names of their failed checks. */
export async function collectPullRequests() {
	const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
	const pulls = (
		await Promise.all(
			REFRESH_BRANCHES.map((branch) => json(`pulls?state=open&head=${owner}:${branch}`)),
		)
	).flat();
	return await Promise.all(
		pulls.map(async (pr) => {
			const { check_runs: runs } = await json(`commits/${pr.head.sha}/check-runs?per_page=100`);
			const { statuses } = await json(`commits/${pr.head.sha}/status`);
			const failedChecks = [
				...runs.filter((run) => FAILED_CONCLUSIONS.has(run.conclusion)).map((run) => run.name),
				...statuses
					.filter((status) => status.state === 'failure' || status.state === 'error')
					.map((status) => status.context),
			];
			return {
				number: pr.number,
				url: pr.html_url,
				branch: pr.head.ref,
				createdAt: pr.created_at,
				failedChecks: [...new Set(failedChecks)],
			};
		}),
	);
}

/**
 * The newest run, from the merge of a refresh PR, that published at least one
 * image of the chain, with the bake file at its commit. A run publishes nothing
 * when the inputs of its images did not change, and must not hide an older run
 * whose chain stopped.
 */
export async function findPublishedRun(runs, workflow, { bakeFileAt, resolve }) {
	for (const run of runs) {
		if (!isRefreshCommit(run.head_commit?.message.split('\n')[0] ?? '')) continue;
		const publishedHcl = await bakeFileAt(run.head_sha);
		const tags = CHAIN[workflow].pins(publishedHcl, run.head_sha).map(({ tag }) => tag);
		if (tags.some((tag) => resolve(tag))) return { run, publishedHcl };
	}
	return null;
}

/**
 * The newest publish of each chain workflow from the merge of a refresh PR, and
 * the pins that still point to older images than it published.
 */
async function collectChains(hcl) {
	const chains = [];
	for (const workflow of Object.keys(CHAIN)) {
		const { workflow_runs: runs } = await json(
			`actions/workflows/${workflow}/runs?branch=master&event=push&status=success&per_page=20`,
		);
		const found = await findPublishedRun(runs, workflow, { bakeFileAt, resolve: resolveDigest });
		if (!found) continue;
		const { run, publishedHcl } = found;
		const changes = await planPins(hcl, workflow, run.head_sha, {
			publishedHcl,
			resolve: resolveDigest,
			contains,
		});
		chains.push({
			workflow,
			sha: run.head_sha,
			runUrl: run.html_url,
			publishedAt: run.updated_at,
			lagging: changes.map((change) => change.source),
		});
	}
	return chains;
}

/** The Slack text of the alerts. */
export function renderAlerts(alerts, { runUrl }) {
	return [
		`*Base image refresh needs a person* (<${runUrl}|run>)`,
		...alerts.map((alert) => `• ${alert}`),
	].join('\n');
}

async function main() {
	const { values } = parseArgs({
		options: {
			candidates: { type: 'string' },
			state: { type: 'string' },
			'state-out': { type: 'string' },
			text: { type: 'string' },
			actor: { type: 'string' },
			manual: { type: 'boolean', default: false },
		},
	});
	if (!values.candidates || !values['state-out'] || !values.text) {
		throw new Error('--candidates, --state-out and --text are required');
	}

	const results = JSON.parse(readFileSync(values.candidates, 'utf8'));
	const state =
		values.state && existsSync(values.state) ? JSON.parse(readFileSync(values.state, 'utf8')) : {};
	// A failed GitHub or registry lookup becomes an alert, so the other alerts still go out.
	const failures = [];
	const collect = async (name, collector) => {
		try {
			return await collector();
		} catch (error) {
			console.log(`::warning::Could not check the ${name}: ${error.message}`);
			failures.push(`The refresh could not check the ${name}: ${error.message}.`);
			return [];
		}
	};

	// The PR steps of the run change the bake file, so read the committed one.
	const hcl = execFileSync('git', ['show', 'HEAD:docker/docker-bake.hcl'], { encoding: 'utf8' });
	const { alerts, state: next } = planAlerts(results, state, {
		now: Date.now(),
		manual: values.manual,
		actor: values.actor,
		prs: await collect('refresh PRs', collectPullRequests),
		chains: await collect('chains', () => collectChains(hcl)),
	});
	alerts.push(...failures);
	writeFileSync(values['state-out'], `${JSON.stringify(next, null, 2)}\n`);

	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
	const text = renderAlerts(alerts, { runUrl });
	writeFileSync(values.text, text);

	console.log(`${alerts.length} alert${alerts.length === 1 ? '' : 's'}`);
	if (process.env.GITHUB_STEP_SUMMARY && alerts.length > 0)
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Alerts\n\n${text}\n`);
	if (process.env.GITHUB_OUTPUT)
		appendFileSync(process.env.GITHUB_OUTPUT, `alert=${alerts.length > 0}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
