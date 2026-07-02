/**
 * Memory baseline harness for node-type description retention (Phase 0).
 *
 * Measures how much heap each holder of full INodeTypeDescription graphs
 * retains, ahead of the shared disk-backed store refactor:
 *
 *   Copy A — InstanceAiAdapterService.nodesCache
 *            (jsonParse of staticCacheDir/types/nodes.json, 5-min TTL)
 *   Copy B — NodeCatalogService.descriptionsById (+ lean NodeTypeParser)
 *   Copy C — legacy AiWorkflowBuilderService.nodeTypes (via collectTypes())
 *   Leak   — LoadNodesAndCredentials.types staying resident because
 *            postProcessLoaders() ran right before collectTypes(), so
 *            collectTypes() skips its release step ("release defeat").
 *
 * Run against built dist artifacts, one scenario per process:
 *
 *   node --expose-gc scripts/memory-baseline/memory-baseline.mjs <scenario>
 *
 * Scenarios: baseline | copyA | copyB | copyC | release-defeat | all
 * Use run-all.mjs to run every scenario and aggregate results.
 *
 * Copies B, C and the release-defeat path run the real service code from
 * dist. Copy A replicates the adapter's getNodesFromCache/listSearchable
 * logic inline because InstanceAiAdapterService needs the full DI graph
 * (DB repositories etc.); the measured work (readFile + jsonParse + array
 * map) is byte-for-byte the same code path.
 *
 * Set MEMORY_BASELINE_SNAPSHOTS=<dir> to also write v8 heap snapshots at
 * key checkpoints (large files, slow).
 */

