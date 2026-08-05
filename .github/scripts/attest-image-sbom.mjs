#!/usr/bin/env node
/**
 * Per-image SBOM attestation for the release Docker images. For each built image:
 * cdxgen scans it (OS + npm), enrich-sbom resolves licenses, check-sbom-licenses
 * gates the npm components, and the result is attested to the image digest via
 * cosign — the same mechanism as the VEX/provenance attestations.
 *
 * Image refs + digests come from the environment (set by docker-build-push.yml).
 * An image with no digest (not built for this release type) is skipped.
 *
 * Usage: node .github/scripts/attest-image-sbom.mjs   (run from the repo root)
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(scriptDir, '..', '..');
const CDXGEN = path.join(scriptDir, 'node_modules', '.bin', 'cdxgen');
const ENRICH = path.join(REPO_ROOT, 'scripts', 'licenses', 'enrich-sbom.mjs');
const CHECK = path.join(REPO_ROOT, 'scripts', 'licenses', 'check-sbom-licenses.mjs');
const ALLOW_REFS = [
	'--allow-ref=LicenseRef-n8n-sustainable-use',
	'--allow-ref=LicenseRef-n8n-enterprise',
];

export function parseTargets(env) {
	return [
		{ label: 'n8n', image: env.N8N_IMAGE, digest: env.N8N_DIGEST },
		{ label: 'runners', image: env.RUNNERS_IMAGE, digest: env.RUNNERS_DIGEST },
		{ label: 'runners-distroless', image: env.DISTROLESS_IMAGE, digest: env.DISTROLESS_DIGEST },
	].filter((t) => t.image && t.digest);
}

function run(cmd, args, extraEnv) {
	execFileSync(cmd, args, {
		stdio: 'inherit',
		env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
	});
}

function attest({ label, image, digest }) {
	const ref = `${image}@${digest}`;
	const out = path.join(REPO_ROOT, `sbom-${label}.cdx.json`);
	console.log(`::group::SBOM for ${label} (${ref})`);

	// Pull the (host-arch) image and scan its filesystem: OS packages + npm.
	run('docker', ['pull', ref]);
	// FETCH_LICENSE=true would make cdxgen call the npm registry for every package
	// to resolve missing license data. In practice it resolves nothing — packages
	// without a license field in their tarball also have no license in the registry —
	// and adds hundreds of sequential HTTP requests. License gaps are covered by
	// enrich-sbom.mjs (license-overrides.json + first-party detection) below.
	run(
		CDXGEN,
		['-t', 'docker', '--no-install-deps', '--profile', 'license-compliance', '--spec-version', '1.6', '-o', out, ref],
		{ CDXGEN_NO_BANNER: '1' },
	);

	// Resolve first-party + override licenses (lenient: this image holds only a
	// subset of the npm closure, so absent overrides are not stale pins) and drop
	// cdxgen filesystem-scan phantoms.
	run(process.execPath, [ENRICH, out, '--lenient-config', '--drop-phantom-npm']);

	// Release-blocking gate, scoped to npm — OS packages carry upstream-distro
	// license strings we don't control, so they're inventoried but not gated.
	run(process.execPath, [CHECK, out, ...ALLOW_REFS, '--enforce-prefix=pkg:npm/']);

	run('cosign', ['attest', '--yes', '--type', 'cyclonedx', '--predicate', out, ref]);
	console.log('::endgroup::');
}

function main() {
	const targets = parseTargets(process.env);
	if (targets.length === 0) {
		console.log('No images with digests to attest — skipping.');
		return;
	}
	for (const target of targets) attest(target);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		main();
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
}
