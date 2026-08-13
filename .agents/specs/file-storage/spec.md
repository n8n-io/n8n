n8n DESIGN DOCUMENT · APPROVED FOR IMPLEMENTATION 

# File storage — project-scoped user files 

Product/UX and technical design for uploading files into a project and using them from workflows — the file sibling of Data tables. Grounded in `n8n-io/n8n@master` (paths verified 2026-08-11, tree `560455faf108` ). Wireframes: [wireframes.png](./wireframes.png). 

Status  Draft v3 · revised after implementation planning Feature name  Files Structural sibling  Data tables Storage layer  @n8n/blob-storage 

##### PART A — PRODUCT/UX 

1. Users, jobs, and use cases 

2. Mental model & naming 

3. Information architecture & navigation 

4. Core flows 

5. Screen-by-screen spec 

6. States & edge cases 

##### PART B — TECHNICAL 

   1. Summary · 2. Data model · 3. Storage layout 

   4. API surface · 5. RBAC & ownership 

   6. Files node design · 7. Expression implementation 

   8. Frontend architecture · 9. Quotas, config, licensing 

   10. Lifecycle & failure modes · 11. Scaling & deployment 

   12. Phasing · 13. Risks & open questions 

7. Node UX 

8. Expression UX 

9. Content design 

10. Telemetry 

##### PART A 

## Product/UX design 

### A1 · Users, jobs, and use cases 

The user is the same person who uses Data tables: a technical workflow builder who today smuggles files through workarounds — base64 blobs in data table cells, re-fetching from Google Drive on every run, or pinned data that dies with the execution. Files gives that person a named, persistent, project-scoped place for the file itself. 

|Scenario|What the design must make easy|
|---|---|
|Lookup/config file|A`pricing.csv`or`routing-rules.json`read by many workflows. Replacing the file<br>updates every workflow on its next run — no re-wiring. Golden path: 'Files →<br>Download' → 'Extract From File' → use the rows.|
|Templates for composition|Logo images, email header art, a DOCX contract template attached or merged when<br>composing emails and documents.|
|Producer/consumer handoff|A nightly workflow writes`report-latest.xlsx`; a second workflow (or a person, via<br>download) picks it up later. Survives execution pruning.|
|Knowledge for AI nodes|Product docs or FAQs fed to AI/RAG nodes each run without re-uploading to a vendor<br>per workflow.|
|Accumulating artifacts|A workflow appends daily exports (`export-2026-08-11.csv`) that ops browse and<br>download from the UI.|



#### Non-goals 

- Not a Drive replacement: no folder hierarchy in MVP, no sharing links, no collaborative editing, no file-level permissions beyond project membership. 

- Not execution-artifact browsing: execution binary data stays where it is, with its own pruning. Files never lists it. 

- Not versioning: replace overwrites. Version history is a possible follow-up, not MVP. 

- Not a media pipeline: no server-side thumbnailing, transcoding, or OCR. 

### A2 · Mental model & naming 

###### DECISION 

