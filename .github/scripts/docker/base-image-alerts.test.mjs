import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPEAT_MS, STALE_MS, planAlerts, renderAlerts } from './base-image-alerts.mjs';

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
		assert.deepEqual(planAlerts([skipped], {}, { now }).alerts, []);
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

	it('ignores medium findings for the 7-day alert', () => {
		const state = { findings: { 'DHI_REF CVE-2 zlib': ago(STALE_MS) } };
		const source = withRemaining('DHI_REF', 'no-upstream-fix', [finding('CVE-2', 'MEDIUM')]);
		assert.deepEqual(planAlerts([source], state, { now }).alerts, []);
	});

	it('skips the finding alerts for PYTHON_IMAGE, which apk upgrade fixes at build time', () => {
		const state = { findings: { 'PYTHON_IMAGE CVE-1 zlib': ago(STALE_MS) } };
		const source = withRemaining('PYTHON_IMAGE', 'no-upstream-fix', [finding('CVE-1')]);
		const { alerts, state: next } = planAlerts([source], state, { now });
		assert.deepEqual(alerts, []);
		assert.deepEqual(next.findings, {});
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
