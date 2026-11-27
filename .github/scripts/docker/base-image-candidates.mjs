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
 * patch does (see classifyNoFix), and a person updates the version.
 *
 * A newer patch of the Node minor (see findNodePatch) updates all Node pins
 * and NODE_VERSION in one PR, so the Alpine and the Debian images stay aligned.
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

import { readNodeVersion } from '../resolve-node-version.mjs';
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
 * The pins of the Node version. A Node patch changes them together with
 * NODE_VERSION, so the Alpine and the Debian images run the same Node. The
 * builder images compile the native addons and give the runners their Node.
 */
export const NODE_PINS = ['DHI_REF', 'DEBIAN_DHI_REF', 'BUILDER_IMAGE', 'DEBIAN_BUILDER_IMAGE'];

export const NODE_RELEASES_URL = 'https://nodejs.org/dist/index.json';

const patchOf = (version) => Number(version.split('.')[2]);

/**
 * The patches of the same Node minor that are newer than `current`, newest
 * first. `releases` is the release list of nodejs.org.
 */
export function newerPatches(releases, current) {
	const [major, minor] = current.split('.');
	return releases
		.map((release) => ({
			version: String(release.version).replace(/^v/, ''),
			security: release.security === true,
		}))
		.filter(({ version }) => {
			const parts = version.split('.');
			return (
				parts.length === 3 &&
				parts[0] === major &&
				parts[1] === minor &&
				/^\d+$/.test(parts[2]) &&
				patchOf(version) > patchOf(current)
			);
		})
		.sort((a, b) => patchOf(b.version) - patchOf(a.version));
}

/** The tag of a Node pin for another version: 26.13.0-alpine3.24-dev -> 26.13.1-alpine3.24-dev. */
export function retag(tag, from, to) {
	return tag.startsWith(`${from}-`) ? `${to}${tag.slice(from.length)}` : null;
}

/**
 * The newest patch of the Node minor that every Node pin publishes.
 * `resolve(repository, tag)` returns the digest of a tag, or null. Returns null
 * when nodejs.org has no newer patch. Otherwise `pins` holds the new tag and
 * digest of each pin (empty when no newer patch is complete), and `waiting`
 * holds the newest patch and the tags that it waits for. `security` tells
 * whether nodejs.org marks a patch up to `to` as a security release.
 */
export function findNodePatch(hcl, releases, resolve) {
	const from = readNodeVersion(hcl);
	const pins = NODE_PINS.map((name) => readPin(hcl, name));
	const misaligned = pins.filter((pin) => !retag(pin.tag, from, from)).map((pin) => pin.name);
	if (misaligned.length > 0) return { from, to: null, pins: [], waiting: null, misaligned };

	const patches = newerPatches(releases, from);
	if (patches.length === 0) return null;
	let waiting = null;
	for (const { version } of patches) {
		const found = pins.map((pin) => {
			const tag = retag(pin.tag, from, version);
			return { pin, tag, digest: resolve(pin.repository, tag) };
		});
		const missing = found.filter((entry) => !entry.digest);
		if (missing.length === 0) {
			const security = patches.some(
				(patch) => patch.security && patchOf(patch.version) <= patchOf(version),
			);
			return { from, to: version, security, pins: found, waiting };
		}
		waiting ??= {
			version,
			tags: missing.map((entry) => `${entry.pin.repository}:${entry.tag}`),
		};
	}
	return { from, to: null, pins: [], waiting };
}

/**
 * Holds the Node patch back until every Node pin is ready: one PR changes them
 * all. A ready pin takes the status of the first pin that is not ready.
 */
export function holdNodePatch(results) {
	const members = results.filter((result) => result.nodePatch);
	const blockers = members.filter((result) => result.status !== 'ready');
	if (blockers.length === 0) return results;
	return results.map((result) =>
		result.nodePatch && result.status === 'ready'
			? { ...result, status: blockers[0].status, heldBy: blockers.map((blocker) => blocker.source) }
			: result,
	);
}

