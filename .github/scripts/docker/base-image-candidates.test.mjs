import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
	SOURCES,
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

describe('renderSummary', () => {
	it('renders one row for each platform', () => {
		const result = evaluateSource(pin, digest('c'), [
			{
				platform: 'linux/amd64',
				pinned: summarizeReport(report([finding('CVE-1', 'openssl', 'CRITICAL')])),
				newest: summarizeReport(report([], ['curl'])),
			},
		]);
		const summary = renderSummary([result, evaluateSource(pin, digest('a'), [])]);
		assert.match(
			summary,
			/\| `DHI_REF` \| candidate \| linux\/amd64 \| 1 C \/ 0 H \/ 0 M \| 0 C \/ 0 H \/ 0 M \| curl \|/,
		);
		assert.match(summary, /\| `DHI_REF` \| current \| - \| - \| - \| - \|/);
	});
});
