#!/usr/bin/env node
/**
 * Finds the base image digests that remove fixable OS findings from the
 * release images.
 *
 * Each upstream source is a pin in docker/docker-bake.hcl. The script resolves
 * the newest digest of the pinned tag, then scans the pinned and the newest
 * digest with Trivy on each platform. The newest digest is a candidate when it
 * removes at least one finding. A candidate is ready when its publisher is
 * verified and it is at least 24 hours old (see applyGate). When no digest of
 * the tag removes a finding, the moving tag of the line shows whether a newer
 * patch does (see classifyNoFix).
 *
 * Usage: node base-image-candidates.mjs [--out <file>] [--skip-gate]
 * Needs docker buildx, trivy, cosign, and a login to each private registry
 * (dhi.io). Writes the result as JSON to --out and to $GITHUB_STEP_SUMMARY,
 * and ready=<count> to $GITHUB_OUTPUT.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { verifyPublisher } from './base-image-publisher.mjs';

const BAKE_FILE = 'docker/docker-bake.hcl';

/**
 * The upstream images that the release images run on. runners-distroless also
 * copies the libraries of DEBIAN_PYTHON_IMAGE, which Trivy does not see there.
 */
export const SOURCES = [
	'DHI_REF',
	'DEBIAN_DHI_REF',
	'DISTROLESS_BASE_IMAGE',
	'PYTHON_IMAGE',
	'DEBIAN_PYTHON_IMAGE',
];

export const PLATFORMS = ['linux/amd64', 'linux/arm64'];

const PINNED_REF = /^(?<repository>[^\s@]+):(?<tag>[^\s:@/]+)@(?<digest>sha256:[0-9a-f]{64})$/;

/** Reads a pin from the default of its bake variable. */
export function readPin(hcl, name) {
	const match = hcl.match(new RegExp(`^variable "${name}" \\{\\s*default = "([^"]+)"`, 'm'));
	if (!match) throw new Error(`${BAKE_FILE} has no plain string default for ${name}`);
	const ref = PINNED_REF.exec(match[1]);
	if (!ref) throw new Error(`${name} is not pinned as <repository>:<tag>@sha256:<digest>`);
	return { name, ref: match[1], ...ref.groups };
}

/**
 * The severities that Trivy gives, the most severe first. The scans keep every
 * fixable finding: each scanner takes the severity from another source, so a
 * finding that Trivy rates Low can be High in another scanner.
 */
export const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

/** Reduces a Trivy JSON report to the fixable findings and the installed package names. */
export function summarizeReport(report) {
	const findings = new Map();
	const packages = new Set();
	for (const result of report.Results ?? []) {
		for (const pkg of result.Packages ?? []) packages.add(pkg.Name);
		for (const vuln of result.Vulnerabilities ?? []) {
			const finding = {
				id: vuln.VulnerabilityID,
				pkg: vuln.PkgName,
				severity: vuln.Severity,
				installed: vuln.InstalledVersion,
				fixed: vuln.FixedVersion,
			};
			findings.set(`${finding.id} ${finding.pkg}`, finding);
		}
	}
	return { findings: [...findings.values()], packages: [...packages].sort() };
}

const keyOf = (finding) => `${finding.id} ${finding.pkg}`;

/** What the newest digest changes on one platform, compared with the pinned digest. */
export function compareScans(pinned, newest) {
	const pinnedKeys = new Set(pinned.findings.map(keyOf));
	const newestKeys = new Set(newest.findings.map(keyOf));
	const pinnedPackages = new Set(pinned.packages);
	return {
		removed: pinned.findings.filter((finding) => !newestKeys.has(keyOf(finding))),
		added: newest.findings.filter((finding) => !pinnedKeys.has(keyOf(finding))),
		addedPackages: newest.packages.filter((name) => !pinnedPackages.has(name)),
		remaining: newest.findings,
	};
}

/**
 * The result for one source. `scans` holds { platform, pinned, newest } entries.
 * When the tag has no newer digest, `newest` is the scan of the pinned digest.
 */
