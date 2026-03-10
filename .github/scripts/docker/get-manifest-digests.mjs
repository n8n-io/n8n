#!/usr/bin/env node
/**
 * Extracts manifest digests and image names for SLSA provenance and VEX attestation.
 * Also validates that image manifests contain only valid tar-based layers
 * (no malformed attestation blobs that would cause "invalid tar header" on pull).
 *
 * Usage:
 *   N8N_TAG=ghcr.io/n8n-io/n8n:1.0.0 node get-manifest-digests.mjs
 *
 * Environment variables:
 *   N8N_TAG              - Full image reference for n8n image
 *   RUNNERS_TAG          - Full image reference for runners image
 *   DISTROLESS_TAG       - Full image reference for runners-distroless image
 *   GITHUB_OUTPUT        - Path to GitHub Actions output file (optional)
 */

import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

// Valid OCI/Docker layer media types (all must be tar-based archives)
export const VALID_LAYER_MEDIA_TYPES = [
	'application/vnd.oci.image.layer.v1.tar',
	'application/vnd.oci.image.layer.v1.tar+gzip',
	'application/vnd.oci.image.layer.v1.tar+zstd',
	'application/vnd.docker.image.rootfs.diff.tar.gzip',
	'application/vnd.oci.image.layer.nondistributable.v1.tar',
	'application/vnd.oci.image.layer.nondistributable.v1.tar+gzip',
	'application/vnd.oci.image.layer.nondistributable.v1.tar+zstd',
];

/**
 * Validates that a parsed manifest contains only valid tar-based layers.
 * Detects malformed attestation blobs (e.g. SBOM JSON) incorrectly referenced as layers,
 * which cause "archive/tar: invalid tar header" errors during docker pull.
 *
 * @param {object} manifest - Parsed OCI/Docker manifest JSON
 * @param {string} [imageRef] - Image reference for error messages
 * @throws {Error} If any layer has a non-tar media type
 */
export function validateManifestLayers(manifest, imageRef = 'unknown') {
	// For OCI index (multi-platform), skip — layers are in child manifests, not at index level
	if (manifest.manifests) {
		return;
	}

	// For single-platform manifests, validate layer media types
	if (manifest.layers) {
		for (let i = 0; i < manifest.layers.length; i++) {
			const layer = manifest.layers[i];
			const mediaType = layer.mediaType || '';

			if (!VALID_LAYER_MEDIA_TYPES.includes(mediaType)) {
				throw new Error(
					`Image ${imageRef}: layer ${i} has non-tar media type "${mediaType}" ` +
						`(size: ${layer.size} bytes). This would cause "archive/tar: invalid tar header" ` +
						`on docker pull. Ensure sbom:false is set in the build step.`,
				);
			}
		}
	}
}

export function getImageName(imageRef) {
	if (!imageRef) return '';
	return imageRef.replace(/:([^:]+)$/, '');
}

function getDigest(imageRef) {
	if (!imageRef) return '';
	const raw = execSync(`docker buildx imagetools inspect "${imageRef}" --raw`, {
		encoding: 'utf8',
	});
	const hash = execSync('sha256sum', { input: raw, encoding: 'utf8' }).split(' ')[0].trim();
	return `sha256:${hash}`;
}

function fetchAndValidateManifest(imageRef) {
	if (!imageRef) return;
	const raw = execSync(`docker buildx imagetools inspect "${imageRef}" --raw`, {
		encoding: 'utf8',
	});
	const manifest = JSON.parse(raw);
	validateManifestLayers(manifest, imageRef);
	console.log(`  Validated layers for ${imageRef}`);
}

function setOutput(name, value, githubOutput) {
	if (githubOutput && value) appendFileSync(githubOutput, `${name}=${value}\n`);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
	const githubOutput = process.env.GITHUB_OUTPUT || null;

	const n8nTag = process.env.N8N_TAG || '';
	const runnersTag = process.env.RUNNERS_TAG || '';
	const distrolessTag = process.env.DISTROLESS_TAG || '';

	// Validate manifest layers before extracting digests
	console.log('=== Validating Image Layers ===');
	fetchAndValidateManifest(n8nTag);
	fetchAndValidateManifest(runnersTag);
	fetchAndValidateManifest(distrolessTag);
	console.log('');

	const results = {
		n8n: { digest: getDigest(n8nTag), image: getImageName(n8nTag) },
		runners: { digest: getDigest(runnersTag), image: getImageName(runnersTag) },
		runners_distroless: {
			digest: getDigest(distrolessTag),
			image: getImageName(distrolessTag),
		},
	};

	setOutput('n8n_digest', results.n8n.digest, githubOutput);
	setOutput('n8n_image', results.n8n.image, githubOutput);
	setOutput('runners_digest', results.runners.digest, githubOutput);
	setOutput('runners_image', results.runners.image, githubOutput);
	setOutput('runners_distroless_digest', results.runners_distroless.digest, githubOutput);
	setOutput('runners_distroless_image', results.runners_distroless.image, githubOutput);

	console.log('=== Manifest Digests ===');
	console.log(`n8n: ${results.n8n.digest || 'N/A'}`);
	console.log(`runners: ${results.runners.digest || 'N/A'}`);
	console.log(`runners-distroless: ${results.runners_distroless.digest || 'N/A'}`);
	console.log('');
	console.log('=== Image Names ===');
	console.log(`n8n: ${results.n8n.image || 'N/A'}`);
	console.log(`runners: ${results.runners.image || 'N/A'}`);
	console.log(`runners-distroless: ${results.runners_distroless.image || 'N/A'}`);
}
