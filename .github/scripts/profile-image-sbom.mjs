#!/usr/bin/env node
/**
 * Local A/B harness for the release image SBOM (DEVP-907).
 *
 * Runs the same scan, enrich and gate steps as attest-image-sbom.mjs against a real
 * image, once per scanner variant. Reports the duration of each step and the
 * licenses each variant resolves. Does not run cosign, so it needs no credentials.
 *
 * Read the `lost` count first. The gate enforces `pkg:npm/` only, so a scanner
 * change can remove PyPI or OS licenses and the gate still passes.
 *
 * Usage:
 *   node .github/scripts/profile-image-sbom.mjs --image ghcr.io/n8n-io/n8n:2.37.4
 *   node .github/scripts/profile-image-sbom.mjs --image <ref> --variants cdxgen-fetch,syft
 *   node .github/scripts/profile-image-sbom.mjs --image <ref> --keep
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(scriptDir, '..', '..');
const CDXGEN = path.join(scriptDir, 'node_modules', '.bin', 'cdxgen');
const ENRICH = path.join(REPO_ROOT, 'scripts', 'licenses', 'enrich-sbom.mjs');
const CHECK = path.join(REPO_ROOT, 'scripts', 'licenses', 'check-sbom-licenses.mjs');
const OUT_DIR = path.join(REPO_ROOT, '.sbom-profile');
const ALLOW_REFS = [
	'--allow-ref=LicenseRef-n8n-sustainable-use',
	'--allow-ref=LicenseRef-n8n-enterprise',
];

const cdxgenArgs = (extra, out, image) => [
	...extra,
	'-t',
	'docker',
	'--no-install-deps',
	'--spec-version',
	'1.6',
	'-o',
	out,
	image,
];

export const VARIANTS = {
	// Production behaviour before DEVP-907. `--profile license-compliance` sets
	// FETCH_LICENSE=true and nothing else. That is one npm registry request per component.
	'cdxgen-fetch': {
		requires: CDXGEN,
		command: (out, image) => [
			CDXGEN,
			cdxgenArgs(['--profile', 'license-compliance'], out, image),
			{ CDXGEN_NO_BANNER: '1' },
		],
	},
	// The same scanner without the registry requests, to measure their cost.
	'cdxgen-no-fetch': {
		requires: CDXGEN,
		command: (out, image) => [CDXGEN, cdxgenArgs([], out, image), { CDXGEN_NO_BANNER: '1' }],
	},
	// Proposed replacement. Reads licenses from the LICENSE files on disk, so it
	// makes no network requests. `-file` excludes syft's per-file catalogue.
	syft: {
		requires: 'syft',
		command: (out, image) => [
			'syft',
			[image, '-o', `cyclonedx-json@1.6=${out}`, '--select-catalogers', '-file', '-q'],
			{},
		],
	},
};

export function slugify(image) {
	return image.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-60);
}

export function parseArgs(argv) {
	const args = { image: null, variants: ['cdxgen-fetch', 'syft'], keep: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--image') args.image = argv[++i];
		else if (arg === '--variants') args.variants = argv[++i].split(',');
		else if (arg === '--keep') args.keep = true;
		else throw new Error(`Unknown argument: ${arg}`);
	}
	if (!args.image) throw new Error('--image is required (e.g. ghcr.io/n8n-io/n8n:2.37.4)');
	for (const v of args.variants) {
		if (!VARIANTS[v])
			throw new Error(`Unknown variant "${v}" (expected: ${Object.keys(VARIANTS).join(', ')})`);
	}
	return args;
}

function time(label, fn) {
	const start = process.hrtime.bigint();
	const result = fn();
	const seconds = Number(process.hrtime.bigint() - start) / 1e9;
	console.log(`  ${label.padEnd(8)} ${seconds.toFixed(1)}s`);
	return { seconds, result };
}

function run(cmd, args, opts = {}) {
	return execFileSync(cmd, args, {
		stdio: opts.quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		env: opts.env ? { ...process.env, ...opts.env } : process.env,
		encoding: 'utf-8',
		maxBuffer: 64 * 1024 * 1024,
	});
}

function imagePresent(image) {
	try {
		run('docker', ['image', 'inspect', image], { quiet: true });
		return true;
	} catch {
		return false;
	}
}

/**
 * Scanners emit licenses in several shapes. Treat an entry as resolved if it has a
 * non-empty id, name or expression. This matches what the gate accepts.
 */
export function licenseOf(component) {
	const ids = (component.licenses ?? [])
		.map((entry) => entry.license?.id ?? entry.license?.name ?? entry.expression)
		.filter(Boolean);
	return ids.length ? ids.sort().join(' AND ') : null;
}

export function ecosystemCounts(components) {
	const counts = {};
	for (const c of components) {
		const eco = (c.purl ?? 'no-purl').split('/')[0];
		counts[eco] = (counts[eco] ?? 0) + 1;
	}
	return counts;
}

/**
 * The gate prints one line per failure as `  <label> (<purl>) - <reason>` and one per
 * warning as `  <label> - <reason>`. Match on the purl, so a new failure reason in
 * check-sbom-licenses.mjs still appears here instead of being silently uncounted.
 */
export function parseGateFailures(gateOutput) {
	return gateOutput
		.split('\n')
		.filter((line) => /\(pkg:[^)]+\)\s+\u2014\s+\S/.test(line))
		.map((line) => line.trim());
}

function indexByPurl(sbom) {
	const map = new Map();
	for (const component of sbom.components ?? []) {
		if (component.purl) map.set(component.purl, component);
	}
	return map;
}

