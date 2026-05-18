# Todo: Import / Export v1 Ship-Gate (LIGO-309)

> Companion to `plan.md` (full task spec) and `SPEC.md` (acceptance
> criteria). Tick boxes as work lands.

---

## Phase 1 — Correctness & format tolerance

- [x] **Task 1 (S)** — Type-safe workflow extension shape ✓ commit `c348e1944d`
  - Eliminate `as unknown` casts in `entities/workflow/workflow.importer.ts`
  - Verify: `pnpm typecheck && pnpm test src/modules/import-export/entities/workflow`
- [x] **Task 2 (XS)** — Type-safe `ImportResult` construction ✓ commit `bd054f4c2e`
  - Eliminate `as unknown as ImportResult` casts in `import-export.service.ts`
  - Verify: `pnpm typecheck && pnpm test src/modules/import-export/__tests__/import-export.service.test.ts`
- [x] **Task 3 (S)** — Tolerant-reader for reserved manifest fields ✓ commit `3d49c5d007`
  - Add optional `mediaType`, `kind`, `signatures`, `attestations`, `packageDigest`, `requires` to manifest types
  - Add v2-shaped manifest parse test
  - Verify: `pnpm test src/modules/import-export`
- [x] **Task 3.1 (XS)** — Bonus: replace `as Record<string, unknown>` cast in `workflow.utils.ts` with type guard ✓ commit `01e49f8c32`
- [x] **Checkpoint A** — Single intentional, documented cast remains in `workflow.types.ts:45` (the bridge to ImportService — see commit message of Task 1). Test suite: 209 passing, 1 pre-existing tar-path-validation failure unrelated to Phase 1. **Awaiting human review of `WorkflowReadyForImport` type design and the bridge-cast localisation.**

## Phase 2 — Operator-facing consistency

- [x] **Task 4 (M)** — Align CLI / REST flag naming ✓ commit `065c808999`
  - Decision: `--include…` everywhere (per user)
  - CLI import + REST controller now accept canonical names; legacy aliases logged as deprecated
- [x] **Path-safety prerequisite** — fix tar writer/reader `./` mismatch ✓ commit `08cf2bab59`
- [x] **Task 5 (M)** — Bundle ↔ folder layout round-trip test ✓ commit `31e745525d`
  - Test exports → unpacks to real temp dir → repacks → re-imports → asserts content match
- [x] **Checkpoint B** — All 212 module tests passing (was 209, 1 pre-existing failure now fixed). Operator surface aligned on `--include…`. Layout duality proved by integration test. **Awaiting human review of flag-aliasing UX (deprecation warnings on legacy flags) and round-trip test scope (currently a single workflow — should it cover folders/tags/credentials too?).**

## Phase 3 — Observability

- [ ] **Task 6 (M)** — Structured logging for export pipeline
  - Inject `Logger`, emit `{ phase, entityKey, count, duration_ms, exportType }`
  - Confirm log schema with observability team before instrumenting
- [ ] **Task 7 (M)** — Structured logging for import pipeline + force-mode audit
  - Mirror Task 6 on import side
  - Add `warn`-level audit log for dropped refs in force mode
  - Add integration test asserting force-mode warn fires
- [ ] **Checkpoint C** — Both pipelines emit per-phase logs; no PII; force-mode audit trail queryable; human review of log schema.

## Phase 4 — Open questions & ship

- [ ] **Task 8 (S/XS)** — Force-mode admin gating
  - **Decision needed first**: Option A (defer to v2) or Option B (land 403 for non-admin)
- [ ] **Task 9 (XS–M)** — Documentation surface
  - **Decision needed first**: customer-facing docs in v1 or internal-only
- [ ] **Task 10 (S)** — Pre-merge sweep
  - Full `build`, `typecheck`, `lint`, `test`
  - Manual smoke test (export → fresh instance → import → workflows execute)
  - Update `SPEC.md` open questions section
- [ ] **Checkpoint D — Ship gate** — All SPEC criteria pass; PR opened referencing LIGO-309; two reviews requested (architecture + security).

---

## Decisions blocking work

These three decisions gate Phase 2 and Phase 4 — collect answers before
those phases begin.

- [ ] **Decision 1 (Task 4)**: `--with…` vs `--include…` flag prefix.
- [ ] **Decision 2 (Task 8)**: Force-mode gating — defer or land?
- [ ] **Decision 3 (Task 9)**: Doc surface — customer-facing or internal?
