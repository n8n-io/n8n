# Spike: cross-instance promotion (push/pull) — plan

**Goal:** harden the promotion-review prototype [`IMPLEMENTED.md`](./IMPLEMENTED.md) into a two-instance thin slice
that lets the team commit to a promotion strategy. Domain language is in
[`CONTEXT.md`](./CONTEXT.md); the load-bearing decisions are in
[`docs/adr/`](./docs/adr).

## Recommended strategy (headline output)

Target-initiated **pull** over a **direct** HTTP wire. The producing instance
freezes a workflow-rooted, immutable **deployable** at "mark for deployment"; a
**promotion request** is intent + manifest (no workflow bytes); the consuming
instance pulls via a `prd`-side **source connection** holding a scoped read-only
key, then runs the existing `ImportPipeline` `plan`/`apply`. Git is backup/mirror
in v1, not the wire. See ADR-0001 and ADR-0002.

## Deliverables (definition of done)

1. **Recommendation memo** + direction decision matrix (source- vs
   target-initiated, scored on security / network / air-gap / status / git fit).
2. **Working thin slice**: two real local instances, one promotion end-to-end
   (`pair → mark → request → pull → plan → rebind → apply`).
3. **Fit-with-git note** (backup now, transport later; `SourceControlImportService`
   reconciliation explicitly out of scope).
4. **Follow-ups list** (already in `CONTEXT.md`).

## Build decisions (grilled)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Topology | Two real local instances, one config-switched codebase (SQLite, two ports) |
| 2 | Role shape | Both producing + consuming endpoints always register; role is emergent from config |
| 3 | Deployable build | Reuse `N8nPackagesService.exportWorkflows()` (real workflows); minimal mark-for-deployment trigger, no producing UI build-out |
| 4 | Producing storage / id | In-memory `Map`; `sha256(buffer)` at mark time (identifies the artifact, not a reproducible build) |
| 5 | The wire | Backend-to-backend fetch; frontend store/api mostly unchanged; manifest list for inbox, deployable bytes on plan/approve with per-session buffer cache |
| 6 | Pairing | Reuse `dev`'s existing API-key UI; minimal `prd` source-connection UI; connection persisted with key encrypted via `Cipher` |

## Change map

### Producing side (`dev`) — new
- `POST /promotion-review-prototype/promotions` `{ workflowIds, targetEnv }`
  → `exportWorkflows()` → `sha256` → store deployable + request (in-memory).
- `GET  /promotion-review-prototype/promotions` → list of requests (intent +
  manifest only).
- `GET  /promotion-review-prototype/deployables/:hash` → deployable bytes.
- Thin "Mark for deployment" trigger (button/endpoint).

### Consuming side (`prd`) — rewire existing
- `PromotionReviewPrototypeService.listPending` → fetch source connection's
  `GET /promotions` (instead of local `Map`).
- `plan` / `approve` → resolve the request's **`locator`** → fetch the deployable
  bytes → existing `ImportPipeline.plan` / `run`. Per-session buffer cache by
  hash.
- Retire `buildPromotionPrototypePackageBuffer` (fixture builder).
- Local review/apply record keyed by deployable hash (in-memory ok).

### Intermediary-readiness seam (cheap insurance — keeps ADR-0002 true)
Direct vs intermediary transport is **not yet decided** (see `CONTEXT.md` →
Open decisions). To keep intermediary an *adapter* and not a rewrite:
- **`DeployableFetcher` interface** on the consuming side with a single
  `DirectFetcher` impl (fetch from producing instance). Intermediary later = a
  second impl; nothing else changes.
- **Request carries a real `locator`** field (v1 value: `direct: producing
  instance`), so the reference is never implicitly "always `dev`".
- **Producing side: "serve vs publish" is a strategy split** — v1 implements
  *serve* (`GET /deployables/:hash`) only; intermediary would *publish* to a
  store.
- **Pairing divergence to record:** intermediary changes pairing to
  *each instance ↔ store* (both outbound), so the `prd`-side source-connection
  UI built here covers **direct only**.

### Pairing (`prd`) — new, minimal UI
- "Source connections" settings section: add form (`name`, producing URL,
  API key), list, delete. Persist via settings store; **encrypt the key**
  (`Cipher`). Model supports a list; demo a single connection.

## Demo script

1. On `dev`: create an API key (existing Settings UI).
2. On `prd`: add a source connection (paste `dev` URL + key) — restart-proof,
   key encrypted at rest.
3. On `dev`: "Mark for deployment" a workflow (with a credential requirement).
4. On `prd`: refresh inbox → request appears with credential gaps (from
   manifest, no heavy transfer).
5. On `prd`: open it → diff + rebind credential → apply. Workflow lands in the
   target project.

## Out of scope (see `CONTEXT.md` follow-ups)

Git-as-transport + `SourceControlImportService` reconciliation; background
polling / push-notification; scoped-key issuance UI; segregation of duties;
rollback / "already applied"; project/folder granularity; source-initiated
direction; DB-backed deployable storage; status callback (off by default).
