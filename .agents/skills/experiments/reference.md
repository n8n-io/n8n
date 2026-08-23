# Experiments reference

Use this guide for code under `packages/frontend/editor-ui/src/experiments/` and related experiment wiring.

## Orient first

- Read `packages/frontend/editor-ui/src/app/constants/experiments.ts` before changing experiment constants or PostHog names.
- Inspect the target experiment folder and the host surface that consumes it.
- For shared state or mutable APIs, prefer a Pinia store. For tiny stateless checks, a composable is acceptable.
- Do not add empty `components/`, `data/`, `workflows/`, routes, modals, or host wiring unless the task needs them.

## Shared rules

- When PostHog MCP is available, check PostHog before inventing or changing an experiment key.
- PostHog enrollment and local display logic are separate concepts.
- Use `isEnabled` for enrollment only. For simple variants, use `posthogStore.isVariantEnabled(EXPERIMENT.name, EXPERIMENT.variant)` or compare `getVariant(...)` with the configured variant. For multi-variant experiments, expose `currentVariant` and derive variant booleans from it.
- Keep local display conditions in separately named state such as `shouldShow*`, `can*`, `hasDismissed*`, or `hasInteracted*`.
- Do not mix enrollment with cloud plan checks, selected-app checks, workflow counts, permission checks, or dismissal state. Those are local display conditions.
- Use `useStorage` from `@/app/composables/useStorage` for experiment-owned persisted UI state such as dismissed, interacted, or last-seen flags.
- Do not use raw `localStorage` for new experiment-owned state unless the experiment must write an existing non-experiment app key.
- Keep `"User is part of experiment"` tracking centralized. Add only experiment-specific `track*` helpers in experiment code.
- Use `getExperimentTelemetryPayload()` from `@/experiments/utils` for every experiment-specific telemetry helper that may be used as a PostHog experiment exposure or metric event.
- Custom exposure events must include PostHog's `$feature/<experiment-name>` property with the current variant. The helper adds this property and the human-readable `variant` property.
- Do not hand-roll `$feature/<experiment-name>` or instance group metadata in experiment stores. `usePostHog().init()` calls `posthog.group()` centrally so the PostHog web SDK associates subsequent frontend events with the instance group.

## PostHog flag lookup

- Use PostHog MCP feature flag tools for new or changed experiment keys when they are available.
- Follow the PostHog MCP workflow strictly: run `info` for each PostHog tool before calling it, including `projects-get`, `switch-project`, `feature-flag-get-all`, `feature-flag-get-definition`, and `create-feature-flag`.
- Use the Production PostHog environment as the source of truth for lookup, duplicate detection, and numeric index selection.
- If the active PostHog project is not Production, use `projects-get` to find the Production project ID and `switch-project` to switch to it before searching flags.
- Search Production for an existing flag by the requested experiment name, proposed key, or product title with `feature-flag-get-all`. Do not add a `type` filter for this first search because older experiment flags may be boolean, experiment, or multivariant flags. Use the returned `key` exactly if a matching flag already exists.
- If multiple plausible flags match, inspect the candidates and ask the user which one is the experiment source of truth before changing code.
- If no flag exists yet, derive the next numeric experiment index from both:
  - Production PostHog feature flag keys returned by `feature-flag-get-all`, paging with `limit` and `offset` until no next page remains, and
  - existing experiment names in `packages/frontend/editor-ui/src/app/constants/experiments.ts`.
- Treat leading numeric prefixes matching `^\d+[_-]` as experiment indexes. Pick `max(existing indexes) + 1`, format new indexes as three digits, and then build the new key from that prefix and a kebab/snake name that matches the surrounding PostHog naming convention.
- When implementing a new experiment and no matching Production flag exists, create disabled PostHog feature flags in both Staging and Production before adding the code constant. Run `info create-feature-flag` immediately before the first create call, set `active: false`, use the same chosen `key` in both environments, and use the existing PostHog naming style such as `Feature Flag for Experiment <Human title>`.
- Use `projects-get` to find Staging and Production project IDs. Switch to each environment with `switch-project`, create or verify the flag there, and switch back to Production before continuing repo work.
- Include variant configuration in the created flag only when the experiment shape requires it and the current MCP schema supports the needed fields. Keep rollout inactive with `active: false`; do not enable rollout as part of implementation.
- After creating flags, verify the returned or listed flag key/id in both Staging and Production with `feature-flag-get-all` or `feature-flag-get-definition`, then use that key in `createExperiment(...)`.
- If the repo and PostHog disagree, prefer the existing PostHog flag key for the experiment name and call out the mismatch in the final response.
- Do not update, enable, or delete PostHog flags unless the user explicitly asks for that side effect. If PostHog MCP or either environment is unavailable, continue the code change and tell the user which disabled flag still needs to be created manually.

