import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPin } from './base-image-candidates.mjs';
import {
	RETRY_MS,
	TARGETS,
	planTarget,
	rebuildFindings,
	renderBody,
	sourceKeys,
} from './base-image-rebuild.mjs';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-25T02:00:00Z');
const ago = (ms) => new Date(now - ms).toISOString();
const digest = (char) => `sha256:${char.repeat(64)}`;
const sha = 'e'.repeat(40);
const hcl = readFileSync(new URL('../../../docker/docker-bake.hcl', import.meta.url), 'utf8');
const base = TARGETS.find((spec) => spec.target === 'base');
const pin = readPin(hcl, 'RUNTIME_IMAGE');
const dhiPin = readPin(hcl, 'DHI_REF');
const pinnedBase = `${pin.repository}@${pin.digest}`;
const rebuiltBase = `n8nio/base@${digest('b')}`;

const finding = (id, pkg, fixed = '1.1-r0') => ({
	id,
	pkg,
	severity: 'HIGH',
	installed: '1.0-r0',
	fixed,
});
const openssh = finding('CVE-1', 'openssh-client-common', '10.3_p1-r2');
const tiff = finding('CVE-2', 'tiff', '4.7.2-r0');
const zlib = finding('CVE-3', 'zlib');

const dhi = (status = 'no-upstream-fix', remaining = [zlib], source = 'DHI_REF') => ({
	source,
	status,
	pinned: readPin(hcl, source).ref,
	platforms: ['linux/amd64', 'linux/arm64'].map((platform) => ({
		platform,
		removed: [],
		added: [],
		addedPackages: [],
		remaining,
	})),
});

/** Fake lookups: each scan returns the findings of its ref, for all platforms or by platform. */
const fakes = (overrides = {}) => {
	const calls = { available: [] };
	const scans = {
		[pinnedBase]: [openssh, tiff, zlib],
		[rebuiltBase]: [zlib],
		...overrides.scans,
	};
	return {
		calls,
		deps: {
			scan: (ref, platform) => {
				const found = scans[ref];
				return { findings: Array.isArray(found) ? found : found[platform], packages: [] };
			},
			available: (distro, ref, platform, findings) => {
				calls.available.push({ distro, ref, platform, pkgs: findings.map((f) => f.pkg) });
				const fixed = overrides.available ?? new Set(['openssh-client-common']);
				return typeof fixed === 'function' ? fixed(platform) : fixed;
			},
			findRun: async () => overrides.run ?? null,
			bakeFileAt: async () => overrides.bake ?? hcl,
			resolve: () => ('digest' in overrides ? overrides.digest : digest('b')),
			lastPullRequest: async () => overrides.pr ?? null,
		},
	};
};

const plan = (
	deps,
	{ entry, tried, results = [dhi()], skipGate = false, at = now, spec = base } = {},
) => planTarget(spec, { hcl, results, entry, tried, now: at, skipGate, deps });

describe('sourceKeys', () => {
	it('gives the findings of the pinned DHI image, not those of the newest digest', () => {
		const keys = sourceKeys({
			removed: [finding('CVE-1', 'a')],
			added: [finding('CVE-2', 'b')],
			remaining: [finding('CVE-2', 'b'), finding('CVE-3', 'c')],
		});
		assert.deepEqual([...keys].sort(), ['CVE-1 a', 'CVE-3 c']);
	});
});

describe('rebuildFindings', () => {
	it('keeps the findings that the DHI image does not have, with their platforms', () => {
		const findings = rebuildFindings(
			[
				{ platform: 'linux/amd64', base: { findings: [openssh, zlib] } },
				{ platform: 'linux/arm64', base: { findings: [openssh, tiff, zlib] } },
			],
			dhi(),
		);
		assert.deepEqual(
			findings.map((f) => `${f.id} ${f.platforms.join('+')}`),
			['CVE-1 linux/amd64+linux/arm64', 'CVE-2 linux/arm64'],
		);
	});
});

