#!/usr/bin/env node
/**
 * Extracts manifest digests and image names for SLSA provenance and VEX attestation.
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

const githubOutput = process.env.GITHUB_OUTPUT || null;

function getDigest(imageRef) {
	if (!imageRef) return '';
	const raw = execSync(`docker buildx imagetools inspect "${imageRef}" --raw`, {
		encoding: 'utf8',
	});
	const hash = execSync('sha256sum', { input: raw, encoding: 'utf8' }).split(' ')[0].trim();
	return `sha256:${hash}`;
}

function getImageName(imageRef) {
	if (!imageRef) return '';
	return imageRef.replace(/:([^:]+)$/, '');
}

function setOutput(name, value) {
	if (githubOutput && value) appendFileSync(githubOutput, `${name}=${value}\n`);
}

const n8nTag = process.env.N8N_TAG || '';
const runnersTag = process.env.RUNNERS_TAG || '';
const distrolessTag = process.env.DISTROLESS_TAG || '';

const results = {
	n8n: { digest: getDigest(n8nTag), image: getImageName(n8nTag) },
	runners: { digest: getDigest(runnersTag), image: getImageName(runnersTag) },
	runners_distroless: { digest: getDigest(distrolessTag), image: getImageName(distrolessTag) },
};

setOutput('n8n_digest', results.n8n.digest);
setOutput('n8n_image', results.n8n.image);
setOutput('runners_digest', results.runners.digest);
setOutput('runners_image', results.runners.image);
setOutput('runners_distroless_digest', results.runners_distroless.digest);
setOutput('runners_distroless_image', results.runners_distroless.image);

console.log('=== Manifest Digests ===');
console.log(`n8n: ${results.n8n.digest || 'N/A'}`);
console.log(`runners: ${results.runners.digest || 'N/A'}`);
console.log(`runners-distroless: ${results.runners_distroless.digest || 'N/A'}`);
console.log('');
console.log('=== Image Names ===');
console.log(`n8n: ${results.n8n.image || 'N/A'}`);
console.log(`runners: ${results.runners.image || 'N/A'}`);
console.log(`runners-distroless: ${results.runners_distroless.image || 'N/A'}`);
