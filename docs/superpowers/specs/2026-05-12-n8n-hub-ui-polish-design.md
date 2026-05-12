# n8n Hub — UI Polish Design

**Date:** 2026-05-12
**Parent plan:** `docs/superpowers/specs/2026-05-10-n8n-hub-implementation-plan.md`
**Scope:** small, focused fixes on top of the in-flight Phase 5 (Observability) work — no DB changes.

## Why now

The Hub backend (Phase 1–2) and the first cut of single-node observability (Phase 5.1–5.4) are landed locally. A walkthrough on 2026-05-12 surfaced five UX papercuts that break the illusion that a single-node call is a first-class execution:

1. The executions list can't be filtered by which action was called *(deferred — see "Cut from scope")*.
2. The browser tab title shows the raw placeholder workflow name (`__n8n-hub-action::n8n-nodes-bas...`) instead of the friendly action label that the list shows.
3. The list's trigger-icon column shows nothing useful for single-node rows.
4. There's no obvious top-of-page navigation back to the executions list from a detail view (the inline "Back to list" link is buried at the bottom of the detail panel).
5. The window title issue is the same root cause as (2).

Independently, a staff review found three internal smells that compound the work and should be fixed in the same PR:

- `SOURCE_LABEL`, caller-display formatting, and friendly-name fallback logic are copy-pasted across three Vue files.
- Hub-placeholder detection is reimplemented in three places (`MainHeader.vue`, `WorkflowDetails.vue`, `workflow.service.ts`).
- `workflow.service.ts:getMany` filters hub placeholders *after* the DB query, which silently breaks pagination (asking for 20 rows can return fewer).

## Non-goals

- **No DB schema changes.** No `kind`/`type` column on `workflow_entity`. The longer-term refactor is acknowledged but parked.
- **No "Action" filter in the executions list.** Deferred until users actually ask for it; the generic metadata filter already works as a manual workaround.
- **No changes to backend execution behavior.** This is UI polish and one repository-query tweak.

## Cut from scope

| Item | Reason for cutting |
|---|---|
| First-class "Action" filter (dropdown + `GET /rest/executions/actions` endpoint) | User decided to live without it for now. The generic metadata filter already supports `key=actionId, value=<id>` as a manual fallback. Revisit if usage signals demand it. |
| `kind: 'standard' \| 'hub-action'` column on `workflow_entity` | Migration cost not justified yet. Tracked as a post-hackathon follow-up. Until then, we keep one well-named helper (`isHubPlaceholderName`) and live with the prefix sniffing. |

## Architecture

### Shared frontend utilities

New file: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts` (this file already exists for `executionRetryMessage`; we extend it).

Four pure functions, exported and unit-tested:

```ts
// Brand-like labels for the caller `kind` discriminator. Centralized so the
// three list/detail components agree on capitalization and forward-compat.
export const CALLER_SOURCE_LABEL: Record<ExecutionCallerKind | string, string> = {
  mcp: 'MCP',
  cli: 'CLI',
  sdk: 'SDK',
};

export function getCallerLabel(
  caller: ExecutionCaller | undefined,
  locale: ReturnType<typeof useI18n>,
): string {
  // Returns 'via MCP (Claude Desktop)' / 'via CLI (n8n-cli@host)' / '' if no caller.
}

export function getSingleNodeHeadline(
  extras: SingleNodeExecutionSummaryExtras,
  fallback: string,
): string {
  // actionDisplayName → actionId → nodeType → caller.name → fallback.
}

export function isHubPlaceholderName(name: string | undefined): boolean {
  return !!name && (name.startsWith('__n8n-hub-action::') || name.startsWith('__n8n-hub-'));
}

export function getFriendlyHubWorkflowName(name: string): string {
  // Strips the prefix and pretty-prints: 'n8n-nodes-base.slack.message.post' → 'slack — message post'.
}
```

All three Vue files (`GlobalExecutionsListItem.vue`, `WorkflowExecutionsCard.vue`, `WorkflowExecutionsPreview.vue`) drop their local copies and import these. `MainHeader.vue` and `WorkflowDetails.vue` swap their inline regex checks for `isHubPlaceholderName`.

### Document title fix

`useWorkflowInitialization.ts` is the only call site of `setDocumentTitle(data.name, ...)`. Wrap it:

```ts
const titleName = isHubPlaceholderName(data.name)
  ? getFriendlyHubWorkflowName(data.name)
  : data.name;
documentTitle.setDocumentTitle(titleName, 'IDLE');
```

Same change applies to the `AI_BUILDING` and `DEBUG` branches at lines 263 and 196.

After this lands, the browser tab on `/executions/<single-node-id>` reads `▶️ slack — message post · n8n` instead of `▶️ __n8n-hub-action::n8n-nodes-bas... · n8n`.

### Header breadcrumb swap

`WorkflowDetails.vue` already exposes `isHubPlaceholderWorkflow`. Today the template renders `FolderBreadcrumbs` for every workflow. For hub placeholders, render a minimal `N8nBreadcrumbs` instead:

```vue
<N8nBreadcrumbs
  v-if="isHubPlaceholderWorkflow"
  :items="hubBreadcrumbItems"
  data-test-id="hub-action-breadcrumbs"
  @item-selected="onHubBreadcrumbItemSelected"
