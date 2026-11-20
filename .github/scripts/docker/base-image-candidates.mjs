#!/usr/bin/env node
/**
 * Finds the base image digests that remove fixable OS findings from the
 * release images.
 *
 * Each upstream source is a pin in docker/docker-bake.hcl. The script resolves
 * the newest digest of the pinned tag, then scans the pinned and the newest
 * digest with Trivy on each platform. The newest digest is a candidate when it
 * removes at least one finding. A candidate is ready when its publisher is
 * verified and it is at least 24 hours old (see applyGate).
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
	};
}

/** The result for one source. `scans` holds { platform, pinned, newest } entries. */
export function evaluateSource(pin, newestDigest, scans) {
	const result = {
		source: pin.name,
		pinned: pin.ref,
		newest: `${pin.repository}:${pin.tag}@${newestDigest}`,
	};
	if (newestDigest === pin.digest) return { ...result, status: 'current', platforms: [] };

	const platforms = scans.map(({ platform, pinned, newest }) => ({
		platform,
		...compareScans(pinned, newest),
	}));
	const removes = platforms.some((platform) => platform.removed.length > 0);
	return { ...result, status: removes ? 'candidate' : 'no-fix', platforms };
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

function resolveNewestDigest(pin) {
	const out = execFileSync(
		'docker',
		[
			'buildx',
			'imagetools',
			'inspect',
			`${pin.repository}:${pin.tag}`,
			'--format',
			'{{json .Manifest}}',
		],
		{ encoding: 'utf8' },
	);
	const digest = JSON.parse(out).digest;
	if (!/^sha256:[0-9a-f]{64}$/.test(digest ?? '')) {
		throw new Error(`No digest for ${pin.repository}:${pin.tag}`);
	}
	return digest;
}

function scan(ref, platform, workDir) {
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
			'--severity',
			'CRITICAL,HIGH,MEDIUM',
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
	return `${by('CRITICAL')} C / ${by('HIGH')} H / ${by('MEDIUM')} M`;
};

/** A Markdown table of the results for the job summary. */
export function renderSummary(results) {
	const lines = [
		'## Base image candidates',
		'',
		'| Source | Status | Published | Auto-merge | Platform | Removed | Added | New packages |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |',
	];
	const errors = [];
	for (const result of results) {
		const published = result.publisher?.publishedAt ?? '-';
		const autoMerge = result.autoMerge === undefined ? '-' : result.autoMerge ? 'yes' : 'no';
		const head = `| \`${result.source}\` | ${result.status} | ${published} | ${autoMerge}`;
		if (result.publisher?.error) errors.push(`- \`${result.source}\`: ${result.publisher.error}`);
		if (result.platforms.length === 0) {
			lines.push(`${head} | - | - | - | - |`);
			continue;
		}
		for (const platform of result.platforms) {
			lines.push(
				`${head} | ${platform.platform} | ${count(platform.removed)} | ${count(platform.added)} | ${platform.addedPackages.join(', ') || '-'} |`,
			);
		}
	}
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
			const newestDigest = resolveNewestDigest(pin);
			const newestRef = `${pin.repository}@${newestDigest}`;
			const pinnedRef = `${pin.repository}@${pin.digest}`;
			const scans =
				newestDigest === pin.digest
					? []
					: PLATFORMS.map((platform) => ({
							platform,
							pinned: scan(pinnedRef, platform, workDir),
							newest: scan(newestRef, platform, workDir),
						}));
			let result = evaluateSource(pin, newestDigest, scans);
			if (result.status === 'candidate') {
				const publisher = await verifyPublisher(pin, newestDigest, PLATFORMS);
				result = applyGate(result, publisher, { now: Date.now(), skipGate: values['skip-gate'] });
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
