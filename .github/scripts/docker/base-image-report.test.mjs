import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	IMAGES,
	LINES,
	buildReport,
	parseTags,
	renderSummary,
	resolveVersion,
	statusOf,
	versionsOf,
} from './base-image-report.mjs';

const finding = (id, severity = 'HIGH', pkg = 'zlib') => ({
	id,
	pkg,
	severity,
	installed: '1.0',
	fixed: '1.1',
});

const platform = (removed = [], remaining = []) => ({
	platform: 'linux/amd64',
	removed,
	added: [],
	addedPackages: [],
	remaining,
});

const n8n = IMAGES.find((image) => image.name === 'n8n');
const runUrl = 'https://github.com/n8n-io/n8n/actions/runs/5';
const prs = [
	{ branch: 'base-image-refresh/daily', url: 'https://github.com/n8n-io/n8n/pull/45000' },
	{ branch: 'base-image-refresh/review', url: 'https://github.com/n8n-io/n8n/pull/45001' },
];
const context = (results, nightlyKeys = new Set(['CVE-1 zlib'])) => ({
	results,
	nightlyKeys,
	prs,
	runUrl,
});

describe('statusOf', () => {
	it('marks a finding that the nightly image no longer has as fix-merged', () => {
		assert.deepEqual(statusOf('CVE-1 zlib', n8n, context([], new Set())), {
			status: 'fix-merged',
		});
	});

	it('links the daily or the review PR of a ready digest that removes the finding', () => {
		const ready = (autoMerge) => ({
			source: 'DHI_REF',
			status: 'ready',
			autoMerge,
			platforms: [platform([finding('CVE-1')])],
		});
		assert.deepEqual(statusOf('CVE-1 zlib', n8n, context([ready(true)])), {
			status: 'pr-open',
			link: 'https://github.com/n8n-io/n8n/pull/45000',
		});
		assert.deepEqual(statusOf('CVE-1 zlib', n8n, context([ready(false)])), {
			status: 'pr-open',
			link: 'https://github.com/n8n-io/n8n/pull/45001',
		});
	});

	it('gives the gate status of a digest that removes the finding', () => {
		const held = (status) => [
			{ source: 'DHI_REF', status, platforms: [platform([finding('CVE-1')])] },
		];
		assert.equal(statusOf('CVE-1 zlib', n8n, context(held('in-24h-gate'))).status, 'in-24h-gate');
		assert.equal(
			statusOf('CVE-1 zlib', n8n, context(held('unverified'))).status,
			'publisher-check-failed',
		);
		assert.equal(
			statusOf('CVE-1 zlib', n8n, context(held('no-publish-time'))).status,
			'no-publish-time',
		);
	});

	it('links the run for a version update that removes the finding', () => {
		const results = [
			{
				source: 'DHI_REF',
				status: 'version-update',
				platforms: [platform([], [finding('CVE-1')])],
				versionUpdate: { platforms: [platform([finding('CVE-1')])] },
			},
		];
		assert.deepEqual(statusOf('CVE-1 zlib', n8n, context(results)), {
			status: 'version-update',
			link: runUrl,
		});
	});

	it('tells a finding of the upstream image from a package that the base installs', () => {
		const results = [
			{
				source: 'DHI_REF',
				status: 'no-upstream-fix',
				platforms: [platform([], [finding('CVE-1')])],
			},
		];
		assert.equal(statusOf('CVE-1 zlib', n8n, context(results)).status, 'no-upstream-fix');
		assert.equal(
			statusOf('CVE-2 openssh', n8n, context(results, new Set(['CVE-2 openssh']))).status,
			'needs-rebuild',
		);
	});

	it('ignores the pins of other images', () => {
		const results = [
			{
				source: 'DEBIAN_DHI_REF',
				status: 'ready',
				autoMerge: true,
				platforms: [platform([finding('CVE-1')])],
			},
		];
		assert.equal(statusOf('CVE-1 zlib', n8n, context(results)).status, 'needs-rebuild');
	});
});

