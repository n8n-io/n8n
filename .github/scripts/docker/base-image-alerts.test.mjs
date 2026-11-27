import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	REPEAT_MS,
	STALE_MS,
	WAIT_MS,
	findPublishedRun,
	nodeMismatch,
	planAlerts,
	renderAlerts,
} from './base-image-alerts.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;
const now = Date.parse('2026-11-23T02:00:00Z');
const ago = (ms) => new Date(now - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

const finding = (id, severity = 'HIGH', pkg = 'zlib') => ({
	id,
	pkg,
	severity,
	installed: '1.0',
	fixed: '1.1',
});

const result = (source, status, extra = {}) => ({
	source,
	status,
	pinned: `dhi.io/node:26-alpine@${digest('a')}`,
	newest: `dhi.io/node:26-alpine@${digest('b')}`,
	platforms: [],
	...extra,
});

const withRemaining = (source, status, findings) =>
	result(source, status, {
		platforms: [
			{ platform: 'linux/amd64', removed: [], added: [], addedPackages: [], remaining: findings },
			{ platform: 'linux/arm64', removed: [], added: [], addedPackages: [], remaining: findings },
		],
	});

describe('planAlerts', () => {
	it('alerts on each run when a publisher check fails', () => {
		const failed = result('DHI_REF', 'unverified', {
			publisher: { verified: false, error: 'no matching signatures' },
		});
		const first = planAlerts([failed], {}, { now });
		const second = planAlerts([failed], first.state, { now: now + DAY });
		assert.equal(first.alerts.length, 1);
		assert.match(first.alerts[0], /publisher check failed .*no matching signatures/);
		assert.equal(second.alerts.length, 1);
	});

	it('sends no publisher alert for a Node pin that only waits for another Node pin', () => {
		const held = result('DHI_REF', 'unverified', { heldBy: ['BUILDER_IMAGE'] });
		const missing = result('DEBIAN_DHI_REF', 'no-publish-time', { heldBy: ['BUILDER_IMAGE'] });
		const first = planAlerts([held, missing], {}, { now });
		const second = planAlerts([held, missing], first.state, { now: now + DAY });
		assert.deepEqual(first.alerts, []);
		assert.deepEqual(second.alerts, []);
	});

	it('alerts when the Node patch check fails for 2 runs', () => {
		const failed = result('NODE_VERSION', 'node-check-failed', { error: 'fetch failed' });
		const first = planAlerts([failed], {}, { now });
		const second = planAlerts([failed], first.state, { now: now + DAY });
		const back = planAlerts([], second.state, { now: now + 2 * DAY });
		assert.deepEqual(first.alerts, []);
		assert.match(second.alerts[0], /could not check for a Node patch for 2 runs: fetch failed/);
		assert.equal(back.state.nodeCheckFailed, 0);
	});

	it('alerts when the publish time stays missing for 2 runs', () => {
		const missing = result('DISTROLESS_BASE_IMAGE', 'no-publish-time');
		const first = planAlerts([missing], {}, { now });
		const second = planAlerts([missing], first.state, { now: now + DAY });
		assert.deepEqual(first.alerts, []);
		assert.match(second.alerts[0], /no publish time after 2 runs/);
	});

	it('counts the missing publish time by source, when the digest changes', () => {
		const missing = (char) =>
			result('DISTROLESS_BASE_IMAGE', 'no-publish-time', {
				newest: `gcr.io/distroless/cc-debian13@${digest(char)}`,
			});
		const first = planAlerts([missing('c')], {}, { now });
		const second = planAlerts([missing('d')], first.state, { now: now + DAY });
		assert.match(second.alerts[0], /`sha256:dddddddddddd…` has no publish time after 2 runs/);
	});

	it('starts the count again when the publish time comes back', () => {
		const missing = result('DISTROLESS_BASE_IMAGE', 'no-publish-time');
		const first = planAlerts([missing], {}, { now });
		const back = planAlerts([result('DISTROLESS_BASE_IMAGE', 'in-24h-gate')], first.state, {
			now: now + DAY,
		});
		const again = planAlerts([missing], back.state, { now: now + 2 * DAY });
		assert.deepEqual(again.alerts, []);
	});

	it('alerts on a manual run that skipped the gate, with the actor', () => {
		const skipped = result('DHI_REF', 'ready', { gateSkipped: true, autoMerge: false });
		const { alerts } = planAlerts([skipped], {}, { now, manual: true, actor: 'octocat' });
		assert.match(alerts[0], /manual run by @octocat skipped the 24-hour gate/);
		assert.match(alerts[0], /The pin is in the review PR\./);
		assert.deepEqual(planAlerts([skipped], {}, { now }).alerts, []);
		const node = { ...skipped, group: 'node' };
		assert.match(planAlerts([node], {}, { now, manual: true }).alerts[0], /in the Node PR\./);
	});

	it('alerts on a version update, then again after 7 days', () => {
		const update = result('DEBIAN_DHI_REF', 'version-update', {
			versionUpdate: {
				ref: `dhi.io/node:26-debian13@${digest('c')}`,
				platforms: [
					{ platform: 'linux/amd64', removed: [finding('CVE-1')] },
					{ platform: 'linux/arm64', removed: [finding('CVE-1')] },
				],
			},
		});
		const first = planAlerts([update], {}, { now });
		const quiet = planAlerts([update], first.state, { now: now + DAY });
		const repeat = planAlerts([update], first.state, { now: now + REPEAT_MS });
		assert.match(
			first.alerts[0],
			/version update needed\. `dhi\.io\/node:26-debian13` removes 1 finding\./,
		);
		assert.deepEqual(quiet.alerts, []);
		assert.equal(repeat.alerts.length, 1);
	});

	it('counts a fixable finding from the first run that saw it', () => {
		const source = withRemaining('DHI_REF', 'no-upstream-fix', [finding('CVE-1')]);
		const first = planAlerts([source], {}, { now });
		const early = planAlerts([source], first.state, { now: now + STALE_MS - DAY });
		const stale = planAlerts([source], first.state, { now: now + STALE_MS });
		assert.deepEqual(first.alerts, []);
		assert.deepEqual(early.alerts, []);
		assert.match(
			stale.alerts[0],
			/1 finding fixable for 7 days or more without a new digest: CVE-1 \(HIGH: zlib\)\./,
		);
	});

	it('repeats a stale finding every 7 days and drops a fixed one', () => {
		const state = { findings: { 'DHI_REF CVE-1 zlib': ago(STALE_MS) } };
		const source = withRemaining('DHI_REF', 'no-upstream-fix', [finding('CVE-1')]);
		const first = planAlerts([source], state, { now });
		const quiet = planAlerts([source], first.state, { now: now + DAY });
		const fixed = planAlerts([withRemaining('DHI_REF', 'current', [])], first.state, {
			now: now + DAY,
		});
		assert.equal(first.alerts.length, 1);
		assert.deepEqual(quiet.alerts, []);
		assert.deepEqual(fixed.state.findings, {});
		assert.deepEqual(fixed.state.lastAlert, {});
	});

	it('groups the packages of a stale finding, and lists the first 10 findings', () => {
		const findings = Array.from({ length: 12 }, (_, i) => [
			finding(`CVE-${i}`, 'HIGH', 'libkrb5-3'),
			finding(`CVE-${i}`, 'HIGH', 'libk5crypto3'),
		]).flat();
		const state = {
			findings: Object.fromEntries(
				findings.map((f) => [`DEBIAN_DHI_REF ${f.id} ${f.pkg}`, ago(STALE_MS)]),
			),
		};
		const source = withRemaining('DEBIAN_DHI_REF', 'no-upstream-fix', findings);
		const [alert] = planAlerts([source], state, { now }).alerts;
		assert.match(alert, /12 findings fixable/);
		assert.match(alert, /CVE-0 \(HIGH: libkrb5-3, libk5crypto3\)/);
		assert.match(alert, /CVE-9 .* and 2 more\.$/);
		assert.doesNotMatch(alert, /CVE-10/);
	});

	it('leaves a source that needs a version update to the version-update alert', () => {
		const state = { findings: { 'DHI_REF CVE-1 zlib': ago(STALE_MS) } };
		const source = {
			...withRemaining('DHI_REF', 'version-update', [finding('CVE-1')]),
			versionUpdate: { ref: `dhi.io/node:26-alpine@${digest('c')}`, platforms: [] },
		};
		const { alerts, state: next } = planAlerts([source], state, { now });
		assert.equal(alerts.length, 1);
		assert.match(alerts[0], /version update needed/);
		assert.equal(next.findings['DHI_REF CVE-1 zlib'], ago(STALE_MS));
	});

	it('alerts on a stale finding of any severity', () => {
		const state = { findings: { 'DHI_REF CVE-2 zlib': ago(STALE_MS) } };
		const source = withRemaining('DHI_REF', 'no-upstream-fix', [finding('CVE-2', 'LOW')]);
		const [alert] = planAlerts([source], state, { now }).alerts;
		assert.match(alert, /CVE-2 \(LOW: zlib\)/);
	});

	it('skips the finding alerts for PYTHON_IMAGE, which apk upgrade fixes at build time', () => {
		const state = { findings: { 'PYTHON_IMAGE CVE-1 zlib': ago(STALE_MS) } };
		const source = withRemaining('PYTHON_IMAGE', 'no-upstream-fix', [finding('CVE-1')]);
		const { alerts, state: next } = planAlerts([source], state, { now });
		assert.deepEqual(alerts, []);
		assert.deepEqual(next.findings, {});
	});
});

describe('nodeMismatch', () => {
	const bake = (versions) =>
		[
			`variable "NODE_VERSION" { default = "26.13.1" }`,
			...Object.entries(versions).map(
				([name, tag]) => `variable "${name}" {\n  default = "repo:${tag}@${digest('a')}"\n}`,
			),
		].join('\n');
	const aligned = {
		DHI_REF: '26.13.1-alpine3.24-dev',
		DEBIAN_DHI_REF: '26.13.1-debian13-dev',
		BUILDER_IMAGE: '26.13.1-alpine3.24',
		DEBIAN_BUILDER_IMAGE: '26.13.1-trixie-slim',
		RUNTIME_IMAGE: `26.13.1-${'a'.repeat(40)}`,
		DEBIAN_RUNTIME_IMAGE: `26.13.1-debian-${'a'.repeat(40)}`,
		N8N_BUILDER_IMAGE: `26.13.1-${'a'.repeat(40)}-dev`,
		PC_BUILDER_IMAGE: `26.13.1-${'a'.repeat(40)}-dev`,
	};

	it('finds no pin when all are on NODE_VERSION', () => {
		assert.deepEqual(nodeMismatch(bake(aligned)), { version: '26.13.1', lagging: [] });
	});

	it('lists the pins on another Node version', () => {
		const stopped = {
			...aligned,
			N8N_BUILDER_IMAGE: `26.13.0-${'b'.repeat(40)}-dev`,
			PC_BUILDER_IMAGE: `26.13.0-${'b'.repeat(40)}-dev`,
		};
		assert.deepEqual(nodeMismatch(bake(stopped)).lagging, [
			'N8N_BUILDER_IMAGE',
			'PC_BUILDER_IMAGE',
		]);
	});
});

describe('planAlerts for the Node pins', () => {
	const node = { version: '26.13.1', lagging: ['N8N_BUILDER_IMAGE'] };

	it('alerts when a Node pin stays on another version for 48 hours, then every 7 days', () => {
		const first = planAlerts([], {}, { now, node });
		const early = planAlerts([], first.state, { now: now + DAY, node });
		const late = planAlerts([], early.state, { now: now + WAIT_MS, node });
		const quiet = planAlerts([], late.state, { now: now + WAIT_MS + DAY, node });
		const repeat = planAlerts([], quiet.state, { now: now + WAIT_MS + REPEAT_MS, node });
		assert.deepEqual(first.alerts, []);
		assert.deepEqual(early.alerts, []);
		assert.match(
			late.alerts[0],
			/`NODE_VERSION` is `26\.13\.1`, but `N8N_BUILDER_IMAGE` still use another Node version after 2 days/,
		);
		assert.deepEqual(quiet.alerts, []);
		assert.equal(repeat.alerts.length, 1);
	});

	it('starts the count again when the pins are aligned', () => {
		const first = planAlerts([], {}, { now, node });
		const aligned = planAlerts([], first.state, {
			now: now + DAY,
			node: { version: '26.13.1', lagging: [] },
		});
		const again = planAlerts([], aligned.state, { now: now + WAIT_MS, node });
		assert.equal(aligned.state.nodeMismatchSince, undefined);
		assert.deepEqual(again.alerts, []);
	});

	it('skips the check when the Node pins could not be read', () => {
		assert.deepEqual(planAlerts([], {}, { now, node: [] }).alerts, []);
	});
});

describe('planAlerts for the refresh PRs and the chains', () => {
	const pr = (branch, extra = {}) => ({
		number: 45000,
		url: 'https://github.com/n8n-io/n8n/pull/45000',
		branch,
		createdAt: ago(DAY),
		failedChecks: [],
		...extra,
	});

	it('alerts on a refresh PR with failed checks, then again after 7 days', () => {
		const prs = [
			pr('base-image-refresh/daily', { createdAt: ago(0), failedChecks: ['Build: Docker'] }),
		];
		const first = planAlerts([], {}, { now, prs });
		const quiet = planAlerts([], first.state, { now: now + DAY, prs });
		const repeat = planAlerts([], first.state, { now: now + REPEAT_MS, prs });
		assert.deepEqual(first.alerts, [
			'<https://github.com/n8n-io/n8n/pull/45000|#45000> has failed checks: Build: Docker.',
		]);
		assert.deepEqual(quiet.alerts, []);
		// After 7 days, the daily PR also stays open for more than 48 hours.
		assert.deepEqual(repeat.alerts, [
			'<https://github.com/n8n-io/n8n/pull/45000|#45000> has failed checks: Build: Docker.',
			'<https://github.com/n8n-io/n8n/pull/45000|#45000> is open for 7 days without a merge.',
		]);
	});

	it('alerts when the daily or the review PR stays open for 48 hours', () => {
		const old = { createdAt: ago(WAIT_MS + DAY) };
		const young = planAlerts([], {}, { now, prs: [pr('base-image-refresh/review')] });
		const review = planAlerts([], {}, { now, prs: [pr('base-image-refresh/review', old)] });
		const daily = planAlerts([], {}, { now, prs: [pr('base-image-refresh/daily', old)] });
		const node = planAlerts([], {}, { now, prs: [pr('base-image-refresh/node', old)] });
		const chain = planAlerts(
			[],
			{},
			{
				now,
				prs: [pr('base-image-refresh/chain-build-base-image', old)],
			},
		);
		assert.deepEqual(young.alerts, []);
		assert.match(review.alerts[0], /#45000> waits for a review\. It is open for 3 days\./);
		assert.match(daily.alerts[0], /#45000> is open for 3 days without a merge\./);
		assert.match(node.alerts[0], /#45000> waits for a review\. It is open for 3 days\./);
		assert.deepEqual(chain.alerts, []);
		assert.deepEqual(chain.state.lastAlert, {});
	});

	it('alerts when a chain stops for 48 hours after the publish', () => {
		const chain = (publishedAt, lagging) => ({
			workflow: 'build-base-image.yml',
			sha: 'f'.repeat(40),
			runUrl: 'https://github.com/n8n-io/n8n/actions/runs/4',
			publishedAt,
			lagging,
		});
		const early = planAlerts([], {}, { now, chains: [chain(ago(DAY), ['RUNTIME_IMAGE'])] });
		const pinned = planAlerts([], {}, { now, chains: [chain(ago(WAIT_MS), [])] });
		const stopped = planAlerts(
			[],
			{},
			{
				now,
				chains: [chain(ago(WAIT_MS), ['RUNTIME_IMAGE', 'DEBIAN_RUNTIME_IMAGE'])],
			},
		);
		assert.deepEqual(early.alerts, []);
		assert.deepEqual(pinned.alerts, []);
		assert.equal(
			stopped.alerts[0],
			'The chain stopped: `build-base-image.yml` published `fffffff` more than 48 hours ago (<https://github.com/n8n-io/n8n/actions/runs/4|run>), but `RUNTIME_IMAGE`, `DEBIAN_RUNTIME_IMAGE` still pin older images.',
		);
	});
});

describe('findPublishedRun', () => {
	const hcl = readFileSync(new URL('../../../docker/docker-bake.hcl', import.meta.url), 'utf8');
	const run = (sha, subject) => ({ head_sha: sha.repeat(40), head_commit: { message: subject } });
	const runs = [
		run('a', 'fix(core): Something else (#45010)'),
		run('b', 'build: Update base image digests with fewer OS findings (#45009)'),
		run('c', 'build: Update base image digests with fewer OS findings (#45008)'),
	];

	it('skips a refresh run that published no image', async () => {
		const found = await findPublishedRun(runs, 'build-base-image.yml', {
			bakeFileAt: async () => hcl,
			resolve: (tag) => (tag.includes('c'.repeat(40)) ? digest('e') : null),
		});
		assert.equal(found.run.head_sha, 'c'.repeat(40));
		assert.equal(found.publishedHcl, hcl);
	});

	it('finds no run when no refresh run published', async () => {
		const found = await findPublishedRun(runs, 'build-base-image.yml', {
			bakeFileAt: async () => hcl,
			resolve: () => null,
		});
		assert.equal(found, null);
	});
});

describe('renderAlerts', () => {
	it('links the run and lists each alert', () => {
		const text = renderAlerts(['`DHI_REF`: one.', '`DEBIAN_DHI_REF`: two.'], {
			runUrl: 'https://github.com/n8n-io/n8n/actions/runs/3',
		});
		assert.equal(
			text,
			[
				'*Base image refresh needs a person* (<https://github.com/n8n-io/n8n/actions/runs/3|run>)',
				'• `DHI_REF`: one.',
				'• `DEBIAN_DHI_REF`: two.',
			].join('\n'),
		);
	});
});