export function evaluateSource(pin, newestDigest, scans) {
	const result = {
		source: pin.name,
		pinned: pin.ref,
		newest: `${pin.repository}:${pin.tag}@${newestDigest}`,
	};
	const platforms = scans.map(({ platform, pinned, newest }) => ({
		platform,
		...compareScans(pinned, newest),
	}));
	if (platforms.some((platform) => platform.removed.length > 0))
		return { ...result, status: 'candidate', platforms };
	const remains = scans.some(({ newest }) => newest.findings.length > 0);
	return { ...result, status: remains ? 'no-fix' : 'current', platforms };
}

/** The moving tag of a pinned tag's line: the same tag without the patch number. */
export function movingTagOf(tag) {
	const match = /^(\d+\.\d+)\.\d+(-.+)?$/.exec(tag);
	return match ? `${match[1]}${match[2] ?? ''}` : null;
}

/**
 * Classifies a source whose newest digest leaves fixable findings. When the
 * moving tag points to a newer patch that removes a finding, a person must
 * update the version. Otherwise the upstream has no fix yet.
 */
export function classifyNoFix(result, moving) {
	if (moving?.platforms.some((platform) => platform.removed.length > 0))
		return { ...result, status: 'version-update', versionUpdate: moving };
	return { ...result, status: 'no-upstream-fix' };
}

export const GATE_MS = 24 * 60 * 60 * 1000;

/**
 * Applies the publisher check, the 24-hour gate and the package-set rule to a
 * candidate. A digest is ready when its publisher is verified and it is at
 * least 24 hours old. A manual run skips the gate. A digest that adds a
 * package, or that skipped the gate, is ready without auto-merge, so that a
 * person reviews it.
 */
export function applyGate(candidate, publisher, { now, skipGate }) {
	const checked = { ...candidate, publisher };
	if (!publisher.verified) return { ...checked, status: 'unverified' };
	const gated = !publisher.publishedAt || now - Date.parse(publisher.publishedAt) < GATE_MS;
	if (gated && !skipGate) {
		return { ...checked, status: publisher.publishedAt ? 'in-24h-gate' : 'no-publish-time' };
	}
	const addsPackage = candidate.platforms.some((platform) => platform.addedPackages.length > 0);
	return { ...checked, status: 'ready', autoMerge: !addsPackage && !gated, gateSkipped: gated };
}

function resolveDigest(repository, tag) {
	const out = execFileSync(
		'docker',
		['buildx', 'imagetools', 'inspect', `${repository}:${tag}`, '--format', '{{json .Manifest}}'],
		{ encoding: 'utf8' },
	);
	const digest = JSON.parse(out).digest;
	if (!/^sha256:[0-9a-f]{64}$/.test(digest ?? '')) {
		throw new Error(`No digest for ${repository}:${tag}`);
	}
	return digest;
}

/** Scans an image for fixable OS findings on one platform. */
export function scan(ref, platform, workDir) {
	const output = path.join(workDir, 'trivy.json');
	execFileSync(
		'trivy',
		[
			'image',
			'--quiet',
			'--image-src',
			'remote',
			'--platform',
			platform,
			'--scanners',
			'vuln',
			'--pkg-types',
			'os',
			'--ignore-unfixed',
			'--list-all-pkgs',
			'--format',
			'json',
			'--output',
			output,
			ref,
		],
		{ stdio: ['ignore', 'inherit', 'inherit'] },
	);
	return summarizeReport(JSON.parse(readFileSync(output, 'utf8')));
}

const count = (findings) => {
	const by = (severity) => findings.filter((finding) => finding.severity === severity).length;
	return `${by('CRITICAL')} C / ${by('HIGH')} H / ${by('MEDIUM')} M / ${by('LOW')} L / ${by('UNKNOWN')} U`;
};

