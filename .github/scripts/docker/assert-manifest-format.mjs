#!/usr/bin/env node
/**
 * Asserts that a pushed image is an OCI image index with only real platform
 * manifests.
 *
 * n8n 2.26.0 shipped as a Docker manifest list, not an OCI index. Older
 * containerd on AKS then read the attestation manifests as image manifests, and
 * every pull failed (#31997). This check verifies the format directly.
 *
 * Usage: node assert-manifest-format.mjs <image-ref> [--expect-platforms n]
 */

import { execFileSync } from 'node:child_process';

const OCI_INDEX = 'application/vnd.oci.image.index.v1+json';

const [ref, ...rest] = process.argv.slice(2);
if (!ref) {
	console.error('usage: assert-manifest-format.mjs <image-ref> [--expect-platforms n]');
	process.exit(2);
}

const expectIdx = rest.indexOf('--expect-platforms');
const expectPlatforms = expectIdx === -1 ? null : Number(rest[expectIdx + 1]);

const raw = execFileSync('docker', ['buildx', 'imagetools', 'inspect', '--raw', ref], {
	encoding: 'utf-8',
});
const manifest = JSON.parse(raw);

const failures = [];

if (manifest.mediaType !== OCI_INDEX) {
	failures.push(`mediaType is ${manifest.mediaType}, expected ${OCI_INDEX}`);
}

const entries = manifest.manifests ?? [];
const platforms = entries.filter((m) => m.platform?.architecture !== 'unknown');
const attestations = entries.filter((m) => m.platform?.architecture === 'unknown');

const distinct = new Set(
	platforms.map((m) =>
		[m.platform.os, m.platform.architecture, m.platform.variant ?? ''].join('/'),
	),
);
if (expectPlatforms !== null && distinct.size !== expectPlatforms) {
	failures.push(
		`${distinct.size} distinct platforms (${[...distinct].join(', ')}), expected ${expectPlatforms}`,
	);
}

console.log(`ref:        ${ref}`);
console.log(`mediaType:  ${manifest.mediaType}`);
for (const m of platforms) {
	console.log(`  platform  ${m.platform.os}/${m.platform.architecture}`);
}
for (const _ of attestations) {
	console.log('  attestation (unknown/unknown)');
}

// Not fatal. `--sbom=true` adds these, and they caused the 2.26.0 pull failure.
// Report the count and let the caller decide.
console.log(`\nplatforms: ${platforms.length}, attestations: ${attestations.length}`);

if (failures.length > 0) {
	for (const f of failures) console.error(`::error::${f}`);
	process.exit(1);
}
console.log('OK: manifest is an OCI image index');