Call the feature Files, presented as a project tab next to Data tables. One-sentence explanation shown in the empty state: _“Store files in this project and read or write them from any of its workflows.”_ The strongest alternative was “File storage” (clearer as a system capability, and matches this doc's working title) — rejected in navigation because tabs name the resource, not the capability: Workflows, Credentials, Data tables, Files. “Assets” was rejected as marketing-flavored and ambiguous next to node icons and images. 

|Term|Meaning|
|---|---|
|File|A named, mutable, project-scoped blob. Name is unique within the project (like a data table<br>name). Identity is the id; the name is the human handle.|
|Replace|Swapping a file's content while keeping its name, id, and every reference to it. The core verb —<br>there is no “version”.|
|Execution binary data|The transient per-run file data flowing between nodes. Files is the durable shelf; executions<br>borrow from and publish to it via the Files node.|
|Folder|Not in MVP — see the namespace decision below.|



###### DECISION — NAMESPACE SHAPE 

Flat namespace per project for MVP, unique `name` per project (mirroring `DataTable` 's `@Index(['name','projectId'], {unique:true})` ). Slashes are allowed _inside_ names ( `templates/welcome.html` ) so teams can fake prefixes and search by them; the UI treats them as plain characters. The alternative — real folders backed by `FsByteStore` path segments — is cheap in storage but expensive everywhere else (breadcrumbs, move flows, resource-locator UX, rename cascades) and can be layered on later without migration because storage keys are id-based, not name-based. 

###### DECISION — REPLACE SEMANTICS 

Uploading a file whose name already exists prompts a conflict dialog: Replace (default), Keep both (auto-suffix `report (1).csv` ), or Cancel. Workflows referencing the file by name or id see replaced content on their next read — deliberately: a file is a named mutable resource, and “update the CSV, every workflow picks it up” is the headline use case. In-flight executions never see mixed content — a read copies bytes into execution binary data at read time; a read racing a replace can fail notfound and is safe to retry (B6, B10). And because a mutable named resource with no undo needs more than warning copy, rename/replace/delete dialogs show how many workflows use the file (dependency tracking ships in MVP, A5). The alternative — immutable content plus versions — is safer but turns the simple “swap the logo” job into version management; rejected for MVP. 

### A3 · Information architecture & navigation 

Files plugs into every surface Data tables already occupies, via the same `module.descriptor.ts` contract ( `packages/frontend/ editor-ui/src/features/core/dataTable/module.descriptor.ts` is the template): 

|Surface|Behavior|
|---|---|
|Project tab|`projectTabs.project`entry “Files” → route`files`under each project, after Data tables.|
|Overview page|`projectTabs.overview`entry →`/home/files`, cross-project listing with ownership badges<br>(aggregate controller, B4); the personal project behaves as it does for data tables<br>(overview sub-page → personal project).|
|Command bar & favorites|The descriptor's`resources: [{ key: 'file', displayName: 'File' }]`is registered but has<br>no production readers today — command bar search needs its own composable in<br>`features/shared/commandBar/composables/`(`useFilesNavigationCommands.ts`, mirroring<br>`useDataTableNavigationCommands.ts`), and favorites need the`FavoriteResourceType`<br>union extended with`'file'`plus a favorites resolver registered in the backend module's<br>`init()`(mirror`register-favorite-resolver.ts`).|
|Details route|None in MVP. A file has no grid to edit, so “open” means preview — a side panel over the<br>list (A5), not a navigation. Route`files/:id`exists only as a deep link that opens the list<br>with the preview panel open.|



### A4 · Core flows 

Upload (single or multi, button or drag-and-drop) 

|||no<br>Toast: limit error<br>temp file removed|
|---|---|---|
|Add file button<br>or drop anywhere on list|POST multipart<br>(multer temp file)|<br>Quota +<br>per-file size OK?|
|||yes<br>no<br>yes<br>Name exists<br>in project?<br>Stream temp file to byte store<br>insert row · toast Saved<br>Conflict dialog:<br>Replace / Keep both / Cancel|
|Flow||Steps|
|Browse / search / sort||Debounced name search, sort by last updated (default), name, or size — the exact<br>`ResourcesListLayout`contract Data tables uses, including the size-sort persistence exclusion.|
|Preview||Click a row → side panel renders inline when the mime type is in`ViewableMimeTypes`; otherwise<br>metadata + Download. Reuses the NDV binary viewer components (A5).|
|Download||Row action → authenticated GET streams with`Content-Disposition: attachment`(same<br>headers as`binary-data.controller.ts`).|
|Rename||Row action → prompt modal, uniqueness validated inline. Dialog warns: “Workflows that<br>reference this file by name will stop finding it.” (id references keep working).|
|Replace||Row action → file picker → confirm showing old vs new size/type, “Used by N workflows”, and a<br>“Download current version” link — the escape hatch for a mutable resource with no undo. Name,<br>id, references unchanged.|
|Delete||Row action or bulk-select → confirm dialog: “This permanently deletes the file. Workflows that<br>read it will fail. You can't undo this action.”, with the used-by count → row removed; bytes swept<br>after a grace period (B10).|
|Use in a workflow||The UI → node bridge: preview panel footer offers “Use in workflow”, which copies a ready-<br>made Files-node reference (and, once expressions ship, the`$files(…)`snippet). In the editor,<br>the Files node's resource locator lists project files by name — the same list/id/name locator as<br>the Data table node.|



### A5 · Screen-by-screen spec 

#### List view ( **`FilesView.vue`** ) 

Built on `ResourcesListLayout` + `ResourcesListEmptyState` with `ProjectHeader` , exactly like `DataTableView.vue` . Each row is a `FileCard.vue` modeled on `DataTableCard.vue` ( `N8nCard` + `N8nIcon` + `N8nText` + `TimeAgo` + `ProjectCardBadge` ): 

|Element|Spec|
|---|---|
|Prepend icon|Lucide icon by mime family:`file-text`,`image`,`file-spreadsheet`,`file-audio`,`file-video`,<br>fallback`file`. No thumbnails in MVP.|
|Header|File name (bold), read-only badge when source control is in read-only mode.|
|Footer cells|Size · type (short mime label, e.g. “CSV”) · Last updated`TimeAgo`· Created — pipe-separated<br>like the data table card.|
|Row actions|Preview · Download · Replace · Rename · Delete via`N8nActionToggle`, plus Add to favorites<br>(the A3 resolver) and a`DependencyPill`“used by” count exactly as on`DataTableCard.vue`<br>— the workflow-index module already indexes data-table dependencies and<br>`DependencyResourceType`is a shared API type; MVP extends it with`'file'`. Mutations<br>hidden behind the same read-only/permission gating as`DataTableActions.vue`.|
|Bulk actions|Checkbox select → Delete n files (single confirm). Bulk download deferred (needs zip<br>streaming).|
|Upload affordance|Primary “Add file” button in`ProjectHeader`(multi-select picker) plus a full-list drop target:<br>dragging files over the view shows a dashed overlay “Drop files to upload to this project”.<br>Upload plumbing follows the data table CSV upload endpoint (`data-table-`<br>`uploads.controller.ts`); the progress UI is net-new —`useToast`has no progress<br>affordance and`ImportCsvModal.vue`is a single-file blocking modal — so the view gets a<br>small upload-queue list (per-file progress bar, cancel, retry, “Apply to all” on conflicts) pinned<br>above the list while uploads run. Costed as one of the larger novel frontend builds in Part A.|
|Storage meter|Quiet “Instance file storage: x of y used” caption right-aligned above the list, from`GET /`<br>`files/limits`— labeled instance-wide explicitly, because the quota is per instance (B9) and<br>an unlabeled number above one project's list reads as that project's usage. Banners take<br>over at warn/error thresholds (A6).|



#### Preview panel ( **`FilePreviewPanel.vue`** ) 

A right-side sliding panel (NDV-style). Body reuses the NDV binary viewer rendering — with one honest caveat: `BinaryDataDisplayEmbed.vue` takes an `IBinaryData` prop and computes its URL internally against `/rest/binary-data` , so MVP includes a small refactor extracting the viewer core to accept an explicit source URL. Small, but net-new — not drop-in reuse. Mime types outside `ViewableMimeTypes` ( `packages/@n8n/api-types/src/schemas/binary-data.schema.ts` ) get an icon, metadata block, and Download button — never inline rendering (HTML, SVG, PDF stay download-only for the XSS/CSP reasons documented in that schema). Footer: Download · Replace · “Use in workflow”. 

#### Modals 

- Name conflict — `N8nModal` , shown per conflicting file when multi-uploading, with “Apply to all”. Actions: Cancel / Keep both / Replace (primary). 

- Rename — single text input, inline uniqueness error, name-reference warning. 

- Delete — destructive confirm per the content-design pattern; bulk variant lists the count. 

### A6 · States & edge cases 

|State|Treatment|
|---|---|
|Empty|`ResourcesListEmptyState`: “Store files in this project and read or write them from any of<br>its workflows.” + Add file button (also a drop target).|
|Loading|Skeleton rows via the layout's built-in loading state; 300 ms delayed spinner like<br>`DataTableView.vue`.|
|Upload progress / failure|Per-file rows in the upload-queue list (A5): progress bar, cancel, retry. A failed upload's<br>row persists with the server message and a Retry action; partial multi-upload success<br>keeps the successes.|
|Oversized file|Rejected client-side before upload when size is known: “Files must be 50 MB or smaller”<br>(limit from frontend settings). Server re-checks regardless (B9).|
||Two banners in`BannerStack.vue`(`features/shared/banners/`), cloned from|
|Quota warning / exceeded|`DataTableStorageLimit{Warning,Error}Banner.vue`. At error, Add file / Replace disable<br>with a tooltip.|
|Name conflict|Conflict dialog (A5). Node-initiated writes take a conflict parameter instead (A7) — never<br>an interactive prompt.|
|Unsupported preview|“Preview isn't available for this file type.” + metadata + Download.|
|No permission|Viewer role: list + preview + download only; mutating actions hidden (not disabled), same<br>convention as data tables.|
|Source-control read-only|Read-only badge on cards; mutations disabled with the shared read-only tooltip; server<br>enforces via an inline`checkInstanceWriteAccess()`guard at the top of each mutation<br>handler (the`data-table.controller.ts:78-85`pattern —`middleware/branch-write-`<br>`access-middleware.ts`exists but is unused dead code; do not copy it).|
|Module disabled|Tab hidden (frontend module not registered); Files node fails execution with “File storage<br>is disabled on this instance.”|



### A7 · Node UX 

One node: Files ( `n8n-nodes-base.files` ), mirroring the Data table node's resource + operation layout ( `packages/nodes-base/ nodes/DataTable/` ), `usableAsTool: true` , subtitle bound to the operation. Single resource ( `file` ) in MVP: 

|Operation|Parameters & output|
|---|---|
|Download|File (resource locator) · Put output in field (default`data`). Output: one item with a binary property +<br>metadata in json — appears in the NDV output binary tab like any HTTP Request download.|
|Upload|Input binary field (default`data`) · File name (expression-friendly) · If file exists: Replace (default) / Keep<br>both / Error. Output: json metadata of the saved file.|
|Get many|Optional name-contains filter, sort, limit. Output: one item per file, metadata only (no bytes) — for fan-<br>out into Download.|
|Delete|File (resource locator). Output:`{ deleted: true, name }`.|



The File parameter is a resource locator with From list (a `listSearch` method like `tableSearch` in the Data table node's `common/ methods.ts` ), By name, and By ID modes. “By name” is first-class because replaced files keep working and names are what AIbuilt workflows reference. Rename and metadata edits stay UI-only in MVP to keep the node small; Get many + Download compose for bulk reads. Verbs are Download/Upload rather than Read/Write to match vendor-node vocabulary (Google Drive, S3); the alternative, Read/Write, reads better for config files but collides with the 'Read/Write Files from Disk' node and implies local disk. The NDV shows a storage-limit callout on the Files node when the instance is at quota (mirror `NodeStorageLimitCallout.vue` ), and the node ships its `builderHint` in Phase 1 — it's node metadata, and AI-built workflows are exactly why by-name references exist. 

### A8 · Expression UX 

###### DECISION 

Ship node-only access in MVP; ship `$files('name')` as the first fast-follow (Phase 2), resolving to metadata + a signed URL — never bytes. The expression sandbox is synchronous ( `WorkflowDataProxy.getDataProxy()` returns plain values), so anything needing async I/O at evaluation time is out; metadata resolves from a per-execution snapshot (B7). Deferring is honest: data tables shipped node-only without blocking anyone, and a bad async story would be worse than none. 

|Expression|Resolves to|
|---|---|
|`$files('logo.png')`|`{ id, name, mimeType, size, updatedAt, url }`—`url`is a short-lived<br>signed download URL (JWT, same mechanism as`createBinarySignedUrl`).|
|`$files('logo.png').url`|The headline use: an HTTP Request URL field — fetched during the run, well<br>inside the TTL. Explicitly not for email img src: recipients open mail hours or<br>days later, after the URL expires — email imagery goes through 'Files →<br>Download' as an attachment instead.|
|`$files.all()`|Array of the same metadata objects for the workflow's home project.|



- Autocomplete: `$files` registered alongside `$vars` in the expression editor's completions; typing `$files('` suggests project file names — the files store fetches the name list on workflow open (it is _not_ populated in the editor context by the Files view, which fills it on view entry). 

- Inline preview: shows the resolved metadata object from the client-side snapshot; `.url` previews as a placeholder — “signed 

URL, generated at run time”. Expression preview evaluates in the browser ( `useWorkflowHelpers.ts` builds `additionalKeys` client-side) and the signing secret is server-only, so no real token can — or should — be minted in the editor. 

- Errors: unknown name resolves to `undefined` with the hint “No file named 'logo.png' in this project” — matching `$vars` miss behavior rather than throwing. 

- Not offered: `.content` . Bytes flow through the Files node only, keeping memory behavior predictable. 

### A9 · Content design 

Namespace: `files.*` in `@n8n/i18n` , mirroring the ~150-key `dataTable.*` structure. Sentence case, direct, risk stated plainly: 

|Key|Copy|
|---|---|
|`files.empty.heading`|Store files for your workflows|
|`files.empty.description`|Store files in this project and read or write them from any of its workflows with the<br>'Files' node.|
|`files.upload.conflict.title`|'{name}' already exists|
|`files.upload.conflict.description`|Replacing updates the file everywhere it's used. Workflows that read '{name}' will get<br>the new content on their next run.|
|`files.delete.confirm.title`|Delete file|
|`files.delete.confirm.description`|This permanently deletes '{name}'. Workflows that read it will fail. You can't undo this<br>action.|
|`files.rename.warning`|Workflows that reference this file by name will stop finding it.|
|`files.upload.error.tooLarge`|Files must be {size} or smaller|
|`files.banner.limitExceeded`|File storage is full. Uploads and workflow writes are paused until you delete files.<br>({used} of {limit} used) — terse two-sentence shape aligned with the<br>`dataTable.banner.*`siblings|
|`files.toast.saved`|Saved|



### A10 · Telemetry 

Registered in the `@n8n/telemetry` event registry — as fresh registry entries: the data-table precedent ( `'User hit data table storage limit'` in `data-table-size-validator.service.ts` ) is a raw `track()` call, so there is nothing to literally reuse: 

- `User uploaded project file` — mime family, size bucket, source (button / drop / replace), conflict resolution chosen 

- `User previewed project file` — viewable vs download-only 

- `User deleted project file` — single vs bulk, count 

- `User hit file storage limit` — total_bytes, max_bytes, surface (ui-upload / node-write) 

- `Files node executed` — fired on first use per workflow, not per run (per-run would be high-volume); operation, conflict mode, success/error class 

- `User inserted $files expression` — via autocomplete vs typed (Phase 2) 



<!-- Start of picture text -->
PART B<br><!-- End of picture text -->

## Technical design 

### B1 · Summary 

Goals: project-scoped persistent files with UI CRUD, a Files node, quota enforcement, and clean behavior across fs/s3/az/db storage and queue mode. Non-goals: folders, versioning, sharing, presigned direct uploads, expression bytes. 

A new `file-storage` backend module shaped byte-for-byte like `packages/cli/src/modules/data-table/` : a `project_files` metadata table in the app DB, bytes in a `ProjectFileStore` built on `ByteStoreRegistry` (the agent-knowledge pattern from `agent-knowledge-file-store.ts` ), project-scoped controllers + an aggregate controller, `file:*` scopes, a Files node behind a proxy service with a node allowlist, and a Data-tables-style quota validator. fs streams end-to-end; S3/Azure writes currently buffer (see B11) — the per-file cap is sized for that reality. 

###### DECISION — STORAGE ARCHITECTURE 

Own store on `ByteStoreRegistry` , not `BinaryDataService` + `FileLocation.ofCustom` . The BinaryDataService route buys `IBinaryData.id` compatibility and the existing `/binary-data` endpoints, but couples persistence to `N8N_DEFAULT_BINARY_DATA_MODE` — and the in-memory `default` mode would silently make “persistent” files vanish. The 2.34 agents refactor deliberately moved knowledge files off BinaryDataService onto ByteStoreRegistry; Files follows the direction of travel. Like agents, `db` storage mode is honored by writing bytes to the `binary_data` table with a new `sourceType` . 

### B2 · Data model 

```
// packages/cli/src/modules/file-storage/project-file.entity.ts
@Entity({ name: 'project_files' })
@Index(['projectId', 'name'], { unique: true })   // ← DataTable's uniqueness pattern
@Index(['projectId', 'updatedAt'])                // list default sort
export class ProjectFile extends WithTimestampsAndStringId {
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Relation<Project>;
  @Column({ type: 'varchar', length: 36 }) projectId: string;
  @Column({ type: 'varchar', length: 255 }) name: string;            // unique per project
  @Column({ type: 'varchar', length: 2, default: 'fs' })
  storedAt: ExecutionDataStorageLocation;                            // 'fs' | 's3' | 'az' | 'db'
  @Column({ type: 'text' }) storageKey: string;                      // AgentFile's persisted-key pattern
  @Column({ type: 'varchar', length: 255 }) mimeType: string;
  @Column({ type: 'bigint' }) fileSizeBytes: number;                 // SUM()'d for quota
}
```

- Repository: `ProjectFileRepository` with use-case-named methods ( `findByProjectId` , `findByName` , `getTotalSizeBytes` , `transferAllToProject` ); transactions through `TransactionRunner` ; no `.manager` in services (lint-enforced). 

- Migration 1: create `project_files` . Entity is returned from the module's `entities()` like `DataTableModule` . 

- Migration 2: add `'project_file'` to the `binary_data.sourceType` CHECK enum via constraint-swap, following `1785255306000CreateAgentChatAttachmentsTable.ts` ; extend `SourceTypeSchema` in `packages/@n8n/db/src/entities/binary-data-file.ts` . 

- Denormalized metadata (name/mime/size on the row, not the store) — same rationale documented in `agent-file.entity.ts` : fs has no native metadata, and list views must not touch the byte store. 

### B3 · Storage layout 

Key scheme (id-based, never name-based — rename is a DB-only operation): `project-files/{projectId}/{fileId}` . In `db` mode the key is a fresh uuid into `binary_data` ( `sourceType: 'project_file'` , `sourceId: fileId` ). Replace writes to a new key, then swaps `storageKey` in the row; the old key is deleted by the orphan sweeper's two-pass reconciliation (B10) — never in the same pass it is discovered — so a read that raced the swap can still finish its stream. Replace is atomic-by-swap on every backend, and a crashed replace leaves only an orphan, never a corrupt file. 



<!-- Start of picture text -->
Write path (upload / node Upload)<br>multer temp file<br>or execution binary stream<br>Read path (download / preview / node Download)<br>project_files row<br>(storedAt, storageKey)<br>ProjectFileStore.write<br>(fs streams; s3/az buffer — B11)<br>ProjectFileStore.readStream mode fs/s3/az mode db<br>ByteStoreRegistry.get(mode) binary_data row<br>HTTP response prepareBinaryData → key: project-files/{projectId}/{fileId} sourceType: project_file<br>(UI download/preview) execution binary data (node)<br>project_files row insert/update<br>(storedAt + storageKey + size)<br><!-- End of picture text -->

### B4 · API surface 

Project controller `@RestController('/projects/:projectId/files')` with project-existence middleware and an inline `checkInstanceWriteAccess()` guard at the top of every mutation handler (the `data-table.controller.ts` pattern); aggregate controller `@RestController('/files')` for cross-project listing and limits — the split of `data-table.controller.ts` / `data-table-aggregate.controller.ts` . Note the deliberate prefix divergence: the data-table aggregate lives at `/data-tables-global` , but that suffix is a rename artifact (from `/data-stores-global` ), not a rule; `/files` is free (verified) and is also the natural home for Phase 2's `GET /files/signed` . One zod DTO per operation under `packages/@n8n/ api-types/src/dto/project-files/` . 

|Verb|Path|Scope|Notes / DTO|
|---|---|---|---|
|`GET`|`/projects/:projectId/files`|`file:listProject`|Paginated; name filter; sort name/size/updatedAt.<br>`ListProjectFilesQueryDto`|
|`POST`|`/projects/:projectId/files`|`file:create`|Multipart (multer disk temp + serialized post-<br>upload quota check);`conflict=replace|`<br>`keepBoth|error`query param|
|`GET`|`/projects/:projectId/files/:fileId`|`file:read`|Metadata only|
|`GET`|`/projects/:projectId/files/:fileId/`<br>`content`|`file:read`|`?action=view|download`— headers,<br>ViewableMimeTypes gate, and sandbox CSP<br>copied from`binary-data.controller.ts`;<br>streams|
|`PUT`|`/projects/:projectId/files/:fileId/`<br>`content`|`file:update`|Replace (multipart, key-swap per B3)|
|`PATCH`|`/projects/:projectId/files/:fileId`|`file:update`|Rename.`UpdateProjectFileDto`|
|`DELETE`|`/projects/:projectId/files/:fileId`|`file:delete`|Row first, then bytes via sweeper (B10)|
|`POST`|`/projects/:projectId/files/batch-delete`|`file:delete`|Bulk delete for multi-select — a body on DELETE<br>is dropped by some proxies, so bulk gets its own<br>POST route.`BatchDeleteProjectFilesDto`|
|`GET`|`/files`|`file:list`|Cross-project listing for /home/files (role-filtered)|
|`GET`|`/files/limits`|`file:list`|Used/max bytes + status for banners and the<br>meter.`@GlobalScope('file:list')`with<br>`file:list`added to`GLOBAL_MEMBER_SCOPES`—<br>the`dataTable:list`pattern; every route carries<br>a scope decorator, and instance-wide usage<br>never leaks to roles with zero file access|



### B5 · RBAC & ownership 

Scopes: `file:create · file:read · file:update · file:delete · file:list · file:listProject` . Fewer than data tables because a file has no row/column sub-resources; content read/write fold into read/update. Project membership is the entire ownership model — no resource-level sharing. Registration points (all in `packages/@n8n/permissions/src/` ): 

1. `constants.ee.ts` — scope declarations 

2. `roles/scopes/global-scopes.ee.ts` — owner/admin get all six; member gets `file:list` globally (added to `GLOBAL_MEMBER_SCOPES` , the `dataTable:list` pattern — what protects `/files/limits` , B4) 

3. `roles/scopes/project-scopes.ee.ts` — project admin/editor: all; viewer: `read + listProject` 

4. `roles/custom-role-scopes.ee.ts` — with the read→list pairing rule ( `file:read` pairs `file:listProject` ) 

5. `public-api-permissions.ee.ts` — Phase 2, with the Public API handlers 

- **`check-access.ts`** branch: add a `fileId` URL-param branch next to the existing `dataTableId` one (lines ~150–165), guarded by `ModuleRegistry.isActive('file-storage')` , resolving the file's project and 404ing when absent. 

- Project transfer/delete: register with `OwnershipTransferHandlerRegistry` in `init()` exactly as `data-table.module.ts` does. Transfer = update `projectId` rows in the transaction (bytes don't move; keys embed the _old_ projectId, which is fine — keys are opaque and persisted). Name collisions in the target project auto-suffix. Delete = per-key byte deletion driven from rows, then rows — `S3ByteStore` / `AzureByteStore` have no `deletePrefix` , so bulk deletes are always per-key from DB rows. 

### B6 · Files node design 

New `packages/nodes-base/nodes/Files/Files/` mirroring `DataTable/` — the `nodes/Files/` group directory already exists (hosting `ConvertToFile/` , `ExtractFromFile/` , `ReadWriteFile/` ), so the node gets a same-named subdirectory, the `ExecuteWorkflow/ExecuteWorkflow/` precedent: `Files.node.ts` , `actions/router.ts` , one file per operation, `common/methods.ts` with `fileSearch` for the resource locator. The node reaches the backend through the module-context proxy chain: 

```
node  →  this.helpers.getProjectFilesProxy()
```

- `→  additionalData['file-storage'].projectFilesProxyProvider   // module context()` 

- `→  ProjectFilesProxyService                                   // packages/cli` 

- `ALLOWED_NODES = ['n8n-nodes-base.files', 'n8n-nodes-base.filesTool']` 

- `resolves projectId via OwnershipService.getWorkflowProjectCached` 

- `checkInstanceWriteAccess() on mutations (branchReadOnly → ForbiddenError)` 

One helper, not a pair: the data-table precedent splits `getDataTableProxy` / `getDataTableAggregateProxy` because rows are a sub-resource bound to a `dataTableId` ; files have no sub-resource, so a single aggregate-shaped `getProjectFilesProxy()` (including `getProjectId()` , which `fileSearch` needs) covers every operation. And no per-op *scope* re-checks on the node path — node executions carry no `User` , and the precedent's `requireScope` calls live only on the user-bound path ( `makeDataTableOperationsForUser` , used by MCP); node-path authorization is the allowlist + home-project resolution + the write-access guard. A user-bound `makeProjectFilesOperationsForUser` factory arrives with MCP tools in Phase 3. 

Helper wiring: a new `file-storage-helper-functions.ts` beside `data-table-helper-functions.ts` in `packages/core/src/ execution-engine/node-execution-context/utils/` , returning `{}` when the module is inactive. The proxy's read/write methods speak streams: 

- Download: proxy returns `{ metadata, stream }` ; the node pipes the stream into `helpers.prepareBinaryData(stream, name, mimeType)` — a copy into execution binary data. This closes gap #1 without touching the hardcoded `{ type: 'execution' }` in `binary-helper-functions.ts` : reads need no persistent-location helper, and copy-on-read means reads never see mixed content. A read racing a replace/delete is two non-atomic steps (SELECT row → open stream) and can fail not-found (fs ENOENT / S3 NoSuchKey); it is safe to retry, and the grace-period key deletion (B3, B10) makes the window small. The alternative — reference semantics (an `IBinaryData.id` pointing at the persistent key) — avoids the copy but breaks execution pruning invariants and makes replace a data race; rejected. 

- Upload: the node obtains the input stream via `helpers.getBinaryStream(binaryData.id)` (buffer fallback for in-memorymode data) and hands it to the proxy's `write(name, stream, meta, conflictMode)` . Quota is validated before and enforced after the write (size known only post-stream; over-quota writes are rolled back key-first). Concurrent writes to the same name across executions/workers: last-write-wins via the B3 key-swap — each writer lands a complete object; the row swap is a single DB update, and the loser's key is swept later (B10). No locks; documented behavior. Two accepted caveats, stated in docs: the serialized quota chain is per-instance, so parallel near-cap writes on different workers can both spuriously roll back; and orphaned keys consume real storage invisible to `SUM(fileSizeBytes)` until the sweep. 

- Tool variant: `usableAsTool: true` generates `filesTool` , allowlisted in the proxy like `dataTableTool` . 

### B7 · Expression implementation (Phase 2) 

- Resolution model: the expression sandbox is synchronous, so `$files` is backed by a per-execution snapshot: the server 

loads the project's file metadata rows — one indexed query, no bytes — into `additionalKeys` , the same channel that injects 

- `$secrets` ( `IWorkflowDataProxyAdditionalKeys` , `interfaces.ts:3103` ). Editor previews build `additionalKeys` in the browser ( `useWorkflowHelpers.ts` ), fed from the same metadata endpoint; `.url` stays server-signed only (A8). 

- **`.url`** : minted lazily on property access — a synchronous JWT sign (mechanics like `createSignedToken` in `BinaryDataService` ) scoped to the fileId with a short TTL (default 15 min, config). Files gets its **own derived secret** ( `sha256('url-signing:project-files:' + encryptionKey)` , optional env override) and payload `{ fileId, scope: 'project-file' }` — NOT the binary-data signing secret/payload, so binary tokens and file tokens can never verify against each other's routes. No token is created unless the expression actually reads `.url` . Download route: `GET /rest/files/signed?token=…` with `skipAuth` , mirroring `/binary-data/signed` . 

- Cost: one indexed metadata query per execution, loaded unconditionally in `getBase()` and cached like `VariablesService.getAllCached` . Placement detail: the load goes **after** the module-context merge loop in `getBase()` (module contexts land on `additionalData` there — not next to the `getVariables` call earlier in the function), and the injection into `additionalKeys` happens beside `$vars` in `packages/core/.../utils/get-additional-keys.ts` . No conditional-prep mechanism exists to piggyback on ( `$vars` loads unconditionally too), and unconditional loading covers manual runs, NDV previews, and queue-mode workers for free. Snapshot is consistent within a run — replaced mid-run files don't shift under the workflow. 

- Security: snapshot is scoped to the workflow's home project; signed URLs are bearer tokens, so TTL is short, tokens are single-file, and the risk is stated in docs (anyone with the URL can fetch until expiry — same posture as binary signed URLs today). 

- Workers: the snapshot rides in `additionalKeys` assembled on the instance that runs the execution; workers hit the DB directly (they own DB access already), so queue mode needs no extra plumbing. 

### B8 · Frontend architecture 

```
packages/frontend/editor-ui/src/features/core/files/
```

```
  module.descriptor.ts        // routes /home/files, files, files/:id; projectTabs; resources:[{key:'file'}]
  FilesView.vue               // ResourcesListLayout, mirrors DataTableView.vue
  files.store.ts              // pinia: list, totalCount, usage, upload progress map
  files.api.ts                // thin fetch layer over B4 endpoints
  components/
    FileCard.vue              // ← DataTableCard.vue
    FileActions.vue           // ← DataTableActions.vue
    FilePreviewPanel.vue      // NDV viewer core, refactored to take a source URL (A5)
    UploadQueue.vue           // net-new multi-file progress/cancel/retry UI (A5)
    UploadConflictModal.vue · RenameFileModal.vue · UploadDropOverlay.vue
  composables/
```

Command-bar search lives in `features/shared/commandBar/composables/useFilesNavigationCommands.ts` (repo convention: all command-bar composables sit in that shared folder and are registered in `useCommandBar.ts` — the `resources` descriptor key alone doesn't provide it, and earlier revisions placed this inside the files feature). 

- Quota banners: two components in `features/shared/banners/components/banners/` registered in `BannerStack.vue` , driven by the `/files/limits` status the store polls on view entry and after mutations. 

- All copy through `@n8n/i18n` ( `files.*` ); spacing via CSS variables; single-value `data-testid` s ( `file-card` , `file-card-name` , …). Nothing new goes into `@n8n/design-system` — every piece composes existing components. 

### B9 · Quotas, config, licensing 

```
// packages/@n8n/config/src/configs/file-storage.config.ts
```

```
N8N_FILE_STORAGE_MODE                      = fs     // fs | s3 | az | db — own env, NOT StorageConfig.modeTag
N8N_FILE_STORAGE_MAX_SIZE_BYTES            = 1 GiB   // instance-wide cap, SUM(fileSizeBytes)
N8N_FILE_STORAGE_MAX_FILE_SIZE_BYTES       = 50 MiB  // per file (≤ N8N_FORMDATA_FILE_SIZE_MAX)
N8N_FILE_STORAGE_WARNING_THRESHOLD_BYTES   // default 80% of max
N8N_FILE_STORAGE_SIZE_CHECK_CACHE_MS       = 5000
N8N_FILE_STORAGE_CLEANUP_INTERVAL_MS / FILE_MAX_AGE_MS   // temp-upload orphan sweep
```

- Own storage-mode env, default **`fs`** : the agent-knowledge pattern selects its backend via `StorageConfig.modeTag` , and `N8N_EXECUTION_DATA_STORAGE_MODE` defaults to `'database'` — copying it verbatim would put up to 1 GiB of blobs in a stock install's SQLite app DB. Files therefore gets `N8N_FILE_STORAGE_MODE` defaulting to `fs` ; `db` remains an explicit opt-in for zeroshared-storage deployments (B11). 

- Validator: a `FileStorageSizeValidator` clone of `DataTableSizeValidator` — cached `SUM(fileSizeBytes)` , `reset()` after every mutation, telemetry on limit hit. Upload path uses the serialized post-upload quota-check chain from `multer-uploadmiddleware.ts` (temp-dir bytes count toward usage during upload). 

- Instance-wide cap, like data tables — per-project caps are a Cloud-plan concern layered on later (the repository can compute per-project sums when that comes; the UI meter is instance-wide and labeled as such, A5). Surfaced to the UI via `frontend.service.ts` → `settings.fileStorage.{maxSize, maxFileSize}` . 

- Licensing: none for the module itself. Files ships as a default module (added to `MODULE_NAMES` in `modules.config.ts` and `defaultModules` in `module-registry.ts` ), disable-able via `N8N_DISABLED_MODULES` — data tables' exact posture. S3/Azure backends: the module registers its **own** byte stores at init, gated by the existing `feat:executionDataS3` / `feat:executionDataAz` license flags ( `LicenseState.isExecutionDataS3Licensed()` / `isExecutionDataAzureLicensed()` ) plus bucket/container config checks, failing startup on violation — the `base-command.ts` posture. (Earlier revisions claimed the `feat:binaryData*` boot checks would be "inherited for free" — wrong twice: those flags gate `N8N_DEFAULT_BINARY_DATA_MODE` , not the storage-mode path, and stores only get registered when *execution-data* storage uses that location, so `N8N_FILE_STORAGE_MODE=s3` on its own would find no store and bypass licensing entirely.) 

### B10 · Lifecycle & failure modes 

|Event|Behavior|
|---|---|
|Delete ordering|Row deleted first (source of truth disappears); bytes go through the sweeper's two-pass<br>grace period like replaced old keys — consistent with A4/B4/B6. A failed sweep leaves an<br>orphan for the next run, never a ghost row.|
|Partial upload|Multer temp files swept by a cleanup service cloned from`data-table-file-`<br>`cleanup.service.ts`(main instance only, age-based).|
|Crashed replace|New-key write completed but row not swapped → orphan key; row swapped but old key<br>not deleted → orphan key. Either way the visible file is intact.|
|Orphan reconciliation|Weekly leader-only job (multi-main: leader gating via`@OnLeaderTakeover`/<br>`@OnLeaderStepdown`, not just instance-type gating — the data-table cleanup precedent<br>only checks instance type) lists keys under`project-files/`and reconciles keys with no<br>matching`storageKey`row **two-pass**: run N marks a candidate, run N+1 deletes it if<br>still unreferenced. (Age alone can't protect replace races — a replaced file's old key is<br>usually already older than any grace window the moment it becomes orphaned.) Requires<br>adding`ByteStore.list(prefix)`: fs walks the tree;`ObjectStoreService.list`exists but<br>isn't surfaced on the S3 store; **Azure has no listing at all** —`AzureBlobService`needs<br>a net-new`list(prefix)`via`listBlobsFlat({prefix})`— scoped as MVP work. DB-mode<br>orphans:`binary_data`rows with`sourceType='project_file'`and no live`sourceId`.<br>The sweeper only covers the currently configured backend: switching<br>`N8N_FILE_STORAGE_MODE`leaves old-backend keys unswept (rows persist`storedAt`, so<br>reads keep working) — documented limitation.|
|Project delete / transfer|Via`OwnershipTransferHandlerRegistry`(B5). Per-key deletes driven from rows — no<br>`deletePrefix`dependency.|
|No execution pruning|Files are exempt by construction: they live outside execution locations and`binary_data`<br>pruning filters on`sourceType`. Explicit delete is the only reaper.|



### B11 · Scaling & deployment 

|Mode|Behavior|
|---|---|
||Default. Single-main: local disk under`N8N_STORAGE_PATH`via`FsByteStoreService`(atomic temp-file writes,|
|`fs`|traversal guard). Queue mode / multi-main requires a shared volume — same operational requirement fs binary<br>data has today; documented, and startup warns when workers lack the path.|
||Recommended for queue mode. Workers register the same stores at boot (existing license-gated init); reads/|
|`s3 / az`|writes go direct from whichever instance executes the node — mains and workers share nothing but the bucket<br>and the DB.|
|`db`|Works everywhere with zero shared storage (bytes in`binary_data`); buffering is unavoidable here, so the per-<br>file cap applies hard and docs steer large-file users to s3/az.|



Webhook and worker instances need no controllers — only the proxy service and stores, which the module provides via `context()` on every instance type. Multi-main: no coordination needed beyond the DB row swap (single UPDATE) and the shared/external byte store. Large-file position: MVP accepts the proxy-through-Node ceiling ( `N8N_FORMDATA_FILE_SIZE_MAX` , 200 MB practical). Streaming is backend-dependent, stated honestly: `fs` streams end-to-end (memory stays flat), but `S3ByteStore.write()` / `AzureByteStore.write()` buffer the whole body ( `binaryToBuffer` ; `ObjectStoreService.put` takes a Buffer and computes ContentMD5 — no multipart upload today) — so on the recommended queue-mode backends a write allocates up to the per-file 

cap in RAM per concurrent upload. That is why the per-file cap defaults to 50 MB. Streaming multipart upload is scoped with the presigned direct-to-S3 work in Phase 3; raising the cap waits for it. 

### B12 · Phasing 

|Phase|Ships|Unlocks (Part A)|
|---|---|---|
|1 — MVP|Module + entity + store, project/aggregate controllers, RBAC,<br>quota, UI (list/upload-queue/preview/download/rename/replace/<br>delete/banners), Files node (4 ops) with`builderHint`,<br>dependency indexing (`'file'`in`DependencyResourceType`+<br>workflow-index) with used-by counts in dialogs, transfer/delete<br>handlers,`ByteStore.list(prefix)`+ orphan sweeps|All A4 flows; A7 node; every A1<br>scenario via nodes|
|2 — Reach|`$files`expressions + signed URLs + autocomplete; Public API v1<br>handlers + OpenAPI YAML (`public-api/v1/handlers/files/`);<br>favorites + command bar polish|A8 expression UX; template-URL<br>scenario without a Download node|
|3 — Scale|MCP tools (`modules/mcp/tools/`), presigned direct-to-S3 +<br>streaming multipart uploads (raises the per-file cap), optional<br>folders + per-project quotas|Agent access; >200 MB files;<br>namespace growth|



### B13 · Risks & open product questions 

#### Risks 

- fs mode in queue deployments silently needs a shared volume; mitigate with a boot-time warning when queue mode + fs files storage is detected. 

- Copy-on-read amplification: a 100 MB file read by a high-frequency workflow copies 100 MB into execution storage per run; execution pruning bounds it, but docs should say so. Mitigation lever if it bites: content-hash dedup in execution storage (out of scope now). 

- Name-based references + rename is a soft breakage. MVP mitigation: dependency tracking ships day one (the platform already indexes data-table dependencies in workflow-index and renders `DependencyPill` ), so rename/replace/delete dialogs show real used-by counts. Residual risk: by-name references inside expressions the index can't see. 

- S3/Azure write buffering caps file size until multipart streaming lands (B11); the 50 MB default is the containment, and docs must not promise “streams end-to-end” on those backends. 

- Signed URLs are bearer tokens; short TTL + single-file scope is the containment — which is also why they are never the answer for email imagery (A8). If Cloud requires stricter, Phase 2 can add per-URL one-time-use. 

#### Open product questions 

1. Default quota numbers: is 1 GiB instance / 50 MB per file right for Cloud starter plans, and should Cloud override per plan (as with data tables)? 

2. Should the Files tab and Data tables eventually merge into one “Storage” tab as project tab count grows (Workflows, 

Credentials, Executions, Data tables, Files, …)? 

3. Extension policy: MVP proposes no extension allowlist (unlike agent uploads) since files are opaque bytes served with a sandbox CSP — does security review agree, or do we block executables? 

4. Do AI/RAG nodes need first-class file references (a file picker parameter type) rather than composing with the Files node? 

5. Is “Keep both” auto-suffixing ( `name (1).csv` ) acceptable for node-initiated writes, or should nodes only ever replace/error? 

6. Should project export/import (source control) include files? MVP excludes them (like data table rows) — confirm. 

All referenced paths verified against n8n-io/n8n@master (tree 560455faf108, 2026-08-11). Rev 2 (2026-08-12) addresses design review: signed-URL TTL vs email, S3/Azure write buffering, own storage-mode default, unconditional $files snapshot, MVP dependency tracking, netnew frontend work costed, /files/limits scope, read-race semantics. Structural templates: `modules/data-table` (module shape), `agentknowledge-file-store.ts` (byte-store pattern), `binary-data.controller.ts` (download semantics). 

Rev 3 (2026-08-12) corrects verification findings from implementation planning and locks decisions: s3/az licensing + module-owned store registration (B9), dead branch-write-access middleware replaced by the inline guard (A6/B4), single aggregate-shaped node proxy helper with no node-path scope re-checks (B6), node directory `nodes/Files/Files/` (B6), snapshot wiring after the module-context merge + `get-additional-keys.ts` injection (B7), own signing secret with scoped payload (B7), Azure listing is net-new (B10), two-pass orphan sweep replacing the age-only grace period (B3/B10), `/files` aggregate prefix divergence documented (B4), command-bar/favorites wiring reality (A3/B8). Scope locked: MVP + Phase 2 on one feature branch (`file-storage-module`). 

