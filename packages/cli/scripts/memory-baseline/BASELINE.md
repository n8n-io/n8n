# Node-type description memory baseline (Phase 0)

Measured heap cost of every holder of full `INodeTypeDescription` graphs on the
backend, ahead of the shared disk-backed store refactor. Companion to the
node-type memory analysis plan (Copies A/B/C + the `collectTypes()`
release-defeat bug).

- **Copy A** — `InstanceAiAdapterService.nodesCache` (`jsonParse` of
  `staticCacheDir/types/nodes.json`, 5-min TTL)
- **Copy B** — `NodeCatalogService.descriptionsById` + lean `NodeTypeParser`
- **Copy C** — legacy `AiWorkflowBuilderService.nodeTypes` (via `collectTypes()`)
- **Release defeat** — `postProcessLoaders()` called immediately before
  `collectTypes()` makes `collectTypes()` see `needsReload === false` and skip
  its release, leaving `LoadNodesAndCredentials.types` resident.

## How to run

```bash
pnpm build   # dist artifacts required (cli + node packages)
cd packages/cli
node scripts/memory-baseline/run-all.mjs --out=/tmp/baseline-results.json

# single scenario
node --expose-gc scripts/memory-baseline/memory-baseline.mjs copyB

# with v8 heap snapshots at key checkpoints (large files)
MEMORY_BASELINE_SNAPSHOTS=/tmp/snapshots node --expose-gc scripts/memory-baseline/memory-baseline.mjs all
```

## Methodology

- One process per scenario (spawned by `run-all.mjs`) so scenarios cannot
  pollute each other's heap. `--expose-gc`; at every checkpoint the harness runs
  `global.gc()` three times with macrotask yields in between, then records
  `process.memoryUsage()`.
- All modules (cli dist, `@n8n/ai-workflow-builder`, `@n8n/ai-utilities`) are
  loaded up-front, so checkpoint deltas measure retained *data*, not module
  graphs.
- Every scenario starts with the real production lifecycle:
  `Container.get(LoadNodesAndCredentials).init()` (real
  `LazyPackageDirectoryLoader` reads of `dist/known/*.json` + `dist/types/*.json`
  for `n8n-nodes-base` and `@n8n/n8n-nodes-langchain`), then `releaseTypes()` —
  exactly what `start.ts` does after startup. Deltas are reported against this
  **steady state**.
- Copy B runs the real `NodeCatalogService.initialize()` from dist. Copy C and
  the release-defeat path run the real `LoadNodesAndCredentials` +
  `AiWorkflowBuilderService` code, replicating the exact call sequence of
  `WorkflowBuilderService.initializeService()` (`postProcessLoaders()` →
  `collectTypes()` → `new AiWorkflowBuilderService(nodes)`).
- Copy A: `InstanceAiAdapterService` cannot be constructed outside the full DI
  graph (DB repositories etc.), so the harness replicates its
  `getNodesFromCache()` (readFile + `jsonParse`) and `listSearchable()`
  projection line-for-line. The `types/nodes.json` artifact is produced with the
  same line format as `FrontendService.writeStaticJSON` from a `collectTypes()`
  snapshot, i.e. the same content the frontend service writes for nodes.
- Retainer attribution is done by delta, not snapshots: after each holder is
  warm, the harness manually calls `releaseTypes()` and/or drops the holder and
  re-measures. (v8 heap snapshots are available behind
  `MEMORY_BASELINE_SNAPSHOTS` for manual retainer inspection of `nodesCache`,
  `descriptionsById`, `parsedNodeTypes`.)
- Environment: Node v22.22.2, linux x64, built dist of this branch;
  895 node types / 440 credential types loaded (base + langchain packages,
  including generated AI-tool variants; no community packages, no module node
  loaders).

## Results

Heap figures are `heapUsed` after full GC, in MB. Δ is against the scenario's
steady state (post-startup `releaseTypes()`).

### Lifecycle reference points (identical across scenarios)

| Checkpoint | heapUsed | Δ vs steady | Notes |
|---|---:|---:|---|
| boot (modules loaded) | 57.5 | | module graph only |
| after `init()` | 100.2 | +33.1 | full types resident during startup (413 ms) |
| **steady state** (post `releaseTypes()`) | **67.1** | 0 | what a non-AI main retains |
| after artifact write (`collectTypes()` from released state) | 67.2 | +0.1 | 15.79 MB `types/nodes.json` written in 338 ms; release semantics work when NOT defeated |

**One full description graph ≈ 33 MB heap.** The on-disk artifact is 15.8 MB;
JS object/string overhead roughly doubles it in heap.

### Copy A — instance-ai adapter `nodesCache`

| Checkpoint | heapUsed | Δ vs steady |
|---|---:|---:|
| `nodesCache` retained (readFile + `jsonParse`, 213 ms) | 99.6 | **+32.5** |
| + `listSearchable()` projection retained | 99.7 | +32.7 |
| projection dropped | 99.6 | +32.5 |
| cache dropped | 67.2 | +0.1 |

