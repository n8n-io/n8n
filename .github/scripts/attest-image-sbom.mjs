#!/usr/bin/env node
/**
 * Per-image SBOM attestation for the release Docker images. For each built image:
 * syft scans it (OS + npm), enrich-sbom resolves licenses, check-sbom-licenses
 * gates the npm components, and the result is attested to the image digest via
 * cosign — the same mechanism as the VEX/provenance attestations.
 *
 * Image refs + digests come from the environment (set by docker-build-push.yml).
 * An image with no digest (not built for this release type) is skipped.
 *
 * Usage: node .github/scripts/attest-image-sbom.mjs   (run from the repo root)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(scriptDir, '..', '..');
const ENRICH = path.join(REPO_ROOT, 'scripts', 'licenses', 'enrich-sbom.mjs');
const CHECK = path.join(REPO_ROOT, 'scripts', 'licenses', 'check-sbom-licenses.mjs');
const ALLOW_REFS = [
	'--allow-ref=LicenseRef-n8n-sustainable-use',
	'--allow-ref=LicenseRef-n8n-enterprise',
];

export function parseTargets(env) {
	return [
		{ label: 'n8n', image: env.N8N_IMAGE, digest: env.N8N_DIGEST },
		{ label: 'n8n-pc', image: env.N8N_PC_IMAGE, digest: env.N8N_PC_DIGEST },
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

/**
 * The gate only inspects components it can see, so it passes on an SBOM that
 * catalogued nothing. Check the shape before signing a near-empty SBOM.
 */
export function assertSbomIsUsable(sbomPath, label) {
	const components = JSON.parse(readFileSync(sbomPath, 'utf-8')).components ?? [];
	const npm = components.filter((c) => c.purl?.startsWith('pkg:npm/')).length;
	if (npm === 0) {
		throw new Error(`${label}: SBOM has no npm components. The scanner catalogued nothing.`);
	}
	// Warn rather than block. Downstream scanners want this to pick a distro
	// vulnerability feed, but it is not a property these bases are known to
	// hold: the runtime base runs `apk del apk-tools` and the distroless runners
	// image carries no package manager at all. Blocking on an unverified
	// assumption would fail every release rather than catch a bad scan.
	if (!components.some((c) => c.type === 'operating-system')) {
		console.log(
			`::warning::${label}: SBOM has no operating-system component, so distro CVE feeds cannot be selected for it.`,
		);
	}
}

function attest({ label, image, digest }) {
	const ref = `${image}@${digest}`;
	const out = path.join(REPO_ROOT, `sbom-${label}.cdx.json`);
	console.log(`::group::SBOM for ${label} (${ref})`);

	// finally, so a throw still closes the group — otherwise the error that
	// names the failing image renders inside a collapsed section.
	try {
		// Pull the (host-arch) image and scan its filesystem: OS packages + npm.
		run('docker', ['pull', ref]);
		// `docker:` pins the scan to the image just pulled. A bare ref lets syft's
		// own provider order decide, and it may resolve the multi-arch index from
		// the registry instead — describing a different manifest than the one
		// cosign then attests to.
		// syft reads licenses from the LICENSE files on disk, so this scan makes no
		// registry requests. `-file` excludes its per-file catalogue, ~4000 entries.
		run('syft', [
			`docker:${ref}`,
			'-o',
			`cyclonedx-json@1.6=${out}`,
			'--select-catalogers',
			'-file',
			'-q',
		]);

		// Resolve first-party + override licenses (lenient: this image holds only a
		// subset of the npm closure, so absent overrides are not stale pins) and drop
		// scanner filesystem phantoms.
		run(process.execPath, [ENRICH, out, '--lenient-config', '--drop-phantom-npm']);

		// Release-blocking gate, scoped to npm — OS packages carry upstream-distro
		// license strings we don't control, so they're inventoried but not gated.
		run(process.execPath, [CHECK, out, ...ALLOW_REFS, '--enforce-prefix=pkg:npm/']);
		assertSbomIsUsable(out, label);

		// --replace, so re-running after a mid-loop failure does not leave the
		// digest carrying two CycloneDX attestations.
		run('cosign', [
			'attest',
			'--yes',
			'--replace',
			'--type',
			'cyclonedx',
			'--predicate',
			out,
			ref,
		]);
	} finally {
		console.log('::endgroup::');
	}
}

function main() {
	const targets = parseTargets(process.env);
	if (targets.length === 0) {
		console.log('No images with digests to attest — skipping.');
		return;
	}
	// Attempt every image, then report. Aborting on the first failure leaves the
	// later images silently unattested and hides whether they would have passed.
	const failed = [];
	for (const target of targets) {
		try {
			attest(target);
		} catch (err) {
			failed.push(`${target.label}: ${err.message}`);
			console.log(`::error title=SBOM attestation::${target.label}: ${err.message}`);
		}
	}
	if (failed.length > 0) {
		throw new Error(`${failed.length} of ${targets.length} image(s) failed:\n  ${failed.join('\n  ')}`);
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
