# Implementation Plan: Import / Export v1 Ship-Gate (LIGO-309)

> **Companion docs.** `SPEC.md` (acceptance criteria),
> `TECHNICAL_DESIGN.md` (architecture), `RFC.md` (strategic).
> This plan is the bridge between SPEC and merged code.

---

## Overview

The spike is functionally complete: the module is fully restructured
(`spec/io/engine/entities/scopes`), HMAC-salted IDs land in v1, all
five REST endpoints + two CLI commands are wired, three import modes
work, and 162 tests pass on the spike branch.

The remaining work is **hardening**, not greenfield build:

1. Remove unsafe casts that violate `/AGENTS.md` ("never use `any`,
   avoid `as` outside tests").
2. Tolerate v2 manifest fields so v1 packages can be opened by future
   readers and v2 fields parse without error today.
3. Resolve the operator-facing inconsistencies surfaced in
   `SPEC.md`'s open questions (CLI flag naming, force-mode gating,
   doc surface).
4. Add structured logging so each pipeline phase is traceable.
5. Prove the bundle↔layout duality contract with a test.

The scope is intentionally tight. RFC v2 follow-ups (signatures,
Plan/Apply, Postgres outer txn, per-entity scope checks) are
explicitly out of scope and remain accepted v1 caveats per SPEC.

---

## Architecture Decisions (carry-forward, not new)

These decisions stand from the spike and shape the plan:

- **`scope.state` carries mutable pipeline data** (folderPathMap,
  credentialBindings, etc.) — the type-safety tasks must preserve
  this contract, not work around it.
- **`CredentialImporter` is intentionally not an `EntityImporter`** —
  credentials are a *requirement* not a *content* (asymmetry per
  TECHNICAL_DESIGN §8). Tasks must respect this.
- **`spec/` is the format contract** — adding tolerance for reserved
  fields (Task 4) means *parsing without rejecting*, not *enforcing*.
  Enforcement lands with v2.
- **Per-importer transactions only** — no outer transaction in v1
  (SQLite deadlock). Failure-mode caveats stay accepted.

---

## Dependency Graph

```
Type-safety cleanup ──→ Tolerant-reader   (Phase 1: independent of each other)
        │                     │
        └──── (no coupling) ──┘
                  │
                  ▼
       CLI/REST flag alignment ──→ Round-trip test    (Phase 2: depend on Phase 1 stable types)
                  │                       │
                  └────────────┬──────────┘
                               ▼
              Structured logging (export → import)    (Phase 3: instruments stable code)
                               │
                               ▼
              Force-mode gating + Docs + Sweep        (Phase 4: ship)
```

Phases 1 and 2 can run in either order. Phase 3 must come after both.
Phase 4 closes the loop.

---

## Task List

### Phase 1: Correctness and format tolerance

#### Task 1: Type-safe workflow extension shape

**Description.** `entities/workflow/workflow.importer.ts` mutates the
deserialized workflow with `parentFolder`, `tags`, and
`versionMetadata` via four `as unknown as Record<string, unknown>`
casts. Replace with a single typed extension interface (e.g.
`WorkflowReadyForImport extends IWorkflowBase`) so the mutations are
checked at compile time.

**Acceptance criteria:**
- [ ] No `as unknown` or `as Record<string, unknown>` casts remain in
  `entities/workflow/workflow.importer.ts`.
- [ ] The extension type is co-located with the workflow entity
  (`entities/workflow/workflow.types.ts`).
- [ ] `ImportService.importWorkflows` continues to receive a value
  shape it accepts (no signature change required on
  `ImportService`).

**Verification:**
- [ ] `cd packages/cli && pnpm typecheck`
- [ ] `cd packages/cli && pnpm test src/modules/import-export/entities/workflow`
- [ ] `cd packages/cli && pnpm test src/modules/import-export/__tests__/import-export.integration.test.ts`

**Dependencies:** None.

**Files likely touched:**
- `entities/workflow/workflow.importer.ts`
- `entities/workflow/workflow.types.ts`
- `entities/workflow/__tests__/workflow.importer.test.ts`

**Estimated scope:** S (1–2 files modified, +1 type file).

---

#### Task 2: Type-safe `ImportResult` construction

**Description.** `import-export.service.ts` returns
`{ projects, ...totals } as unknown as ImportResult` in two places.
The `totals` object is a `Record<string, number>` indexed by
`EntityKey`. Make `ImportResult` accept that shape (or build it
via a typed mapper) so the cast disappears.

**Acceptance criteria:**
- [ ] No `as unknown as ImportResult` casts in
  `import-export.service.ts`.
- [ ] `ImportResult` shape is documented in
  `import-export.types.ts` and matches the return value at the
  call site.

