---
name: n8n:experiments
description: >-
  Guides work on `packages/frontend/editor-ui` experiments. Use when creating,
  extending, wiring, testing, reviewing, or retiring editor-ui experiments,
  PostHog feature flags, experiment key indexes, variants, stores/composables,
  persisted experiment state, or experiment telemetry.
---

# Experiments

Use this skill for frontend experiment code lifecycle work in `packages/frontend/editor-ui`.

Start with the relevant mode in [reference.md](reference.md):

- `Create` for a new experiment folder, constant, store/composable, and tests.
- `Extend` for new variants, behavior, display logic, or telemetry on an existing experiment.
- `Wire` for host-surface integration through routes, modals, views, or components.
- `Test` for store, composable, persistence, telemetry, and UI behavior coverage.
- `Review` for auditing experiment changes.
- `Retire` for cleaning up completed or abandoned experiments.

When experiment work touches Vue components or user-facing copy, also follow `n8n:design-system` and `n8n:content-design`.
