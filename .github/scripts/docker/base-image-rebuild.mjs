#!/usr/bin/env node
/**
 * Rebuilds n8nio/base when a package that it installs on top of the DHI image
 * has a fix, and prepares the PR that pins the rebuilt base.
 *
 * The base Dockerfiles install packages (openssh, graphicsmagick, …) without
 * an upgrade, so a fix of such a package reaches the base only when master
 * builds it again. For each base, the script scans the pinned base. A finding
 * that the pinned DHI image does not have comes from a package that the base
 * installs. The package manager of the DHI image tells whether its repository
 * has a version with the fix. Only then does the script dispatch
 * build-base-image.yml for that base. A later run scans the rebuilt base. When
 * it has fewer findings and is at least 24 hours old, the PR pins it.
 *
 * The state file keeps the rebuild in progress and the last rebuild of each
 * base, so that the same findings start no new rebuild for 7 days.
 *
 * Usage: node base-image-rebuild.mjs --candidates <json> --state-out <json>
 *   --body <file> --text <file> [--state <json>] [--dispatch] [--skip-gate]
 * Needs docker, trivy and a login to dhi.io. Writes changed=true|false and
 * alert=true|false to $GITHUB_OUTPUT, and the plan to $GITHUB_STEP_SUMMARY.
 */

