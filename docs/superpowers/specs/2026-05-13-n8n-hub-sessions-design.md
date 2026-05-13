# n8n Hub — Sessions & node-direct execution view

**Date:** 2026-05-13
**Parent specs:**
- `docs/superpowers/specs/2026-05-10-n8n-hub-design.md`
- `docs/superpowers/specs/2026-05-12-n8n-hub-ui-polish-design.md`

**Scope:** add optional session grouping to single-node executions and replace the canvas-first detail view with a node-direct view that includes a sibling rail when a session is present.

## Why now

The Hub branch landed two things: single-node executions are first-class (caller-attributed in the list, browser-tab title fixed, source icon per caller kind), and the four entry points (REST, CLI, SDK, MCP) all flow through the same `caller` payload (`kind`, `name`, `clientId`).

Two papercuts remain:

1. **No way to see "what did this agent run actually do."** A Claude conversation that fires 4 MCP calls scatters across the executions list, interleaved with workflow runs. The user can attribute each row to MCP, but not to *one logical run*.
2. **The detail view shows a canvas for a 1-node execution.** The user has to click into the node on the canvas to see input/output. The canvas is irrelevant for a single-node call — there's nothing to navigate.

This spec addresses both with a single concept (`caller.sessionId`) and one UI refactor (replace `<WorkflowPreview>` with a node-direct layout when `mode === 'single-node'`).

## Non-goals

- **No new DB columns or migrations.** Session id rides on `ExecutionMetadata`, same mechanism as the other caller fields.
- **No dedicated `sessionId` query parameter.** The existing metadata filter already supports `{ key: 'caller.sessionId', value: <id> }`; UI uses that under the hood.
- **No session-transcript view.** Considered and dropped — the sibling rail in the node-direct view already gives the user "all calls in this session + the current one's I/O" in one screen.
- **No `sessionLabel` field.** The `sessionId` is free-form text and can carry a short human description if the caller wants one. Adding a dedicated label is a v2 if usage signals demand.
- **No mandatory session id.** Sessionless single-node executions remain valid first-class citizens.

## Design decisions (resolved during brainstorming)

| Decision | Choice | Notes |
|---|---|---|
| Session identity | **Caller-supplied free-form string** | Server stores verbatim. No server-derived correlation. Aligns with how `caller.name` / `clientId` already work. |
| Grouping shape in list | **Sectioned inline** with collapsible session headers | Solo single-node calls and workflow runs interleave by time. |
| List grouping default | **On, user-toggleable**, persisted per user | Off → today's flat list. |
| `single-node` text badge | **Drop it.** | The MCP/CLI/SDK caller chip already discriminates these rows. |
| Session-of-1 rendering | **Flat row with session-id chip** | No group header for a single-call session. |
| Header click target | **Collapse/expand toggle only** | No dedicated session view. |
| Row click target | **Node-direct view + sibling rail** | Rail shows session siblings when `caller.sessionId` is present. |
| Canvas in detail view | **Removed** for `mode === 'single-node'` | No hybrid tabs. The placeholder workflow is an implementation detail. |
| Detail view shell | **Same `/executions/:id` route, not a modal** | Replaces what's rendered inside `WorkflowExecutionsPreview.vue` when mode is single-node. |
| Credential link | **Carried in** to the new detail view | Same `credentialInfo` computed + `RouterLink` to `VIEWS.CREDENTIALS` (with deleted-state fallback) as the current preview. |
| Session-id size cap | **512 chars** | `ExecutionMetadata.value` is `text` (no DB limit); cap is a Zod sanity ceiling that leaves room for short human descriptions. |

## Architecture

### Data model — `caller.sessionId`

A new optional field on the existing caller payload. No schema migration.

**`packages/@n8n/api-types/src/schemas/executions.schema.ts`**

```ts
export const ExecutionCallerSchema = z.object({
  kind: ExecutionCallerKindSchema,             // 'mcp' | 'sdk' | 'cli'
  name: z.string(),
  clientId: z.string().optional(),
  sessionId: z.string().min(1).max(512).optional(), // NEW
});

export const EXECUTION_CALLER_METADATA_KEYS = {
  // ...existing keys
  sessionId: 'caller.sessionId',                // NEW
} as const;
```

