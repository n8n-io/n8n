---
experiment-name: "(Exp-RC-0) Resource Center with Static Content"
notion-page-id: "2e75b6e0-c94f-8094-b7ab-f67bd54d0934"
---

# (Exp-RC-0) Resource Center with Static Content — Implementation Plan

> Generated from [Notion spec](https://www.notion.so/2e75b6e0c94f8094b7abf67bd54d0934) on 2026-03-03

## Summary

The Resource Center experiment (`063_resource_center_0`) adds a permanent sidebar surface with static onboarding content — videos, templates, courses, and quick-start workflows — aimed at helping new trial users find inspiration or learn how to use the product. The experiment tests two non-control variants (`variant-resources` with a "Resources" sidebar label and `variant-inspiration` with an "Inspiration" label) against a control group, measuring whether 30%+ of new users engage with the resource center and whether it improves activation rates.

**Current status: The experiment is fully implemented (PR [#24510](https://github.com/n8n-io/n8n/pull/24510), merged 2026-01-21) and has been declared a Failure.** The cleanup ticket [GRO-271](https://linear.app/n8n/issue/GRO-271) exists in Triage status. The primary remaining work is cleanup — removing all experiment code or promoting learnings into a V2 iteration.

## Tasks

### 1. Implementation

**Status: COMPLETE** — All implementation work was delivered in PR [#24510](https://github.com/n8n-io/n8n/pull/24510).

The following checklist documents what was implemented (all items done):

- [x] Register experiment constant `RESOURCE_CENTER_EXPERIMENT` in `packages/frontend/editor-ui/src/app/constants/experiments.ts` using `createExperiment('063_resource_center_0', { control, variantResources, variantInspiration })`
- [x] Add `063_resource_center_0` to `EXPERIMENTS_TO_TRACK`
- [x] Add `RESOURCE_CENTER` and `RESOURCE_CENTER_SECTION` to VIEWS enum in `app/constants/navigation.ts`
- [x] Create Pinia store at `experiments/resourceCenter/stores/resourceCenter.store.ts` with PostHog variant check, tooltip dismissal logic, and telemetry methods
- [x] Add routes in `app/router.ts`: `/resource-center` and `/resource-center/section/:sectionId`
- [x] Build `ResourceCenterView.vue` (main page with sections: Get Started, Get Inspired, Learn)
- [x] Build `ResourceCenterSectionView.vue` (section detail with sorting and grid layout)
- [x] Build 10 components: `ResourceCenterTooltip`, `ResourceCenterHeader`, `HorizontalGallery`, `VideoThumbCard`, `TemplateCard`, `SandboxCard`, `FeaturedSandboxCard`, `QuickStartCard`, `CourseCard`, `WorkflowPreviewSvg`
- [x] Create static data files: `resourceCenterData.ts`, `quickStartWorkflows.ts`
- [x] Add 20 workflow preview PNG assets (light + dark mode variants)
- [x] Integrate into `MainSidebar.vue`: conditionally replace Templates link with Resource Center entry, add tooltip component
- [x] Add ~33 i18n strings under `experiments.resourceCenter.*` namespace
- [x] Wire telemetry events: `User visited resource center`, `User visited resource center section`, `User clicked on resource center tile`, `User visited template repo`, `User viewed resource center tooltip`, `User dismissed resource center tooltip`

**Effort estimate:** L (already complete)

### 2. Cleanup

**Status: TODO** — Tracked by [GRO-271](https://linear.app/n8n/issue/GRO-271) (Triage). This is the primary remaining work.

Since the experiment was declared a **Failure**, all experiment code should be removed:

- [ ] Remove feature flag `063_resource_center_0` from PostHog
- [ ] Remove `RESOURCE_CENTER_EXPERIMENT` constant from `app/constants/experiments.ts`
- [ ] Remove from `EXPERIMENTS_TO_TRACK` array
- [ ] Remove `RESOURCE_CENTER` and `RESOURCE_CENTER_SECTION` from VIEWS enum
- [ ] Remove routes from `app/router.ts`
- [ ] Delete entire `experiments/resourceCenter/` directory (store, views, 10 components, data files, 20 PNG assets)
- [ ] Remove Resource Center imports and conditional logic from `MainSidebar.vue`
- [ ] **Restore Templates link for all users** — the experiment's conditional logic broke the Templates link for self-hosted users with custom template libraries ([GitHub #25710](https://github.com/n8n-io/n8n/issues/25710))
- [ ] Remove ~33 i18n strings from `en.json`
- [ ] Address telemetry regression: `User clicked on template` event no longer firing in side panel ([GRO-249](https://linear.app/n8n/issue/GRO-249))
- [ ] Update/remove any related tests
- [ ] Confirm whether learnings feed into a V2 iteration before full teardown (per GRO-271 notes)

**Effort estimate:** M

**Blocker:** Need confirmation on whether a V2 Resource Center iteration is planned. If yes, some code may be worth preserving or adapting rather than fully deleted.

## Open Questions

- **V2 iteration decision** — GRO-271 notes that "new triage tickets GRO-262-274 suggest redesign." Is a V2 Resource Center planned? This affects whether cleanup is full removal or partial refactoring. Suggested default: proceed with full removal; any V2 can reference the PR history. **Blocker** — determines cleanup scope.

- **Telemetry regression priority** — [GRO-249](https://linear.app/n8n/issue/GRO-249) reports that `User clicked on template` events no longer fire in the side panel. Is this caused by the Resource Center experiment, or is it a separate issue? Should it be fixed as part of cleanup or tracked independently? Suggested default: investigate during cleanup and fix if related.

- **Design for future iterations** — The spec mentions design work by Giulio Andreini (GRO-184, completed) and open items about section differentiation and video thumbnail design from Brand. Are these learnings documented for potential future use? Suggested default: archive design artifacts in the experiment Notion page before cleanup.

## Risks

- **Templates link regression persists** — The experiment broke the Templates sidebar link for self-hosted users with custom template libraries ([GitHub #25710](https://github.com/n8n-io/n8n/issues/25710)). Until cleanup is complete, affected users may not see their Templates link. **Likelihood: high** (actively occurring). Mitigation: prioritize cleanup or ship a targeted hotfix for the `MainSidebar.vue` conditional logic.

- **Incomplete cleanup leaves dead code** — With 10 components, 20 PNG assets, 33 i18n keys, and multiple integration points, partial cleanup risks leaving orphaned code. **Likelihood: medium.** Mitigation: use the file inventory above as a comprehensive checklist; verify with `pnpm typecheck` and `pnpm lint` after removal.

- **Telemetry data gap** — If the `User clicked on template` regression (GRO-249) is related to this experiment, template click analytics may have been broken since the experiment launched. **Likelihood: medium.** Mitigation: investigate root cause during cleanup; check if event was silently dropped or renamed.

## References

### Notion Spec
- [Experiment Spec](https://www.notion.so/2e75b6e0c94f8094b7abf67bd54d0934)

### Linear Tickets
- [GRO-184](https://linear.app/n8n/issue/GRO-184) — Resource Center | Design (Done)
- [GRO-185](https://linear.app/n8n/issue/GRO-185) — Resource Center | Implementation (Done)
- [GRO-271](https://linear.app/n8n/issue/GRO-271) — Cleanup: post-experiment code removal (Triage)
- [GRO-284](https://linear.app/n8n/issue/GRO-284) — Bug: tooltip shows on every page load (Canceled)
- [GRO-246](https://linear.app/n8n/issue/GRO-246) — Bug: title tag not updated when navigating (Canceled)
- [GRO-249](https://linear.app/n8n/issue/GRO-249) — Telemetry: template click event regression (Todo)

### GitHub
- [PR #24510](https://github.com/n8n-io/n8n/pull/24510) — feat(editor): Resource center experiment (Merged)
- [Issue #25710](https://github.com/n8n-io/n8n/issues/25710) — Templates button missing with custom template library (Closed)

### Key Files (to be modified during cleanup)
- `packages/frontend/editor-ui/src/app/constants/experiments.ts`
- `packages/frontend/editor-ui/src/app/constants/navigation.ts`
- `packages/frontend/editor-ui/src/app/router.ts`
- `packages/frontend/editor-ui/src/app/components/MainSidebar.vue`
- `packages/frontend/@n8n/i18n/src/locales/en.json`
- `packages/frontend/editor-ui/src/experiments/resourceCenter/` (entire directory)

### Precursor Experiments
- [GRO-89](https://linear.app/n8n/issue/GRO-89) — Template discovery ([PR #17183](https://github.com/n8n-io/n8n/pull/17183))
- [GRO-123](https://linear.app/n8n/issue/GRO-123) — Ready to Run v2 ([PR #19468](https://github.com/n8n-io/n8n/pull/19468))
- [GRO-133](https://linear.app/n8n/issue/GRO-133) — Template Recommendation v3 ([PR #20152](https://github.com/n8n-io/n8n/pull/20152))
