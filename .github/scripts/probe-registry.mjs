#!/usr/bin/env node
// Characterises this runner's path to registry.npmjs.org, to separate a degraded
// egress path from bandwidth division across pnpm's ~50 concurrent metadata
// connections. Both produce identical `Request took Nms` / `error (23)` logs.
//
// Temporary — delete once the install slowdown is root-caused.
import { readFileSync } from 'node:fs';

const REGISTRY = 'https://registry.npmjs.org';
const ACCEPT = {
	abbrev: 'application/vnd.npm.install-v1+json',
	full: 'application/json',
};
// Unset workflow_dispatch inputs arrive as '', which Number() turns into 0 —
// enough to make AbortSignal.timeout(0) abort every request instantly.
const num = (value, fallback) => {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Matches pnpm's fetch-timeout, so a request that would have died in pnpm dies here too.
const TIMEOUT_MS = num(process.env.TIMEOUT_MS, 60_000);
const LOCKFILE = process.env.LOCKFILE || 'pnpm-lock.yaml';
const CTL_BYTES = num(process.env.CTL_BYTES, 20_000_000);

const encode = (name) => name.replace('/', '%2f');
const kbs = (bytes, ms) => (ms > 0 ? bytes / 1024 / (ms / 1000) : 0);

async function timedGet(url, accept) {
	const started = performance.now();
	try {
		const res = await fetch(url, {
			headers: accept ? { accept } : {},
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		// Bytes are post-gunzip: undici strips content-length when it decompresses,
		// so there is no wire figure available here. Packuments gzip ~15x, so these
		// are ~15x the bytes pnpm's logs imply. Fine for comparing runs of this
		// script against each other; do not compare them to a `curl -w` size.
		const body = await res.arrayBuffer();
		const ms = performance.now() - started;
		const ray = res.headers.get('cf-ray') ?? '';
		return {
			ok: res.ok,
			status: res.status,
			ms,
			bytes: body.byteLength,
			pop: ray.includes('-') ? ray.split('-').pop() : '-',
			cache: res.headers.get('cf-cache-status') ?? '-',
			age: res.headers.get('age') ?? '-',
		};
	} catch (err) {
		return { ok: false, status: 0, ms: performance.now() - started, bytes: 0, err: err.name };
	}
}

// Bounded worker pool; `limit` concurrent requests in flight, nothing queued upstream.
async function pool(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (true) {
				const i = next++;
				if (i >= items.length) return;
				results[i] = await fn(items[i]);
			}
		}),
	);
	return results;
}

function samplePackages() {
	const lines = readFileSync(LOCKFILE, 'utf8').split('\n');
	const names = new Set();
	let inPackages = false;
	for (const line of lines) {
		if (/^packages:/.test(line)) { inPackages = true; continue; }
		if (/^[a-z]/.test(line)) inPackages = false;
		if (!inPackages) continue;
		const m = line.match(/^ {2}'?((?:@[^/@']+\/)?[^@'/ ]+)@/);
		if (m) names.add(m[1]);
	}
	// Evenly spaced so the sample spans the whole tree rather than one scope.
	const all = [...names].sort();
	return all.filter((_, i) => i % 13 === 0);
}

const section = (t) => console.log(`\n=== ${t} ===`);
const report = {};

section('Runner identity');
for (const [k, v] of [
	['runner_name', process.env.RUNNER_NAME],
	['runner_arch', process.env.RUNNER_ARCH],
	['cpus', (await import('node:os')).cpus().length],
	['node', process.version],
]) {
	console.log(`${k}=${v ?? 'unknown'}`);
}
try {
	// ASN/org identifies a shared NAT that npm or Cloudflare may be throttling.
	const info = await (await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(15_000) })).json();
	report.egress = { ip: info.ip, org: info.org, city: info.city, country: info.country };
	console.log(`egress=${info.ip} (${info.org}, ${info.city}/${info.country})`);
} catch {
	console.log('egress=lookup failed');
}

