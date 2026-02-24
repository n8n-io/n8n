# exp_free_1 — Freemium Test with 50 Prod Executions: Implementation Plan

> Gathered from Linear project [EXP - Freemium](https://linear.app/n8n/project/exp-freemium-e83b20a77452), ticket [GRO-244](https://linear.app/n8n/issue/GRO-244/freemium-v1), and codebase analysis on 2026-02-24.
>
> **Note:** The Notion MCP had a persistent API version header issue during analysis. Spec details were reconstructed from Linear tickets, linked PRs, and the existing codebase.

## Summary

The `exp_free_1` experiment converts trial accounts into a "freemium" tier by giving users **50 production executions per month** instead of the standard time-limited trial. The key behavioral changes are:

- **No "time left" in the trial banner** — the countdown-style trial messaging is hidden
- **No trial-specific wording or communications** — the user should not feel like they are on a trial
- **Trial accounts with a 90-day duration** — technically still a trial account on the backend, but presented as a free plan
- **Execution-limited rather than time-limited** — the primary constraint is the 50-execution cap, not an expiration date

The experiment targets new cloud signups to test whether a freemium model (limited executions, no time pressure) converts better than the existing time-limited trial. Variants v2 (price discount for starter plan) and v3 (price reduction + inactivity detection) are planned as follow-ups.

Most of the infrastructure for this experiment already exists. PR [#25412](https://github.com/n8n-io/n8n/pull/25412) (merged 2026-02-09) added backend-controlled banner configuration (`bannerConfig`), which allows the cloud backend to dynamically control what the trial banner displays. The cloud-side PRs ([n8n-cloud#3029](https://github.com/n8n-io/n8n-cloud/pull/3029), [n8n-cloud#3067](https://github.com/n8n-io/n8n-cloud/pull/3067), [n8n-cloud#3070](https://github.com/n8n-io/n8n-cloud/pull/3070), [n8n-hosted-frontend#879](https://github.com/n8n-io/n8n-hosted-frontend/pull/879)) implement the server-side experiment assignment and plan management. **GRO-244 is already marked "Done" in Linear.**

## Tasks

### 1. Implementation (if additional frontend work is needed)

The bulk of this experiment is **backend/cloud-driven**, with the n8n editor already supporting the necessary frontend changes via the `bannerConfig` mechanism. The implementation checklist below covers what may still be needed on the n8n side:

- [ ] **Register experiment constant** in `packages/frontend/editor-ui/src/app/constants/experiments.ts`
  ```typescript
  export const FREEMIUM_V1_EXPERIMENT = createExperiment('exp_free_1_freemium_test_with_50_prod_exec');
  ```
- [ ] **Add to `EXPERIMENTS_TO_TRACK`** array for automatic telemetry enrollment tracking
- [ ] **Create experiment store** (`packages/frontend/editor-ui/src/experiments/freemiumV1/stores/freemiumV1.store.ts`) following the standard pattern:
  - Import `usePostHog` and `useCloudPlanStore`
  - Expose `isFeatureEnabled` computed (variant check + cloud plan conditions)
  - Track experiment participation via `useTelemetry()`
  - Watch for variant enablement and fire one-time tracking event
- [ ] **Verify `bannerConfig` handling** covers the freemium case:
  - `timeLeft` should be omitted or `{ show: false }` (no countdown)
  - `showExecutions` should be `true` (show the 50/50 progress bar)
  - `cta` should use non-trial wording (e.g., "Upgrade" without trial references)
  - `dismissible` behavior should match spec requirements
- [ ] **Audit i18n strings** — ensure no "trial" language leaks through when `bannerConfig` suppresses the time-left section. Check:
  - `banners.trial.message.*` keys — these should not render when `bannerTimeLeft.show` is false (already handled in `TrialBanner.vue:105`)
  - `executionUsage.currentUsage.text` — currently says "You are in a free trial with limited executions"; this may need a freemium-specific variant
  - `executionUsage.expired.text` — says "Your trial is over"; may need alternative text when executions run out on freemium
  - `executionUsage.ranOutOfExecutions.text` — currently says "You're out of executions. Upgrade your plan to keep automating." — this may be acceptable as-is
- [ ] **Verify `TrialOverBanner` behavior** — when a freemium user exhausts all 50 executions, the `allExecutionsUsed` computed in `cloudPlan.store.ts:116-119` triggers. Confirm the correct banner/messaging shows (not "Your trial is over")
- [ ] **Add telemetry events** specific to the freemium experiment:
  - `User is part of experiment` (automatic via `EXPERIMENTS_TO_TRACK`)
  - `Freemium user reached execution limit` (if not already tracked)
  - `Freemium user upgraded` (may be tracked via existing upgrade telemetry)
- [ ] **Write unit tests**:
  - Experiment store: variant detection, feature enablement logic
  - Banner rendering: ensure no trial language when in freemium mode
  - Cloud plan store: verify `shouldShowBanner` with freemium `bannerConfig`
- [ ] **Verify `PlanMetadata` types** — the current `Cloud.PlanMetadata.group` union is `'opt-out' | 'opt-in' | 'trial'`. If freemium uses a new group (e.g., `'free'`), the type in `packages/frontend/@n8n/rest-api-client/src/api/cloudPlans.ts:20` needs updating. Similarly, `slug` may need a new value.

**Effort estimate:** **S-M** — Most of the heavy lifting is done. The frontend experiment constant registration and store are standard boilerplate. The main risk is i18n string auditing and edge-case banner behavior.

### 2. Cleanup (post-experiment)

This task happens after experiment results are analyzed and a decision is made:

- [ ] Remove `FREEMIUM_V1_EXPERIMENT` from `experiments.ts` and `EXPERIMENTS_TO_TRACK`
- [ ] Remove experiment store (`freemiumV1.store.ts`) and any experiment-specific components
- [ ] If freemium wins: promote the free tier as the default for new signups (backend change), remove PostHog feature flag
- [ ] If freemium loses: revert cloud backend to standard trial flow, remove `bannerConfig` overrides
- [ ] Update/remove experiment-specific tests

## Open Questions

- **Is additional frontend code actually needed?** GRO-244 is marked "Done" and all linked PRs are merged. The `bannerConfig` mechanism may already handle everything from the cloud backend. If the backend sends the right `bannerConfig` (no `timeLeft`, `showExecutions: true`, 50-execution limit), the existing frontend renders correctly without any experiment-specific code on the n8n side.
  - **Suggested default:** Verify by checking what `bannerConfig` the cloud backend sends for freemium users. If it's fully backend-driven, the n8n-side work is limited to registering the experiment constant for telemetry tracking.

- **What PostHog feature flag name is used?** The experiment branch is named `gro-exp-exp_free_1_freemium_test_with_50_prod_exec`, suggesting the flag name is `exp_free_1_freemium_test_with_50_prod_exec`. This needs confirmation from the cloud team / PostHog dashboard.
  - **Suggested default:** Use `exp_free_1_freemium_test_with_50_prod_exec` as the experiment name.

- **Should "trial" language be replaced with "free plan" language?** The spec says "no trial wording or comms," but the existing i18n strings reference "trial" in several places (execution usage text, API trial limits, etc.). The `bannerConfig` hides the time-left section, but other parts of the UI (e.g., settings pages, API access warnings) may still reference "trial."
  - **Suggested default:** The `bannerConfig` mechanism handles the banner. For other UI locations, add conditional checks based on the experiment variant to swap "trial" text for "free plan" text.

- **Is dedicated design work needed before implementation?** The spec does not mention mockups or visual direction. The existing banner components (progress bar + execution counter) seem sufficient for the freemium display. However, if the "no trial wording" requirement extends to all UI surfaces (settings, billing, usage pages), design input may be needed to define the freemium user experience holistically.
  - **Suggested default:** No dedicated design task needed for the banner (already functional). If broader UI changes are required, a design review should be scoped separately.

- **What happens when a freemium user exhausts all 50 executions?** The `allExecutionsUsed` computed triggers, but does the `TrialOverBanner` show (with "Your trial is over" text) or does the regular banner show a "you're out of executions" state? This UX needs to be defined.
  - **Suggested default:** Show the execution-exhausted state in the trial banner (progress bar at 100%, danger color, CTA to upgrade) rather than switching to `TrialOverBanner`.

- **Does the `PlanMetadata.group` type need a new `'free'` value?** If the cloud backend assigns a new plan group for freemium users, the TypeScript type union in `cloudPlans.ts` needs updating. **Potential blocker** if the backend uses an unlisted group value — TypeScript will complain.
  - **Suggested default:** Check with the cloud team what `metadata.group` value is used. If it's still `'trial'`, no type change needed.

## Risks

- **i18n string leakage (medium likelihood):** "Trial" language appearing in unexpected places (settings, API access warnings, email notifications). The `bannerConfig` mechanism only controls the banner, not all UI surfaces.
  - **Mitigation:** Conduct a full audit of i18n strings containing "trial" and identify which ones are visible to freemium users. Either add conditional rendering or add new i18n keys.

- **Execution limit edge cases (low likelihood):** Race conditions between the polling interval (`CLOUD_TRIAL_CHECK_INTERVAL`) and actual execution counts. User might execute workflow #51 before the banner updates.
  - **Mitigation:** This is existing behavior for trial users and is acceptable. The backend enforces the hard limit regardless of frontend display.

- **`TrialOverBanner` showing incorrect messaging (medium likelihood):** When executions run out, the system may show "Your trial is over" instead of an execution-specific message, since `trialExpired` and `allExecutionsUsed` both trigger banner state changes.
  - **Mitigation:** Verify the banner rendering priority. The `shouldShowBanner` logic in `cloudPlan.store.ts` relies on `bannerConfig` from the backend, so the backend should send the appropriate config when executions run out.

- **Type safety with new plan metadata (low likelihood):** If the cloud backend sends a `metadata.group` or `metadata.slug` value not in the TypeScript union, it could cause runtime issues or type errors.
  - **Mitigation:** Add the new values to the union type proactively, or use a more permissive type (e.g., `string` union with known values).

- **Experiment already shipped (informational):** GRO-244 is marked "Done" with all PRs merged. The frontend work via `bannerConfig` (PR #25412) and cloud-side changes are live. Any additional n8n-side work should be incremental improvements, not core implementation.
  - **Mitigation:** Verify current production behavior before adding code. The main remaining work may be limited to experiment constant registration for telemetry.

## References

### Linear Tickets
- [GRO-244 — Freemium v1](https://linear.app/n8n/issue/GRO-244/freemium-v1) (Done)
- [GRO-275 — Freemium v2](https://linear.app/n8n/issue/GRO-275/freemium-v2) (Done) — price discount variant
- [GRO-282 — Freemium v3](https://linear.app/n8n/issue/GRO-282/freemium-v3) (Backlog) — price reduction + inactivity detection
- [EXP - Freemium project](https://linear.app/n8n/project/exp-freemium-e83b20a77452)

### GitHub PRs (n8n repo)
- [#25412 — chore(editor): Allow control of banner content from cloud](https://github.com/n8n-io/n8n/pull/25412) (Merged 2026-02-09)

### GitHub PRs (cloud repos)
- [n8n-cloud#3029 — feat: Support free tier](https://github.com/n8n-io/n8n-cloud/pull/3029)
- [n8n-cloud#3067 — chore(dashboard-backend): Emit user is part of experiment for freemium](https://github.com/n8n-io/n8n-cloud/pull/3067)
- [n8n-cloud#3070 — chore(dashboard-backend): Handle free plan like trial everywhere](https://github.com/n8n-io/n8n-cloud/pull/3070)
- [n8n-hosted-frontend#879 — chore: Handle freemium on plan changes](https://github.com/n8n-io/n8n-hosted-frontend/pull/879)

### Key Files (n8n repo)
- `packages/frontend/editor-ui/src/app/constants/experiments.ts` — Experiment registration
- `packages/frontend/editor-ui/src/app/stores/cloudPlan.store.ts` — Cloud plan state management, banner logic
- `packages/frontend/editor-ui/src/features/shared/banners/components/banners/TrialBanner.vue` — Banner component with backend-controlled config
- `packages/frontend/editor-ui/src/features/shared/banners/components/banners/TrialOverBanner.vue` — Trial-over banner
- `packages/frontend/@n8n/rest-api-client/src/api/cloudPlans.ts` — Cloud API types and endpoints
- `packages/frontend/@n8n/i18n/src/locales/en.json` — i18n strings (trial/execution wording)
- `packages/frontend/editor-ui/src/app/stores/posthog.store.ts` — PostHog feature flag integration
