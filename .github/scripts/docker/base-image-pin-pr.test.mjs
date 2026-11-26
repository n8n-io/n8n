import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { removedFindings, renderBody, selectGroup, updatePins } from './base-image-pin-pr.mjs';

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
});