- Copy A costs **32.5 MB** and is fully independent (parsed from JSON, shares
  nothing with the loaders). Re-parsed every 5 minutes under use: ~213 ms CPU +
  ~32 MB transient garbage per expiry.
- The per-call `listSearchable()` projection is only **~0.2 MB** — the lean
  shapes are cheap; the recurring full parse is the problem, not the mapping.

### Copy B — `NodeCatalogService`

| Checkpoint | heapUsed | Δ vs steady |
|---|---:|---:|
| `initialize()` done (263 ms) | 102.2 | **+35.1** |
| after manual `releaseTypes()` | 100.9 | +33.8 |

- Copy B costs **35.1 MB**: ~33 MB full graph in `descriptionsById` + ~2 MB
  lean `NodeTypeParser` copy/index.
- `initialize()` leaves `LoadNodesAndCredentials.types` resident
  (`lncTypesResident=895` → release defeated, latent bug #1 confirmed), **but**
  `descriptionsById` indexes the *same* objects, so the defeated release only
  pins an extra ~1.3 MB of container arrays here — the graphs are shared, not
  duplicated.

### Copy C — legacy `AiWorkflowBuilderService`

| Checkpoint | heapUsed | Δ vs steady |
|---|---:|---:|
| after pre-emptive `postProcessLoaders()` (237 ms) | 100.3 | +33.2 |
| after `collectTypes()` + `new AiWorkflowBuilderService(nodes)` (10 ms) | 100.4 | **+33.3** |
| after manual `releaseTypes()` | 98.3 | +31.2 |
| builder dropped | 67.2 | +0.1 |

- Copy C costs **33.3 MB**, but nearly all of it is the graph re-materialized
  by its own pre-emptive `postProcessLoaders()`; the service's filtered array
  (`filterNodeTypes` + `SessionManagerService`) adds only ~0.1 MB of wrappers
  on top because it holds references into the same graph.

### Release-defeat bug in isolation (latent bug #1)

| Checkpoint | heapUsed | Δ vs steady |
|---|---:|---:|
| `postProcessLoaders()` + `collectTypes()`, caller retains **nothing** | 100.3 | **+33.2** |
| after manual `releaseTypes()` | 67.2 | +0.1 |
| `collectTypes()` alone from released state, caller retains nothing | 67.3 | +0.2 |

Confirmed: calling `postProcessLoaders()` right before `collectTypes()` (as
both `node-catalog.service.ts:289` and `ai-workflow-builder.service.ts:154` do)
permanently leaks **~33 MB** even if the caller keeps nothing, while
`collectTypes()` from a released state cleans up after itself perfectly.

### All three warm (realistic combined steady state)

| Checkpoint | heapUsed | Δ vs steady |
|---|---:|---:|
| Copy A retained | 99.6 | +32.5 |
| + Copy B initialized | 133.8 | +66.7 |
| + Copy C initialized (`postProcessLoaders` now only +0.1) | 134.0 | **+66.9** |
| after manual `releaseTypes()` | 132.7 | +65.6 |
| after also dropping Copy A | 101.2 | +34.1 |

Total AI-surface cost with everything warm: **+66.9 MB over steady state**
(process: 67 MB → 134 MB heap, RSS ~264 MB).

## Verdict on the plan's estimates

| Plan estimate | Measured | Verdict |
|---|---|---|
| ~31 MB per full description graph | 32.5–33.3 MB heap per graph | holds (heap); the *file* is only 15.8 MB |
| ~90 MB+ steady state with all copies warm | **66.9 MB** | overestimate — B and C share one graph (see below) |
| `collectTypes()` release-defeat leaks the graph | +33.2 MB with zero consumer retention | confirmed |
| `listSearchable()` remaps 31 MB per call | projection is only ~0.2 MB per call | the *remapping* is cheap; the recurring 32 MB re-parse (5-min TTL) is the real Copy-A cost |

**Surprise contradicting the plan's assumptions:** the plan states "each
`collectTypes()` call after a release rebuilds a fresh object graph, so these
copies share nothing". Measured behavior: once the *first* consumer defeats the
release (bug #1), `LoadNodesAndCredentials.types` and every loader's `types`
stay populated, so subsequent `postProcessLoaders()` calls do **not** re-read
from disk (`ensureTypesLoaded()` no-ops) — they only re-create cheap top-level
wrappers (`{ ...rest, name }`) whose property values point into the *same* deep
graph. Copies B and C (and the leaked `lnc.types`) therefore share one ~33 MB
graph instead of holding three independent ones. The two bugs partially cancel:
fixing the release-defeat *alone* (Phase 2's removal of the pre-emptive
`postProcessLoaders()` calls) would make B and C each materialize genuinely
independent graphs again — steady state would get *worse* (~99 MB) unless the
holders are removed in the same phase, which is what the plan's store design
does.

Steady state today: `67 MB → 134 MB` heap with both builders + instance-ai
warm. Target after refactor (one lean copy + bounded LRU): ~10–20 MB over
steady, i.e. **~50+ MB saved** plus elimination of the recurring 213 ms /
32 MB re-parse every 5 minutes on the instance-ai hot path.