**Verification:**
- [ ] `cd packages/cli && pnpm typecheck`
- [ ] `cd packages/cli && pnpm test src/modules/import-export/__tests__/import-export.service.test.ts`

**Dependencies:** None.

**Files likely touched:**
- `import-export.service.ts`
- `import-export.types.ts`

**Estimated scope:** XS.

---

#### Task 3: Tolerant-reader for reserved manifest fields

**Description.** SPEC says the v1 manifest must reserve `mediaType`,
`kind`, `signatures`, `attestations`, `packageDigest`,
`requires.n8nVersion`, and per-entry `digest`/`size` — present in
the type so v2 producers don't break v1 readers, ignored at runtime
in v1. Currently absent from `spec/manifest.types.ts`. Add the
optional fields and a unit test that parses a v2-shaped manifest
without throwing.

**Acceptance criteria:**
- [ ] Optional fields added to `PackageManifest` and `ManifestEntry`
  in `spec/manifest.types.ts`: `mediaType?`, `kind?`,
  `packageDigest?`, `signatures?: unknown[]`,
  `attestations?: unknown[]`, `requires?: { n8nVersion?: string }`.
- [ ] A new test in `__tests__/import-export.service.test.ts`
  parses a manifest containing all reserved fields and emits no
  errors or warnings.
- [ ] `parseAndValidateManifest` rejects only on
  `packageFormatVersion` mismatch, not on unknown fields.
- [ ] No runtime *behaviour* change — reserved fields are stored on
  the parsed object but no v1 code path reads them.

**Verification:**
- [ ] `cd packages/cli && pnpm test src/modules/import-export`
- [ ] Manual: open a fixture v2-shaped manifest in the test, confirm
  `analyzePackage` returns the expected v1 summary.

**Dependencies:** None.

**Files likely touched:**
- `spec/manifest.types.ts`
- `__tests__/import-export.service.test.ts`

**Estimated scope:** S.

---

### Checkpoint A: After Tasks 1–3

- [ ] No `as unknown` casts in module non-test code (`grep -rE "as unknown" --include="*.ts" --exclude-dir=__tests__` returns empty).
- [ ] `pnpm typecheck` passes in `packages/cli/`.
- [ ] All existing integration tests pass.
- [ ] v2-shaped manifest parses without rejection.
- [ ] **Human review**: confirm the type extension shapes (Task 1, 2)
  before proceeding.

---

### Phase 2: Operator-facing consistency

#### Task 4: Align CLI / REST variable & credential flag names

**Description.** Resolve SPEC open question 1. CLI export uses
`--includeVariableValues`; CLI import uses `--withVariableValues`
and `--withCredentialStubs`. REST accepts both `createCredentialStubs`
*and* `withCredentialStubs` as a legacy fallthrough. Pick one form
(recommend `--with…` for both directions; matches import-side and
the `withValues`/`withCredentialStubs` precedent in code) and
deprecate the other with a 1-release-cycle warning.

**Acceptance criteria:**
- [ ] CLI export and import use the same prefix (`--with…`).
- [ ] REST controller accepts the canonical form *and* the deprecated
  form, logging a deprecation warning when the legacy form is used.
- [ ] CLI command `--help` text reflects the canonical names.
- [ ] OpenAPI / DTO types in `@n8n/api-types` updated where shared.

**Verification:**
- [ ] `cd packages/cli && pnpm typecheck`
- [ ] `cd packages/cli && pnpm test src/commands/export src/commands/import`
- [ ] `cd packages/cli && pnpm test src/modules/import-export/__tests__/import-export.service.test.ts`
- [ ] Manual: run `n8n export:package --help` and `n8n import:package
  --help`, confirm consistent flag names.

**Dependencies:** Phase 1 stable.

**Files likely touched:**
- `packages/cli/src/commands/export/package.ts`
- `packages/cli/src/commands/import/package.ts`
- `packages/cli/src/modules/import-export/import-export.controller.ts`
- `packages/@n8n/api-types/src/dto/import-export/*` (if DTOs exist)

**Estimated scope:** M (touches 4–5 files across CLI + REST + DTOs).

> **Pending decision** — confirm flag prefix choice before starting.

---

#### Task 5: Bundle ↔ folder layout round-trip test

**Description.** SPEC §Format requires the wire bundle and unpacked
folder layout to round-trip losslessly. No test currently proves
this. Add an integration test that exports → unpacks the tar to a
temp directory → repacks → re-imports → asserts equivalent state.

**Acceptance criteria:**
- [ ] New test in
  `__tests__/import-export.integration.test.ts` named
  `'bundle ↔ folder layout duality'`.
- [ ] Test pipeline: export project → write tar bytes → unpack to
  temp dir → repack to a new tar → re-import → diff against
  original-import state.