/** A Markdown table of the results for the job summary. */
export function renderSummary(results) {
	const lines = [
		'## Base image candidates',
		'',
		'| Source | Status | Published | Auto-merge | Platform | Removed | Added | Left | New packages |',
		'| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
	];
	const errors = [];
	const notes = [];
	for (const result of results) {
		if (result.versionUpdate) {
			// The same finding on each platform counts once.
			const removed = [
				...new Map(
					result.versionUpdate.platforms
						.flatMap((platform) => platform.removed)
						.map((finding) => [keyOf(finding), finding]),
				).values(),
			];
			notes.push(
				`- \`${result.source}\`: version update needed. \`${result.versionUpdate.ref}\` removes ${count(removed)}.`,
			);
		}
		const published = result.publisher?.publishedAt ?? '-';
		const autoMerge = result.autoMerge === undefined ? '-' : result.autoMerge ? 'yes' : 'no';
		const head = `| \`${result.source}\` | ${result.status} | ${published} | ${autoMerge}`;
		if (result.publisher?.error) errors.push(`- \`${result.source}\`: ${result.publisher.error}`);
		if (result.platforms.length === 0) {
			lines.push(`${head} | - | - | - | - | - |`);
			continue;
		}
		for (const platform of result.platforms) {
			lines.push(
				`${head} | ${platform.platform} | ${count(platform.removed)} | ${count(platform.added)} | ${count(platform.remaining)} | ${platform.addedPackages.join(', ') || '-'} |`,
			);
		}
	}
	if (notes.length > 0) lines.push('', '### Needs a person', '', ...notes);
	if (errors.length > 0) lines.push('', '### Publisher errors', '', ...errors);
	return `${lines.join('\n')}\n`;
}

async function main() {
	const { values } = parseArgs({
		options: { out: { type: 'string' }, 'skip-gate': { type: 'boolean', default: false } },
	});
	const hcl = readFileSync(BAKE_FILE, 'utf8');
	const workDir = mkdtempSync(path.join(tmpdir(), 'base-image-candidates-'));
	const results = [];
	try {
		for (const name of SOURCES) {
			const pin = readPin(hcl, name);
			const newestDigest = resolveDigest(pin.repository, pin.tag);
			const scans = PLATFORMS.map((platform) => {
				const pinned = scan(`${pin.repository}@${pin.digest}`, platform, workDir);
				const newest =
					newestDigest === pin.digest
						? pinned
						: scan(`${pin.repository}@${newestDigest}`, platform, workDir);
				return { platform, pinned, newest };
			});
			let result = evaluateSource(pin, newestDigest, scans);
			if (result.status === 'candidate') {
				const publisher = await verifyPublisher(pin, newestDigest, PLATFORMS);
				result = applyGate(result, publisher, { now: Date.now(), skipGate: values['skip-gate'] });
			} else if (result.status === 'no-fix') {
				// A pinned tag can freeze on its patch. The moving tag of the line shows a newer patch.
				const movingTag = movingTagOf(pin.tag);
				let movingDigest = null;
				try {
					if (movingTag) movingDigest = resolveDigest(pin.repository, movingTag);
				} catch {
					// Not every line publishes a moving tag. The source stays no-upstream-fix.
					console.log(`${name}: no moving tag ${pin.repository}:${movingTag}`);
				}
				const moving =
					movingDigest && movingDigest !== newestDigest
						? {
								ref: `${pin.repository}:${movingTag}@${movingDigest}`,
								platforms: scans.map(({ platform, newest }) => ({
									platform,
									...compareScans(
										newest,
										scan(`${pin.repository}@${movingDigest}`, platform, workDir),
									),
								})),
							}
						: null;
				result = classifyNoFix(result, moving);
			}
			console.log(`${name}: ${result.status} (${result.newest})`);
			results.push(result);
		}
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}

	if (values.out) writeFileSync(values.out, `${JSON.stringify(results, null, 2)}\n`);
	if (process.env.GITHUB_STEP_SUMMARY)
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(results));
	if (process.env.GITHUB_OUTPUT) {
		const ready = results.filter((result) => result.status === 'ready').length;
		appendFileSync(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