import { execFileSync } from 'node:child_process';
import {
	appendFileSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { renderAlerts } from './base-image-alerts.mjs';
import { GATE_MS, PLATFORMS, compareScans, readPin, scan } from './base-image-candidates.mjs';
import {
	CHAIN,
	bakeFileAt,
	commitOf,
	fetchWithRetry,
	github,
	resolveDigest,
} from './base-image-chain-pr.mjs';
import { removedFindings, updatePins } from './base-image-pin-pr.mjs';

const BAKE_FILE = 'docker/docker-bake.hcl';
const BUILD_WORKFLOW = 'build-base-image.yml';
export const REBUILD_BRANCH = 'base-image-refresh/rebuild';

const DAY_MS = 24 * 60 * 60 * 1000;
export const RETRY_MS = 7 * DAY_MS;

/** The bases that n8n builds, with their pin, their DHI source and its package manager. */
export const TARGETS = [
	{ target: 'base', pin: 'RUNTIME_IMAGE', source: 'DHI_REF', distro: 'alpine' },
	{
		target: 'base-debian',
		pin: 'DEBIAN_RUNTIME_IMAGE',
		source: 'DEBIAN_DHI_REF',
		distro: 'debian',
	},
];

/**
 * Shell scripts that read "<package> <fixed version>" lines and print
 * "<package> <version>" when the repository has a version with the fix. Each
 * runs in the DHI image, so it reads the repository and compares the versions
 * as the base build does.
 */
const AVAILABLE = {
	alpine: `apk update -q >/dev/null || exit 3
while read -r pkg fixed; do
  newest=$(apk search -x "$pkg" | head -n 1)
  [ -n "$newest" ] || continue
  version=\${newest#"$pkg"-}
  [ "$(apk version -t "$version" "$fixed")" = "<" ] || echo "$pkg $version"
done`,
	debian: `apt-get update -qq >/dev/null || exit 3
while read -r pkg fixed; do
  version=$(apt-cache policy "$pkg" | awk '/Candidate:/ { print $2 }')
  [ -n "$version" ] && [ "$version" != "(none)" ] || continue
  if dpkg --compare-versions "$version" ge "$fixed"; then echo "$pkg $version"; fi
done`,
};

const keyOf = (finding) => `${finding.id} ${finding.pkg}`;

/** The findings of the pinned DHI image on one platform of a candidates result. */
export function sourceKeys(platform) {
	const added = new Set(platform.added.map(keyOf));
	return new Set([
		...platform.remaining.map(keyOf).filter((key) => !added.has(key)),
		...platform.removed.map(keyOf),
	]);
}

/**
 * The findings of the pinned base that the pinned DHI image does not have, once
 * for each CVE and package, with their platforms. `scans` holds
 * { platform, base } entries, and `source` is the candidates result of the DHI pin.
 */
export function rebuildFindings(scans, source) {
	const findings = new Map();
	for (const { platform, base } of scans) {
		const dhi = source.platforms.find((entry) => entry.platform === platform);
		const known = dhi ? sourceKeys(dhi) : new Set();
		for (const finding of base.findings) {
			const key = keyOf(finding);
			if (known.has(key)) continue;
			const entry = findings.get(key) ?? { ...finding, platforms: [] };
			entry.platforms.push(platform);
			findings.set(key, entry);
		}
	}
	return [...findings.values()];
}

const sameKeys = (a, b) => a.length === b.length && a.every((key, i) => key === b[i]);

/**
 * Plans one base. `entry` is the rebuild in progress from the state file, and
 * `tried` the last rebuild. `deps` holds the lookups: scan(ref, platform),
 * available(distro, ref, platform, findings) -> Set of packages with a fix,
 * findRun(entry), bakeFileAt(sha), resolve(tag) and lastPullRequest().
 * Returns the next entry and tried, the events for the alerts, a note for the
 * summary, and `dispatch` or `change` when the run must act.
 */
export async function planTarget(spec, { hcl, results, entry, tried, now, skipGate, deps }) {
	const iso = new Date(now).toISOString();
	const pin = readPin(hcl, spec.pin);
	const events = [];
	const done = (note, extra = {}) => ({ entry, tried, events, note, ...extra });
	const giveUp = (event, note) => {
		events.push(
			`\`${spec.target}\`: ${event} It starts again after 7 days, or for other findings.`,
		);
		tried = { keys: entry.keys, at: iso };
		entry = undefined;
		return done(note);
	};

	if (entry && entry.pinned !== pin.ref) {
		const merged = entry.built?.ref === pin.ref;
		entry = undefined;
		return done(
			merged ? 'the pin of the rebuilt base merged' : 'the pin changed after the rebuild',
		);
	}

	if (entry && !entry.built) {
		const run = await deps.findRun(entry);
		if (!run && now - Date.parse(entry.dispatchedAt) >= DAY_MS) {
			return giveUp(`the dispatched rebuild of \`n8nio/base\` did not start.`, 'no rebuild run');
		}
		if (!run) return done('the rebuild run has not started');
		entry = { ...entry, runId: run.id };
		if (run.status !== 'completed') return done('the rebuild runs');
		const link = `<${run.html_url}|run>`;
		if (run.conclusion !== 'success') {
			return giveUp(`the rebuild of \`n8nio/base\` failed (${link}).`, 'the rebuild failed');
		}
		const publishedHcl = await deps.bakeFileAt(run.head_sha);
		const { tag } = CHAIN[BUILD_WORKFLOW]
			.pins(publishedHcl, run.head_sha)
			.find(({ name }) => name === spec.pin);
		const digest = deps.resolve(tag);
		if (!digest) {
			return giveUp(`the rebuild of \`n8nio/base\` published no \`${tag}\` (${link}).`, 'no image');
		}
		const platforms = PLATFORMS.map((platform) => ({
			platform,
			...compareScans(
				deps.scan(`${pin.repository}@${pin.digest}`, platform),
				deps.scan(`${pin.repository}@${digest}`, platform),
			),
		}));
		// The findings must go down: no platform gains more than it loses, and one loses more.
		const net = (platform) => platform.removed.length - platform.added.length;
		if (!platforms.every((platform) => net(platform) >= 0) || !platforms.some((p) => net(p) > 0)) {
			return giveUp(
				`the rebuild of \`n8nio/base\` did not reduce the findings (${link}).`,
				'no effect',
			);
		}
		entry = {
			...entry,
			built: {
				ref: `${tag}@${digest}`,
				publishedAt: run.updated_at,
				runUrl: run.html_url,
				platforms,
			},
		};
	}

	if (entry?.built) {
		const pr = await deps.lastPullRequest();
		if (
			pr?.closed &&
			!pr.merged &&
			Date.parse(pr.createdAt) >= Date.parse(entry.built.publishedAt)
		) {
			tried = { keys: entry.keys, at: iso };
			entry = undefined;
			return done('a person closed the rebuild PR');
		}
		const gated = now - Date.parse(entry.built.publishedAt) < GATE_MS;
		if (gated && !skipGate) return done('the rebuilt base is in the 24-hour gate');
		return done('the rebuild PR pins the rebuilt base', {
			change: {
				source: spec.pin,
				pinned: pin.ref,
				newest: entry.built.ref,
				platforms: entry.built.platforms,
				publishedAt: entry.built.publishedAt,
				runUrl: entry.built.runUrl,
				gateSkipped: gated,
			},
		});
	}

	// A refresh PR of the DHI pin makes master build the base again anyway.
	const source = results.find((result) => result.source === spec.source);
	if (!source) throw new Error(`The candidates have no ${spec.source}`);
	if (source.status === 'ready' || source.status === 'in-24h-gate') {
		return done(`a refresh PR of \`${spec.source}\` builds the base again`);
	}
	const builtFrom = commitOf(pin.ref);
	if (!builtFrom || readPin(await deps.bakeFileAt(builtFrom), spec.source).ref !== source.pinned) {
		return done(`the base is not built from the \`${spec.source}\` pin yet, so a chain PR is due`);
	}

	const findings = rebuildFindings(
		PLATFORMS.map((platform) => ({
			platform,
			base: deps.scan(`${pin.repository}@${pin.digest}`, platform),
		})),
		source,
	);
	if (findings.length === 0) return done('no finding comes from a package that the base installs');
	const available = new Map(
		PLATFORMS.map((platform) => [
			platform,
			deps.available(
				spec.distro,
				source.pinned,
				platform,
				findings.filter((finding) => finding.platforms.includes(platform)),
			),
		]),
	);
	const fixable = findings.filter((finding) =>
		finding.platforms.some((platform) => available.get(platform).has(finding.pkg)),
	);
	if (fixable.length === 0) return done('the DHI repository has no fix yet');
	const keys = fixable.map(keyOf).sort();
	if (tried && sameKeys(tried.keys, keys) && now - Date.parse(tried.at) < RETRY_MS) {
		return done('a rebuild for these findings ran less than 7 days ago');
	}
	entry = { pinned: pin.ref, keys, findings: fixable, dispatchedAt: iso };
	return done(`a rebuild removes ${keys.length} finding${keys.length === 1 ? '' : 's'}`, {
		dispatch: true,
	});
}

/** The Markdown body of the rebuild PR. */
export function renderBody(changes, { runUrl }) {
	const lines = [
		'This PR pins `n8nio/base` images that master built again to get patched packages. The rebuilt images have fewer fixable OS findings.',
		'',
	];
	for (const change of changes) {
		lines.push(
			`### \`${change.source}\``,
			'',
			`\`${change.pinned}\` → \`${change.newest}\``,
			'',
			`Published: ${change.publishedAt} ([build run](${change.runUrl})).`,
			'',
		);
		if (change.gateSkipped)
			lines.push(
				'A manual run skipped the 24-hour gate: this image is less than 24 hours old.',
				'',
			);
		lines.push(
			'| CVE | Severity | Package | Installed | Fixed | Platforms |',
			'| --- | --- | --- | --- | --- | --- |',
		);
		for (const finding of removedFindings(change)) {
			lines.push(
				`| ${finding.id} | ${finding.severity} | ${finding.pkg} | ${finding.installed} | ${finding.fixed} | ${finding.platforms.join(', ')} |`,
			);
		}
		lines.push('');
	}
	lines.push(`_Opened by \`sec-base-image-refresh.yml\` ([run](${runUrl}))._`);
	return `${lines.join('\n')}\n`;
}

/** The packages of `findings` that have a version with the fix in the repository of `ref`. */
function available(distro, ref, platform, findings) {
	if (findings.length === 0) return new Set();
	const input = findings.map((finding) => `${finding.pkg} ${finding.fixed.split(/,\s*/)[0]}\n`);
	const out = execFileSync(
		'docker',
		[
			'run',
			'--rm',
			'-i',
			'--platform',
			platform,
			'--user',
			'root',
			'--entrypoint',
			'sh',
			ref,
			'-c',
			AVAILABLE[distro],
		],
		{ input: [...new Set(input)].join(''), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] },
	);
	return new Set(
		out
			.split('\n')
			.filter(Boolean)
			.map((line) => line.split(' ')[0]),
	);
}