- [ ] Test passes deterministically (no time-based or random ID
  drift in assertions).

**Verification:**
- [ ] `cd packages/cli && pnpm test src/modules/import-export/__tests__/import-export.integration.test.ts`

**Dependencies:** Phase 1 stable.

**Files likely touched:**
- `__tests__/import-export.integration.test.ts`
- (optional) `io/tar/__tests__/tar-package-reader.test.ts` for a
  unit-level unpack helper

**Estimated scope:** M (one focused test, but exercises the full path).

---

### Checkpoint B: After Tasks 4–5

- [ ] Operator-facing flags are consistent between CLI and REST.
- [ ] Layout duality contract is proved by a test.
- [ ] **Human review**: confirm flag-naming decision shipped as
  intended.

---

### Phase 3: Observability

#### Task 6: Structured logging — export pipeline

**Description.** SPEC §Observability requires per-phase structured
logs. The module currently has zero `logger` calls. Inject the
`Logger` service into `ExportPipeline` and entity exporters; emit
one log line per phase with `{ phase, entityKey, count, duration_ms,
exportType }`.

**Acceptance criteria:**
- [ ] Each entity exporter emits `info` on completion with
  `{ entityKey, count, duration_ms }`.
- [ ] `ExportPipeline` emits a phase-boundary log with
  `{ phase: 'sequential' | 'parallel' | 'backfill', duration_ms }`.
- [ ] Errors include `entityKey` + source ID for debuggability.
- [ ] No PII (workflow content, credential names) in log fields —
  IDs and counts only.

**Verification:**
- [ ] `cd packages/cli && pnpm test src/modules/import-export`
- [ ] Manual: run `n8n export:package --projectIds=<id>` and confirm
  expected log lines appear.

**Dependencies:** Phase 1 + Phase 2 complete (avoids re-instrumenting
mid-flight).

**Files likely touched:**
- `engine/export.pipeline.ts`
- Each `entities/<name>/<name>.exporter.ts` (six files, one-line
  injection + log call each)

**Estimated scope:** M (touches 6 exporters + 1 pipeline; mechanical).

---

#### Task 7: Structured logging — import pipeline + force-mode audit

**Description.** Mirror Task 6 for the import side, **plus** add the
audit-warning channel SPEC §Modes requires for force-mode dangling
refs. When a credential / sub-workflow / variable reference is left
unresolved in `force` mode, emit a `warn`-level log with
`{ refType, sourceId, workflowId }`.

**Acceptance criteria:**
- [ ] Each importer emits `info` on completion with
  `{ entityKey, count, duration_ms }`.
- [ ] `ImportPipeline` emits phase-boundary logs.
- [ ] Force-mode dangling refs produce a `warn` log per dropped ref.
- [ ] A new test asserts the warn log fires when `mode: 'force'` is
  used with an unresolved credential.

**Verification:**
- [ ] `cd packages/cli && pnpm test src/modules/import-export`
- [ ] Manual: run `n8n import:package --input=<pkg> --mode=force`
  with a missing credential, confirm warn lines.

**Dependencies:** Task 6 sets the logging conventions.

**Files likely touched:**
- `engine/import.pipeline.ts`
- Each `entities/<name>/<name>.importer.ts` (five files)
- `entities/credential/credential.finalize.ts` (force-mode warn)
- `__tests__/import-export.integration.test.ts` (audit test)

**Estimated scope:** M.

---

### Checkpoint C: After Tasks 6–7

- [ ] Both pipelines emit structured per-phase logs.
- [ ] Force mode produces a queryable audit trail.
- [ ] No PII in log payloads.
- [ ] **Human review**: confirm log schema before merge (one log
  schema is hard to change once shipped).

---

### Phase 4: Open questions and ship

#### Task 8: Force-mode admin gating (decision + impl)

**Description.** Resolve SPEC open question 2. RFC v2 says force
mode should require admin; v1 currently allows any caller with
`project:create`. Two options:

- **Option A (defer)**: Document as a v2 follow-up. No code change.
  Update SPEC to move from "open question" to "accepted v1 caveat".
- **Option B (land)**: Add an admin scope check
  (`@GlobalScope('admin')` or equivalent) when `mode: 'force'` is
  used. Reject non-admin callers with 403.

**Acceptance criteria (Option B):**
- [ ] Force-mode requests from non-admin users return 403 *before*
  any DB read.
- [ ] CLI behaviour unchanged (CLI runs as instance owner).
- [ ] New integration test covering both admit (admin) and reject
  (non-admin) paths.

**Acceptance criteria (Option A):**
- [ ] SPEC.md "Open Questions" item 2 moves to "Known v1 Caveats".

