/**
 * Regenerate `examples/manifest.json`, `examples/workflows/*.json`, and
 * `examples/templates.zip` from the cached public-template catalog.
 *
 * The goal is a small, diverse set of high-quality real workflows the builder
 * agent can grep when constructing new ones. Diversity beats raw popularity:
 * we'd rather have one good `webhook + Slack + AI + branching` example than
 * ten of them.
 *
 * Stage 1 — Catalog gate + cheap score (`scoreCatalogEntry`)
 *   For every entry in the cached catalog, drop paid templates, unverified
 *   authors, and oversized workflows. Score survivors on `traction` (log-scaled
 *   views) and `recency` (linear decay from 90→730 days). By default the full
 *   survivor set is used; pass `--candidates=N` to cap the detail-fetch budget
 *   on a cold cache.
 *
 * Stage 2 — Detail fetch + full-rubric score (`scoreDetailedTemplate`)
 *   For each candidate, fetch its detail JSON (cached), re-gate on real node
 *   count + trigger presence, compute its bucket key
 *   `(triggerType, primaryIntegration, hasAI, controlFlowKind)`, and score on
 *   the full 6-dimension rubric (traction, recency, coverage, aiAgent, clarity,
 *   density). Weights live in `criteria.ts` — `coverage` is the dominant
 *   weight (35) because it drives bucket diversity.
 *
 * Stage 3 — Greedy round-robin pick
 *   Loop until `--target` (default 50) accepted: re-score every remaining
 *   candidate against the *current* `acceptedBuckets` (coverage decays once a
 *   bucket fills), pick the highest scorer, validate it round-trips through
 *   `generateWorkflowCode` + `emitInstanceAi`, accept on success. Validation
 *   failures are logged to `_failures.log` and the candidate is dropped.
 *
 * Stage 3b — Coverage patch for must-cover node types
 *   `MUST_COVER_NODE_TYPES` (Postgres + all langchain vector stores) must each
 *   appear somewhere in the manifest. For any missing type, first scan the
 *   1000-candidate pool; if none has it, fall back to scanning the full
 *   catalog and fetching detail on demand for up to 25 ranked candidates.
 *   This is why the final count usually exceeds `--target`.
 *
 * Stage 4 — Write outputs
 *   Clear `examples/workflows/`, write one JSON per accepted candidate, write
 *   `manifest.json` sorted by score (with the per-dimension breakdown so picks
 *   are reviewable), write `_catalog-snapshot.json`, then pack the workflow
 *   JSONs into `examples/templates.zip`. Only the manifest and the zip are
 *   committed; the unpacked JSONs are gitignored and recreated on demand by
 *   `examples-loader`.
 *
 * Usage:
 *   pnpm regenerate-examples                  # default target 50
 *   pnpm regenerate-examples --target=100     # explicit target
 *   pnpm regenerate-examples --candidates=2000 # cap detail-fetch budget
 */
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

import { generateWorkflowCode, emitInstanceAi } from '../src/codegen';
import {
	bucketKey,
	bucketKeyToString,
	mechanicalGateCatalog,
	mechanicalGateDetail,
	scoreCatalogEntry,
	scoreDetailedTemplate,
	type BucketKey,
	type ScoreResult,
} from './criteria';
import {
	fetchDetail,
	loadCachedCatalog,
	type CatalogEntry,
	type DetailResponse,
} from './fetch-templates';

const EXAMPLES_DIR = path.resolve(__dirname, '../examples');
const WORKFLOWS_DIR = path.join(EXAMPLES_DIR, 'workflows');
const MANIFEST_PATH = path.join(EXAMPLES_DIR, 'manifest.json');
const ZIP_PATH = path.join(EXAMPLES_DIR, 'templates.zip');
const SNAPSHOT_PATH = path.join(EXAMPLES_DIR, '_catalog-snapshot.json');
const FAILURES_LOG = path.join(EXAMPLES_DIR, '_failures.log');

const DEFAULT_TARGET = 50;
// No cap by default — process the full catalog. Detail JSONs are cached on
// disk in `examples/_raw/`, so warm runs are cheap. Pass `--candidates=N` to
// bound the detail-fetch budget on a cold cache.
const DEFAULT_CANDIDATES = Infinity;

