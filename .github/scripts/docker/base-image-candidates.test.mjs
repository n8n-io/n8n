import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	GATE_MS,
	SOURCES,
	applyGate,
	classifyNoFix,
	movingTagOf,
	compareScans,
	evaluateSource,
	readPin,
	renderSummary,
	summarizeReport,
} from './base-image-candidates.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;

const finding = (id, pkg, severity = 'HIGH') => ({
	VulnerabilityID: id,
	PkgName: pkg,
	Severity: severity,
	InstalledVersion: '1.0',
	FixedVersion: '1.1',
});

const report = (vulnerabilities, packages = []) => ({
	Results: [
		{
			Packages: packages.map((Name) => ({ Name })),
			Vulnerabilities: vulnerabilities,
		},
	],
});

const pin = readPin(
	`variable "DHI_REF" {\n  default = "dhi.io/node:26.13.0-alpine3.24-dev@${digest('a')}"\n}\n`,
	'DHI_REF',
);

describe('readPin', () => {
	it('splits a pin into repository, tag and digest', () => {
		assert.deepEqual(pin, {
			name: 'DHI_REF',
			ref: `dhi.io/node:26.13.0-alpine3.24-dev@${digest('a')}`,
			repository: 'dhi.io/node',
			tag: '26.13.0-alpine3.24-dev',
			digest: digest('a'),
		});
	});

	it('reads a registry with a port', () => {
		const hcl = `variable "X" { default = "localhost:5000/node:26@${digest('b')}" }`;
		assert.equal(readPin(hcl, 'X').repository, 'localhost:5000/node');
	});

	it('rejects a pin without a digest', () => {
		assert.throws(() => readPin('variable "X" { default = "node:26" }', 'X'), /is not pinned/);
	});

	it('rejects a missing variable', () => {
		assert.throws(() => readPin('', 'X'), /no plain string default/);
	});

	it('reads every source from the bake file', () => {
		const hcl = readFileSync(new URL('../../../docker/docker-bake.hcl', import.meta.url), 'utf8');
		for (const name of SOURCES) assert.equal(readPin(hcl, name).name, name);
	});
});

describe('summarizeReport', () => {
	it('collects the findings and the package names', () => {
		const summary = summarizeReport(
			report([finding('CVE-1', 'openssl'), finding('CVE-1', 'openssl')], ['zlib', 'openssl']),
		);
		assert.deepEqual(summary.findings, [
			{ id: 'CVE-1', pkg: 'openssl', severity: 'HIGH', installed: '1.0', fixed: '1.1' },
		]);
		assert.deepEqual(summary.packages, ['openssl', 'zlib']);
	});

	it('accepts a report without results', () => {
		assert.deepEqual(summarizeReport({}), { findings: [], packages: [] });
	});
});

describe('compareScans', () => {
	it('lists the removed and added findings and the added packages', () => {
		const pinned = summarizeReport(
			report([finding('CVE-1', 'openssl'), finding('CVE-2', 'zlib')], ['openssl', 'zlib']),
		);
		const newest = summarizeReport(
			report([finding('CVE-2', 'zlib'), finding('CVE-3', 'curl')], ['openssl', 'zlib', 'curl']),
		);
		const diff = compareScans(pinned, newest);
		assert.deepEqual(
			diff.removed.map((f) => f.id),
			['CVE-1'],
		);
		assert.deepEqual(
			diff.added.map((f) => f.id),
			['CVE-3'],
		);
		assert.deepEqual(diff.addedPackages, ['curl']);
		assert.deepEqual(
			diff.remaining.map((f) => f.id),
			['CVE-2', 'CVE-3'],
		);
	});

	it('treats the same CVE in another package as another finding', () => {
		const pinned = summarizeReport(report([finding('CVE-1', 'libssl3')]));
		const newest = summarizeReport(report([finding('CVE-1', 'libcrypto3')]));
		const diff = compareScans(pinned, newest);
		assert.equal(diff.removed.length, 1);
		assert.equal(diff.added.length, 1);
	});
});