const API = () =>
	`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}/repos/${process.env.GITHUB_REPOSITORY}`;

const json = async (route) => await (await github(route, 'application/vnd.github+json')).json();

/** Dispatches the base build on master. Returns the run ID when GitHub gives it. */
async function dispatchBuild(targets) {
	const post = async (body) =>
		await fetchWithRetry(`${API()}/actions/workflows/${BUILD_WORKFLOW}/dispatches`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
				accept: 'application/vnd.github+json',
				'content-type': 'application/json',
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(30_000),
		});
	const body = { ref: 'master', inputs: { push: 'true', targets: targets.join(',') } };
	let response = await post({ ...body, return_run_details: true });
	// Without the run details, findRun looks up the run by its start time.
	if (response.status === 422) response = await post(body);
	if (!response.ok)
		throw new Error(`The dispatch of ${BUILD_WORKFLOW} returned ${response.status}`);
	if (response.status !== 200) return null;
	return (await response.json()).workflow_run_id ?? null;
}

/** The run of a dispatched rebuild: by ID, or the first dispatch run after it. */
async function findRun(entry) {
	if (entry.runId) return await json(`actions/runs/${entry.runId}`);
	// The search syntax takes no milliseconds.
	const created = encodeURIComponent(`>=${entry.dispatchedAt.replace(/\.\d+Z$/, 'Z')}`);
	const { workflow_runs: runs } = await json(
		`actions/workflows/${BUILD_WORKFLOW}/runs?event=workflow_dispatch&branch=master&created=${created}&per_page=20`,
	);
	return runs.at(-1) ?? null;
}

