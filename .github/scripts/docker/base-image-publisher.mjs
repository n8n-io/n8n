/**
 * Checks who published a base image digest, and when.
 *
 * DHI and distroless sign their images with cosign. The Rekor entry of the
 * signature gives the publication time. Rekor signs that time, so the registry
 * cannot change it. A digest signed before its push would pass the 24-hour
 * gate early. We accept this: the signature follows the push by seconds.
 * Docker Official Images have no signature. For them, the SLSA provenance
 * must name the docker-library builder and the source of the image, and
 * Docker Hub gives the push time of the tag.
 */

import { execFileSync } from 'node:child_process';

/** The DHI signing key, from https://registry.scout.docker.com/keyring/dhi/latest.pub. */
const DHI_KEY = 'security/keys/dhi.pub';

const DISTROLESS_IDENTITY = [
	'--certificate-identity',
	'keyless@distroless.iam.gserviceaccount.com',
	'--certificate-oidc-issuer',
	'https://accounts.google.com',
];

const DOCKER_LIBRARY = 'https://github.com/docker-library';

/** The source of a Docker Official Image that docker-library builds from another repository. */
const OFFICIAL_SOURCES = { node: 'https://github.com/nodejs/docker-node.git#' };

export function publisherOf(repository) {
	if (repository.startsWith('dhi.io/')) return 'dhi';
	if (repository.startsWith('gcr.io/distroless/')) return 'distroless';
	if (!repository.includes('/')) return 'docker-official';
	return null;
}

/** The earliest Rekor time of the verified signatures of `digest`, from `cosign verify --output json`. */
export function signatureTime(verified, digest) {
	const times = verified
		.filter((entry) => entry.critical?.image?.['docker-manifest-digest'] === digest)
		.map((entry) => entry.optional?.Bundle?.Payload?.integratedTime)
		.filter(Number.isInteger);
	return times.length > 0 ? new Date(Math.min(...times) * 1000).toISOString() : null;
}

/** Returns why the SLSA provenance of a Docker Official Image is wrong, or null when it is correct. */
export function checkProvenance(provenance, repository, platforms) {
	const source = OFFICIAL_SOURCES[repository] ?? `${DOCKER_LIBRARY}/${repository}.git#`;
	for (const platform of platforms) {
		const slsa = provenance?.[platform]?.SLSA;
		const builder = slsa?.builder?.id ?? slsa?.runDetails?.builder?.id;
		const uri =
			slsa?.invocation?.configSource?.uri ??
			slsa?.buildDefinition?.externalParameters?.configSource?.uri;
		if (builder !== DOCKER_LIBRARY) return `${platform}: the builder is ${builder ?? 'missing'}`;
		if (!uri?.startsWith(source)) return `${platform}: the source is ${uri ?? 'missing'}`;
	}
	return null;
}

/** The push time of a Docker Hub tag, when the tag still points at `digest`. */
export function hubPushTime(tag, digest) {
	if (tag?.digest !== digest || !tag.tag_last_pushed) return null;
	return new Date(tag.tag_last_pushed).toISOString();
}

function cosignVerify(args, ref) {
	const out = execFileSync('cosign', ['verify', ...args, '--output', 'json', ref], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	return JSON.parse(out);
}

async function verifyDockerOfficial(pin, digest, platforms) {
	const out = execFileSync(
		'docker',
		[
			'buildx',
			'imagetools',
			'inspect',
			`${pin.repository}@${digest}`,
			'--format',
			'{{json .Provenance}}',
		],
		{ encoding: 'utf8' },
	);
	const error = checkProvenance(JSON.parse(out), pin.repository, platforms);
	if (error) return { verified: false, publishedAt: null, error };

	// The provenance passed, so a Docker Hub failure only leaves the time unknown.
	const url = `https://hub.docker.com/v2/repositories/library/${pin.repository}/tags/${pin.tag}`;
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
		if (!response.ok) throw new Error(`${url} returned ${response.status}`);
		return { verified: true, publishedAt: hubPushTime(await response.json(), digest) };
	} catch (error) {
		return { verified: true, publishedAt: null, error: error.message };
	}
}

/**
 * Verifies the publisher of `<repository>@<digest>` and reads its publication
 * time. A failed check returns verified: false with the reason.
 */
export async function verifyPublisher(pin, digest, platforms) {
	const publisher = publisherOf(pin.repository);
	const ref = `${pin.repository}@${digest}`;
	try {
		switch (publisher) {
			case 'dhi': {
				// DHI attaches the signature as an OCI referrer.
				const verified = cosignVerify(['--experimental-oci11', '--key', DHI_KEY], ref);
				return { publisher, verified: true, publishedAt: signatureTime(verified, digest) };
			}
			case 'distroless': {
				const verified = cosignVerify(DISTROLESS_IDENTITY, ref);
				return { publisher, verified: true, publishedAt: signatureTime(verified, digest) };
			}
			case 'docker-official':
				return { publisher, ...(await verifyDockerOfficial(pin, digest, platforms)) };
			default:
				return { publisher, verified: false, publishedAt: null, error: 'unknown publisher' };
		}
	} catch (error) {
		const detail = String(error.stderr ?? '').trim() || error.message;
		return { publisher, verified: false, publishedAt: null, error: detail.split('\n').at(-1) };
	}
}
