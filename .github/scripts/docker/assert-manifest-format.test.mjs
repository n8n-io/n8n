import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkManifestFormat, OCI_INDEX } from './assert-manifest-format.mjs';

const DOCKER_LIST = 'application/vnd.docker.distribution.manifest.list.v2+json';

const platform = (os, architecture, variant) => ({ platform: { os, architecture, variant } });
const attestation = () => ({ platform: { os: 'unknown', architecture: 'unknown' } });

describe('checkManifestFormat', () => {
	it('passes a two-platform OCI index', () => {
		const { failures, platforms, attestations } = checkManifestFormat(
			{ mediaType: OCI_INDEX, manifests: [platform('linux', 'amd64'), platform('linux', 'arm64')] },
			2,
		);
		assert.deepEqual(failures, []);
		assert.equal(platforms.length, 2);
		assert.equal(attestations.length, 0);
	});

	it('rejects a Docker manifest list', () => {
		const { failures } = checkManifestFormat({
			mediaType: DOCKER_LIST,
			manifests: [platform('linux', 'amd64')],
		});
		assert.equal(failures.length, 1);
		assert.match(failures[0], /expected application\/vnd\.oci\.image\.index/);
	});

	it('counts attestations separately from platforms', () => {
		const { platforms, attestations, failures } = checkManifestFormat(
			{
				mediaType: OCI_INDEX,
				manifests: [platform('linux', 'amd64'), platform('linux', 'arm64'), attestation()],
			},
			2,
		);
		assert.deepEqual(failures, []);
		assert.equal(platforms.length, 2);
		assert.equal(attestations.length, 1);
	});

	it('fails when the distinct platform count does not match', () => {
		const { failures } = checkManifestFormat(
			{ mediaType: OCI_INDEX, manifests: [platform('linux', 'amd64')] },
			2,
		);
		assert.equal(failures.length, 1);
		assert.match(failures[0], /1 distinct platforms/);
	});

	it('does not let a duplicated platform satisfy the expected count', () => {
		const { failures } = checkManifestFormat(
			{ mediaType: OCI_INDEX, manifests: [platform('linux', 'amd64'), platform('linux', 'amd64')] },
			2,
		);
		assert.ok(failures.some((f) => /1 distinct platforms/.test(f)));
		assert.ok(failures.some((f) => /2 platform manifests but only 1 distinct/.test(f)));
	});

	it('treats a descriptor with no platform as a failure, not a crash', () => {
		const { failures } = checkManifestFormat(
			{ mediaType: OCI_INDEX, manifests: [platform('linux', 'amd64'), { digest: 'sha256:x' }] },
			1,
		);
		assert.ok(failures.some((f) => /carry no platform descriptor/.test(f)));
	});

	it('treats a missing or non-array manifests field as empty', () => {
		assert.equal(checkManifestFormat({ mediaType: OCI_INDEX }).platforms.length, 0);
		assert.equal(
			checkManifestFormat({ mediaType: OCI_INDEX, manifests: {} }).platforms.length,
			0,
		);
	});

	it('distinguishes platforms that differ only by variant', () => {
		const { platforms, failures } = checkManifestFormat(
			{
				mediaType: OCI_INDEX,
				manifests: [platform('linux', 'arm', 'v6'), platform('linux', 'arm', 'v7')],
			},
			2,
		);
		assert.deepEqual(failures, []);
		assert.equal(platforms.length, 2);
	});

	it('skips the platform-count check when no expectation is given', () => {
		const { failures } = checkManifestFormat({
			mediaType: OCI_INDEX,
			manifests: [platform('linux', 'amd64')],
		});
		assert.deepEqual(failures, []);
	});
});