describe('planTarget: find a rebuild', () => {
	it('dispatches a rebuild when the DHI repository has a fix for a package that the base installs', async () => {
		const { deps, calls } = fakes();
		const result = await plan(deps);
		assert.equal(result.dispatch, true);
		assert.deepEqual(result.entry.keys, ['CVE-1 openssh-client-common']);
		assert.equal(result.entry.pinned, pin.ref);
		assert.equal(result.entry.dispatchedAt, ago(0));
		// The package manager of the pinned DHI image checks only the findings of the base packages.
		assert.deepEqual(calls.available[0], {
			distro: 'alpine',
			ref: dhiPin.ref,
			platform: 'linux/amd64',
			pkgs: ['openssh-client-common', 'tiff'],
		});
		assert.deepEqual(
			calls.available.map((call) => call.platform),
			['linux/amd64', 'linux/arm64'],
		);
	});

	it('rebuilds for a finding that only one platform has a fix for', async () => {
		const { deps, calls } = fakes({
			scans: { [pinnedBase]: { 'linux/amd64': [zlib], 'linux/arm64': [openssh, zlib] } },
			available: (platform) =>
				platform === 'linux/arm64' ? new Set(['openssh-client-common']) : new Set(),
		});
		const result = await plan(deps);
		assert.equal(result.dispatch, true);
		assert.deepEqual(result.entry.findings[0].platforms, ['linux/arm64']);
		assert.deepEqual(
			calls.available.map((call) => `${call.platform}: ${call.pkgs.join(',')}`),
			['linux/amd64: ', 'linux/arm64: openssh-client-common'],
		);
	});

	it('checks the Debian base with the Debian DHI image', async () => {
		const debian = TARGETS.find((spec) => spec.target === 'base-debian');
		const debianPin = readPin(hcl, 'DEBIAN_RUNTIME_IMAGE');
		const client = finding('CVE-6', 'openssh-client', '1:10.0p1-7+deb13u4');
		const { deps, calls } = fakes({
			scans: { [`${debianPin.repository}@${debianPin.digest}`]: [client, zlib] },
			available: new Set(['openssh-client']),
		});
		const results = [dhi(), dhi('no-upstream-fix', [zlib], 'DEBIAN_DHI_REF')];
		const result = await plan(deps, { spec: debian, results });
		assert.equal(result.dispatch, true);
		assert.equal(result.entry.pinned, debianPin.ref);
		assert.deepEqual(result.entry.keys, ['CVE-6 openssh-client']);
		assert.equal(calls.available[0].distro, 'debian');
		assert.equal(calls.available[0].ref, readPin(hcl, 'DEBIAN_DHI_REF').ref);
	});

	it('does not rebuild when the DHI repository has no fix yet', async () => {
		const { deps } = fakes({ available: new Set() });
		const result = await plan(deps);
		assert.equal(result.dispatch, undefined);
		assert.equal(result.entry, undefined);
		assert.match(result.note, /no fix yet/);
	});

	it('does not rebuild when each finding comes from the DHI image', async () => {
		const { deps, calls } = fakes({ scans: { [pinnedBase]: [zlib] } });
		const result = await plan(deps);
		assert.equal(result.dispatch, undefined);
		assert.equal(calls.available.length, 0);
	});

	it('leaves the base to a refresh PR of the DHI pin', async () => {
		for (const status of ['ready', 'in-24h-gate']) {
			const { deps, calls } = fakes();
			const result = await plan(deps, { results: [dhi(status)] });
			assert.equal(result.dispatch, undefined);
			assert.equal(calls.available.length, 0);
		}
	});

	it('waits for the chain PR when the base is not built from the DHI pin', async () => {
		const older = hcl.replace(dhiPin.ref, `${dhiPin.repository}:${dhiPin.tag}@${digest('0')}`);
		const { deps } = fakes({ bake: older });
		const result = await plan(deps);
		assert.equal(result.dispatch, undefined);
		assert.match(result.note, /chain PR is due/);
	});

	it('does not rebuild for the same findings within 7 days', async () => {
		const keys = ['CVE-1 openssh-client-common'];
		const { deps } = fakes();
		const recent = await plan(deps, { tried: { keys, at: ago(RETRY_MS - DAY) } });
		const old = await plan(deps, { tried: { keys, at: ago(RETRY_MS) } });
		const other = await plan(deps, { tried: { keys: ['CVE-9 x'], at: ago(DAY) } });
		assert.equal(recent.dispatch, undefined);
		assert.equal(old.dispatch, true);
		assert.equal(other.dispatch, true);
	});
});