/**
 * Popular catalog node types that must be represented in the manifest. After
 * the main bucket-pick loop, any of these missing from the manifest gets a
 * coverage patch: we force-include the highest-scoring eligible candidate
 * containing that type. Extends the manifest beyond `target`.
 *
 * If a must-cover type's candidates didn't make the top-K catalog cohort, the
 * patch step falls back to fetching detail for the type's highest-scoring
 * catalog entries on demand.
 */
const MUST_COVER_NODE_TYPES = [
	'n8n-nodes-base.postgres',
	'@n8n/n8n-nodes-langchain.vectorStorePinecone',
	'@n8n/n8n-nodes-langchain.vectorStoreSupabase',
	'@n8n/n8n-nodes-langchain.vectorStoreQdrant',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	'@n8n/n8n-nodes-langchain.vectorStorePGVector',
	'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
	'@n8n/n8n-nodes-langchain.vectorStoreWeaviate',
	'@n8n/n8n-nodes-langchain.vectorStoreMilvus',
	'@n8n/n8n-nodes-langchain.vectorStoreRedis',
] as const;

interface CliArgs {
	target: number;
	candidates: number;
}

interface ManifestEntry {
	id: number;
	slug: string;
	name: string;
	description: string;
	nodes: string[];
	tags: string[];
	triggerType: string;
	hasAI: boolean;
	score: number;
	scoreBreakdown: ScoreResult['breakdown'];
	source: string;
	author: string;
	success: true;
}

interface SnapshotEntry {
	id: number;
	name: string;
	score: number;
	createdAt: string;
	totalViews: number;
	picked: boolean;
	dropReason?: string;
}

function parseArgs(): CliArgs {
	const args = { target: DEFAULT_TARGET, candidates: DEFAULT_CANDIDATES };
	for (const a of process.argv.slice(2)) {
		const [k, v] = a.split('=');
		if (k === '--target') args.target = Number(v);
		else if (k === '--candidates') args.candidates = Number(v);
	}
	return args;
}

function ensureDirs() {
	for (const dir of [EXAMPLES_DIR, WORKFLOWS_DIR]) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}
}

function clearFailuresLog() {
	if (fs.existsSync(FAILURES_LOG)) fs.unlinkSync(FAILURES_LOG);
}

function logFailure(id: number, name: string, reason: string) {
	fs.appendFileSync(FAILURES_LOG, `${id} | ${name} | ${reason}\n`);
}

function makeSlug(id: number, name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 60);
	return `${base || 'workflow'}-${id}`;
}

function detailToWorkflowJson(detail: DetailResponse) {
	const attrs = detail.data.attributes;
	return {
		id: `wf-${detail.data.id}`,
		name: attrs.name,
		nodes: attrs.workflow.nodes,
		connections: attrs.workflow.connections,
		settings: attrs.workflow.settings ?? {},
		pinData: attrs.workflow.pinData ?? {},
	};
}

function buildTags(detail: DetailResponse, key: BucketKey): string[] {
	const tags: string[] = [`trigger:${key.triggerType}`];
	if (key.hasAI) tags.push('ai');
	if (key.primaryIntegration && key.primaryIntegration !== 'none') {
		tags.push(`integration:${key.primaryIntegration}`);
	}
	return tags;
}

function uniqueNodeTypes(detail: DetailResponse): string[] {
	const seen = new Set<string>();
	for (const node of detail.data.attributes.workflow.nodes ?? []) {
		const type = String(node.type ?? '');
		if (type) seen.add(type);
	}
	return Array.from(seen);
}

function validateRoundtrip(detail: DetailResponse): { ok: true } | { ok: false; reason: string } {
	const json = detailToWorkflowJson(detail);
	let firstPass: string;
	try {
		firstPass = generateWorkflowCode(json);
	} catch (error) {
		return { ok: false, reason: `codegen threw: ${(error as Error).message}` };
	}
	if (!firstPass || firstPass.length === 0) {
		return { ok: false, reason: 'codegen produced empty output' };
	}
	try {
		const wrapped = emitInstanceAi(json);
		if (!wrapped.includes("from '@n8n/workflow-sdk'")) {
			return { ok: false, reason: 'emitInstanceAi produced output without SDK import' };
		}
	} catch (error) {
		return { ok: false, reason: `emitInstanceAi threw: ${(error as Error).message}` };
	}
	return { ok: true };
}