describe('buildReport', () => {
	const scans = (release, nightly) =>
		['linux/amd64', 'linux/arm64'].map((name) => ({
			platform: name,
			release: { findings: release, packages: [] },
			nightly: nightly ? { findings: nightly, packages: [] } : null,
		}));

	it('lists each finding once with its platforms and status, the most severe first', () => {
		const report = buildReport({
			line: 'stable',
			version: '2.48.8',
			image: n8n,
			ref: 'n8nio/n8n:2.48.8@sha256:a',
			nightlyRef: 'n8nio/n8n:nightly@sha256:b',
			scans: scans([finding('CVE-2', 'LOW'), finding('CVE-1', 'CRITICAL')], []),
			results: [],
			prs,
			runUrl,
		});
		assert.deepEqual(
			report.findings.map((f) => `${f.severity} ${f.id} ${f.platforms.join('+')} ${f.status}`),
			[
				'CRITICAL CVE-1 linux/amd64+linux/arm64 fix-merged',
				'LOW CVE-2 linux/amd64+linux/arm64 fix-merged',
			],
		);
	});

	it('does not claim fix-merged without a nightly image', () => {
		const report = buildReport({
			line: 'stable',
			version: '2.48.8',
			image: n8n,
			ref: 'n8nio/n8n:2.48.8@sha256:a',
			nightlyRef: null,
			scans: scans([finding('CVE-1')], null),
			results: [],
			prs,
			runUrl,
		});
		assert.equal(report.findings[0].status, 'needs-rebuild');
	});
});

describe('parseTags', () => {
	it('maps each tag to its commit, and an annotated tag to the commit it points to', () => {
		const tags = parseTags(
			[
				'aaa\trefs/tags/stable',
				'aaa\trefs/tags/n8n@2.49.5',
				'ttt\trefs/tags/n8n@3.4.0',
				'ccc\trefs/tags/n8n@3.4.0^{}',
				'',
			].join('\n'),
		);
		assert.deepEqual(
			[...tags],
			[
				['stable', 'aaa'],
				['n8n@2.49.5', 'aaa'],
				['n8n@3.4.0', 'ccc'],
			],
		);
	});
});

describe('versionsOf', () => {
	const tags = new Map([
		['stable', 'c1'],
		['n8n@2.49.5', 'c1'],
		['n8n@2.50.0', 'c2'],
		['n8n@3.3.0', 'c3'],
		['n8n@3.10.0', 'c4'],
		['n8n@3.4.0', 'c5'],
		['n8n@3.5.0-rc.1', 'c6'],
		['v3-rc', 'c6'],
	]);

	it('gives the version tag on the commit of a track tag', () => {
		assert.deepEqual(versionsOf(LINES[0], tags), ['2.49.5']);
	});

	it('gives the release versions of a major, the newest first', () => {
		const v3 = LINES.find((line) => line.line === 'v3');
		assert.deepEqual(versionsOf(v3, tags), ['3.10.0', '3.4.0', '3.3.0']);
	});

	it('fails when the track tag does not exist', () => {
		assert.throws(
			() => versionsOf({ line: 'beta', track: 'beta' }, tags),
			/beta tag does not exist/,
		);
	});
});

describe('resolveVersion', () => {
	const tags = new Map([
		['stable', 'c1'],
		['n8n@2.49.5', 'c1'],
		['n8n@3.3.0', 'c3'],
		['n8n@3.4.0', 'c4'],
	]);
	const stable = { line: 'stable', track: 'stable' };
	const v3 = { line: 'v3', major: 3 };
	const labels = (map) => (ref) => map[ref] ?? null;

	it('returns the version when the image has the same version label', () => {
		const label = labels({ 'n8nio/n8n:2.49.5': '2.49.5' });
		assert.equal(resolveVersion(stable, tags, { label }), '2.49.5');
	});

	it('fails when the image of a track version has another label', () => {
		const label = labels({ 'n8nio/n8n:2.49.5': 'v3-nightly' });
		assert.throws(() => resolveVersion(stable, tags, { label }), /matching version label/);
	});

	it('falls back to the version before a new tag without an image', () => {
		const label = labels({ 'n8nio/n8n:3.3.0': '3.3.0' });
		assert.equal(resolveVersion(v3, tags, { label }), '3.3.0');
	});
});

describe('renderSummary', () => {
	it('counts the findings and the statuses of each image', () => {
		const summary = renderSummary([
			{
				line: 'stable',
				image: 'n8nio/n8n:2.48.8@sha256:a',
				findings: [
					{ ...finding('CVE-1', 'HIGH'), status: 'pr-open' },
					{ ...finding('CVE-2', 'HIGH'), status: 'pr-open' },
					{ ...finding('CVE-3', 'LOW'), status: 'no-upstream-fix' },
				],
			},
		]);
		assert.match(
			summary,
			/\| stable \| `n8nio\/n8n:2\.48\.8` \| 0 \| 2 \| 0 \| 1 \| 0 \| pr-open: 2, no-upstream-fix: 1 \|/,
		);
	});
});
