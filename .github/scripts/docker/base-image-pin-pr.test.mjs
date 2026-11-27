import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	removedFindings,
	renderBody,
	selectGroup,
	titleOf,
	updateNodeVersion,
	updatePins,
} from './base-image-pin-pr.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;

const finding = (id, pkg, severity = 'HIGH') => ({
	id,
	pkg,
	severity,
	installed: '1.0',
	fixed: '1.1',
});

const ready = (source, autoMerge, platforms) => ({
	source,
	pinned: `python:3.13.18-slim-trixie@${digest('a')}`,
	newest: `python:3.13.18-slim-trixie@${digest('b')}`,
	status: 'ready',
	autoMerge,
	publisher: {
		publisher: 'docker-official',
		verified: true,
		publishedAt: '2026-11-08T02:07:36.190Z',
	},
	platforms,
});

const platform = (name, removed, addedPackages = []) => ({
	platform: name,
	removed,
	added: [],
	addedPackages,
	remaining: [],
});

describe('selectGroup', () => {
	const results = [
		ready('DEBIAN_PYTHON_IMAGE', true, []),
		ready('DISTROLESS_BASE_IMAGE', false, []),
		{ source: 'DHI_REF', status: 'in-24h-gate', platforms: [] },
	];

	it('puts the ready candidates with auto-merge in the daily group', () => {
		assert.deepEqual(
			selectGroup(results, 'daily').map((result) => result.source),
			['DEBIAN_PYTHON_IMAGE'],
		);
	});

	it('puts the ready candidates that add a package in the review group', () => {
		assert.deepEqual(
			selectGroup(results, 'review').map((result) => result.source),
			['DISTROLESS_BASE_IMAGE'],
		);
	});

	it('puts the Node patch in the node group only', () => {
		const node = { ...ready('DHI_REF', false, []), group: 'node' };
		const withNode = [...results, node];
		assert.deepEqual(selectGroup(withNode, 'node'), [node]);
		assert.ok(!selectGroup(withNode, 'review').includes(node));
		assert.ok(!selectGroup(withNode, 'daily').includes(node));
	});
});

describe('titleOf', () => {
	it('names the new Node version in the Node PR', () => {
		const results = [{ nodePatch: { from: '26.13.0', to: '26.13.1' } }];
		assert.equal(titleOf('node', results), 'build: Update Node to 26.13.1');
		assert.equal(titleOf('daily', []), 'build: Update base image digests with fewer OS findings');
	});
});

describe('updateNodeVersion', () => {
	const hcl = 'variable "NODE_VERSION" { default = "26.13.0" }\n';

	it('sets the new version', () => {
		assert.equal(
			updateNodeVersion(hcl, { from: '26.13.0', to: '26.13.1' }),
			'variable "NODE_VERSION" { default = "26.13.1" }\n',
		);
	});

	it('stops when NODE_VERSION is not the old version', () => {
		assert.throws(
			() => updateNodeVersion(hcl, { from: '26.12.0', to: '26.13.1' }),
			/NODE_VERSION 26\.12\.0 is in docker\/docker-bake\.hcl 0 times/,
		);
	});
});

describe('updatePins', () => {
	const hcl = `variable "DEBIAN_PYTHON_IMAGE" {\n  default = "python:3.13.18-slim-trixie@${digest('a')}"\n}\n`;

	it('replaces the pinned ref with the newest ref', () => {
		const updated = updatePins(hcl, [ready('DEBIAN_PYTHON_IMAGE', true, [])]);
		assert.equal(
			updated,
			`variable "DEBIAN_PYTHON_IMAGE" {\n  default = "python:3.13.18-slim-trixie@${digest('b')}"\n}\n`,
		);
	});

	it('fails when the pinned ref is not in the file', () => {
		assert.throws(() => updatePins('', [ready('DEBIAN_PYTHON_IMAGE', true, [])]), /0 times/);
	});

	it('fails when the pinned ref is in the file twice', () => {
		assert.throws(() => updatePins(hcl + hcl, [ready('DEBIAN_PYTHON_IMAGE', true, [])]), /2 times/);
	});
});

describe('removedFindings', () => {
	it('lists a finding once with all its platforms, the most severe first', () => {
		const result = ready('DEBIAN_PYTHON_IMAGE', true, [
			platform('linux/amd64', [finding('CVE-2', 'zlib', 'MEDIUM'), finding('CVE-1', 'apt')]),
			platform('linux/arm64', [finding('CVE-1', 'apt')]),
		]);
		assert.deepEqual(
			removedFindings(result).map((f) => `${f.severity} ${f.id} ${f.platforms.join('+')}`),
			['HIGH CVE-1 linux/amd64+linux/arm64', 'MEDIUM CVE-2 linux/amd64'],
		);
	});
});