async function profile(variant, image) {
	const sbomPath = path.join(OUT_DIR, `${slugify(image)}.${variant}.cdx.json`);
	console.log(`\n=== variant: ${variant} ===`);

	const [cmd, args, env] = VARIANTS[variant].command(sbomPath, image);
	const scan = time('scan', () => run(cmd, args, { quiet: true, env }));

	const enrich = time('enrich', () =>
		run(process.execPath, [ENRICH, sbomPath, '--lenient-config', '--drop-phantom-npm'], {
			quiet: true,
		}),
	);

	let gatePassed = true;
	let gateOutput = '';
	time('gate', () => {
		try {
			gateOutput = run(
				process.execPath,
				[CHECK, sbomPath, ...ALLOW_REFS, '--enforce-prefix=pkg:npm/'],
				{ quiet: true },
			);
		} catch (err) {
			gatePassed = false;
			gateOutput = `${err.stdout ?? ''}${err.stderr ?? ''}`;
		}
	});

	const sbom = JSON.parse(await readFile(sbomPath, 'utf-8'));
	const components = sbom.components ?? [];
	const npm = components.filter((c) => c.purl?.startsWith('pkg:npm/'));

	return {
		variant,
		sbomPath,
		seconds: { scan: scan.seconds, enrich: enrich.seconds },
		total: components.length,
		npm: npm.length,
		npmLicensed: npm.filter((c) => licenseOf(c) !== null).length,
		ecosystems: ecosystemCounts(components),
		gatePassed,
		gateFailures: parseGateFailures(gateOutput),
		byPurl: indexByPurl(sbom),
	};
}

export function compare(baseline, candidate) {
	console.log(`\n=== ${baseline.variant} -> ${candidate.variant} ===`);

	const onlyInBaseline = [...baseline.byPurl.keys()].filter((p) => !candidate.byPurl.has(p));
	const onlyInCandidate = [...candidate.byPurl.keys()].filter((p) => !baseline.byPurl.has(p));

	// `lost` counts only components present in BOTH runs whose license disappeared.
	// A component the candidate never reported is a coverage change, not a license
	// loss, and is counted separately in onlyInBaseline. Keep the two apart: syft
	// legitimately omits thousands of cdxgen filesystem entries.
	const lost = [];
	for (const [purl, before] of baseline.byPurl) {
		const after = candidate.byPurl.get(purl);
		if (!after) continue;
		if (licenseOf(before) !== null && licenseOf(after) === null) {
			lost.push({ purl, was: licenseOf(before) });
		}
	}

	console.log(`  components only in ${baseline.variant}: ${onlyInBaseline.length}`);
	console.log(`  components only in ${candidate.variant}: ${onlyInCandidate.length}`);
	console.log(`  licenses LOST by ${candidate.variant}:     ${lost.length}`);
	for (const l of lost.slice(0, 25)) console.log(`    ${l.purl} — was ${l.was}`);
	if (lost.length > 25) console.log(`    … and ${lost.length - 25} more`);

	return { onlyInBaseline, onlyInCandidate, lost };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));

	for (const v of args.variants) {
		const bin = VARIANTS[v].requires;
		const available = bin.includes('/') ? existsSync(bin) : true;
		if (!available) {
			throw new Error(
				`${v} needs ${bin}\nRun: pnpm install --frozen-lockfile --dir .github/scripts --ignore-workspace`,
			);
		}
	}

	await mkdir(OUT_DIR, { recursive: true });

	console.log(`image: ${args.image}`);
	if (imagePresent(args.image)) {
		console.log('  (already pulled — pull time excluded)');
	} else {
		time('pull', () => run('docker', ['pull', args.image], { quiet: true }));
	}

	const results = [];
	for (const variant of args.variants) results.push(await profile(variant, args.image));

	console.log('\n=== summary ===');
	const widths = [18, 9, 9, 8, 7, 9, 7];
	console.log(
		['variant', 'scan', 'enrich', 'total', 'npm', 'npm+lic', 'gate?']
			.map((h, i) => h.padEnd(widths[i]))
			.join(''),
	);
	for (const r of results) {
		console.log(
			[
				r.variant,
				`${r.seconds.scan.toFixed(1)}s`,
				`${r.seconds.enrich.toFixed(1)}s`,
				String(r.total),
				String(r.npm),
				String(r.npmLicensed),
				r.gatePassed ? 'pass' : `FAIL(${r.gateFailures.length})`,
			]
				.map((v, i) => v.padEnd(widths[i]))
				.join(''),
		);
	}

	for (const r of results.filter((x) => !x.gatePassed)) {
		console.log(`\n  ${r.variant} gate failures:`);
		for (const f of r.gateFailures) console.log(`    ${f}`);
	}

	const [baseline, ...candidates] = results;
	const diffs = candidates.map((c) => ({
		baseline: baseline.variant,
		candidate: c.variant,
		speedup: Number((baseline.seconds.scan / c.seconds.scan).toFixed(2)),
		...compare(baseline, c),
	}));
	for (const d of diffs) console.log(`\n  scan speedup ${d.candidate}: ${d.speedup}x`);

	const reportPath = path.join(OUT_DIR, `${slugify(args.image)}.report.json`);
	await writeFile(
		reportPath,
		`${JSON.stringify(
			{
				image: args.image,
				generatedAt: new Date().toISOString(),
				results: results.map(({ byPurl: _byPurl, ...rest }) => rest),
				diffs,
			},
			null,
			2,
		)}\n`,
	);
	console.log(`\nreport: ${reportPath}`);

	if (!args.keep) {
		for (const r of results) await rm(r.sbomPath, { force: true });
		console.log('(SBOMs removed — pass --keep to retain them)');
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		await main();
	} catch (err) {
		console.error(`\n${err.message}`);
		process.exit(1);
	}
}