import { mkdirSync, mkdtempSync, statSync, writeFileSync, createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import v8 from 'node:v8';
import { fileURLToPath } from 'node:url';

if (typeof global.gc !== 'function') {
	console.error('Run with --expose-gc');
	process.exit(1);
}

const scenario = process.argv[2] ?? 'baseline';
const SCENARIOS = ['baseline', 'copyA', 'copyB', 'copyC', 'release-defeat', 'all'];
if (!SCENARIOS.includes(scenario)) {
	console.error(`Unknown scenario '${scenario}'. One of: ${SCENARIOS.join(', ')}`);
	process.exit(1);
}

// Isolated user folder so the harness never touches a real ~/.n8n
if (!process.env.N8N_USER_FOLDER) {
	process.env.N8N_USER_FOLDER = mkdtempSync(path.join(os.tmpdir(), 'n8n-memory-baseline-'));
}
process.env.N8N_ENCRYPTION_KEY ??= 'memory-baseline-harness';
process.env.N8N_LOG_LEVEL ??= 'silent';
process.env.N8N_RUNNERS_ENABLED ??= 'false';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// module graph loaded up-front so it never pollutes checkpoint deltas
// ---------------------------------------------------------------------------
require('reflect-metadata');
const { Container } = require('@n8n/di');
const { jsonParse } = require('n8n-workflow');
const { LoadNodesAndCredentials } = require(
	path.join(__dirname, '../../dist/load-nodes-and-credentials'),
);
const { NodeCatalogService } = require(
	path.join(__dirname, '../../dist/node-catalog/node-catalog.service'),
);
const { AiWorkflowBuilderService } = require('@n8n/ai-workflow-builder');
// dynamically imported inside NodeCatalogService.doInitialize — preload
require('@n8n/ai-utilities/node-catalog');
require('@n8n/workflow-sdk');

// ---------------------------------------------------------------------------
// measurement helpers
// ---------------------------------------------------------------------------
const rows = [];
const mb = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
const snapshotDir = process.env.MEMORY_BASELINE_SNAPSHOTS;

async function settle() {
	await new Promise((resolve) => setImmediate(resolve));
}

/** Full GC (twice, with a macrotask in between) then record memory usage. */
async function checkpoint(name, extra = {}) {
	for (let i = 0; i < 3; i++) {
		global.gc();
		await settle();
	}
	const m = process.memoryUsage();
	const row = {
		scenario,
		name,
		heapUsedMB: mb(m.heapUsed),
		externalMB: mb(m.external),
		rssMB: mb(m.rss),
		...extra,
	};
	rows.push(row);
	console.error(`  [${scenario}] ${name}: heapUsed=${row.heapUsedMB} MB`);
	if (snapshotDir && extra.snapshot) {
		mkdirSync(snapshotDir, { recursive: true });
		v8.writeHeapSnapshot(path.join(snapshotDir, `${scenario}-${name}.heapsnapshot`));
	}
	return row;
}

// ---------------------------------------------------------------------------
// production-code replicas (only where the real service cannot be constructed
// outside the full DI graph)
// ---------------------------------------------------------------------------

/**
 * Same line format as FrontendService.writeStaticJSON (frontend.service.ts),
 * which produces the staticCacheDir/types/nodes.json Copy A parses.
 */
async function writeStaticNodesJson(filePath, nodes) {
	mkdirSync(path.dirname(filePath), { recursive: true });
	const stream = createWriteStream(filePath, 'utf-8');
	await new Promise((resolve, reject) => {
		stream.on('error', reject);
		stream.on('finish', resolve);
		stream.write('[\n');
		nodes.forEach((entry, index) => {
			stream.write(JSON.stringify(entry));
			if (index !== nodes.length - 1) stream.write(',');
			stream.write('\n');
		});
		stream.write(']\n');
		stream.end();
	});
}

/** Replica of InstanceAiAdapterService.getNodesFromCache (Copy A). */
async function parseNodesJson(filePath) {
	const json = await readFile(filePath, 'utf-8');
	return jsonParse(json);
}

/** Replica of the adapter's listSearchable() projection (per-call mapping). */
function mapToSearchable(nodes) {
	const toStringArray = (value) => {
		if (typeof value === 'string') return value;
		return value.map((v) => (typeof v === 'string' ? v : v.type));
	};
	return nodes.map((n) => {
		const result = {
			name: n.name,
			displayName: n.displayName,
			description: n.description ?? '',
			version: n.version,
			inputs: toStringArray(n.inputs),
			outputs: toStringArray(n.outputs),
		};
		if (n.codex?.alias) result.codex = { alias: n.codex.alias };
		if (n.builderHint) result.builderHint = { ...n.builderHint };
		return result;
	});
}

// ---------------------------------------------------------------------------
// scenario steps
// ---------------------------------------------------------------------------

async function bootAndRelease() {
	await checkpoint('boot');

	const lnc = Container.get(LoadNodesAndCredentials);
	const t0 = Date.now();
	await lnc.init();
	await checkpoint('after-init', {
		ms: Date.now() - t0,
		nodeTypes: lnc.types.nodes.length,
		credentialTypes: lnc.types.credentials.length,
	});

	// what start.ts does after startup
	lnc.releaseTypes();
	const steady = await checkpoint('steady-state (post releaseTypes)');
	return { lnc, steady };
}

/**
 * Produce staticCacheDir/types/nodes.json the way FrontendService.generateTypes
 * does (collectTypes → line-formatted JSON). Run from the released state, so
 * collectTypes() correctly re-releases afterwards — this doubles as proof that
 * release semantics work when postProcessLoaders() was NOT called beforehand.
 */
async function writeArtifact(lnc) {
	const { staticCacheDir } = Container.get(require('n8n-core').InstanceSettings);
	const filePath = path.join(staticCacheDir, 'types/nodes.json');
	const t0 = Date.now();
	// inner scope so the collected graph is unreachable by checkpoint time
	await (async () => {
		const { nodes } = await lnc.collectTypes();
		await writeStaticNodesJson(filePath, nodes);
	})();
	await checkpoint('artifact-written (transient collectTypes)', {
		ms: Date.now() - t0,
		artifactSizeMB: mb(statSync(filePath).size),
		lncTypesResident: lnc.types.nodes.length,
	});
	return filePath;
}

async function measureCopyA(lnc, filePath) {
	const t0 = Date.now();
	let retained = await parseNodesJson(filePath);
	await checkpoint('copyA-retained (nodesCache)', {
		ms: Date.now() - t0,
		nodes: retained.length,
		snapshot: true,
	});

	let searchable = mapToSearchable(retained);
	await checkpoint('copyA-searchable-retained (listSearchable projection)', {
		nodes: searchable.length,
	});

	searchable = null;
	await checkpoint('copyA-searchable-dropped');
	return {
		drop: () => {
			retained = null;
		},
		get: () => retained,
	};
}

async function measureCopyB(lnc) {
	const catalog = Container.get(NodeCatalogService);
	const t0 = Date.now();
	await catalog.initialize();
	await checkpoint('copyB-initialized (NodeCatalogService)', {
		ms: Date.now() - t0,
		lncTypesResident: lnc.types.nodes.length,
		snapshot: true,
	});
	return catalog;
}

async function measureCopyC(lnc) {
	// replica of WorkflowBuilderService.initializeService (lines 154-170):
	// the pre-emptive postProcessLoaders() is what defeats collectTypes()'s release
	const t0 = Date.now();
	await lnc.postProcessLoaders();
	await checkpoint('copyC-postProcessLoaders', {
		ms: Date.now() - t0,
		lncTypesResident: lnc.types.nodes.length,
	});

	const t1 = Date.now();
	const { nodes } = await lnc.collectTypes();
	const builder = new AiWorkflowBuilderService(nodes);
	await checkpoint('copyC-initialized (AiWorkflowBuilderService)', {
		ms: Date.now() - t1,
		lncTypesResident: lnc.types.nodes.length,
		snapshot: true,
	});
	return builder;
}

/** Manually undo the defeated release to see what LoadNodesAndCredentials.types alone pins. */
async function measureManualRelease(lnc, label) {
	lnc.releaseTypes();
	await checkpoint(`${label} (after manual releaseTypes)`, {
		lncTypesResident: lnc.types.nodes.length,
	});
}

// ---------------------------------------------------------------------------
// scenarios
// ---------------------------------------------------------------------------

const scenarios = {
	/** Boot + release only: the steady state of a main that never uses AI features. */
	async baseline() {
		const { lnc } = await bootAndRelease();
		await writeArtifact(lnc);
	},

	async copyA() {
		const { lnc } = await bootAndRelease();
		const filePath = await writeArtifact(lnc);
		const copyA = await measureCopyA(lnc, filePath);
		copyA.drop();
		await checkpoint('copyA-dropped');
	},

	async copyB() {
		const { lnc } = await bootAndRelease();
		// keep the service reachable while later checkpoints run
		globalThis.__retain_copyB = await measureCopyB(lnc);
		await measureManualRelease(lnc, 'copyB');
	},

	async copyC() {
		const { lnc } = await bootAndRelease();
		globalThis.__retain_copyC = await measureCopyC(lnc);
		await measureManualRelease(lnc, 'copyC');
		globalThis.__retain_copyC = null;
		await checkpoint('copyC-dropped (builder unreachable)', {
			lncTypesResident: lnc.types.nodes.length,
		});
	},

	/**
	 * Isolate latent bug #1: postProcessLoaders() immediately before
	 * collectTypes() leaves LoadNodesAndCredentials.types resident even when
	 * the caller retains nothing.
	 */
	async 'release-defeat'() {
		const { lnc } = await bootAndRelease();

		await lnc.postProcessLoaders();
		let types = await lnc.collectTypes();
		const kept = types.nodes.length > 0 && lnc.types.nodes.length > 0;
		types = null;
		await checkpoint('after postProcessLoaders+collectTypes, caller retains nothing', {
			releaseDefeated: kept,
			lncTypesResident: lnc.types.nodes.length,
			snapshot: true,
		});
		await measureManualRelease(lnc, 'release-defeat');

		// contrast: collectTypes() from a released state cleans up after itself
		let types2 = await lnc.collectTypes();
		types2 = null;
		await checkpoint('after collectTypes from released state (no defeat)', {
			lncTypesResident: lnc.types.nodes.length,
		});
	},

	/** Realistic combined steady state with all three holders warm (A, then B, then C). */
	async all() {
		const { lnc } = await bootAndRelease();
		const filePath = await writeArtifact(lnc);

		const copyA = await measureCopyA(lnc, filePath);
		globalThis.__retain_copyB = await measureCopyB(lnc);
		globalThis.__retain_copyC = await measureCopyC(lnc);
		await checkpoint('all-warm (A+B+C resident)', {
			lncTypesResident: lnc.types.nodes.length,
			snapshot: true,
		});

		await measureManualRelease(lnc, 'all');
		copyA.drop();
		await checkpoint('all after dropping copyA');
	},
};

// ---------------------------------------------------------------------------

try {
	await scenarios[scenario]();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
}

console.log(`RESULT_JSON:${JSON.stringify(rows)}`);
// n8n dist modules start timers (e.g. instance settings watchers); exit explicitly
process.exit(process.exitCode ?? 0);