/** The Node release list of nodejs.org, or the error of the request. */
async function nodeReleases() {
	try {
		const response = await fetch(NODE_RELEASES_URL, { signal: AbortSignal.timeout(30_000) });
		if (!response.ok) throw new Error(`${NODE_RELEASES_URL} returned ${response.status}`);
		return { releases: await response.json() };
	} catch (error) {
		console.log(`No Node patch check: ${error.message}`);
		return { error: error.message };
	}
}

/**
 * The result that tells the alerts that the run could not check for a Node
 * patch: nodejs.org or a registry failed. It has no platforms, so the PRs and
 * the report skip it.
 */
export function nodeCheckFailed(hcl, error) {
	const version = readNodeVersion(hcl);
	return {
		source: 'NODE_VERSION',
		status: 'node-check-failed',
		pinned: version,
		newest: version,
		platforms: [],
		error,
	};
}

/**
 * Classifies a source whose newest digest leaves fixable findings. When the
 * moving tag points to a newer patch that removes a finding, a person must
 * update the version. Otherwise the upstream has no fix yet.
 */
export function classifyNoFix(result, moving) {
	if (!moving?.platforms.some((platform) => platform.removed.length > 0))
		return { ...result, status: 'no-upstream-fix' };
	return { ...result, status: 'version-update', versionUpdate: moving };
}

export const GATE_MS = 24 * 60 * 60 * 1000;

/**
 * Applies the publisher check, the 24-hour gate and the package-set rule to a
 * candidate. A digest is ready when its publisher is verified and it is at
 * least 24 hours old. A manual run skips the gate. A digest that adds a
 * package or that skipped the gate is ready without auto-merge, so that a
 * person reviews it. `group` names its PR: `daily`, `review`, or `node` for a
 * Node patch, which a person reviews.
 */
export function applyGate(candidate, publisher, { now, skipGate }) {
	const checked = { ...candidate, publisher };
	if (!publisher.verified) return { ...checked, status: 'unverified' };
	const gated = !publisher.publishedAt || now - Date.parse(publisher.publishedAt) < GATE_MS;
	if (gated && !skipGate) {
		return { ...checked, status: publisher.publishedAt ? 'in-24h-gate' : 'no-publish-time' };
	}
	const addsPackage = candidate.platforms.some((platform) => platform.addedPackages.length > 0);
	const autoMerge = !addsPackage && !gated && !candidate.nodePatch;
	const group = candidate.nodePatch ? 'node' : autoMerge ? 'daily' : 'review';
	return { ...checked, status: 'ready', autoMerge, group, gateSkipped: gated };
}

/**
 * The digest of a tag, or null when the registry does not have the tag. Any
 * other error stops the Node patch check, so a registry error never looks
 * like a missing patch.
 */
function findDigest(repository, tag) {
	try {
		return resolveDigest(repository, tag);
	} catch (error) {
		if (/: not found\b/.test(String(error.stderr ?? ''))) return null;
		throw error;
	}
}