// Cloudflare caches the abbreviated and full packuments as separate objects
// (`vary: accept`). minimumReleaseAge makes this repo one of the few clients
// asking for the full variant, so it is likelier to be cold at any given POP —
// a MISS means an origin round-trip per package.
section('Cache status + POP per packument variant');
console.log(
	['PACKAGE'.padEnd(26), 'VARIANT'.padEnd(7), 'POP'.padEnd(5), 'CACHE'.padEnd(9), 'AGE'.padEnd(7), 'DEC-KB'.padStart(8), 'MS'.padStart(9)].join(' '),
);
report.variants = [];
for (const pkg of ['storybook', '@storybook/vue3-vite', '@storybook/builder-vite', 'eslint-plugin-storybook', 'vue', 'typescript']) {
	for (const variant of ['abbrev', 'full']) {
		const r = await timedGet(`${REGISTRY}/${encode(pkg)}`, ACCEPT[variant]);
		report.variants.push({ pkg, variant, ...r });
		console.log(
			[
				pkg.padEnd(26),
				variant.padEnd(7),
				String(r.pop ?? '-').padEnd(5),
				String(r.cache ?? '-').padEnd(9),
				String(r.age ?? '-').padEnd(7),
				(r.bytes / 1024).toFixed(0).padStart(8),
				r.ms.toFixed(0).padStart(9),
			].join(' ') + (r.ok ? '' : `  !! ${r.err ?? `http ${r.status}`}`),
		);
	}
}

// The discriminator. The same packages at every level, so total bytes are identical
// and only parallelism varies — package-size variance would otherwise swamp the
// signal. Everything popular is a CDN HIT, so re-requesting does not skew levels.
//   aggregate scales with parallelism  -> the pipe is not the ceiling
//   aggregate plateaus                 -> the pipe is the ceiling, concurrency divides it
//   aggregate low even at par=1        -> the path itself is degraded
section('Full-variant throughput vs parallelism');
const pkgs = samplePackages();
console.log(`sampled ${pkgs.length} packages from ${LOCKFILE}`);
const REQS = num(process.env.REQS, 16);
console.log(['PAR'.padEnd(5), 'OK'.padStart(4), 'FAIL'.padStart(5), 'WALL(s)'.padStart(9), 'AGG(KB/s)'.padStart(11), 'PER-REQ(KB/s)'.padStart(14)].join(' '));
report.sweep = [];
for (const par of [1, 4, REQS, 50]) {
	// par=50 mirrors pnpm's actual fan-out rather than comparing against the others.
	const count = par === 50 ? 50 : REQS;
	const slice = pkgs.slice(0, count);
	if (slice.length < count) { console.log(`(not enough packages for par=${par})`); break; }
	const started = performance.now();
	const rs = await pool(slice, par, (name) => timedGet(`${REGISTRY}/${encode(name)}`, ACCEPT.full));
	const wall = performance.now() - started;
	const ok = rs.filter((r) => r.ok);
	const bytes = ok.reduce((a, r) => a + r.bytes, 0);
	const perReq = ok.length ? ok.reduce((a, r) => a + kbs(r.bytes, r.ms), 0) / ok.length : 0;
	const row = { par, reqs: count, ok: ok.length, fail: rs.length - ok.length, wallMs: wall, aggKbs: kbs(bytes, wall), perReqKbs: perReq };
	report.sweep.push(row);
	console.log(
		[String(par).padEnd(5), String(ok.length).padStart(4), String(row.fail).padStart(5), (wall / 1000).toFixed(2).padStart(9), row.aggKbs.toFixed(1).padStart(11), perReq.toFixed(1).padStart(14)].join(' '),
	);
}

// npm sits behind Cloudflare too, so a slow control points at egress rather than
// anything npm- or packument-specific.
section('Control: non-registry throughput');
report.control = [];
for (const par of [1, 16]) {
	const started = performance.now();
	const rs = await pool(Array.from({ length: par }, (_, i) => i), par, () =>
		timedGet(`https://speed.cloudflare.com/__down?bytes=${CTL_BYTES}`, undefined),
	);
	const wall = performance.now() - started;
	const bytes = rs.filter((r) => r.ok).reduce((a, r) => a + r.bytes, 0);
	report.control.push({ par, aggKbs: kbs(bytes, wall) });
	console.log(`par=${String(par).padEnd(3)} agg=${kbs(bytes, wall).toFixed(1)} KB/s (${((bytes * 8) / (wall / 1000) / 1e6).toFixed(1)} Mbit/s)`);
}

section('JSON');
console.log(JSON.stringify(report));
