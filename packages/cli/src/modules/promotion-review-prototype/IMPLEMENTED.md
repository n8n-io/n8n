# Implemented so far (baseline)

This baseline was built on the **first day of the spike** — a quick prototype to
prove the consuming-side review/apply flow before designing the cross-instance
model. It predates the design grilling captured in
[`CONTEXT.md`](./CONTEXT.md) and the ADRs, so its choices (single instance,
fixture deployable, hardcoded policies) are scaffolding, not decisions.

Current state of the promotion-review prototype **before** the push/pull thin
slice. Today it is a **single-instance simulation of the consuming side**: it
demonstrates review → plan → credential rebind → apply on top of the real
`n8n-packages` `ImportPipeline`. The producing instance, the wire, and pairing
are all mocked. The target shape is in [`SPIKE-PLAN.md`](./SPIKE-PLAN.md).

## Backend — `packages/cli/src/modules/promotion-review-prototype/`

- **`promotion-review-prototype.module.ts`** — `@BackendModule`; lazy-imports the
  controller on init.
- **`promotion-review-prototype.controller.ts`** — `@RestController('/promotion-review-prototype')`:
  - `GET  /pending` — list pending promotions
  - `GET  /credentials` — usable target-project credentials (`projectId`, `type`)
  - `GET  /:promotionId` — promotion metadata
  - `POST /:promotionId/plan` — preview (calls `ImportPipeline.plan`)
  - `POST /:promotionId/approve` — apply (calls `ImportPipeline.run`)
  - `POST /:promotionId/reject`
- **`promotion-review-prototype.service.ts`** — in-memory `Map<string,
  PromotionRecord>` seeded with **one** promotion ("Customer Onboarding v2").
  `plan`/`approve` call `ImportPipeline` with **hardcoded policies**
  (`WorkflowConflictPolicy.NewVersion`, `WorkflowPublishingPolicy.MatchSource`,
  `WorkflowIdPolicy.New`, `credentialMatchingMode: 'id-only'`,
  `credentialMissingMode: 'must-preexist'`). Usable credentials come from
  `CredentialsService.getCredentialsAUserCanUseInAWorkflow`.
  `resetPromotionForDemo` re-seeds to `pending` after approve so the demo repeats.
- **`promotion-review-prototype.types.ts`** — `PromotionRecord` (incl. the
  in-process `packageBuffer`), `PromotionReviewSummary`.
- **`promotion-review-package.builder.ts`** — **fixture**: builds a real `.n8np`
  tar in-process (`TarPackageWriter`) with a manifest, the Customer Onboarding
  workflow, and a Slack credential requirement (`dev-slack-sales-alerts`). Also
  produces the before/after workflow diff.

## API types — `packages/@n8n/api-types/src/dto/promotion-review/promotion-review-plan.dto.ts`

- Requests: `PromotionReviewPlanRequestDto` (`projectId?`,
  `credentialBindings?`), `PromotionReviewCredentialsQueryDto`.
- Responses: `PromotionReviewPlanResponse` (package, target project, workflow
  plan items, **workflow diffs**, credential requirements, resolved bindings,
  blocking issues, `canApply`), `PromotionReviewSummary`,
  `PromotionTargetCredential`, `PromotionBlockingIssue`, `PromotionWorkflowDiff`.

## Frontend — `packages/frontend/editor-ui/src/features/promotion-review-prototype/`

- **`promotionReview.api.ts`** — REST wrappers for the endpoints above.
- **`promotionReview.store.ts`** — Pinia store: load pending, select promotion,
  run plan, rebind credentials (re-runs plan), approve/reject; integrates with
  the projects store for the target project.
- **`components/PromotionReviewPanel.vue`** — plan preview: workflow actions,
  credential blockers + binding selects, apply/reject.
- **`components/PromotionWorkflowDiffInline.vue`** — inline before/after diff.
- **`views/SettingsPromotionReview.vue`** — inbox + review page (settings route).
- i18n keys under `promotionReview.*` (`@n8n/i18n` `en.json`).

## Builds on (real, reused) — `packages/cli/src/modules/n8n-packages/`

`ImportPipeline.plan` / `run`, `TarPackageReader` / `TarPackageWriter`,
`WorkflowImporter`, `CredentialImporter`, and the import policies. This is the
**proven apply engine** the spike keeps untouched.

## Real vs simulated today

| Real | Simulated / mocked |
|------|--------------------|
| Consuming-side `plan` / `apply` via `ImportPipeline` | No producing instance / second instance |
| Credential resolution against the target project | Deployable built **in-process by a fixture**, not exported from real workflows |
| Workflow diff rendering | Inbox is **one seeded in-memory** promotion |
| The `.n8np` format (manifest + workflow + credential requirements) | No transport/wire; no pairing; no auth |
| | Approve **re-seeds** for a repeatable demo (not a real lifecycle) |
| | Import policies are **hardcoded**; no status feedback |

## What the thin slice changes

Split this single module into a **producing role** (export real deployables,
serve them, expose promotion requests) and a **consuming role** (fetch over a
`DeployableFetcher`, pair via a source connection), running on **two real local
instances**. Detail and the build forks are in `SPIKE-PLAN.md`.