**Verification:**
- [ ] `cd packages/cli && pnpm test src/modules/import-export`
  (Option B only)

**Dependencies:** Phase 3 complete.

**Files likely touched (Option B):**
- `import-export.controller.ts`
- `__tests__/import-export.integration.test.ts`

**Estimated scope:** S (Option B) / XS (Option A).

> **Pending decision** — A or B?

---

#### Task 9: Documentation surface

**Description.** Resolve SPEC open question 4. Decide whether v1
ships customer-facing docs or remains internal-only. If
customer-facing: add a public docs page covering the CLI flow,
mode semantics, and the credential-stub pattern. If internal-only:
no-op for this task.

**Acceptance criteria (customer-facing):**
- [ ] Public docs page drafted, linked from
  `docs.n8n.io/import-export` (or internal docs handover via the
  docs team).
- [ ] CLI `--help` text and docs page agree on flag names.

**Acceptance criteria (internal-only):**
- [ ] SPEC.md "Open Questions" item 4 moves to "Known v1 Caveats"
  noting the deferred docs surface.

**Verification:** Manual (docs review).

**Dependencies:** Phase 3 complete; Task 4 (flag names) shipped.

**Estimated scope:** XS–M depending on decision.

> **Pending decision** — customer-facing or internal-only?

---

#### Task 10: Pre-merge sweep

**Description.** Final correctness gate before opening PR. Run the
full check from `/AGENTS.md`, smoke-test the happy path on a dev
instance, and update `SPEC.md` to reflect resolved open questions.

**Acceptance criteria:**
- [ ] `pnpm build` clean.
- [ ] `pnpm typecheck` clean (full repo).
- [ ] `pnpm lint` clean (full repo).
- [ ] `pnpm test` clean for `packages/cli`.
- [ ] Manual smoke: export a project from a dev instance, import
  into a fresh instance, confirm three workflows execute
  end-to-end.
- [ ] `SPEC.md` open questions section reduced to outstanding items
  only.

**Verification:**
- [ ] `pnpm build > build.log 2>&1 && tail -20 build.log` (no errors)
- [ ] `cd packages/cli && pnpm typecheck && pnpm lint`
- [ ] `cd packages/cli && pnpm test src/modules/import-export src/commands/export src/commands/import`
- [ ] Manual smoke (logged in PR description).

**Dependencies:** All prior tasks complete.

**Files likely touched:**
- `SPEC.md` (open questions cleanup)

**Estimated scope:** S.

---

### Checkpoint D: Ship gate

- [ ] All SPEC success criteria checkable against tests.
- [ ] No accepted-but-undocumented limitations.
- [ ] Smoke test logged in PR.
- [ ] PR title follows `.github/pull_request_title_conventions.md`.
- [ ] PR description references `https://linear.app/n8n/issue/LIGO-309`.
- [ ] Two reviews requested (architecture + security).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Type-safety changes (Tasks 1, 2) trigger downstream type-check failures across `cli` package. | Med | Run typecheck after every commit in Phase 1. Touch only the import-export module's exported types. |
| Logging schema choice (Tasks 6, 7) becomes a future ops compatibility headache. | Med | Confirm schema with observability before Task 6 starts. Use `entityKey` + `phase` enums (already exist) — no free-form strings. |
| CLI flag rename (Task 4) breaks existing scripts in customer environments. | Med | Keep legacy flags accepted with a deprecation warning for one release cycle. Document in CHANGELOG. |
| Bundle/layout round-trip test (Task 5) reveals a real bug in tar handling. | Low–High | Failing test surfaces the bug early; budget for a fix slot before merge. |
| Phase 3 logging instrumentation breaks the spike's 162-test baseline. | Low | Logger calls are side-effect-only — failing tests would indicate accidental control-flow change; investigate, don't bypass. |
| Force-mode admin gating (Task 8) blocks a customer's CI flow. | Med (Option B) | Land Option A in v1, ticket Option B for v2 — the safer default if there's any doubt. |

---

## Open Questions (require human input before respective tasks start)

1. **Task 4** — flag naming: `--with…` (preferred) or `--include…`?
2. **Task 8** — force-mode gating: defer to v2 (Option A) or land
   admin check now (Option B)?
3. **Task 9** — documentation surface: customer-facing docs in v1
   or internal-only with deferred handover?

---

## Parallelization Opportunities

- **Phase 1 internal**: Tasks 1, 2, 3 are independent — three agents
  (or three commits) can land in parallel.
- **Phase 2 internal**: Tasks 4 and 5 are independent of each other
  but both depend on Phase 1.
- **Phase 3 sequential**: Task 7 depends on Task 6's logging
  conventions — keep these sequential.
- **Phase 4**: Tasks 8 and 9 can run in parallel; Task 10 is the
  closer.
