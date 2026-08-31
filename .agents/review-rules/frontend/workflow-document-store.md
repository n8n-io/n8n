# Migrated workflow fields must use workflowDocumentStore

Applies to: `packages/frontend`.

Workflow state is migrating from `workflowsStore` to `workflowDocumentStore`,
now the single source of truth for the fields already moved:

`active`, `activeVersion`, `activeVersionId`, `checksum`, `createdAt`,
`homeProject`, `meta`, `pinData`, `settings`, `tags`, `updatedAt`

Flag NEW code reading one of those from `workflowsStore.workflow.<field>` or a
`workflow` ref destructured out of it, writing one through `workflowsStore`,
or calling a `workflowsStore` action that only mutates a migrated field.
Point at `useWorkflowDocumentStore(createWorkflowDocumentId(workflowId))`.

Do NOT flag non-migrated fields such as `.nodes` or `.connections`, or the two
store files themselves. The list grows as the migration proceeds.