/>
<FolderBreadcrumbs v-else ... />
```

Where:

```ts
const hubBreadcrumbItems = computed<PathItem[]>(() => [
  {
    id: 'executions',
    label: locale.baseText('generic.executions'), // existing i18n key
    href: router.resolve({ name: VIEWS.EXECUTIONS }).href,
  },
]);

function onHubBreadcrumbItemSelected(item: PathItem) {
  if (item.id === 'executions') {
    void router.push({ name: VIEWS.EXECUTIONS });
  }
}
```

The friendly action name (already computed as `displayedWorkflowName`) keeps its current rendering position via the `#append` slot — it stays as a non-editable text node (since `readOnlyActions` is already `true` for hub placeholders).

Once this lands, the now-redundant "Back to list" link in `WorkflowExecutionsPreview.vue:319` is removed.

### Source icon column

`GlobalExecutionsListItem.vue:334-341` today renders icons for `mode === 'manual'` (flask) and `mode === 'chat'` (message-square). Add a third branch for `mode === 'single-node'` that reads `execution.caller?.kind` and picks an icon:

```ts
const SOURCE_ICON: Record<ExecutionCallerKind, IconName> = {
  mcp: 'bot',      // MCP / agent-driven (Claude Desktop, etc.)
  cli: 'terminal', // CLI command
  sdk: 'code',     // SDK script
};
```

```vue
<N8nTooltip
  v-else-if="execution.mode === 'single-node' && execution.caller"
  :content="singleNodeCallerLabel"
  placement="top"
>
  <N8nIcon :icon="SOURCE_ICON[execution.caller.kind] ?? 'plug-zap'" />
</N8nTooltip>
```

Fallback icon `plug-zap` covers forward-compat (an unknown future `kind`).

### Repository-level placeholder filter

`packages/cli/src/workflows/workflow.service.ts:getMany` today (around line 191) does:

```ts
workflows = await this.workflowRepository.getMany(...);
workflows = workflows.filter((wf) => !wf.name?.startsWith('__n8n-hub-'));
```

This post-query filter silently truncates paginated responses (request 20, get back 17 if 3 placeholders happened to fall in the page). Move the filter into the query:

```ts
// In WorkflowRepository.getMany (or via an option flag on the existing method),
// add a WHERE clause:  workflow_entity.name NOT LIKE '__n8n-hub-%'
```

The exact mechanism depends on whether `getMany` already accepts a query-builder hook. If it doesn't, the smallest change is to expose an `excludeNamePrefix?: string` option and have `workflow.service.ts` pass `'__n8n-hub-'`. Pagination, count, and filter semantics all line up with the rendered list after this.

## Testing

| Area | Test |
|---|---|
| Utils | Unit-test all four new helpers in `executions.utils.test.ts`. Cover empty caller, all three known kinds, unknown future kind, and the headline fallback chain. |
| Document title | Vitest on `useWorkflowInitialization.ts` (or the doc-title composable directly) — feed in a hub placeholder name, assert the friendly name is set. |
| Breadcrumb | Snapshot/dom test on `WorkflowDetails.vue` with a hub placeholder vs standard workflow: assert the right component renders and the "Executions" link routes to `VIEWS.EXECUTIONS`. |
| Source icon | Component test on `GlobalExecutionsListItem.vue` covering each `caller.kind` and the no-caller fallback. |
| Repo filter | Add a Jest test to `workflow.service.test.ts` that seeds N standard + M placeholder workflows, requests page size = N, and asserts exactly N rows returned. |

No Playwright test added — the existing executions E2E flow already covers the happy path; the changes here are presentation-level.

## Migration / rollout

None required. All changes are additive or refactor:

- New utility functions are pure additions.
- Doc-title and breadcrumb changes only branch on the existing `isHubPlaceholderName` predicate — no behavior change for standard workflows.
- Source icon adds a `v-else-if` branch; the column is unchanged for non-single-node executions.
- Repo-level filter has identical semantics to the JS filter, just executed earlier and consistently.

## Risks

1. **Friendly-name parsing might drop information.** `getFriendlyHubWorkflowName` strips the package prefix (`n8n-nodes-base`) — for community nodes with a different package, we lose the namespace. Mitigation: keep the raw name in a tooltip on the breadcrumb segment for power users / debugging.
2. **The repo-level filter requires a custom WHERE clause** that may not fit cleanly into the existing `WorkflowRepository.getMany` signature. Mitigation: if extending the signature is invasive, leave the JS filter in place for this PR and file the SQL fix as a follow-up. The user-visible impact (off-by-N pagination) is minor on instances with a small number of placeholders.
3. **Icon choice is subjective.** `bot` / `terminal` / `code` are the proposed mapping but design may want to swap. Mitigation: implement via the `SOURCE_ICON` map so swapping is one-line.

## Effort

Total: ~4h, single engineer.

| Step | Effort |
|---|---|
| Extract helpers + sweep call sites | ~1h |
| Document title fix | ~30m |
| Breadcrumb swap | ~1h |
| Source icon | ~1h |
| Repo-level filter | ~30m |

## Follow-ups (not part of this design)

- **`kind` column on `workflow_entity`.** Drops the prefix-sniffing entirely. ~4h + migration. Tracked in the post-hackathon production handoff list of the parent plan.
- **First-class "Action" filter** in the executions list. Re-evaluate after users start asking for it.
- **i18n the MCP/CLI/SDK labels.** Brand-like terms; low priority.