describe('renderBody', () => {
	const runUrl = 'https://github.com/n8n-io/n8n/actions/runs/1';

	it('lists each pin and its removed findings', () => {
		const result = ready('DEBIAN_PYTHON_IMAGE', true, [
			platform('linux/amd64', [finding('CVE-1', 'apt')]),
		]);
		const body = renderBody([result], { group: 'daily', runUrl });
		assert.match(body, /### `DEBIAN_PYTHON_IMAGE`/);
		assert.match(body, /`sha256:aaaaaaaaaaaa…` → `python:3\.13\.18-slim-trixie@sha256:b{64}`/);
		assert.match(body, /\| CVE-1 \| HIGH \| apt \| 1\.0 \| 1\.1 \| linux\/amd64 \|/);
		assert.match(body, /\(\[run\]\(https:\/\/github\.com\/n8n-io\/n8n\/actions\/runs\/1\)\)/);
		assert.doesNotMatch(body, /no auto-merge/);
	});

	it('explains the review PR and lists the new packages', () => {
		const result = ready('DISTROLESS_BASE_IMAGE', false, [
			platform('linux/amd64', [finding('CVE-1', 'libc6')], ['tzdata-legacy']),
		]);
		const body = renderBody([result], { group: 'review', runUrl });
		assert.match(body, /has no auto-merge/);
		assert.match(body, /New packages: `tzdata-legacy`\./);
		assert.doesNotMatch(body, /less than 24 hours old/);
	});

	it('explains a digest that skipped the 24-hour gate', () => {
		const result = {
			...ready('DHI_REF', false, [platform('linux/amd64', [finding('CVE-1', 'zlib')])]),
			gateSkipped: true,
		};
		const body = renderBody([result], { group: 'review', runUrl });
		assert.match(
			body,
			/A manual run skipped the 24-hour gate: this digest is less than 24 hours old\./,
		);
		assert.doesNotMatch(body, /New packages/);
	});

	it('does not claim an age for a digest without a publish time', () => {
		const result = {
			...ready('DHI_REF', false, [platform('linux/amd64', [finding('CVE-1', 'zlib')])]),
			gateSkipped: true,
		};
		result.publisher = { ...result.publisher, publishedAt: null };
		const body = renderBody([result], { group: 'review', runUrl });
		assert.match(body, /Published: unknown\./);
		assert.match(
			body,
			/A manual run skipped the 24-hour gate: the publish time of this digest is unknown\./,
		);
		assert.doesNotMatch(body, /less than 24 hours old/);
	});

	it('explains the Node patch and updates all Node pins and NODE_VERSION', () => {
		const nodePatch = { from: '26.13.0', to: '26.13.1', security: true };
		const pin = (source, repository, variant, removed) => ({
			...ready(source, false, removed ? [platform('linux/amd64', removed)] : []),
			pinned: `${repository}:26.13.0-${variant}@${digest('a')}`,
			newest: `${repository}:26.13.1-${variant}@${digest('b')}`,
			group: 'node',
			nodePatch,
		});
		const pins = [
			pin('DHI_REF', 'dhi.io/node', 'alpine3.24-dev', [finding('CVE-1', 'libssl3')]),
			pin('DEBIAN_DHI_REF', 'dhi.io/node', 'debian13-dev', [finding('CVE-2', 'libc6')]),
			pin('BUILDER_IMAGE', 'node', 'alpine3.24'),
			pin('DEBIAN_BUILDER_IMAGE', 'node', 'trixie-slim'),
		];
		const body = renderBody(pins, { group: 'node', runUrl });
		assert.match(body, /This PR updates Node from `26\.13\.0` to `26\.13\.1`/);
		assert.match(body, /security release/);
		assert.match(body, /This PR has no auto-merge/);
		assert.match(body, /\| CVE-1 \| HIGH \| libssl3 \|/);
		assert.match(body, /\| CVE-2 \| HIGH \| libc6 \|/);
		assert.match(
			body,
			/The release images take only the Node of this image, so no scan covers it\./,
		);
		assert.doesNotMatch(body, /fewer fixable OS findings/);
		const hcl = [
			'variable "NODE_VERSION" { default = "26.13.0" }',
			...pins.map(({ source, pinned }) => `variable "${source}" {\n  default = "${pinned}"\n}`),
		].join('\n');
		const updated = updateNodeVersion(updatePins(hcl, pins), nodePatch);
		assert.doesNotMatch(updated, /26\.13\.0/);
		for (const { newest } of pins) assert.ok(updated.includes(`default = "${newest}"`));
		assert.match(updated, /variable "NODE_VERSION" \{ default = "26\.13\.1" \}/);
	});
});