`extractExecutionCaller` gets a one-line extension that mirrors the `clientId` handling, so the same metadata-to-DTO bridge surfaces it.

### Semantics — `clientId` vs `sessionId`

For documentation purposes (matters for API docs, tool descriptions, and the spec's reviewers):

| Field | Identifies | Lifetime | Example |
|---|---|---|---|
| `caller.name` | The caller product | Forever | `"@n8n/sdk"`, `"@n8n/cli"`, `"Claude Desktop"` |
| `caller.clientId` | A specific app/installation using the caller | Stable across calls from that installation | `"voice-bot-prod-eu1"`, `"claude-desktop-mcp-abc"`, `"fil@laptop"` |
| `caller.sessionId` | A logical run/conversation within that installation | Bounded — process, MCP connection, or what the caller supplies | `"a3f24c…"`, `"daily-digest-2026-05-13"` |

A long-lived deployment (one `clientId`) produces many sessions (many `sessionId`s).

### Caller defaults

Each official caller generates a sensible default at the point where "a logical run starts":

**CLI** (`packages/@n8n/cli/src/commands/exec/run.ts`)
- Default: one UUID generated at process start. Same id for every call in the same `n8n exec …` invocation.
- Flag: `--session <id>` overrides.
- Rationale: a script that loops over `n8n exec` in a shell gets one session per iteration. A multi-step script inside one process gets one session.

**MCP** (`packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts`)
- Default: the MCP transport's existing per-connection session identifier. Each Claude Desktop conversation that establishes its own MCP session gets its own bucket automatically.
- The `n8n_execute_tool` input schema gains an optional `sessionId` field; if the agent passes one, it overrides the transport default.
- The tool description documents the field so agents can use it for finer-grained logical grouping (e.g., agent threads, multi-turn tasks).

**SDK** (`packages/@n8n/sdk/src/client.ts`, `proxy.ts`)
- Default: one UUID generated at `createClient({...})` time, stored on the client instance.
- Override: `createClient({ caller: { …, sessionId } })` to fix it, or pass `sessionId` on individual calls via `caller` overrides.
- Rationale: per script run = one session by default.

**REST** (`POST /rest/executions/node`)
- Accepts and persists `caller.sessionId` verbatim if provided. No server-side defaulting.

### Backend changes

Three small touches.

**1. DTO (`packages/cli/src/executions/dto/execute-node-request.dto.ts`)**

```ts
caller: z
  .object({
    kind: z.enum(['mcp', 'sdk', 'cli']),
    name: z.string(),
    clientId: z.string().optional(),
    sessionId: z.string().min(1).max(512).optional(), // NEW
  })
  .optional(),
```

**2. Persist (`packages/cli/src/executions/execute-node.service.ts`)**

Around line 511, in the same block that writes `caller.kind` / `caller.name` / `caller.clientId`:

```ts
if (req.caller.sessionId !== undefined) {
  metadata[EXECUTION_CALLER_METADATA_KEYS.sessionId] = req.caller.sessionId;
}
```

**3. Query (`packages/cli/src/executions/execution.service.ts`)**

No code change. The existing `metadata` filter on `ExecutionsQueryFilter` already supports `[{ key: 'caller.sessionId', value: '<id>' }]`. UI uses this directly (see §Frontend list and §Frontend detail). No dedicated `sessionId` filter field is added for v1 — keeps the API surface tight and the URL shape stable with what already works.

### Frontend — executions list

All changes under `packages/frontend/editor-ui/src/features/execution/executions/`.

**Toolbar — "Group by session" toggle**

A small switch in the executions-list toolbar (top of `WorkflowExecutionsList.vue` and the global executions view).

- Local-storage key: `executions.groupBySession`.
- Default: **on** when at least one single-node execution exists on the current page; otherwise the toggle is hidden (no visual change for instances without Hub usage).
- Off → flat list, identical to today.

**Grouping pass (in the store)**

When the toggle is on, the executions store partitions the current page's rows:

- Rows sharing a `caller.sessionId` get bucketed under one session group.
- Groups are ordered by the earliest call's timestamp.
- Solo rows (no `sessionId`, or session-of-1) stay as their own rows, interleaved by time.
- Pagination caveat: if a session's calls straddle a page boundary, the group on each page renders only its in-page children. Documented; acceptable for v1.

**Components**

- New `ExecutionsSessionGroup.vue`
  - Header row: chevron · caller chip (MCP/CLI/SDK) · `caller.name` · session-id chip · `N calls` · status rollup · time range.
  - Header is **collapse/expand only** — not a navigation target.
  - Default expanded if call count ≤ 5; otherwise collapsed. Persisted per-session-id in local state for the lifetime of the page.
  - Children render with the existing `GlobalExecutionsListItem.vue` (or equivalent for the workflow-scoped view), unchanged.
- New session-id chip on rows (in `GlobalExecutionsListItem.vue`). Clicking it pushes a URL with the existing metadata filter set to `caller.sessionId=<id>` — same shareable URL behavior as any other metadata filter.

**`single-node` text badge removed**

The current code paints a `single-node` badge next to the row title. Drop it. The MCP/CLI/SDK caller chip already discriminates these rows from workflow runs.

### Frontend — single-node detail view

`WorkflowExecutionsPreview.vue` today renders `<WorkflowPreview>` (the canvas) for every execution. The change: branch on `mode === 'single-node'` early and render a dedicated layout.

**Layout (text version of the mock)**

```
┌──────────────────────────────────────────────────────────────────┐
│  Executions › Slack — Post Message                          [×]  │  ← page header (existing)
├──────────────────────────────────────────────────────────────────┤
│  ● Slack — Post Message · success · 1.2s                         │  ← title row (existing)
├──────────────────────────────────────────────────────────────────┤
│  [MCP] via Claude Desktop · session a3f24c…   Cred: Slack-Prod → │  ← caller bar (NEW: + credential link)
├─────────────┬────────────────────────────────────────────────────┤
│ SESSION (3) │  Input · parameters     │  Output · 1 item         │
│ ● Slack…  ← │  ┌──────────────────┐   │  ┌──────────────────┐    │
│ ● Linear…   │  │ channel: …       │   │  │ { ok: true, … }  │    │
│ ✗ GitHub…   │  │ text: …          │   │  │                  │    │
│ View all →  │  └──────────────────┘   │  └──────────────────┘    │
└─────────────┴────────────────────────────────────────────────────┘
```

**Routing**

Same `/executions/:id` route as today. The detail content is rendered in-page, not as a modal. Whether the view spans the right-pane only (as today's preview does) or the full content area is a presentation choice owned by the parent `WorkflowExecutionsView.vue` — for v1 keep the existing right-pane shell so the list stays visible on the left, matching the current model.

**New components**

- `SingleNodeExecutionDetail.vue`
  - Replaces `<WorkflowPreview>` when `mode === 'single-node'`.
  - Reads `runData` for the executed node; renders two `RunData.vue` instances (one for input, one for output) using the existing JSON/Table/Schema toggles.
  - Hosts the caller bar (chip · `caller.name` · session-id chip · credential link).
  - Hosts the sibling rail when a `caller.sessionId` is present.
- `SingleNodeExecutionSiblingRail.vue`
  - Lists session siblings in chronological order. Shows status dot + action display name + timestamp.
  - Active row highlighted.
  - Row click → `router.push({ params: { executionId: sibling.id } })`.
  - Header: `Session · N calls` (plus a status rollup).
  - "View all in list →" footer link → pushes the URL-driven session filter (same as clicking the chip elsewhere). Caps the rail at 50 siblings; deeper sessions use the "view all" link.

**Caller bar contents** (carried over and extended)

- Caller-kind chip (`MCP` / `CLI` / `SDK`)
- `via <caller.name>`
- `session <session-id-short>` chip (when present)
- **Credential link** — same `credentialInfo` computed currently in `WorkflowExecutionsPreview.vue`:
  - Known credential → `RouterLink` to `VIEWS.CREDENTIALS` with the credential name as label.
  - Deleted credential → plain text with `(<credentialId>)` and a "deleted" hint.
  - No credentialId on the summary → omitted.

**Data fetching for the rail**

When the detail view opens for an execution with `caller.sessionId`, fetch siblings via the existing API:

```
GET /rest/executions?filter={ metadata: [{ key: 'caller.sessionId', value: '<id>' }] }
```

Cap at 50; the rail fetch is fire-and-forget. If it fails the view still renders without the rail and logs the error — the rail is enhancement, not load-blocking.

**Things this view drops**

- The canvas (`<WorkflowPreview>`).
- The redundant inline "Back to list" link added in the UI-polish phase — the breadcrumb covers it.
- Any workflow-editing affordances tied to the placeholder workflow.

### Edge cases

| Case | Behavior |
|---|---|
| Execution failed before producing output | Render input panel + error banner where output would go. Same layout. |
| `runData` missing entirely (rare — wiped from storage) | Existing 404-style fallback. |
| `runData` present, output array empty | "Node produced no items" placeholder in the output panel. |
| Sibling rail fetch fails | View renders without the rail; log the error. |
| Session has > 50 siblings | Rail shows the most recent 50; "View all in list →" link to the filtered flat list. |
| Pagination boundary in grouped list | Group renders only its in-page children. Documented v1 limitation. |
| Session-of-1 | Flat row with session-id chip. No group header. |

## Design system compliance

All new UI is implemented against `@n8n/design-system` and the rules in `packages/frontend/AGENTS.md`. No bespoke styling, no hardcoded spacing, no design-system bypass. The visual mocks in `.superpowers/brainstorm/…/final-mocks.html` are wireframes — they communicate layout, not pixels.

**Components (use existing, do not invent):**

| UI element | Design-system component |
|---|---|
| "Group by session" toolbar control | `N8nSwitch` |
| Caller chip (MCP / CLI / SDK) | `N8nBadge`. The current UI-polish phase landed `<span class="chip ...">` markup; migrate those existing call sites to `N8nBadge` in the same change so the list rows, the new session group header, and the new caller bar all share one primitive. Color theme keyed off `caller.kind`; mapping centralized in `executions.utils.ts`. |
| Session-group chevron / rollup icons | `N8nIcon` only — names from `updatedIconSet` in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`. No deprecated icons. |
| Session-id chip on rows | `N8nTag` (clickable variant), monospaced text for the id, action triggers the URL filter. |
| Rail title / row labels / metadata text | `N8nText` with semantic size + color tokens (no inline `font-size`). |
| Input / Output panels | **Reuse `RunData.vue`** — same component the workflow editor uses. No duplication. |
| Credential link | `RouterLink` to `VIEWS.CREDENTIALS`, styled with `var(--color--primary)` per the existing pattern in `WorkflowExecutionsPreview.vue`. |
| Status dots in the rail and group rows | `N8nIcon` with status-token colors (`--color--success`, `--color--danger`). |

**Tokens (semantic only):**

- Use tokens from `@n8n/design-system/src/css/_tokens.scss` and `_primitives.scss` for spacing, color, radius, typography.
- **Never** import from `_tokens.legacy.scss`.
- **Never** hardcode `px` for spacing — use `var(--spacing--*)`.
- Caller-kind chip colors share the same purple/green/amber palette established in the UI-polish phase; centralize the mapping in `executions.utils.ts` so all three list components, the rail, and the caller bar pull from one source.

**i18n:**

- All visible strings (`"Group by session"`, `"Session"`, `"N calls"`, `"View all in list"`, `"Credential"`, `"deleted"`, rollup labels, etc.) go through `@n8n/i18n`. New keys land in `packages/frontend/@n8n/i18n/src/locales/en.json` under the existing `executions.*` and `executionDetails.singleNode.*` namespaces.
- The caller-kind brand labels (`"MCP"`, `"CLI"`, `"SDK"`) stay non-translated, per the existing decision in the UI-polish spec.

**`data-testid` discipline:**

Single value, no spaces. New ids follow the existing convention:

- `executions-group-by-session-toggle`
- `executions-session-group` (per-group, with the group id appended where needed)
- `executions-session-chip`
- `single-node-execution-detail`
- `single-node-execution-rail`
- `single-node-execution-rail-item`
- `single-node-execution-credential` (already exists from the previous commit — verify it renders inside the new component)

**Review hook:**

When CSS / Vue changes are reviewed (self-review or PR), apply the `n8n:design-system` skill explicitly. Catch any deprecated-token use, hardcoded spacing, or design-system bypass at the same time as functional review.

## Testing

| Area | Test |
|---|---|
| Schema | Round-trip `extractExecutionCaller` with `sessionId` present and absent. |
| DTO | Reject `sessionId` length > 512; accept up to 512. |
| Service | `executeNode` with `caller.sessionId` writes the metadata row; absent → no row. |
| API | `POST /rest/executions/node` accepts `caller.sessionId`. |
| Grouping (FE store) | Unit-test the partitioning pass: solo rows, group-of-N, mixed with workflow runs, session straddling page boundary. |
| Group component | Snapshot for collapsed/expanded states; rollup label correct; chevron flips. |
| Session chip | Click → URL pushed with the metadata filter set. |
| Detail view | `mode === 'single-node'` → renders `SingleNodeExecutionDetail.vue`, not `WorkflowPreview`. |
| Sibling rail | Renders when `caller.sessionId` present; absent → no rail. Active row matches current execution. Row click navigates. |
| Credential link | Known credential → link with name. Deleted → plain-text fallback. No id → omitted. |
| Caller defaults | CLI: one sessionId per process. SDK: one sessionId per `createClient`. MCP: tool input override beats transport default. |

No new Playwright test is required for v1; the existing executions E2E covers the navigation happy path. Add one targeted Playwright spec only if the grouping toggle or the rail navigation prove flaky in manual testing.

## Migration / rollout

None required. All changes are additive:

- `caller.sessionId` is optional everywhere. Existing callers and stored executions continue to work.
- Group-by-session toggle defaults on only when single-node executions exist on the page; pure-workflow instances see no change.
- The detail-view branch is gated on `mode === 'single-node'`; workflow executions keep the canvas.

## Risks

1. **Pagination + grouping interaction.** Sessions straddling a page boundary appear partial. Mitigation: documented. If users complain, fetch one extra page or add a "show full session" affordance in the group header. For v1 the volume is bounded enough that this is rarely visible.
2. **Sibling-rail fetch volume.** Each detail-view open fires one filter query. Cheap at low volumes; could be cached per session-id for the session-list lifetime. Mitigation: simple in-memory cache keyed by `sessionId` in the executions store.
3. **No DB index on `caller.sessionId`.** Filter queries scan-and-match within the metadata table. Acceptable for v1; if usage justifies, add an index on `(key, value)` or break out a dedicated `session_id` column. Tracked as a follow-up.
4. **Caller defaults could surprise users.** A user looping `n8n exec` 100× in a shell will create 100 sessions. Documented; users wanting one session pass `--session <id>` explicitly.

## Effort

Single engineer, ~1.5 days end to end:

| Step | Effort |
|---|---|
| API types + DTO + extract helper | ~30m |
| Persist + tests | ~30m |
| CLI default + flag | ~30m |
| MCP default + tool input + tool description | ~1h |
| SDK default + override surface | ~1h |
| List toolbar toggle | ~1h |
| Grouping pass + session-group component + tests | ~3h |
| Session-id chip + URL filter | ~30m |
| Drop `single-node` badge | ~10m |
| Detail-view branch + `SingleNodeExecutionDetail.vue` | ~3h |
| Sibling rail component + fetch + tests | ~2h |
| Credential link carry-in | already on branch — verify it renders inside the new component |
| Documentation in spec + follow-ups | ~30m |

## Follow-ups (out of v1 scope)

- **Dedicated `(key, value)` index** on `ExecutionMetadata` for `caller.sessionId`. Add once filter usage is measurable.
- **`sessionLabel`** on the caller payload, if free-form `sessionId` text proves inadequate for human display.
- **Dedicated "Session" filter input** in the filter sidebar, if usage shows users wanting it (vs. the chip-click path).
- **Session-transcript view** (chronological stack of a session's calls with their I/O), if the rail-driven flipping proves insufficient for "what did the agent do."
- **Cache sibling-rail results** in the executions store keyed by `sessionId`.
- **One Playwright spec** that exercises group toggle + click into detail with rail navigation.
