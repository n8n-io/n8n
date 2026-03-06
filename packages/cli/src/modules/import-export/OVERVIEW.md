# Import / Export Module

Exports and imports n8n resources as `.n8np` packages (gzipped tar archives).
A package can contain one or more projects with their workflows, folders,
credentials, variables, and data tables.

The goal is a single package format that enables any ALM strategy — manual
promotion, instance sync, folder-backed storage, or git. See `docs/` for
design rationale and the wider vision.

## Package Format

A `.n8np` file is a gzipped tar. Three variants exist — **project**,
**folder**, and **workflow** — all sharing the same entity structure.
Project packages wrap entities in a `projects/<slug>/` directory. Standalone
exports place entities at the archive root.

```
manifest.json                          <-- always first entry (enables streaming fast-fail)
projects/
  billing-550e84/
    project.json
    folders/
      invoices-folder1/
        folder.json
    workflows/
      sync-orders-wf1abc/
        workflow.json
    credentials/
      slack-cred01/
        credential.json
    variables/
      api-url-var01/
        variable.json
    data-tables/
      customers-dt01/
        data-table.json
```

Directory names: `{name}-{first6charsOfId}` via `slug.utils.ts`.

The manifest lists what's in the package and its **requirements** —
dependencies that must exist on the target instance (node types, credentials,
variables, sub-workflows). The `/analyze` endpoint surfaces these so the user
knows what needs to be present or mapped before importing.

## API & CLI

### Endpoints (`/import-export`)

| Method | Path                | Purpose                               |
| ------ | ------------------- | ------------------------------------- |
| POST   | `/export`           | Export projects                        |
| POST   | `/export/workflows` | Export standalone workflows            |
| POST   | `/export/folders`   | Export folders and descendants         |
| POST   | `/analyze`          | Inspect a package without importing    |
| POST   | `/import`           | Import a package                       |

### CLI

```
n8n export:package --projectIds=... | --workflowIds=... | --folderIds=...
n8n import:package --input=file.n8np [--projectId=X] [--force] [--withCredentialStubs]
```

See `docs/Import Export CLI commands ...md` for the full flag reference with
examples.

## Architecture

```
Controller / CLI
    |
    v
ImportExportService           orchestrates export & import, writes manifest
    |
    |-- ProjectExporter       exports one project -> ExportPipeline
    |-- ProjectImporter       imports one project -> ImportPipeline
    |
    |-- ExportPipeline        runs exporters in dependency order
    |       |-- FolderExporter        (sequential, populates state.folderPathMap)
    |       |-- WorkflowExporter      (sequential, reads folderPathMap, populates nodesByWorkflow)
    |       |-- CredentialExporter    (parallel)
    |       |-- VariableExporter      (parallel)
    |       |-- DataTableExporter     (parallel)
    |       '-- PackageRequirementsExtractor (post-process)
    |
    |-- ImportPipeline        runs importers in dependency order
    |       |-- FolderImporter        (sequential, populates state.folderIdMap)
    |       |-- CredentialImporter    (phase 2, creates stubs, updates state.credentialBindings)
    |       |-- WorkflowImporter      (parallel, reads state.*)
    |       |-- VariableImporter      (parallel)
    |       '-- DataTableImporter     (parallel)
    |
    '-- BindingResolver       coordinates requirement resolution
            |-- CredentialResolver    (name+type match in target project)
            '-- SubWorkflowResolver   (ID existence check)
```

### Export Pipeline

1. **Sequential**: Folders -> Workflows. Order matters — folders produce
   `folderPathMap`, workflows consume it and produce `nodesByWorkflow`.
2. **Parallel**: Credentials, Variables, DataTables (independent).
3. **Requirements**: Walk workflow nodes for external dependencies.
4. **Backfill**: For non-project exports, use requirements to fetch referenced
   credentials/variables that weren't picked up by the entity exporters.

### Import Pipeline

The service handles orchestration (parse manifest, resolve bindings, validate
requirements), then delegates to the pipeline:

1. **Sequential**: Folders (produces `folderIdMap`)
2. **Credential stubs**: If enabled, create empty credentials for unresolved
   requirements, update `credentialBindings`
3. **Parallel**: Workflows, Variables, DataTables

**No outer transaction.** Each importer manages its own DB operations.
An outer `dataSource.transaction()` deadlocks on SQLite — the single
connection gets held by the transaction while downstream repository calls
try to acquire it from the pool.

