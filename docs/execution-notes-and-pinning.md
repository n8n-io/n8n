# Execution Notes & Pinning

This document explains the user‑facing behavior and API surface that were added
in PR A to support annotating and prioritizing workflow executions.

## Overview

- **Execution Notes** let operators leave free‑form context (why a run failed,
  mitigations, follow‑ups) directly on the execution record.
- **Execution Pinning** keeps critical runs at the top of execution lists and
  allows the “Show pinned only” filter so on‑call teams can focus on the most
  important items.

Both features cover the full stack: database columns, REST API endpoints, UI
surfacing, and Pinia store actions.

## Using the feature in the UI

1. Open the **Executions** sidebar from any workflow or from the global
   “Executions” view.
2. Hover a row to reveal the new pin icon. Click once to pin, again to unpin.
   Pinned runs show a solid icon and bubble up in the list.
3. Use the **Show pinned only** checkbox in the filter popover to narrow the
   list.
4. Select any execution to open the preview drawer, then use the **Add note**
   action to create or edit the note. Notes display their last editor and
   timestamp below the text area.

All strings are localized via `@n8n/i18n/src/locales/en.json`.

## REST API reference

| Endpoint | Purpose | Payload |
| --- | --- | --- |
| `PATCH /rest/executions/:id/note` | Create/update/clear the note attached to an execution. | `{ "note": "string \| null" }` |
| `PATCH /rest/executions/:id/pin` | Toggle the pinned flag for an execution. | `{ "pinned": true \| false }` |

### Example

```bash
curl -X PATCH \
  http://localhost:5678/rest/executions/123/note \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: <api-key>" \
  -d '{ "note": "Investigated on-call, waiting for upstream fix." }'
```

Both routes enforce the same permission checks as `PATCH /rest/executions/:id`
and return the updated `IExecutionFlattedResponse`, including the new
`note`, `noteUpdatedAt`, `noteUpdatedBy`, `pinned`, `pinnedAt`, and `pinnedBy`
fields that now exist on `ExecutionEntity`.

## Data model

- `packages/@n8n/db/src/entities/execution-entity.ts` defines the new columns.
- Migration `1764200000000-AddExecutionNotesAndPins` ensures all supported
  databases receive the schema change.

## Testing

- Backend: `packages/cli/src/executions/__tests__/execution.service.test.ts`
  and `executions.controller.test.ts` cover the service logic and endpoints.
- Frontend: `packages/frontend/editor-ui/src/features/execution/executions/executions.store.test.ts`
  exercises the new store actions; components have targeted unit tests where
  applicable.

Run the standard suite before opening a PR:

```bash
pnpm build
pnpm lint
pnpm test
```



