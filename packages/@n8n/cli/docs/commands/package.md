# package

Export and import workflows as portable n8n packages (`.n8np` archives).

> **Beta feature:** n8n packages are still under development and there may be breaking changes on APIs.

## `package export`

Export workflows, folders, or projects into a gzipped `.n8np` archive written
to disk. Each exported folder includes its nested folders. Provide workflow
and/or folder IDs, or project IDs, but not both groups in the same command.

```bash
n8n-cli package export --workflow-id=abc --output=export.n8np
n8n-cli package export -w abc -w def -o team.n8np
n8n-cli package export --folder-id=xyz -o folders.n8np
n8n-cli package export --project-id=abc -o project.n8np
n8n-cli package export -p abc -p def -o projects.n8np
n8n-cli package export -w abc --include-variable-values=false -o export.n8np
```

| Flag | Description |
|------|-------------|
| `-w, --workflow-id` | Workflow ID to include. Repeat the flag to export several. |
| `-f, --folder-id` | Folder ID to include with its nested folders. Repeat the flag to export several. |
| `-p, --project-id` | Project ID to include. Repeat the flag to export several. |
| `-o, --output` | File to write the package to. Defaults to `export.n8np`. |
| `--include-variable-values` | `true` (default) or `false`. Whether values of variables referenced by the exported workflows are bundled into the package. When `false`, variables still travel as name/type files (and in the package requirements), just without their values. |
| `--missing-workflow-dependency-policy` | Policy for missing static sub-workflow dependencies: `fail`, `reference-only`, or `include-in-package`. Currently only `fail` is supported. |

Provide at least one `--workflow-id`, `--folder-id`, or `--project-id`. Requires
the API key to hold `workflow:export` when exporting workflows or folders, or
`project:export` when exporting projects.

Statically referenced sub-workflows must also be included in the resulting
package. For workflow exports, include referenced sub-workflows with additional
`--workflow-id` flags. For folder exports, referenced sub-workflows must be in
the exported folder tree or included with `--workflow-id`. For project exports,
referenced sub-workflows must be in one of the exported projects.

## `package import`

Import a `.n8np` archive into a project.

```bash
n8n-cli package import --file=export.n8np --conflict-policy=fail
n8n-cli package import --file=export.n8np --project=<id> --conflict-policy=new-version
n8n-cli package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist
n8n-cli package import --file=export.n8np --conflict-policy=fail --bindings='{"credentials":{"<sourceId>":"<targetId>"}}'
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` package file. (required) |
| `--conflict-policy` | What to do when a workflow already exists by source ID: `new-version`, `fail`, or `skip`. (required) |
| `--project` | Target project ID. Defaults to your personal project. |
| `--folder` | Target folder ID within the project. Defaults to the project root. |
| `--workflow-publishing-policy` | Whether imported workflows end up published. `preserve-published-state` (instance default) never publishes drafts — an updated workflow is republished only when it was already published and the package workflow is published too; `match-source` follows the package workflow's published flag; `publish-all` publishes every imported workflow; `unpublish-all` leaves new workflows unpublished and unpublishes updated ones. |
| `--workflow-id-policy` | Whether imported workflows keep their source ID (`source`) or receive a new one (`new`). |
| `--missing-node-type-mode` | What to do when a workflow uses a node type — or a version of a node type — this instance does not have. `fail` (instance default) rejects the import before anything is written, listing every missing node type and the workflows that use it; `import-anyway` imports the package, but the affected workflows are never published by the import, regardless of the publishing policy. |
| `--folder-conflict-policy` | What to do when a package folder already exists in the target project: `merge` (default, reuse the existing folder and merge the package's children into it) or `fail`. Requires a folders-enabled license when the package contains folders. |
| `--credential-matching-mode` | How credential references are matched on the target instance: `id-only` (default, match by id), `name-and-type` (match by exact name and type), or `type-only` (match by type). For `name-and-type` and `type-only`, candidates are ranked by scope — owned by the target project, then shared into it, then global — and ties within a scope use the most recently updated credential. |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved. `create-stub` (instance default) creates empty placeholder credentials in the target project; `must-preexist` requires every referenced credential to already exist. |
| `--data-table-matching-mode` | How data tables referenced by the package's workflows are matched on the target instance: `by-id` (default and only mode) matches the target-project table with the same id — imported tables keep their source id — and never falls back to name matching. |
| `--data-table-missing-mode` | What to do when a referenced data table is absent in the target project. `create` (instance default) creates it from the package schema — keeping the source id, with no rows; `must-preexist` requires it to already exist; `do-nothing` skips creation. Matched tables are always used as-is and schema-validated (all package columns present with the same name and type), even under `do-nothing`. |
| `--data-table-schema-conflict-policy` | How strictly a matched data table's schema is compared. Every package column must exist on the matched target table with the same name and type — a missing column or a type mismatch always rejects. `keep-existing` (instance default) ignores additional columns the target table has of its own; `fail` is the strict drift-detection choice and rejects those too. Neither policy alters the matched target table — package columns are never added to it. |
| `--variable-missing-mode` | What to do when a variable referenced by the package's workflows is absent from both the target project and the global scope (lookup order: project, then global): `do-nothing` (instance default) imports the workflows anyway and lists the unresolved variable names in the result, without creating anything; `must-preexist` rejects the import unless every referenced variable already resolves. Matched variables are used as-is — the import never creates or overwrites variables. |
| `--bindings` | Explicit source→target id bindings as a JSON object keyed by entity type, e.g. `{"credentials":{"<sourceId>":"<targetId>"}}`. Only `credentials` is honoured today; these bindings are applied before `--credential-matching-mode` resolution runs. |

Requires the API key to hold the `workflow:import` scope, plus `dataTable:create`
when the package references data tables and `--data-table-missing-mode` is
`create`. When the import is blocked — for example by a workflow conflict under
`--conflict-policy=fail`, or by an unresolved credential under
`--credential-missing-mode=must-preexist`, or by a schema-incompatible data
table — the command exits non-zero and lists the blocking issues. With the
default `create-stub` mode, missing credentials are stubbed instead of blocking
the import.