function resolveDigest(repository, tag) {
	const out = execFileSync(
		'docker',
		['buildx', 'imagetools', 'inspect', `${repository}:${tag}`, '--format', '{{json .Manifest}}'],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
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

/** The Node patch lines of the job summary. `nodePatch` is the result of findNodePatch. */
export function renderNodePatch(results, nodePatch) {
	if (!nodePatch) return [];
	if (nodePatch.misaligned) {
		return [
			`- The Node pins do not all use \`NODE_VERSION\` \`${nodePatch.from}\`: ${nodePatch.misaligned.map((name) => `\`${name}\``).join(', ')}. A person aligns them.`,
		];
	}
	const lines = [];
	if (nodePatch.to) {
		const members = results.filter((result) => result.nodePatch);
		const status = members.every((result) => result.status === 'ready')
			? 'ready'
			: members.map((result) => `\`${result.source}\` ${result.status}`).join(', ');
		lines.push(
			`- Node \`${nodePatch.from}\` → \`${nodePatch.to}\`${nodePatch.security ? ' (security release)' : ''}: ${status}.`,
		);
	}
	if (nodePatch.waiting) {
		lines.push(
			`- Node \`${nodePatch.waiting.version}\` waits for: ${nodePatch.waiting.tags.map((tag) => `\`${tag}\``).join(', ')}.`,
		);
	}
	return lines;
}

/** A Markdown table of the results for the job summary. */
export function renderSummary(results, nodePatch = null) {
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
	const node = renderNodePatch(results, nodePatch);
	if (node.length > 0) lines.push('', '### Node patch', '', ...node);
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
	let results = [];
	let nodePatch = null;
	try {
		const scansOf = new Map();
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
			scansOf.set(name, scans);
			let result = evaluateSource(pin, newestDigest, scans);
			if (result.status === 'no-fix') {
				// A pinned tag can freeze on its patch. The moving tag of the line shows a newer patch.
				const movingTag = movingTagOf(pin.tag);
				let movingDigest = null;
				try {
					if (movingTag) movingDigest = resolveDigest(pin.repository, movingTag);
				} catch {
					// Not every line publishes a moving tag. The source stays no-upstream-fix.
					console.log(`${name}: no moving tag ${pin.repository}:${movingTag}`);
				}
				let moving = null;
				if (movingDigest && movingDigest !== newestDigest) {
					moving = {
						ref: `${pin.repository}:${movingTag}@${movingDigest}`,
						platforms: scans.map(({ platform, newest }) => ({
							platform,
							...compareScans(newest, scan(`${pin.repository}@${movingDigest}`, platform, workDir)),
						})),
					};
				}
				result = classifyNoFix(result, moving);
			}
			if (result.status === 'candidate') {
				const publisher = await verifyPublisher(pin, newestDigest, PLATFORMS);
				result = applyGate(result, publisher, { now: Date.now(), skipGate: values['skip-gate'] });
			}
			console.log(`${name}: ${result.status} (${result.newest})`);
			results.push(result);
		}

		// The Node patch replaces the results of its pins: one PR changes them all.
		const { releases, error: releasesError } = await nodeReleases();
		let error = releasesError;
		try {
			nodePatch = releases ? findNodePatch(hcl, releases, findDigest) : null;
		} catch (registryError) {
			error =
				String(registryError.stderr ?? '')
					.trim()
					.split('\n')
					.at(-1) || registryError.message;
			console.log(`No Node patch check: ${error}`);
		}
		if (error) results.push(nodeCheckFailed(hcl, error));
		for (const { pin, tag, digest } of nodePatch?.pins ?? []) {
			const scans = scansOf.get(pin.name);
			// The builder images give the release images only their Node, so no scan covers them.
			const platforms = scans
				? scans.map(({ platform, pinned }) => ({
						platform,
						...compareScans(pinned, scan(`${pin.repository}@${digest}`, platform, workDir)),
					}))
				: [];
			const candidate = {
				source: pin.name,
				pinned: pin.ref,
				newest: `${pin.repository}:${tag}@${digest}`,
				status: 'candidate',
				platforms,
				nodePatch: { from: nodePatch.from, to: nodePatch.to, security: nodePatch.security },
			};
			const publisher = await verifyPublisher({ ...pin, tag }, digest, PLATFORMS);
			const result = applyGate(candidate, publisher, {
				now: Date.now(),
				skipGate: values['skip-gate'],
			});
			const index = results.findIndex((entry) => entry.source === pin.name);
			if (index === -1) results.push(result);
			else results[index] = result;
		}
		results = holdNodePatch(results);
		for (const result of results.filter((entry) => entry.nodePatch)) {
			console.log(`${result.source}: Node ${nodePatch.to}, ${result.status} (${result.newest})`);
		}
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}

	if (values.out) writeFileSync(values.out, `${JSON.stringify(results, null, 2)}\n`);
	if (process.env.GITHUB_STEP_SUMMARY)
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(results, nodePatch));
	if (process.env.GITHUB_OUTPUT) {
		const ready = results.filter((result) => result.status === 'ready').length;
		appendFileSync(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
	}
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
