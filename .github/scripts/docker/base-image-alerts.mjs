#!/usr/bin/env node
/**
 * Plans the Slack alerts of a base image refresh run from the result of
 * base-image-candidates.mjs.
 *
 * An alert tells the Security team that the refresh needs a person: a
 * publisher check failed, a publish time stays missing, a version update is
 * necessary, a finding stays fixable for 7 days without a new digest, or a
 * manual run skipped the 24-hour gate. The state file of the last run keeps the
 * first time that a run saw each finding, and the last time of each alert. An
 * alert repeats every 7 days while its cause stays. A failed publisher check
 * alerts on each run.
 *
 * Usage: node base-image-alerts.mjs --candidates <json> --state-out <json>
 *   --text <file> [--state <json>] [--actor <login>] [--manual]
 * Writes alert=true|false to $GITHUB_OUTPUT, and the alert text to
 * $GITHUB_STEP_SUMMARY.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const DAY_MS = 24 * 60 * 60 * 1000;
export const REPEAT_MS = 7 * DAY_MS;
export const STALE_MS = 7 * DAY_MS;

/** The severities that make a finding stale after 7 days. */
const STALE_SEVERITIES = new Set(['CRITICAL', 'HIGH']);

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
 * of the last run, or an empty object.
 */
export function planAlerts(results, state, { now, manual = false, actor }) {
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
			if (!STALE_SEVERITIES.has(finding.severity)) continue;
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

	return { alerts, state: next };
}

/** The Slack text of the alerts. */
export function renderAlerts(alerts, { runUrl }) {
	return [
		`*Base image refresh needs a person* (<${runUrl}|run>)`,
		...alerts.map((alert) => `• ${alert}`),
	].join('\n');
}

function main() {
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
	const { alerts, state: next } = planAlerts(results, state, {
		now: Date.now(),
		manual: values.manual,
		actor: values.actor,
	});
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