describe('evaluateSource', () => {
	const scans = (pinnedVulns, newestVulns) => [
		{
			platform: 'linux/amd64',
			pinned: summarizeReport(report(pinnedVulns)),
			newest: summarizeReport(report(newestVulns)),
		},
	];

	it('reports a source whose tag has no newer digest', () => {
		const result = evaluateSource(pin, digest('a'), []);
		assert.equal(result.status, 'current');
		assert.equal(result.newest, pin.ref);
	});

	it('reports a newer digest that removes a finding as a candidate', () => {
		const result = evaluateSource(pin, digest('c'), scans([finding('CVE-1', 'openssl')], []));
		assert.equal(result.status, 'candidate');
		assert.equal(result.newest, `dhi.io/node:26.13.0-alpine3.24-dev@${digest('c')}`);
	});

	it('reports a newer digest that removes no finding', () => {
		const result = evaluateSource(pin, digest('c'), scans([], [finding('CVE-1', 'openssl')]));
		assert.equal(result.status, 'no-fix');
	});
});

describe('evaluateSource without a newer digest', () => {
	const same = (vulns) => {
		const scanned = summarizeReport(report(vulns));
		return [{ platform: 'linux/amd64', pinned: scanned, newest: scanned }];
	};

	it('reports a pinned digest without findings as current', () => {
		assert.equal(evaluateSource(pin, digest('a'), same([])).status, 'current');
	});

	it('reports a pinned digest with findings as no-fix', () => {
		const result = evaluateSource(pin, digest('a'), same([finding('CVE-1', 'openssl')]));
		assert.equal(result.status, 'no-fix');
	});
});

describe('movingTagOf', () => {
	it('drops the patch number', () => {
		assert.equal(movingTagOf('26.13.0-alpine3.24-dev'), '26.13-alpine3.24-dev');
		assert.equal(movingTagOf('3.13.18-slim-trixie'), '3.13-slim-trixie');
		assert.equal(movingTagOf('26.13.0'), '26.13');
	});

	it('returns null for a tag without a patch number', () => {
		assert.equal(movingTagOf('latest'), null);
		assert.equal(movingTagOf('26.13-alpine3.24-dev'), null);
	});
});

describe('classifyNoFix', () => {
	const noFix = { source: 'DHI_REF', status: 'no-fix', platforms: [] };
	const moving = (removed) => ({
		ref: `dhi.io/node:26.13-alpine3.24-dev@${digest('d')}`,
		platforms: [{ platform: 'linux/amd64', removed, added: [], addedPackages: [] }],
	});
	const fixed = { id: 'CVE-1', pkg: 'openssl', severity: 'HIGH' };

	it('asks for a version update when the moving tag removes a finding', () => {
		const result = classifyNoFix(noFix, moving([fixed]));
		assert.equal(result.status, 'version-update');
		assert.equal(result.versionUpdate.ref, `dhi.io/node:26.13-alpine3.24-dev@${digest('d')}`);
	});

	it('reports no upstream fix when the moving tag removes nothing', () => {
		assert.equal(classifyNoFix(noFix, moving([])).status, 'no-upstream-fix');
	});

	it('reports no upstream fix without a moving tag', () => {
		assert.equal(classifyNoFix(noFix, null).status, 'no-upstream-fix');
	});
});

describe('applyGate', () => {
	const now = Date.parse('2026-11-19T12:00:00Z');
	const candidate = (addedPackages = []) => ({
		source: 'DHI_REF',
		status: 'candidate',
		platforms: [{ platform: 'linux/amd64', removed: [], added: [], addedPackages }],
	});
	const publisher = (publishedAt, verified = true) => ({ publisher: 'dhi', verified, publishedAt });
	const hoursAgo = (hours) => new Date(now - hours * 60 * 60 * 1000).toISOString();

	it('keeps a digest with a failed publisher check out', () => {
		const result = applyGate(candidate(), publisher(hoursAgo(48), false), { now, skipGate: true });
		assert.equal(result.status, 'unverified');
	});

	it('keeps a digest younger than 24 hours in the gate', () => {
		const result = applyGate(candidate(), publisher(hoursAgo(23)), { now, skipGate: false });
		assert.equal(result.status, 'in-24h-gate');
	});

	it('releases a digest at exactly 24 hours', () => {
		const publishedAt = new Date(now - GATE_MS).toISOString();
		const result = applyGate(candidate(), publisher(publishedAt), { now, skipGate: false });
		assert.equal(result.status, 'ready');
		assert.equal(result.autoMerge, true);
	});

	it('keeps a digest without a publication time out', () => {
		const result = applyGate(candidate(), publisher(null), { now, skipGate: false });
		assert.equal(result.status, 'no-publish-time');
	});

	it('skips the gate on a manual run, without auto-merge', () => {
		const young = applyGate(candidate(), publisher(hoursAgo(1)), { now, skipGate: true });
		const unknown = applyGate(candidate(), publisher(null), { now, skipGate: true });
		for (const result of [young, unknown]) {
			assert.equal(result.status, 'ready');
			assert.equal(result.autoMerge, false);
			assert.equal(result.gateSkipped, true);
		}
	});

	it('keeps auto-merge on a manual run for a digest older than 24 hours', () => {
		const result = applyGate(candidate(), publisher(hoursAgo(48)), { now, skipGate: true });
		assert.equal(result.autoMerge, true);
		assert.equal(result.gateSkipped, false);
	});

	it('turns auto-merge off for a digest that adds a package', () => {
		const result = applyGate(candidate(['curl']), publisher(hoursAgo(48)), {
			now,
			skipGate: false,
		});
		assert.equal(result.status, 'ready');
		assert.equal(result.autoMerge, false);
	});
});

