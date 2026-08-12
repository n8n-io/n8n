# Use workflowDocumentStore for Migrated Workflow Fields

We are actively migrating workflow state from `workflowsStore` (Pinia store defined in
`packages/frontend/editor-ui/src/app/stores/workflows.store.ts`) to `workflowDocumentStore`
(defined in `packages/frontend/editor-ui/src/app/stores/workflowDocument.store.ts`).

The `workflowDocumentStore` is the single source of truth for migrated fields.
When new frontend code reads or writes any of the fields listed below, it **must** use
`workflowDocumentStore` instead of `workflowsStore.workflow.*` or equivalent accessors.

**Already-migrated fields (do NOT access via workflowsStore):**
- `active`
- `activeVersion`
- `activeVersionId`
- `checksum`
- `createdAt`
- `homeProject`
- `meta`
- `pinData`
- `settings`
- `tags`
- `updatedAt`

**Detection criteria — flag when NEW code in `packages/frontend/` does any of:**
1. Reads a migrated field from `workflowsStore.workflow.<field>` (e.g. `workflowsStore.workflow.tags`)
2. Reads a migrated field from a destructured `workflow` ref originating from `workflowsStore`
3. Writes to a migrated field through `workflowsStore` (e.g. `workflowsStore.workflow.active = true`)
4. Calls a `workflowsStore` setter/action that only mutates a migrated field when
   `workflowDocumentStore` already exposes an equivalent method

**Do NOT flag:**
- Existing unchanged code (only review new or modified lines)
- Access to non-migrated fields (e.g. `workflowsStore.workflow.nodes`, `workflowsStore.workflow.connections`)
- Backend code — this rule applies only to `packages/frontend/`
- Code inside `workflowDocument.store.ts` or its sub-modules (those *are* the source of truth)
- Code inside `workflows.store.ts` itself (the migration is still in progress there)

**Recommendation:**
Use `useWorkflowDocumentStore(createWorkflowDocumentId(workflowId))` from
`@/app/stores/workflowDocument.store.ts` to access migrated fields.

This is an active migration. The list of migrated fields will grow over time.