interface ScoredCandidate {
	entry: CatalogEntry;
	detail: DetailResponse;
	bucket: BucketKey;
	bucketStr: string;
	scoreAtPick: ScoreResult;
}

async function main() {
	const args = parseArgs();
	ensureDirs();
	clearFailuresLog();

	const candidatesLabel = Number.isFinite(args.candidates) ? args.candidates : 'all';
	console.log(`Regenerating examples (target=${args.target}, candidates=${candidatesLabel})\n`);

	// Stage 1: catalog-stage filter and score
	const catalog = loadCachedCatalog();
	console.log(`Loaded ${catalog.length} catalog entries`);

	const snapshot: SnapshotEntry[] = [];
	const survivors: Array<{ entry: CatalogEntry; score: number }> = [];

	for (const entry of catalog) {
		const gate = mechanicalGateCatalog(entry);
		if (!gate.ok) {
			snapshot.push({
				id: entry.id,
				name: entry.name,
				score: 0,
				createdAt: entry.createdAt,
				totalViews: entry.totalViews,
				picked: false,
				dropReason: gate.reason,
			});
			continue;
		}
		const s = scoreCatalogEntry(entry);
		survivors.push({ entry, score: s.total });
		snapshot.push({
			id: entry.id,
			name: entry.name,
			score: s.total,
			createdAt: entry.createdAt,
			totalViews: entry.totalViews,
			picked: false,
		});
	}

	survivors.sort((a, b) => b.score - a.score);
	const topCandidates = survivors.slice(0, args.candidates);
	console.log(
		`Stage 1: ${survivors.length} catalog survivors → top ${topCandidates.length} for detail fetch`,
	);

	// Stage 2: fetch detail and full-rubric score
	const scored: ScoredCandidate[] = [];
	let detailFetched = 0;
	let detailDropped = 0;
	let detailFailed = 0;

	for (let i = 0; i < topCandidates.length; i++) {
		const { entry } = topCandidates[i];
		if (i % 50 === 0) {
			console.log(`  detail fetch ${i}/${topCandidates.length}...`);
		}
		const detail = await fetchDetail(entry.id);
		if (!detail) {
			detailFailed++;
			logFailure(entry.id, entry.name, 'detail fetch failed');
			continue;
		}
		detailFetched++;
		const gate = mechanicalGateDetail(detail);
		if (!gate.ok) {
			detailDropped++;
			logFailure(entry.id, entry.name, `detail gate: ${gate.reason}`);
			continue;
		}
		const bucket = bucketKey(detail);
		// score with empty running set; we'll re-score during bucket pick
		const s = scoreDetailedTemplate(entry, detail, []);
		scored.push({
			entry,
			detail,
			bucket,
			bucketStr: bucketKeyToString(bucket),
			scoreAtPick: s,
		});
	}

	console.log(
		`Stage 2: detail fetched=${detailFetched}, dropped=${detailDropped}, failed=${detailFailed}, scored=${scored.length}`,
	);

	// Stage 3: greedy round-robin pick by bucket count, recomputing coverage
	const accepted: ScoredCandidate[] = [];
	const acceptedBuckets: BucketKey[] = [];

	while (accepted.length < args.target) {
		let best: { idx: number; score: number; cand: ScoredCandidate } | null = null;
		for (let i = 0; i < scored.length; i++) {
			const cand = scored[i];
			if (accepted.includes(cand)) continue;
			const fresh = scoreDetailedTemplate(cand.entry, cand.detail, acceptedBuckets);
			if (best === null || fresh.total > best.score) {
				best = { idx: i, score: fresh.total, cand };
			}
		}
		if (best === null) break;

		// Validate before accepting
		const valid = validateRoundtrip(best.cand.detail);
		if (!valid.ok) {
			scored.splice(best.idx, 1);
			logFailure(best.cand.entry.id, best.cand.entry.name, `validation: ${valid.reason}`);
			continue;
		}

		const fresh = scoreDetailedTemplate(best.cand.entry, best.cand.detail, acceptedBuckets);
		best.cand.scoreAtPick = fresh;
		accepted.push(best.cand);
		acceptedBuckets.push(best.cand.bucket);
		scored.splice(best.idx, 1);
	}

	console.log(`Stage 3: accepted ${accepted.length} workflows after validation`);

	// Stage 3b: coverage patch — force-include must-cover node types missing from accepted
	const acceptedTypes = new Set<string>();
	for (const cand of accepted) {
		for (const node of cand.detail.data.attributes.workflow.nodes ?? []) {
			acceptedTypes.add(String(node.type ?? ''));
		}
	}
	let patchedCount = 0;
	for (const mustType of MUST_COVER_NODE_TYPES) {
		if (acceptedTypes.has(mustType)) continue;

		// First-tier: try scored candidates already in our pool.
		const fromScored = scored
			.map((cand) => {
				const types = (cand.detail.data.attributes.workflow.nodes ?? []).map((n) =>
					String(n.type ?? ''),
				);
				if (!types.includes(mustType)) return null;
				const fresh = scoreDetailedTemplate(cand.entry, cand.detail, acceptedBuckets);
				return { cand, score: fresh.total };
			})
			.filter((x): x is { cand: ScoredCandidate; score: number } => x !== null)
			.sort((a, b) => b.score - a.score);

		let added = false;
		for (const { cand, score } of fromScored) {
			const valid = validateRoundtrip(cand.detail);
			if (!valid.ok) {
				logFailure(cand.entry.id, cand.entry.name, `coverage-patch validation: ${valid.reason}`);
				continue;
			}
			const fresh = scoreDetailedTemplate(cand.entry, cand.detail, acceptedBuckets);
			cand.scoreAtPick = fresh;
			accepted.push(cand);
			acceptedBuckets.push(cand.bucket);
			scored.splice(scored.indexOf(cand), 1);
			for (const node of cand.detail.data.attributes.workflow.nodes ?? []) {
				acceptedTypes.add(String(node.type ?? ''));
			}
			console.log(
				`  coverage patch (+1 for ${mustType}): id=${cand.entry.id} score=${score.toFixed(2)} ${cand.entry.name.slice(0, 60)}`,
			);
			patchedCount++;
			added = true;
			break;
		}
		if (added) continue;

		// Second-tier: type wasn't in the top-K candidate pool. Scan the full
		// catalog for entries whose sparse list contains the type, fetch detail
		// on demand (cached after first hit), and accept the first that passes
		// gate + roundtrip. Ranked by catalog-stage score so we try the
		// strongest candidate first.
		const catalogCandidates = catalog
			.filter((entry) => (entry.nodes ?? []).some((n) => n.name === mustType))
			.filter((entry) => mechanicalGateCatalog(entry).ok)
			.map((entry) => ({ entry, score: scoreCatalogEntry(entry).total }))
			.sort((a, b) => b.score - a.score)
			.slice(0, 25); // bounded — don't go fetching the whole tail

		for (const { entry } of catalogCandidates) {
			const detail = await fetchDetail(entry.id);
			if (!detail) continue;
			if (!mechanicalGateDetail(detail).ok) continue;
			// Catalog `entry.nodes` is a sparse list that can drift from the
			// real workflow JSON; re-verify against the detail before accepting.
			const detailHasType = (detail.data.attributes.workflow.nodes ?? []).some(
				(n) => String(n.type ?? '') === mustType,
			);
			if (!detailHasType) continue;
			const valid = validateRoundtrip(detail);
			if (!valid.ok) {
				logFailure(entry.id, entry.name, `coverage-patch fallback validation: ${valid.reason}`);
				continue;
			}
			const bucket = bucketKey(detail);
			const fresh = scoreDetailedTemplate(entry, detail, acceptedBuckets);
			const cand: ScoredCandidate = {
				entry,
				detail,
				bucket,
				bucketStr: bucketKeyToString(bucket),
				scoreAtPick: fresh,
			};
			accepted.push(cand);
			acceptedBuckets.push(bucket);
			for (const node of detail.data.attributes.workflow.nodes ?? []) {
				acceptedTypes.add(String(node.type ?? ''));
			}
			console.log(
				`  coverage patch fallback (+1 for ${mustType}): id=${entry.id} score=${fresh.total.toFixed(2)} ${entry.name.slice(0, 60)}`,
			);
			patchedCount++;
			break;
		}
	}
	if (patchedCount > 0) {
		console.log(`Stage 3b: coverage patch added ${patchedCount} workflows`);
	}
	console.log();

	// Stage 4: write workflows + manifest
	// Clear existing committed workflow files
	for (const f of fs.readdirSync(WORKFLOWS_DIR)) {
		if (f.endsWith('.json')) fs.unlinkSync(path.join(WORKFLOWS_DIR, f));
	}

	const manifestEntries: ManifestEntry[] = [];
	const slugSet = new Set<string>();
	for (const cand of accepted) {
		const baseSlug = makeSlug(cand.entry.id, cand.entry.name);
		let slug = baseSlug;
		let suffix = 2;
		while (slugSet.has(slug)) slug = `${baseSlug}-${suffix++}`;
		slugSet.add(slug);

		const wfJson = detailToWorkflowJson(cand.detail);
		fs.writeFileSync(path.join(WORKFLOWS_DIR, `${slug}.json`), JSON.stringify(wfJson, null, 2));

		const tags = buildTags(cand.detail, cand.bucket);
		manifestEntries.push({
			id: cand.entry.id,
			slug,
			name: cand.entry.name,
			description: cand.detail.data.attributes.description ?? '',
			nodes: uniqueNodeTypes(cand.detail),
			tags,
			triggerType: cand.bucket.triggerType,
			hasAI: cand.bucket.hasAI,
			score: Number(cand.scoreAtPick.total.toFixed(2)),
			scoreBreakdown: {
				traction: Number(cand.scoreAtPick.breakdown.traction.toFixed(3)),
				recency: Number(cand.scoreAtPick.breakdown.recency.toFixed(3)),
				coverage: Number(cand.scoreAtPick.breakdown.coverage.toFixed(3)),
				aiAgent: Number(cand.scoreAtPick.breakdown.aiAgent.toFixed(3)),
				clarity: Number(cand.scoreAtPick.breakdown.clarity.toFixed(3)),
				density: Number(cand.scoreAtPick.breakdown.density.toFixed(3)),
			},
			source: `https://n8n.io/workflows/${cand.entry.id}`,
			author: cand.detail.data.attributes.username || cand.entry.user.username || 'unknown',
			success: true,
		});

		// Mark in snapshot
		const snap = snapshot.find((s) => s.id === cand.entry.id);
		if (snap) snap.picked = true;
	}

	manifestEntries.sort((a, b) => b.score - a.score);
	fs.writeFileSync(
		MANIFEST_PATH,
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				workflows: manifestEntries,
			},
			null,
			2,
		),
	);

	fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

	// Pack workflow JSONs into the committed zip so the unpacked dir can be gitignored.
	const zip = new AdmZip();
	for (const entry of manifestEntries) {
		zip.addLocalFile(path.join(WORKFLOWS_DIR, `${entry.slug}.json`));
	}
	zip.writeZip(ZIP_PATH);

	// Bucket distribution report
	const bucketDistribution = new Map<string, number>();
	for (const e of manifestEntries) {
		const k = `${e.triggerType}|${e.hasAI ? 'ai' : 'noai'}`;
		bucketDistribution.set(k, (bucketDistribution.get(k) ?? 0) + 1);
	}
	console.log('Bucket distribution (triggerType × hasAI):');
	for (const [k, v] of Array.from(bucketDistribution.entries()).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${v.toString().padStart(3)} | ${k}`);
	}
	console.log();

	console.log(
		`Wrote ${manifestEntries.length} entries to ${path.relative(process.cwd(), MANIFEST_PATH)}`,
	);
	console.log(`Wrote workflow JSONs to ${path.relative(process.cwd(), WORKFLOWS_DIR)}/`);
	console.log(`Wrote zip to ${path.relative(process.cwd(), ZIP_PATH)}`);
	console.log(`Catalog snapshot: ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
	if (fs.existsSync(FAILURES_LOG)) {
		const failuresCount = fs.readFileSync(FAILURES_LOG, 'utf-8').split('\n').filter(Boolean).length;
		console.log(`Failures (${failuresCount}): ${path.relative(process.cwd(), FAILURES_LOG)}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