## Create

- Check Production PostHog for an existing feature flag before adding code constants. Reuse it when it exists; otherwise create disabled PostHog flags in Staging and Production and use the created key.
- Add the experiment constant in `packages/frontend/editor-ui/src/app/constants/experiments.ts`.
- Add the experiment name to `EXPERIMENTS_TO_TRACK`.
- Create `packages/frontend/editor-ui/src/experiments/<name>/`.
- For store-backed experiments, add a `STORES.EXPERIMENT_*` entry in `packages/frontend/@n8n/stores/src/constants.ts`, then create `stores/<name>.store.ts` and `stores/<name>.store.test.ts`.
- For tiny stateless experiments, create a focused composable such as `use<Name>Experiment.ts` with an adjacent test when the logic is non-trivial.
- If persisted UI state, telemetry helpers, cross-component state, or reset behavior is needed, use the store path.

## Extend

- Preserve the existing public API unless the caller explicitly asks for a breaking cleanup.
- Check PostHog for the existing feature flag when changing the experiment key, variants, or rollout assumptions.
- When adding variants, update the `createExperiment(...)` shape and prefer clear variant names matching PostHog values.
- Add display gates as local computed state, not as part of enrollment.
- Keep telemetry payloads small, typed where practical, and include the active variant when event analysis needs it.
- Use existing experiment-local folders and test layout before introducing a new structure.

## Wire

- Wire experiments at the narrowest host surface that owns the decision.
- Keep experiment components inside the experiment folder unless they become generally reusable.
- All user-facing text in Vue code must use i18n. Follow `n8n:content-design` when writing or revising copy.
- Follow `n8n:design-system` for Vue component structure, n8n design-system components, and CSS variables.
- At the end of scaffold or wiring work, tell the user what remains manual, such as PostHog configuration, route guards, modal registration, or extra workflow payload files.

## Test

- Test the public API next to the store or composable. Default store test location is `stores/<name>.store.test.ts`; use `__tests__/` only when the local folder already follows that pattern.
- Cover enrollment logic, derived display state, persistence behavior, and experiment-specific telemetry helpers.
- For component wiring, cover visible behavior rather than internal implementation details.
- Mock PostHog, telemetry, storage, and external stores directly in the unit test.
- Work from `packages/frontend/editor-ui` when running focused frontend tests.

## Review

Check for these common issues:

- new constants missing from `EXPERIMENTS_TO_TRACK`
- new experiment code added without a matching disabled PostHog feature flag
- new disabled feature flag missing from either Staging or Production
- newly created PostHog flag accidentally left active
- experiment key or numeric index chosen without checking Production PostHog flags
- repo experiment name differing from the matching PostHog feature flag key
- product or dismissal gates mixed into enrollment
- raw `localStorage` used for new experiment-owned state
- participation tracking duplicated inside experiment code
- store-backed behavior implemented as an oversized composable
- missing tests for variant, persistence, or telemetry behavior
- user-facing text added without i18n
- unused experiment assets, i18n keys, or host wiring left behind

## Retire

- Remove host-surface imports and conditional rendering first.
- Remove experiment-local components, stores, composables, data, workflow payloads, and tests that are no longer used.
- Remove the experiment constant and its `EXPERIMENTS_TO_TRACK` entry.
- Remove any unused `STORES.EXPERIMENT_*` entry.
- Remove stale i18n keys and assets owned only by the retired experiment.
- Run targeted searches for the experiment constant, folder name, PostHog name, storage keys, telemetry event names, and store id before finishing.