/** The newest PR of the rebuild branch, or null. */
async function lastPullRequest() {
	const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
	const [pr] = await json(
		`pulls?state=all&head=${owner}:${REBUILD_BRANCH}&sort=created&direction=desc&per_page=1`,
	);
	if (!pr) return null;
	return { closed: pr.state === 'closed', merged: Boolean(pr.merged_at), createdAt: pr.created_at };
}

async function main() {
	const { values } = parseArgs({
		options: {
			candidates: { type: 'string' },
			state: { type: 'string' },
			'state-out': { type: 'string' },
			body: { type: 'string' },
			text: { type: 'string' },
			dispatch: { type: 'boolean', default: false },
			'skip-gate': { type: 'boolean', default: false },
		},
	});
	if (!values.candidates || !values['state-out'] || !values.body || !values.text) {
		throw new Error('--candidates, --state-out, --body and --text are required');
	}

	const results = JSON.parse(readFileSync(values.candidates, 'utf8'));
	const state =
		values.state && existsSync(values.state) ? JSON.parse(readFileSync(values.state, 'utf8')) : {};
	const hcl = readFileSync(BAKE_FILE, 'utf8');
	const workDir = mkdtempSync(path.join(tmpdir(), 'base-image-rebuild-'));
	const deps = {
		scan: (ref, platform) => scan(ref, platform, workDir),
		available,
		findRun,
		bakeFileAt,
		resolve: resolveDigest,
		lastPullRequest,
	};

	const next = { pending: {}, tried: { ...state.tried } };
	const events = [];
	const changes = [];
	const dispatches = [];
	const notes = [];
	try {
		for (const spec of TARGETS) {
			const plan = await planTarget(spec, {
				hcl,
				results,
				entry: state.pending?.[spec.target],
				tried: state.tried?.[spec.target],
				now: Date.now(),
				skipGate: values['skip-gate'],
				deps,
			});
			if (plan.entry) next.pending[spec.target] = plan.entry;
			if (plan.tried) next.tried[spec.target] = plan.tried;
			events.push(...plan.events);
			if (plan.change) changes.push(plan.change);
			if (plan.dispatch) dispatches.push(spec.target);
			notes.push(`- \`${spec.target}\`: ${plan.note}.`);
			console.log(`${spec.target}: ${plan.note}`);
		}
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}

	// A preview dispatches nothing, and keeps no state.
	if (dispatches.length > 0 && values.dispatch) {
		const runId = await dispatchBuild(dispatches);
		for (const target of dispatches) next.pending[target].runId = runId;
		notes.push(`- Dispatched \`${BUILD_WORKFLOW}\` for ${dispatches.join(', ')}.`);
	}
	writeFileSync(values['state-out'], `${JSON.stringify(next, null, 2)}\n`);

	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
	const summary = ['## Base rebuild', '', ...notes, ''];
	if (changes.length > 0) {
		writeFileSync(BAKE_FILE, updatePins(hcl, changes));
		const body = renderBody(changes, { runUrl });
		writeFileSync(values.body, body);
		summary.push('### The rebuild PR', '', body);
	}
	writeFileSync(values.text, renderAlerts(events, { runUrl }));
	if (process.env.GITHUB_STEP_SUMMARY)
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`changed=${changes.length > 0}\nalert=${events.length > 0}\n`,
		);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
