#!/usr/bin/env node
/**
 * Copies the release image attestations from GHCR to Docker Hub.
 *
 * The attestation jobs in docker-build-push.yml sign the GHCR images only.
 * Docker Hub merges its own index from the same platform images, so it has the
 * same digest. Cosign stores attestations under `sha256-<hex>.att` and
 * actions/attest under `sha256-<hex>`, both derived from that digest. Copying
 * these tags makes `cosign verify-attestation` and `gh attestation verify`
 * work on the Docker Hub image.
 *
 * Image refs and digests come from the same environment variables as
 * attest-image-sbom.mjs. DOCKER_HUB_NAMESPACE is the Docker Hub account.
 *
 * Usage: DOCKER_HUB_NAMESPACE=n8nio node .github/scripts/docker/mirror-attestations.mjs
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { parseTargets } from '../attest-image-sbom.mjs';

export function attestationTags(digest) {
	const hex = digest.replace(/^sha256:/, '');
	return [`sha256-${hex}`, `sha256-${hex}.att`];
}

/** `ghcr.io/n8n-io/runners` -> `docker.io/<namespace>/runners` */
export function dockerHubRepo(ghcrImage, namespace) {
	return `docker.io/${namespace}/${ghcrImage.split('/').pop()}`;
}

/** imagetools ends the error for a missing manifest with `: not found`. */
export function isNotFound(message) {
	return /: not found\s*$/.test(message);
}

/**
 * Wraps `docker buildx imagetools`. `inspect` returns the error text, or null
 * when the manifest exists.
 */
export const imagetools = {
	inspect(ref) {
		try {
			execFileSync('docker', ['buildx', 'imagetools', 'inspect', '--raw', ref], {
				stdio: ['ignore', 'ignore', 'pipe'],
			});
			return null;
		} catch (err) {
			return String(err.stderr ?? err.message).trim();
		}
	},
	copy(src, dst) {
		// --prefer-index=false copies a single manifest byte for byte. Without it,
		// imagetools wraps the manifest in a new index with a different digest.
		execFileSync(
			'docker',
			['buildx', 'imagetools', 'create', '--prefer-index=false', '--tag', dst, src],
			{ stdio: 'inherit' },
		);
	},
};

/** Returns the error messages. An empty array means every image succeeded. */
export function mirrorAttestations(targets, namespace, registry = imagetools) {
	const errors = [];
	for (const { label, image, digest } of targets) {
		const dstRepo = dockerHubRepo(image, namespace);

		if (registry.inspect(`${dstRepo}@${digest}`) !== null) {
			errors.push(
				`${label}: ${dstRepo} has no manifest ${digest}. The GHCR and Docker Hub indexes differ, so the GHCR attestations do not apply.`,
			);
			continue;
		}

		for (const tag of attestationTags(digest)) {
			const src = `${image}:${tag}`;
			const err = registry.inspect(src);
			if (err !== null) {
				// A skipped attestation job leaves no tag. Any other read error must
				// fail, or Docker Hub silently misses attestations.
				if (isNotFound(err)) {
					console.log(`${label}: no ${src} - skipping`);
				} else {
					errors.push(`${label}: cannot read ${src}: ${err}`);
				}
				continue;
			}
			try {
				registry.copy(src, `${dstRepo}:${tag}`);
			} catch (copyErr) {
				errors.push(`${label}: cannot copy ${src}: ${copyErr.message}`);
			}
		}
	}
	return errors;
}

export function main({ env = process.env, registry = imagetools } = {}) {
	const namespace = env.DOCKER_HUB_NAMESPACE;
	if (!namespace) throw new Error('DOCKER_HUB_NAMESPACE is not set');

	const targets = parseTargets(env);
	if (targets.length === 0) {
		console.log('No images with digests - skipping.');
		return;
	}

	const errors = mirrorAttestations(targets, namespace, registry);
	for (const e of errors) console.log(`::error title=Attestation mirror::${e}`);
	if (errors.length > 0) {
		throw new Error(`${errors.length} attestation mirror error(s)`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		main();
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
}
