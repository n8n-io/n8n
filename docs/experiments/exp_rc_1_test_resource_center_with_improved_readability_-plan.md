---
experiment-name: "(Exp-RC-1) Test resource center with improved readability"
notion-page-id: "2e95b6e0-c94f-80b1-bb00-ca2280eb394c"
---

# (Exp-RC-1) Test resource center with improved readability — Implementation Plan

> Generated from [Notion spec](https://www.notion.so/2e95b6e0-c94f-80b1-bb00-ca2280eb394c) on 2026-03-03

## Summary

This experiment is the **V2 iteration** of the resource center concept, following
Exp-RC-0 (`063_resource_center_0`) which was declared a failure. RC-1 hypothesises
that the original experiment underperformed because (a) the tile/card design was
too noisy and hard to scan, and (b) the sidebar was collapsed by default, hiding the
resource center entry point.

RC-1 tests two changes together: **improved tile design** for easier readability and
**expanded sidebar by default** for natural discoverability. The target audience is
**new trial users only**. Success is measured by d14 activation rate (+5% lift),
percentage of instances visiting the resource center (10.2% → 20%), and returning
visitor rate (18% → 40%).

## Tasks

### 1. Implementation

All implementation work in a single task. Since the RC-0 codebase is still present
and the cleanup ticket (GRO-271) is in Triage, the recommended approach is to
**extend the existing `experiments/resourceCenter/` code** with a new experiment
constant and variant-conditional rendering rather than building from scratch.

**Effort estimate: M (Medium)** — Most infrastructure exists from RC-0. The main
work is registering a new experiment, updating tile components for improved
readability, wiring sidebar expansion, adding new content, and updating telemetry.

- [ ] Register `RESOURCE_CENTER_V1_EXPERIMENT` in `packages/frontend/editor-ui/src/app/constants/experiments.ts` (e.g. `0XX_resource_center_1` with `control`/`variant` variants)
- [ ] Add `RESOURCE_CENTER_V1_EXPERIMENT.name` to `EXPERIMENTS_TO_TRACK`
- [ ] Create or extend the resource center Pinia store to check RC-1 variant via `posthogStore.getVariant()`
- [ ] Gate the experiment to trial users only using `cloudPlanStore.userIsTrialing`
- [ ] **Sidebar expansion**: Wire RC-1 variant to expand sidebar by default (either extend the existing `useSidebarExpandedExperiment` composable or add logic in `MainSidebar.vue` for RC-1 users)
- [ ] **Tile design updates** (pending design spec from @Romeo Balta):
  - [ ] Update `TemplateCard.vue` for improved readability
  - [ ] Update `VideoThumbCard.vue` for improved readability
  - [ ] Update `SandboxCard.vue` / `FeaturedSandboxCard.vue` for improved readability
  - [ ] Create `NodeMinicard.vue` component if the "tools mini cards" concept requires a new component (uses `NodeIcon` from design system)
- [ ] **Content updates**: Update `resourceCenterData.ts` with new/improved content entries
- [ ] **Sidebar integration**: Update `MainSidebar.vue` to show resource center link for RC-1 variant users, with explicit `hasCustomTemplatesHost` check to avoid self-hosted regression (ref: GitHub #25710)
- [ ] Add i18n keys in `@n8n/i18n/src/locales/en.json` with prefix `experiments.resourceCenter.*` for any new/changed copy
- [ ] **Telemetry events**:
  - [ ] `User visited resource center` (with RC-1 variant context)
  - [ ] `User clicked on resource center tile` (with section, type, id)
  - [ ] `User clicked on node minicard` (with tool identifier)
  - [ ] `User visited resource center section` (with section id)
- [ ] Handle interaction between RC-0 and RC-1: ensure only one experiment is active per user (coordinate via PostHog flag targeting)
- [ ] Write unit tests for the new store logic and variant gating
- [ ] Write component tests for updated tile components
- [ ] Fix known RC-0 bugs in the RC-1 implementation:
  - [ ] Title tag not updating on navigation (GRO-246)
  - [ ] Tooltip showing on every page load (GRO-284)

**Blockers:**
- Tile design spec is incomplete — marked as `@Romeo Balta to fill` in the Notion spec. Cannot implement tile design changes until this is provided.

### 2. Design

The spec explicitly references design work for the tile redesign (`@Romeo Balta to fill`
in the Tile Design section). Design deliverables are needed before implementation can
proceed on tile components.

- [ ] Tile design spec for improved readability (less noisy, more consistent, more differentiated)
- [ ] Light and dark mode mockups for control and variant
- [ ] Node minicard component design (compact card showing node icon + name)
- [ ] Updated content strategy (which templates, videos, courses to feature)

### 3. Cleanup

Separate from implementation. After experiment results are in:

- [ ] Remove RC-1 feature flag and experiment constant from `experiments.ts`
- [ ] Remove from `EXPERIMENTS_TO_TRACK`
- [ ] Promote winning variant to default (or remove experiment code entirely)
- [ ] Remove RC-1-specific store logic and variant branching
- [ ] Clean up any RC-1-only components
- [ ] Update tests
- [ ] Coordinate with RC-0 cleanup (GRO-271) — if RC-1 ships, RC-0 cleanup becomes a subset of RC-1 cleanup

## Open Questions

- **[Blocker] Tile design is unspecified.** The Notion spec says `@Romeo Balta to fill` under Tile Design. Without design specs, the tile redesign cannot be implemented. *Suggested default: start implementation of non-design work (experiment registration, sidebar expansion, telemetry, gating) while waiting for design.*

- **What is the relationship between RC-0 and RC-1 code?** Should RC-1 extend the existing `experiments/resourceCenter/` directory with variant branching, or should it be a new directory (`experiments/resourceCenterV1/`)? *Suggested default: extend the existing code, since the routes and most infrastructure are reusable. Add RC-1 variant checks alongside RC-0 checks.*

- **How does RC-1 sidebar expansion relate to the existing `067_sidebar_expanded` experiment?** The spec says "expand sidebar by default" but there is already a separate sidebar expanded experiment. Should RC-1 depend on 067, replace it, or be independent? *Suggested default: make RC-1 sidebar expansion independent — if the user is in the RC-1 variant, expand the sidebar regardless of the 067 experiment assignment.*

- **What is the PostHog feature flag name?** The spec's "Feature Flag" section is empty. *Suggested default: follow the existing naming convention, e.g. `0XX_resource_center_1` where XX is the next available number.*

- **What are the exact variants?** The spec doesn't enumerate variants. RC-0 had three variants (`control`, `variant-resources`, `variant-inspiration`). *Suggested default: use simple `control`/`variant` since the spec describes a single treatment (improved readability + expanded sidebar).*

- **What specific content changes are planned?** The Content table in the spec is sparse (only mentions "tools mini cards" and "node minicard"). What templates, videos, and courses should be featured? *Suggested default: reuse RC-0 content data as a starting point and update based on content strategy input.*

- **Should RC-0 be cleaned up before or after RC-1 ships?** GRO-271 is still in Triage. *Suggested default: defer RC-0 cleanup until RC-1 results are in, since RC-1 reuses RC-0 infrastructure.*

- **Telemetry schema is incomplete.** The telemetry table has placeholder values and missing event names. *Suggested default: follow RC-0 telemetry patterns and add the `User clicked on node minicard` event as specified.*

## Risks

- **Self-hosted sidebar regression** — RC-0 caused a bug where self-hosted users with custom template hosts lost their Templates link (GitHub [#25710](https://github.com/n8n-io/n8n/issues/25710)). RC-1's sidebar changes could reintroduce this if the `hasCustomTemplatesHost` check is not properly handled. *Likelihood: medium.* *Mitigation: add explicit `hasCustomTemplatesHost` check in sidebar logic; add a unit test specifically for this case.*

- **RC-0/RC-1 experiment interaction** — Both experiments target the same UI (resource center, sidebar). If a user is enrolled in both PostHog flags simultaneously, the experience could be inconsistent. *Likelihood: medium.* *Mitigation: configure PostHog targeting so RC-0 and RC-1 are mutually exclusive; add client-side guard to prefer RC-1 over RC-0 if both are active.*

- **Design dependency delays implementation** — Tile design is explicitly incomplete (`@Romeo Balta to fill`). If design takes longer than expected, the experiment timeline slips. *Likelihood: high.* *Mitigation: separate implementation into design-dependent (tile components) and design-independent (experiment registration, gating, sidebar, telemetry) work. Start with the latter.*

- **Sidebar expansion may conflict with user preference** — The existing sidebar expanded experiment (`067_sidebar_expanded`) respects whether the user has manually set a collapsed/expanded preference (checks `uiStore.sidebarMenuCollapsed === null`). RC-1 needs to decide whether to override user preference. *Likelihood: low.* *Mitigation: follow the same pattern — only expand sidebar for users who haven't explicitly set a preference.*

- **Metric attribution ambiguity** — RC-1 tests two changes simultaneously (tile design + sidebar expansion). If the experiment succeeds, it will be unclear which change drove the improvement. *Likelihood: medium.* *Mitigation: this is a known trade-off accepted in the spec. Consider adding telemetry to measure sidebar clicks separately from tile interactions for post-hoc analysis.*

## References

- **Notion spec**: [Link](https://www.notion.so/2e95b6e0-c94f-80b1-bb00-ca2280eb394c)
- **Predecessor spec (RC-0)**: [Notion](https://www.notion.so/2e75b6e0c94f8094b7abf67bd54d0934)

### Code files that will be modified

| File | Purpose |
|------|---------|
| `packages/frontend/editor-ui/src/app/constants/experiments.ts` | Register new experiment constant |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/stores/resourceCenter.store.ts` | Extend store with RC-1 variant checks |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/views/ResourceCenterView.vue` | Update tile layout for improved readability |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/components/TemplateCard.vue` | Tile design updates |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/components/VideoThumbCard.vue` | Tile design updates |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/components/SandboxCard.vue` | Tile design updates |
| `packages/frontend/editor-ui/src/experiments/resourceCenter/data/resourceCenterData.ts` | Content updates |
| `packages/frontend/editor-ui/src/app/components/MainSidebar.vue` | Sidebar integration + expansion |
| `packages/frontend/@n8n/i18n/src/locales/en.json` | i18n keys for new copy |

### Related Linear tickets

| Ticket | Title | Status |
|--------|-------|--------|
| [GRO-185](https://linear.app/n8n/issue/GRO-185) | Resource Center \| Implementation (RC-0) | Done |
| [GRO-184](https://linear.app/n8n/issue/GRO-184) | Resource Center \| Design (RC-0) | Done |
| [GRO-271](https://linear.app/n8n/issue/GRO-271) | Cleanup — RC-0 post-experiment code removal | Triage |
| [GRO-246](https://linear.app/n8n/issue/GRO-246) | Bug — Title tag not updated in resource center | Canceled |
| [GRO-284](https://linear.app/n8n/issue/GRO-284) | Bug — Resource center tooltip shows on every page load | Canceled |
| [GRO-248](https://linear.app/n8n/issue/GRO-248) | Capture sidebar collapsed/expanded state in telemetry | Todo |

### Related GitHub PRs/Issues

| Link | Title |
|------|-------|
| [PR #24510](https://github.com/n8n-io/n8n/pull/24510) | feat(editor): Resource center experiment (RC-0) |
| [PR #25096](https://github.com/n8n-io/n8n/pull/25096) | feat(editor): Sidebar state experiment |
| [PR #25186](https://github.com/n8n-io/n8n/pull/25186) | fix(editor): Sidebar labels are not visible |
| [Issue #25710](https://github.com/n8n-io/n8n/issues/25710) | No Template button if custom template library is set |
