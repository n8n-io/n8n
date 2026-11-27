#!/usr/bin/env node
/**
 * Writes the public Trivy report of the released images.
 *
 * The script resolves each release line to its version from the Git tags, then
 * scans each variant of that version and the nightly image of the same variant
 * for fixable OS findings, on each platform. Each finding gets the status of
 * its fix (see statusOf), from the result of the refresh run in
 * base-image-candidates.mjs.
 *
 * Usage: node base-image-report.mjs --candidates <json> --out <dir>
 * Needs git, docker buildx and trivy. Writes one JSON for each image to --out, and
 * a summary to $GITHUB_STEP_SUMMARY.
 */

import { execFileSync } from 'node:child_process';
import {
	appendFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

import { branchOf, collectPullRequests } from './base-image-alerts.mjs';
import { PLATFORMS, SEVERITIES, scan } from './base-image-candidates.mjs';
import { resolveDigest } from './base-image-chain-pr.mjs';

/**
 * The release lines, and the nightly tag of the branch that each line comes
 * from. `track` is the Git tag that the release workflow moves to the version
 * of the line. v3 has no track tag, so its line is the newest 3.x version.
 * v1 is not here: the refresh does not update the 1.x branch, and v1 support
 * ends on 2027-01-31.
 */
export const LINES = [
	{ line: 'stable', track: 'stable', nightly: 'nightly' },
	{ line: 'beta', track: 'beta', nightly: 'nightly' },
	{ line: 'v3', major: 3, nightly: 'v3-nightly' },
];

const VERSION_TAG = /^n8n@(\d+)\.(\d+)\.(\d+)$/;

/** The variants of a release, and the pins in docker/docker-bake.hcl that bring their OS packages. */
export const IMAGES = [
	{ name: 'n8n', repository: 'n8nio/n8n', suffix: '', sources: ['DHI_REF'] },
	{ name: 'n8n-pc', repository: 'n8nio/n8n', suffix: '-pc', sources: ['DHI_REF'] },
	{ name: 'n8n-debian', repository: 'n8nio/n8n', suffix: '-debian', sources: ['DEBIAN_DHI_REF'] },
	{ name: 'runners', repository: 'n8nio/runners', suffix: '', sources: ['PYTHON_IMAGE'] },
	{
		name: 'runners-debian',
		repository: 'n8nio/runners',
		suffix: '-debian',
		sources: ['DEBIAN_DHI_REF'],
	},
	{
		name: 'runners-distroless',
		repository: 'n8nio/runners',
		suffix: '-distroless',
		sources: ['DISTROLESS_BASE_IMAGE', 'DEBIAN_PYTHON_IMAGE'],
	},
];

const keyOf = (finding) => `${finding.id} ${finding.pkg}`;

const has = (findings, key) => findings.some((finding) => keyOf(finding) === key);

/**
 * The status of the fix of one finding, in the order that a fix moves:
 * - `fix-merged`: the nightly image of the line no longer has it. The fix ships with the next release.
 * - `pr-open`: a refresh PR pins a digest that removes it.
 * - `in-24h-gate`: a digest removes it, and waits for the 24-hour gate.
 * - `publisher-check-failed`, `no-publish-time`: a digest removes it, but the refresh holds it back and sends an alert.
 * - `version-update`: a newer patch of the pinned tag removes it. A person updates the version.
 * - `no-upstream-fix`: the newest digest of the pinned tag still has it.
 * - `needs-rebuild`: no base pin has it, so it comes from a package that n8nio/base installs. A rebuild of the base fixes it.
 */
export function statusOf(key, image, { results, nightlyKeys, prs, runUrl }) {
	if (nightlyKeys && !nightlyKeys.has(key)) return { status: 'fix-merged' };
	const sources = results.filter((result) => image.sources.includes(result.source));
	const removes = (platforms) => platforms?.some((platform) => has(platform.removed, key)) ?? false;
	for (const result of sources) {
		if (!removes(result.platforms)) continue;
		if (result.status === 'ready') {
			const branch = branchOf(result);
			return { status: 'pr-open', link: prs.find((pr) => pr.branch === branch)?.url ?? null };
		}
		if (['in-24h-gate', 'unverified', 'no-publish-time'].includes(result.status)) {
			const status = result.status === 'unverified' ? 'publisher-check-failed' : result.status;
			return { status };
		}
	}
	for (const result of sources) {
		if (result.status === 'version-update' && removes(result.versionUpdate.platforms))
			return { status: 'version-update', link: runUrl };
	}
	const upstream = sources.some((result) =>
		result.platforms.some((platform) => has(platform.remaining, key)),
	);
	return { status: upstream ? 'no-upstream-fix' : 'needs-rebuild' };
}

/**
 * The report of one image. `scans` holds { platform, release, nightly } entries,
 * where `nightly` is null when the nightly image does not exist.
 */
export function buildReport({ line, version, image, ref, nightlyRef, scans, ...context }) {
	const findings = new Map();
	for (const { platform, release } of scans) {
		for (const finding of release.findings) {
			const entry = findings.get(keyOf(finding)) ?? { ...finding, platforms: [] };
			entry.platforms.push(platform);
			findings.set(keyOf(finding), entry);
		}
	}
	const nightlyKeys = scans.every(({ nightly }) => nightly)
		? new Set(scans.flatMap(({ nightly }) => nightly.findings.map(keyOf)))
		: null;
	const list = [...findings.values()]
		.sort(
			(a, b) =>
				SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
				a.id.localeCompare(b.id) ||
				a.pkg.localeCompare(b.pkg),
		)
		.map((finding) => ({
			...finding,
			...statusOf(keyOf(finding), image, { ...context, nightlyKeys }),
		}));
	return { line, version, image: ref, nightly: nightlyRef, findings: list };
}

/** The Markdown summary of the reports. */
export function renderSummary(reports) {
	const count = (report, severity) =>
		report.findings.filter((finding) => finding.severity === severity).length;
	const lines = [
		'## Trivy report of the released images',
		'',
		'| Line | Image | Critical | High | Medium | Low | Unknown | Status of the findings |',
		'| --- | --- | --- | --- | --- | --- | --- | --- |',
	];
	for (const report of reports) {
		const statuses = new Map();
		for (const finding of report.findings.filter((f) => f.status)) {
			statuses.set(finding.status, (statuses.get(finding.status) ?? 0) + 1);
		}
		const status = [...statuses].map(([name, n]) => `${name}: ${n}`).join(', ') || '-';
		lines.push(
			`| ${report.line} | \`${report.image.split('@')[0]}\` | ${count(report, 'CRITICAL')} | ${count(report, 'HIGH')} | ${count(report, 'MEDIUM')} | ${count(report, 'LOW')} | ${count(report, 'UNKNOWN')} | ${status} |`,
		);
	}
	return `${lines.join('\n')}\n`;
}

/** Reads `git ls-remote --tags` output into a map of tag name to commit. */
export function parseTags(output) {
	const tags = new Map();
	const peeled = new Map();
	for (const row of output.split('\n')) {
		const [sha, ref] = row.split('\t');
		if (!ref?.startsWith('refs/tags/')) continue;
		const name = ref.slice('refs/tags/'.length);
		// An annotated tag also lists the commit that it points to as `<name>^{}`.
		if (name.endsWith('^{}')) peeled.set(name.slice(0, -3), sha);
		else tags.set(name, sha);
	}
	for (const [name, sha] of peeled) tags.set(name, sha);
	return tags;
}

/** The versions of a line, the newest first. */
export function versionsOf(line, tags) {
	const commit = line.track ? tags.get(line.track) : undefined;
	if (line.track && !commit) throw new Error(`the ${line.track} tag does not exist`);
	const versions = [];
	for (const [name, sha] of tags) {
		const match = VERSION_TAG.exec(name);
		if (!match) continue;
		const parts = match.slice(1).map(Number);
		if (line.track ? sha === commit : parts[0] === line.major) versions.push(parts);
	}
	if (versions.length === 0) throw new Error(`no version tag matches the ${line.line} line`);
	return versions
		.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])
		.map((parts) => parts.join('.'));
}

