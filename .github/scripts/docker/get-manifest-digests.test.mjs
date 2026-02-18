import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateManifestLayers, getImageName, VALID_LAYER_MEDIA_TYPES } from './get-manifest-digests.mjs';

describe('validateManifestLayers', () => {
	it('should pass for manifest with valid tar+gzip layers', () => {
		const manifest = {
			schemaVersion: 2,
			mediaType: 'application/vnd.oci.image.manifest.v1+json',
			layers: [
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
					size: 31457280,
					digest: 'sha256:abc123',
				},
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
					size: 1024000,
					digest: 'sha256:def456',
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest, 'test:latest'));
	});

	it('should pass for manifest with valid Docker-format layers', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip',
					size: 5000000,
					digest: 'sha256:aaa111',
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should pass for manifest with tar+zstd layers', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+zstd',
					size: 2000000,
					digest: 'sha256:bbb222',
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should pass for manifest with uncompressed tar layers', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar',
					size: 10000000,
					digest: 'sha256:ccc333',
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should throw for layer with SBOM JSON media type (the bug this fix prevents)', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
					size: 31457280,
					digest: 'sha256:abc123',
				},
				{
					mediaType: 'application/spdx+json',
					size: 1890,
					digest: 'sha256:bc0cdc8ecc2f',
				},
			],
		};
		assert.throws(
			() => validateManifestLayers(manifest, 'n8nio/n8n:2.4.0'),
			(err) => {
				assert.match(err.message, /non-tar media type/);
				assert.match(err.message, /spdx\+json/);
				assert.match(err.message, /invalid tar header/);
				assert.match(err.message, /n8nio\/n8n:2\.4\.0/);
				assert.match(err.message, /1890 bytes/);
				return true;
			},
		);
	});

	it('should throw for layer with generic JSON media type', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/json',
					size: 2048,
					digest: 'sha256:bad000',
				},
			],
		};
		assert.throws(
			() => validateManifestLayers(manifest, 'test:latest'),
			(err) => {
				assert.match(err.message, /non-tar media type/);
				assert.match(err.message, /application\/json/);
				return true;
			},
		);
	});

	it('should throw for layer with empty media type', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: '',
					size: 1024,
					digest: 'sha256:empty00',
				},
			],
		};
		assert.throws(
			() => validateManifestLayers(manifest),
			(err) => {
				assert.match(err.message, /non-tar media type/);
				return true;
			},
		);
	});

	it('should throw for layer with attestation manifest media type', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.in-toto+json',
					size: 512,
					digest: 'sha256:attest0',
				},
			],
		};
		assert.throws(
			() => validateManifestLayers(manifest),
			(err) => {
				assert.match(err.message, /non-tar media type/);
				return true;
			},
		);
	});

	it('should pass for OCI index (multi-platform) manifests without layers', () => {
		const manifest = {
			schemaVersion: 2,
			mediaType: 'application/vnd.oci.image.index.v1+json',
			manifests: [
				{
					mediaType: 'application/vnd.oci.image.manifest.v1+json',
					digest: 'sha256:amd64digest',
					platform: { architecture: 'amd64', os: 'linux' },
				},
				{
					mediaType: 'application/vnd.oci.image.manifest.v1+json',
					digest: 'sha256:arm64digest',
					platform: { architecture: 'arm64', os: 'linux' },
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should pass for OCI index with attestation manifests (architecture: unknown)', () => {
		const manifest = {
			schemaVersion: 2,
			manifests: [
				{
					mediaType: 'application/vnd.oci.image.manifest.v1+json',
					digest: 'sha256:amd64digest',
					platform: { architecture: 'amd64', os: 'linux' },
				},
				{
					mediaType: 'application/vnd.oci.image.manifest.v1+json',
					digest: 'sha256:attestdigest',
					platform: { architecture: 'unknown', os: 'unknown' },
				},
			],
		};
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should pass for manifest with no layers property', () => {
		const manifest = { schemaVersion: 2 };
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should pass for manifest with empty layers array', () => {
		const manifest = { schemaVersion: 2, layers: [] };
		assert.doesNotThrow(() => validateManifestLayers(manifest));
	});

	it('should validate all media types in VALID_LAYER_MEDIA_TYPES pass', () => {
		for (const mediaType of VALID_LAYER_MEDIA_TYPES) {
			const manifest = {
				schemaVersion: 2,
				layers: [{ mediaType, size: 1000, digest: 'sha256:test' }],
			};
			assert.doesNotThrow(
				() => validateManifestLayers(manifest),
				`Expected ${mediaType} to be valid`,
			);
		}
	});

	it('should use default imageRef in error message when not provided', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [{ mediaType: 'application/octet-stream', size: 100, digest: 'sha256:x' }],
		};
		assert.throws(
			() => validateManifestLayers(manifest),
			(err) => {
				assert.match(err.message, /unknown/);
				return true;
			},
		);
	});

	it('should detect the first invalid layer among valid ones', () => {
		const manifest = {
			schemaVersion: 2,
			layers: [
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
					size: 5000000,
					digest: 'sha256:good1',
				},
				{
					mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip',
					size: 3000000,
					digest: 'sha256:good2',
				},
				{
					mediaType: 'application/spdx+json',
					size: 1890,
					digest: 'sha256:bad',
				},
			],
		};
		assert.throws(
			() => validateManifestLayers(manifest, 'test:v1'),
			(err) => {
				assert.match(err.message, /layer 2/);
				return true;
			},
		);
	});
});

describe('getImageName', () => {
	it('should extract image name from full reference', () => {
		assert.equal(getImageName('ghcr.io/n8n-io/n8n:1.0.0'), 'ghcr.io/n8n-io/n8n');
	});

	it('should handle reference with port', () => {
		assert.equal(getImageName('registry:5000/image:tag'), 'registry:5000/image');
	});

	it('should return empty string for empty input', () => {
		assert.equal(getImageName(''), '');
	});

	it('should handle image with no tag', () => {
		assert.equal(getImageName('ghcr.io/n8n-io/n8n'), 'ghcr.io/n8n-io/n8n');
	});
});
