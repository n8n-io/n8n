# Migrated workflow fields must use workflowDocumentStore

Applies to: `packages/frontend`.

Workflow state is actively migrating from `workflowsStore`
(`packages/frontend/editor-ui/src/app/stores/workflows.store.ts`) to
`workflowDocumentStore`
(`packages/frontend/editor-ui/src/app/stores/workflowDocument.store.ts`).

`workflowDocumentStore` is the single source of truth for migrated fields. New
code that reads or writes one of them must go through it, not through
`workflowsStore.workflow.*` or an equivalent accessor.

Already-migrated fields — do NOT access these via `workflowsStore`:

`active`, `activeVersion`, `activeVersionId`, `checksum`, `createdAt`,
`homeProject`, `meta`, `pinData`, `settings`, `tags`, `updatedAt`

Flag when NEW code does any of:

1. Reads a migrated field from `workflowsStore.workflow.<field>`
2. Reads one from a destructured `workflow` ref originating in `workflowsStore`
3. Writes one through `workflowsStore`, e.g. `workflowsStore.workflow.active = true`
4. Calls a `workflowsStore` setter/action that only mutates a migrated field,
   when `workflowDocumentStore` already exposes an equivalent method

Do NOT flag:

- Non-migrated fields, e.g. `workflowsStore.workflow.nodes`, `.connections`
- Code inside `workflowDocument.store.ts` or its sub-modules — those *are* the
  source of truth
- Code inside `workflows.store.ts` itself — the migration is still in progress there

Use `useWorkflowDocumentStore(createWorkflowDocumentId(workflowId))` from
`@/app/stores/workflowDocument.store.ts`.

This is an active migration; the field list will grow.