### Polymorphic Interfaces

```typescript
interface EntityExporter {
  readonly entityKey: EntityKey;  // 'folders' | 'workflows' | 'credentials' | ...
  export(scope: ExportScope): Promise<ManifestEntry[]>;
}

interface EntityImporter {
  readonly entityKey: EntityKey;
  import(scope: ImportScope, entries: ManifestEntry[]): Promise<void>;
}
```

Pipelines iterate by `entityKey`. To add a new entity type: implement the
interface, add the key to `ENTITY_KEYS`, register in the pipeline constructor.

**Exception**: `CredentialImporter` does not implement `EntityImporter` — it
creates stubs from requirements, not from manifest entries.

### Scope Objects

Pipelines thread a scope through all handlers carrying query hints,
entity-specific options, and **mutable state** populated during execution:

- **ExportScope**: `basePath`, `writer`, query hints (`projectId`/`workflowIds`/
  `folderIds`), `entityOptions`, `state` (`folderPathMap`, `nodesByWorkflow`)
- **ImportScope**: `user`, `targetProjectId`, `reader`, `assignNewIds`,
  `entityOptions`, `state` (`folderIdMap`, `credentialBindings`,
  `subWorkflowBindings`)

### Entity Layer Pattern

Each entity subdirectory follows the same structure:

| File               | Role                                              |
|--------------------|---------------------------------------------------|
| `*.types.ts`       | `Serialized*` interface (on-disk JSON schema)     |
| `*.serializer.ts`  | DB entity -> serialized form                      |
| `*.exporter.ts`    | Fetch from DB, serialize, write to archive        |
| `*.importer.ts`    | Read from archive, create/update in DB            |

Simple exporters use `writeEntityFiles()` from `entity-exporter.ts`.
Folders and workflows have custom path logic.

`ProjectExporter`/`ProjectImporter` are meta-orchestrators — they
create/find the project, then delegate to the pipeline.

## Key Behaviors

**Credentials** — secrets are never exported. Only name+type go into the
package. On import, `BindingResolver` matches by name+type in the target
project. Unmatched credentials either reject the import, or create empty
stubs (if `--withCredentialStubs`).

**Variables** — always appear as requirements (names only). Optionally
exported with values. On import, missing required variables reject unless
`--force`. See `docs/Import Export principles ...md` for the full
import flow diagram.

**Workflow IDs** — when importing with `--projectId`, IDs become
`{targetProjectId}-{sourceId}`. Same package + same project = upsert.
Same package + different project = separate copy.

**Binding resolution** — `BindingResolver` coordinates resolution using
pluggable `RequirementResolver<T>` strategies. Currently two resolvers
exist: `CredentialResolver` (match by name+type in target project) and
`SubWorkflowResolver` (check if workflow ID exists). Three modes control
behavior: `auto` (resolve then fail if unresolved), `strict` (explicit
mappings only), `force` (best-effort, skip unresolved). Explicit bindings
always take priority. To add a new resolution strategy, implement
`RequirementResolver<T>` and inject it into `BindingResolver`.

## File Index

```
import-export.controller.ts      REST endpoints
import-export.service.ts          Orchestrator (export + import)
import-export.types.ts            Shared types (scopes, manifests, requests)
import-export.constants.ts        FORMAT_VERSION
import-export.module.ts           DI module registration

export-pipeline.ts                Runs entity exporters in dependency order
import-pipeline.ts                Runs entity importers in dependency order

entity-exporter.ts                EntityExporter interface + writeEntityFiles()
entity-importer.ts                EntityImporter interface
serializer.ts                     Generic Serializer<TEntity, TSerialized> interface

binding-resolver.ts               Coordinates requirement resolution via resolvers
requirement-resolver.ts           RequirementResolver<T> interface + ResolveContext

package-reader.ts                 PackageReader interface
package-writer.ts                 PackageWriter interface
tar-package-reader.ts             Tar/gzip PackageReader
tar-package-writer.ts             Tar/gzip PackageWriter

package-requirements-extractor.ts Walks workflow nodes for external dependencies
slug.utils.ts                     Filesystem-safe directory names

project/                          Project export/import (meta-orchestrator)
folder/                           Folder export/import
workflow/                         Workflow export/import, workflow.utils.ts, + sub-workflow.resolver.ts
credential/                       Credential export, stub creation, + credential.resolver.ts
variable/                         Variable export/import
data-table/                       Data table export/import
```