describe('renderSummary', () => {
	it('renders one row for each platform', () => {
		const result = evaluateSource(pin, digest('c'), [
			{
				platform: 'linux/amd64',
				pinned: summarizeReport(report([finding('CVE-1', 'openssl', 'CRITICAL')])),
				newest: summarizeReport(report([], ['curl'])),
			},
			{
				platform: 'linux/arm64',
				pinned: summarizeReport(report([finding('CVE-2', 'zlib', 'HIGH')])),
				newest: summarizeReport(report([])),
			},
		]);
		const ready = applyGate(
			result,
			{ publisher: 'dhi', verified: true, publishedAt: '2026-11-17T00:00:00.000Z' },
			{ now: Date.parse('2026-11-19T00:00:00Z'), skipGate: false },
		);
		const summary = renderSummary([ready, evaluateSource(pin, digest('a'), [])]);
		assert.match(
			summary,
			/\| `DHI_REF` \| ready \| 2026-11-17T00:00:00.000Z \| no \| linux\/amd64 \| 1 C \/ 0 H \/ 0 M \/ 0 L \/ 0 U \| 0 C \/ 0 H \/ 0 M \/ 0 L \/ 0 U \| 0 C \/ 0 H \/ 0 M \/ 0 L \/ 0 U \| curl \|/,
		);
		assert.match(
			summary,
			/\| `DHI_REF` \| ready \| 2026-11-17T00:00:00.000Z \| no \| linux\/arm64 \| 0 C \/ 1 H \/ 0 M \/ 0 L \/ 0 U \| 0 C \/ 0 H \/ 0 M \/ 0 L \/ 0 U \| 0 C \/ 0 H \/ 0 M \/ 0 L \/ 0 U \| - \|/,
		);
		assert.match(summary, /\| `DHI_REF` \| current \| - \| - \| - \| - \| - \| - \| - \|/);
	});

	it('lists the sources that need a version update', () => {
		const fixed = { id: 'CVE-1', pkg: 'openssl', severity: 'HIGH' };
		const versionUpdate = classifyNoFix(
			{ source: 'DHI_REF', status: 'no-fix', platforms: [] },
			{
				ref: 'dhi.io/node:26.13-alpine3.24-dev@sha256:d',
				platforms: [
					{ platform: 'linux/amd64', removed: [fixed], added: [], addedPackages: [] },
					{ platform: 'linux/arm64', removed: [fixed], added: [], addedPackages: [] },
				],
			},
		);
		const summary = renderSummary([versionUpdate]);
		assert.match(summary, /### Needs a person/);
		assert.match(
			summary,
			/- `DHI_REF`: version update needed\. `dhi\.io\/node:26\.13-alpine3\.24-dev@sha256:d` removes 0 C \/ 1 H \/ 0 M \/ 0 L \/ 0 U\./,
		);
	});

	it('lists the publisher errors', () => {
		const unverified = applyGate(
			evaluateSource(pin, digest('c'), []),
			{ publisher: 'dhi', verified: false, publishedAt: null, error: 'no signatures found' },
			{ now: 0, skipGate: false },
		);
		assert.match(renderSummary([unverified]), /- `DHI_REF`: no signatures found/);
	});
});
