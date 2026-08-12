# Project Files

Persistent files attached to a project — a first-class project asset alongside
data tables. Users upload and manage them from the project **Files** tab;
workflows write them with the **Add file to project** node.

The bytes live in `BinaryDataService`, so they land wherever the instance already
stores binary data (filesystem, S3, Azure, or the database). This module owns no
storage driver — only the metadata, the authorization, and the quotas.

---

## Capabilities

| Capability | Notes |
|---|---|
| **Upload** | One file per request, multipart. Any MIME type; no extension or type filtering |
| **Replace** | Uploading an existing name is rejected unless it opts in, then swaps the content in place and reclaims the old bytes |
| **List** | Paginated, name search, `updatedAt DESC` with an id tiebreaker, plus the project's storage usage |
| **Download** | Streams as `Content-Disposition: attachment`; never buffered in a tab |
| **Preview** | Inline in a dialog, for images and text only — see [Preview](#preview) |
| **Rename** | Metadata only; the stored bytes are untouched |
| **Delete** | Removes the row and the bytes |
| **Write from a workflow** | The `n8n-nodes-base.projectFile` node writes into the project that owns the executing workflow |
| **Attribution** | Every file records who created and last touched it — a user or a workflow |
| **Quotas** | Per file, per team project, and one instance-wide budget shared by all personal projects |
| **Ownership transfer** | Files follow the project when it changes owner, and their bytes are deleted with it |

Not supported: expression access (`$projectFiles[...]`), file-change triggers,
public API endpoints, source-control sync, folders, or versioning.

---

## Layout

```
project-files/
├── project-files.module.ts          @BackendModule: entities, controller, node context, transfer handlers
├── project-files.controller.ts      REST surface, RBAC, HTTP error mapping
├── project-file.service.ts          Business logic: store, rename, delete, quotas
├── project-file.repository.ts       All TypeORM lives here
├── project-file.entity.ts           The project_file row
├── project-file-response.service.ts Row → API response; resolves actors, strips the binary ref
├── project-file-proxy.service.ts    Bridge to the Add file to project node
├── project-file-upload.middleware.ts multer staging for multipart uploads
├── project-file-cleanup.service.ts  Sweeps abandoned staged uploads
├── project-files.types.ts           Actor, source, list options, quota scope
├── errors/                          Domain errors the controller and node map
└── utils/size-utils.ts              Byte formatting for messages
```

Related code outside this directory:

| Where | What |
|---|---|
| `@n8n/db/src/migrations/common/1786000000000-CreateProjectFilesTable.ts` | Table, unique index, FKs, `binary_data.sourceType` check |
| `@n8n/config/src/configs/project-files.config.ts` | All env vars |
| `@n8n/api-types/src/project-file.ts` | Response types |
| `@n8n/api-types/src/dto/project-file/` | Request DTOs |
| `@n8n/api-types/src/schemas/binary-data.schema.ts` | `ProjectFilePreviewableMimeTypes` |
| `@n8n/permissions` | `projectFile:*` scopes |
| `editor-ui/src/features/core/projectFiles/` | The Files tab |
| `nodes-base/nodes/ProjectFile/` | The node |

---

## REST API

All routes are nested under the project and gated by a project scope. A middleware
resolves the project first, so an unknown project is `404` rather than `403`.

| Method | Path | Scope |
|---|---|---|
| `GET` | `/projects/:projectId/files` | `projectFile:listProject` |
| `POST` | `/projects/:projectId/files?overwrite=` | `projectFile:create` |
| `GET` | `/projects/:projectId/files/:fileId/content?action=` | `projectFile:read` |
| `PATCH` | `/projects/:projectId/files/:fileId` | `projectFile:update` |
| `DELETE` | `/projects/:projectId/files/:fileId` | `projectFile:delete` |

`projectFile:list` also exists but authorizes nothing yet — it is reserved for a
future cross-project overview, mirroring how `dataTable:list` relates to
`dataTable:listProject`.

Mutating routes additionally refuse when source control has the branch in
read-only mode.

### Status codes

| Code | When |
|---|---|
| `400` | No file attached, blank name, unrecognised `action`, or a type that can't be previewed |
| `403` | Missing scope, or the instance branch is read-only |
| `404` | Unknown project, or a file that belongs to another project |
| `409` | Name already taken, or an overwrite lost a concurrent race |
| `413` | Over the per-file cap, over a quota, or too large to preview |

---

## Data model

`project_file`, one row per file:

| Column | Notes |
|---|---|
| `id` | nanoid, generated before the bytes are stored so the blob path is attributable |
| `projectId` | FK → `project`, **CASCADE** |
| `name` | Sanitized; **unique per project** |
| `mimeType` | Client-declared |
| `fileSizeBytes` | `int`, so a single file can't exceed 2 GiB — config validation enforces it |
| `binaryDataId` | Mode-prefixed `BinaryDataService` reference |
| `createdById` / `updatedById` | FK → `user`, **SET NULL** |
| `createdByWorkflowId` / `updatedByWorkflowId` | FK → `workflow_entity`, **SET NULL** |
| `createdAt` / `updatedAt` | `updatedAt` means *last touched*, so a rename bumps it |

### `binaryDataId` must never reach a client

`GET /rest/binary-data?id=` is authenticated but performs **no ownership check**,
so a leaked reference is a cross-project file read for any user on the instance.
Both boundaries that could expose it strip it deliberately:
`ProjectFileResponseService` for the REST API, and `toNodeOutput` in
`ProjectFileProxyService` for node output, which is visible in the NDV and
persisted in execution data.

It is also intentionally **not** a foreign key — `binary_data` only has rows when
the instance runs in `database` binary mode.

### Attribution

A file is written either by a person or by a workflow, never both, so exactly one
id column of each pair is set. The API turns that into a discriminated union
(`{ type: 'user', … } | { type: 'workflow', … }`). Both being null means the actor
was deleted — both FKs are `SET NULL` — which the UI renders as "Unknown".

Attribution is display and filter only, **never an authorization input**. Access
is purely project-scoped; an uploader has no special rights over their own file.

---

## Storage integration

Files are stored at a custom binary-data location:

```ts
FileLocation.ofCustom({
  pathSegments: ['projects', projectId, 'files'],
  sourceType: 'project_file',
  sourceId: projectFileId,
})
```

Uploads take a path (`copyBinaryFile`) or a stream, never a fully buffered
`Buffer` for large inputs, so a 100 MB file never lands in memory.

Two rules the code depends on:

1. **Deletion goes through `deleteManyByBinaryDataId`, never `deleteMany(locations)`.**
   Prefix deletion is optional on the `Manager` interface and absent on S3 and
   Azure, so it would silently leak every file there. Deleting by id also groups
   references by mode prefix, so files written before a storage-mode switch still
   delete correctly.
2. **A missing `stored.id` is fatal.** The in-memory `default` binary mode returns
   the bytes inline with no durable reference, so the service throws
   `OperationalError` rather than writing a row that points at nothing.

### Ordering, and why there are no row locks

Bytes are always written before any row is written or updated, so a failure leaves
an unreferenced blob rather than a row pointing at bytes that don't exist.

Overwrite is a **compare-and-swap**: the update only lands if the row still
references the bytes that were read. `SELECT … FOR UPDATE` would throw on SQLite,
so a lock would be a Postgres-only guarantee. The writer whose update didn't land
deletes its own blob and gets a `409`, so no interleaving leaves an orphan or a
row pointing at deleted bytes.

Deletes remove the row first and the bytes after, so a crash leaks bytes rather
than leaving a dangling row.

---

## Quotas

| Scope | Applies to |
|---|---|
| Per file | Every upload, whatever the project |
| Per project | Team projects, each with its own budget |
| Instance-wide personal | **All personal projects share one budget** |

The personal budget being shared means a user can be blocked by other people's
uploads, so the error message names the instance-wide limit rather than implying a
personal one.

Concurrent uploads are each checked independently, so overshoot is bounded at
`concurrency × maxFileSize` and self-corrects. The UI uploads a multi-file drop
sequentially to keep reported usage honest.

Both sums widen past 2^31 — Postgres promotes `SUM(int)` to `bigint` and SQLite
integers are 64-bit — so only the per-file column is bounded.

---

## Preview

Inline preview is deliberately narrow. `ProjectFilePreviewableMimeTypes` is a
**strict subset of `ViewableMimeTypes`**, and a test enforces the subset
relationship so it can't widen without a deliberate change to the instance-wide
policy.

Previewable: `png`, `jpeg`, `jpg`, `gif`, `webp`, `bmp`, `json`, `plain`, `csv`,
`markdown`.

| Excluded | Why |
|---|---|
| `application/pdf` | Excluded by `ViewableMimeTypes` — code-execution risk in PDF engines |
| `text/html`, `image/svg+xml` | Execute script on the n8n origin |
| `image/tiff` | Only Safari renders it |
| `audio/*`, `video/*` | The content route has no `Accept-Ranges`, so no seeking |

`?action=view` serves `Content-Disposition: inline` plus
`X-Content-Type-Options: nosniff` and the sandbox CSP. The nosniff header is what
stops bytes uploaded as `text/plain` that are really HTML from being sniffed and
rendered as HTML, which would defeat the allowlist. The allowlist is enforced on
the server — a client-side check is decorative.

Text is rendered as a text node, never `innerHTML`, and truncated client-side on
top of the server's size cap.

---

## The node

`n8n-nodes-base.projectFile` ("Add file to project") takes a binary field and a
file name, with an optional **Replace Existing File** toggle that defaults on.

The node has **no project parameter**. The target is always the project that owns
the executing workflow, resolved through `OwnershipService`, which is why no
per-execution scope check is needed: a workflow cannot write to another project's
files. An unsaved workflow has no owner row, so that same lookup is what stops an
unpersisted workflow id from reaching the `createdByWorkflowId` FK.

`ProjectFileProxyService` is published into workflow context by the module's
`context()` hook and re-wraps the module's errors as `NodeOperationError` with a
concrete next step, since a node error needs to tell the builder what to change.

---

## Configuration

| Env var | Default |
|---|---|
| `N8N_PROJECT_FILES_MAX_FILE_SIZE_BYTES` | 100 MiB (validated below 2 GiB) |
| `N8N_PROJECT_FILES_PROJECT_MAX_SIZE_BYTES` | 2 GiB |
| `N8N_PROJECT_FILES_PERSONAL_TOTAL_MAX_SIZE_BYTES` | 1 GiB |
| `N8N_PROJECT_FILES_MAX_PREVIEW_SIZE_BYTES` | 10 MiB |
| `N8N_PROJECT_FILES_CLEANUP_INTERVAL_MS` | 1 minute |
| `N8N_PROJECT_FILES_FILE_MAX_AGE_MS` | 10 minutes |

The last two govern the sweeper over the multipart staging directory. Uploads are
removed as soon as the request finishes, so the sweeper only reclaims files a
crash left behind. It never touches stored blobs — reclaiming those means
paginating an object-store prefix and diffing against the database, where a bug
deletes live customer files.

The `project_file` table is created on every instance whether or not the module is
enabled, since the migration lives in `@n8n/db/migrations/common`. Disabling the
module leaves an empty table, not a missing one.

---

## Gotchas

- **Browser-driven requests can't send the `browser-id` header.** Download is a
  navigation and preview is an `<img>` subresource, so the content route is in
  `skipBrowserIdCheckEndpoints` in `auth.service.ts`. Without that entry every
  download 401s. The entry is a RegExp because the endpoint string mixes a
  resolved `:projectId` with a literal `:fileId`.
- **Integration tests can't catch that class of bug.** The test server injects
  `req.browserId` on every request, so the check always passes there. Only the
  Playwright suite exercises the missing-header path.
- **Never branch on `mimeType.startsWith('text/')`** — `text/html` is inside that
  prefix. Previewability is explicit list membership only.
- **Unique-index case sensitivity differs by driver.** `Logo.png` and `logo.png`
  collide on SQLite but not Postgres. `DataTable` has the same property; a fix
  needs a lowercased `nameKey` column.
- **Project files don't sync through source control.** A project pulled onto
  another instance arrives with no file rows.

---

## Tests

| Suite | Location |
|---|---|
| Service, real DB and real filesystem blobs | `cli/test/integration/modules/project-files.integration.test.ts` |
| REST API, RBAC, preview headers | `cli/test/integration/modules/project-files.api.test.ts` |
| Route-scope guard | `__tests__/project-files.controller.scopes.test.ts` |
| Preview allowlist subset | `@n8n/api-types/src/schemas/__tests__/binary-data.schema.test.ts` |
| Store, view, preview renderer | `editor-ui/src/features/core/projectFiles/` |
| End to end | `testing/playwright/tests/e2e/project-files/` |

The route-scope guard fails when a new endpoint is added without a
`projectFile:*` scope, so an unguarded route can't slip through review.