/**
 * The newest version of a line that has a released image. The version label of
 * the image must match the tag. A new tag can come before its image, so a line
 * without a track tag can fall back to the version before it.
 */
export function resolveVersion(line, tags, { label = imageVersion } = {}) {
	const versions = versionsOf(line, tags).slice(0, line.track ? 1 : 2);
	for (const version of versions) {
		if (label(`n8nio/n8n:${version}`) === version) return version;
	}
	throw new Error(`no image of ${versions.join(' or ')} has the matching version label`);
}

/** The version label of an image, or null when the tag does not exist. */
function imageVersion(ref) {
	let out;
	try {
		out = execFileSync(
			'docker',
			['buildx', 'imagetools', 'inspect', ref, '--format', '{{json .}}'],
			{
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);
	} catch (error) {
		if (/: not found\b/.test(String(error.stderr ?? ''))) return null;
		throw error;
	}
	const { image } = JSON.parse(out);
	// A multi-platform image maps each platform to its config.
	const config = image.config ?? Object.values(image).find((entry) => entry?.config)?.config;
	return config?.Labels?.['org.opencontainers.image.version'] ?? null;
}

async function main() {
	const { values } = parseArgs({
		options: { candidates: { type: 'string' }, out: { type: 'string' } },
	});
	if (!values.candidates || !values.out) throw new Error('--candidates and --out are required');

	const results = JSON.parse(readFileSync(values.candidates, 'utf8'));
	const prs = await collectPullRequests();
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
	const trivy = execFileSync('trivy', ['--version', '--format', 'json'], { encoding: 'utf8' });
	const scannedAt = new Date().toISOString();
	const tags = parseTags(
		execFileSync('git', ['ls-remote', '--tags', 'origin'], { encoding: 'utf8' }),
	);

	mkdirSync(values.out, { recursive: true });
	const workDir = mkdtempSync(path.join(tmpdir(), 'base-image-report-'));
	const reports = [];
	const skipped = [];
	try {
		for (const line of LINES) {
			// A line without a release version must not stop the report of the other lines.
			let version;
			try {
				version = resolveVersion(line, tags);
			} catch (error) {
				console.log(`::warning::Skipped the ${line.line} line: ${error.message}`);
				skipped.push(`${line.line}: ${error.message}`);
				continue;
			}
			for (const image of IMAGES) {
				const digest = resolveDigest(`${image.repository}:${version}${image.suffix}`);
				if (!digest) {
					console.log(`${line.line}: ${image.repository}:${version}${image.suffix} does not exist`);
					continue;
				}
				const nightlyDigest = resolveDigest(`${image.repository}:${line.nightly}${image.suffix}`);
				const scans = PLATFORMS.map((platform) => ({
					platform,
					release: scan(`${image.repository}@${digest}`, platform, workDir),
					nightly: nightlyDigest
						? scan(`${image.repository}@${nightlyDigest}`, platform, workDir)
						: null,
				}));
				const report = buildReport({
					line: line.line,
					version,
					image,
					ref: `${image.repository}:${version}${image.suffix}@${digest}`,
					nightlyRef: nightlyDigest
						? `${image.repository}:${line.nightly}${image.suffix}@${nightlyDigest}`
						: null,
					scans,
					results,
					prs,
					runUrl,
				});
				reports.push(report);
				writeFileSync(
					path.join(values.out, `${line.line}-${image.name}.json`),
					`${JSON.stringify({ ...report, scannedAt, trivy: JSON.parse(trivy).Version }, null, 2)}\n`,
				);
				console.log(`${line.line}: ${report.image} has ${report.findings.length} findings`);
			}
		}
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}

	if (process.env.GITHUB_STEP_SUMMARY) {
		const notes = skipped.map((reason) => `- Skipped ${reason}`).join('\n');
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`${renderSummary(reports)}${notes ? `\n${notes}\n` : ''}`,
		);
	}
	// The reports of the other lines are written, so the upload step can still run.
	if (skipped.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