describe('planTarget: follow a rebuild', () => {
	const pending = (extra = {}) => ({
		pinned: pin.ref,
		keys: ['CVE-1 openssh-client-common'],
		dispatchedAt: ago(DAY),
		runId: 7,
		...extra,
	});
	const run = (extra = {}) => ({
		id: 7,
		status: 'completed',
		conclusion: 'success',
		head_sha: sha,
		html_url: 'https://github.com/n8n-io/n8n/actions/runs/7',
		updated_at: ago(DAY - 60_000),
		...extra,
	});

	it('waits while the rebuild runs', async () => {
		const { deps } = fakes({ run: run({ status: 'in_progress', conclusion: null }) });
		const result = await plan(deps, { entry: pending() });
		assert.equal(result.entry.built, undefined);
		assert.deepEqual(result.events, []);
	});

	it('alerts and waits 7 days when the rebuild fails', async () => {
		const { deps } = fakes({ run: run({ conclusion: 'failure' }) });
		const result = await plan(deps, { entry: pending() });
		assert.equal(result.entry, undefined);
		assert.deepEqual(result.tried, { keys: ['CVE-1 openssh-client-common'], at: ago(0) });
		assert.match(
			result.events[0],
			/^`base`: the rebuild of `n8nio\/base` failed \(<https:.*\|run>\)\./,
		);
	});

	it('alerts when no rebuild run started after a day', async () => {
		const { deps } = fakes();
		const result = await plan(deps, { entry: pending({ runId: null }) });
		assert.match(result.events[0], /did not start/);
	});

	it('alerts when the rebuild published no image', async () => {
		const { deps } = fakes({ run: run(), digest: null });
		const result = await plan(deps, { entry: pending() });
		assert.match(result.events[0], /published no `n8nio\/base:[0-9.]+-e{40}`/);
	});

	it('alerts when the rebuilt base removes no finding', async () => {
		const { deps } = fakes({ run: run(), scans: { [rebuiltBase]: [openssh, tiff, zlib] } });
		const result = await plan(deps, { entry: pending() });
		assert.match(result.events[0], /did not reduce the findings/);
		assert.equal(result.entry, undefined);
	});

	it('alerts when the rebuilt base adds more findings than it removes', async () => {
		const added = [finding('CVE-4', 'libpng'), finding('CVE-5', 'freetype')];
		const { deps } = fakes({ run: run(), scans: { [rebuiltBase]: [tiff, zlib, ...added] } });
		const result = await plan(deps, { entry: pending() });
		assert.match(result.events[0], /did not reduce the findings/);
		assert.equal(result.change, undefined);
	});

	it('pins the Debian base from its own tag', async () => {
		const debian = TARGETS.find((spec) => spec.target === 'base-debian');
		const debianPin = readPin(hcl, 'DEBIAN_RUNTIME_IMAGE');
		const { deps } = fakes({
			run: run(),
			scans: { [`${debianPin.repository}@${debianPin.digest}`]: [openssh, zlib] },
		});
		const result = await plan(deps, {
			spec: debian,
			entry: pending({ pinned: debianPin.ref }),
			at: now + DAY,
		});
		assert.equal(result.change.source, 'DEBIAN_RUNTIME_IMAGE');
		assert.match(result.change.newest, new RegExp(`^n8nio/base:[0-9.]+-debian-${sha}@`));
	});

	it('keeps the rebuilt base in the 24-hour gate, then pins it', async () => {
		const { deps } = fakes({ run: run() });
		const first = await plan(deps, { entry: pending() });
		assert.match(first.entry.built.ref, new RegExp(`^n8nio/base:[0-9.]+-${sha}@${digest('b')}$`));
		assert.equal(first.change, undefined);
		const later = await plan(deps, { entry: first.entry, at: now + DAY });
		assert.equal(later.change.source, 'RUNTIME_IMAGE');
		assert.equal(later.change.pinned, pin.ref);
		assert.equal(later.change.newest, first.entry.built.ref);
		assert.equal(later.change.gateSkipped, false);
	});

	it('lets a manual run skip the 24-hour gate', async () => {
		const { deps } = fakes({ run: run() });
		const result = await plan(deps, { entry: pending(), skipGate: true });
		assert.equal(result.change.gateSkipped, true);
	});

	it('stops when a person closed the rebuild PR', async () => {
		const built = { ref: `n8nio/base:x@${digest('b')}`, publishedAt: ago(2 * DAY), platforms: [] };
		const { deps } = fakes({ pr: { closed: true, merged: false, createdAt: ago(DAY) } });
		const result = await plan(deps, { entry: pending({ built }) });
		assert.equal(result.entry, undefined);
		assert.equal(result.change, undefined);
		assert.deepEqual(result.tried.keys, ['CVE-1 openssh-client-common']);
	});

	it('ends when the pin changes', async () => {
		const { deps } = fakes();
		const result = await plan(deps, { entry: pending({ pinned: 'n8nio/base:old@sha256:0' }) });
		assert.equal(result.entry, undefined);
		assert.equal(result.dispatch, undefined);
	});
});

describe('renderBody', () => {
	it('lists the removed findings of each pin', () => {
		const body = renderBody(
			[
				{
					source: 'RUNTIME_IMAGE',
					pinned: 'n8nio/base:26.13.0-a@sha256:1',
					newest: 'n8nio/base:26.13.0-b@sha256:2',
					publishedAt: '2026-11-24T02:30:00Z',
					runUrl: 'https://github.com/n8n-io/n8n/actions/runs/7',
					gateSkipped: false,
					platforms: [{ platform: 'linux/amd64', removed: [openssh] }],
				},
			],
			{ runUrl: 'https://github.com/n8n-io/n8n/actions/runs/8' },
		);
		assert.match(body, /### `RUNTIME_IMAGE`/);
		assert.match(
			body,
			/\| CVE-1 \| HIGH \| openssh-client-common \| 1\.0-r0 \| 10\.3_p1-r2 \| linux\/amd64 \|/,
		);
		assert.doesNotMatch(body, /skipped the 24-hour gate/);
	});
});
