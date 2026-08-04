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
n8n-cli package export -w abc --include-tags=false -o export.n8np
```

| Flag | Description |
|------|-------------|
| `-w, --workflow-id` | Workflow ID to include. Repeat the flag to export several. |
| `--folder-id` | Folder ID to include with its nested folders. Repeat the flag to export several. |
| `-p, --project-id` | Project ID to include. Repeat the flag to export several. |
| `-o, --output` | File to write the package to. Defaults to `export.n8np`. |
| `--include-variable-values` | `true` (default) or `false`. Whether values of variables referenced by the exported workflows are bundled into the package. When `false`, variables still travel as name/type files (and in the package requirements), just without their values. |
| `--include-tags` | `true` (default) or `false`. Whether tags assigned to the exported workflows are bundled into the package. When `false`, no tag data is included in the package. |
| `--missing-workflow-dependency-policy` | Policy for missing static sub-workflow dependencies: `fail` aborts when any dependency is missing, `include-in-package` automatically adds missing static sub-workflows, and `reference-only` keeps them out of the package, listing them in the package requirements as workflows expected to already exist on the target. |

Provide at least one `--workflow-id`, `--folder-id`, or `--project-id`. Requires
the API key to hold `workflow:export` when exporting workflows or folders, or
`project:export` when exporting projects.

Statically referenced sub-workflows are dependencies of the package. How
missing ones are handled depends on
`--missing-workflow-dependency-policy`. With the default `fail` policy you include them yourself. With `include-in-package`, n8n resolves the static dependency graph and adds any
missing sub-workflows to the package automatically, so you don't need to list
them explicitly. With `reference-only`, missing sub-workflows stay out of the
package and are only listed in the package requirements (by id, with a
best-effort name), on the assumption that they and their own dependencies
already exist on the target instance.

## `package import`

Import a `.n8np` archive into a project.

```bash
n8n-cli package import --file=export.n8np
n8n-cli package import --file=export.n8np --project-id=<id> --workflow-conflict-policy=skip
n8n-cli package import --file=export.n8np --workflow-conflict-policy=fail --credential-missing-mode=must-preexist
n8n-cli package import --file=export.n8np --workflow-conflict-policy=fail --bindings='{"credentials":{"<sourceId>":"<targetId>"}}'
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` package file. (required) |
| `--workflow-conflict-policy` | What to do when a workflow already exists by source ID: `new-version` (default), `fail`, or `skip`. |
| `-p, --project-id` | Target project ID. Defaults to your personal project. (alias: `--project`) |
| `--folder-id` | Target folder ID within the project. Defaults to the project root. (alias: `--folder`) |
| `--workflow-publishing-policy` | Whether imported workflows end up published. `preserve-published-state` (instance default) never publishes drafts — an updated workflow is republished only when it was already published and the package workflow is published too; `match-source` follows the package workflow's published flag; `publish-all` publishes every imported workflow; `unpublish-all` leaves new workflows unpublished and unpublishes updated ones. |
| `--workflow-id-policy` | Whether imported workflows keep their source ID (`source`) or receive a new one (`new`). |
| `--missing-node-type-mode` | What to do when a workflow uses a node type — or a version of a node type — this instance does not have. `fail` (instance default) rejects the import before anything is written, listing every missing node type and the workflows that use it; `import-anyway` imports the package, but the affected workflows are never published by the import, regardless of the publishing policy. |
| `--folder-conflict-policy` | What to do when a package folder already exists in the target project: `merge` (default, reuse the existing folder and merge the package's children into it) or `fail`. Requires a folders-enabled license when the package contains folders. |
| `--credential-matching-mode` | How credential references are matched on the target instance: `id-only` (default, match by id), `name-and-type` (match by exact name and type), or `type-only` (match by type). For `name-and-type` and `type-only`, candidates are ranked by scope — owned by the target project, then shared into it, then global — and ties within a scope use the most recently updated credential. |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved. `create-stub` (instance default) creates empty placeholder credentials in the target project; `must-preexist` requires every referenced credential to already exist. |
| `--data-table-matching-mode` | How data tables referenced by the package's workflows are matched on the target instance: `by-id` (default and only mode) matches the target-project table with the same id — imported tables keep their source id — and never falls back to name matching. |
| `--data-table-missing-mode` | What to do when a referenced data table is absent in the target project. `create` (instance default) creates it from the package schema — keeping the source id, with no rows; `must-preexist` requires it to already exist; `do-nothing` skips creation. Matched tables are always used as-is and schema-validated (all package columns present with the same name and type), even under `do-nothing`. |
| `--data-table-schema-conflict-policy` | How strictly a matched data table's schema is compared. Every package column must exist on the matched target table with the same name and type — a missing column or a type mismatch always rejects. `keep-existing` (instance default) ignores additional columns the target table has of its own; `fail` is the strict drift-detection choice and rejects those too. Neither policy alters the matched target table — package columns are never added to it. |
| `--variable-missing-mode` | What to do when a referenced variable is absent from both the target project and global scope: `create-with-value` (instance default) creates it with the package value and reports it under `variables.created`, falling back to an empty stub under `variables.stubbed` when the package carries no value for it; `create-stub` always creates an empty value; `do-nothing` reports unresolved names without creating anything; `must-preexist` rejects the import. Matched variables are never overwritten. Requires a variables-enabled license only when the import creates a variable. |
| `--variable-parent-policy` | Where `create-with-value` and `create-stub` place missing variables for workflow/folder packages (`project`, the behaviour when omitted, uses the target project; `global` uses global scope). Must be omitted for project packages, which reject it with a 400 — their placement follows the package layout, so a variable bundled under a project is created in that project and one bundled at the top level is created globally. |
| `--tag-missing-mode` | What to do when a tag referenced by the package's workflows is absent on the target instance — tags are matched by source id, never by name. `create` (instance default) creates the tag globally with its source id and name; `do-nothing` imports the workflows without the missing tags and lists them under `tags.skipped`. |
| `--tag-conflict-policy` | What to do when a referenced tag conflicts on the target instance — the same-id target tag carries a different name (rename drift), or the tag's name is held by a different tag (name collision). `skip` (instance default) imports the workflows without the conflicted tags and lists them under `tags.skipped`; `fail` rejects the import; `rename` renames a drifted target tag to the package name and reconciles a name collision by re-keying the existing tag to the package (source) id, keeping its name and taggings; a drifted tag whose package name is held by another tag still rejects the import. |
| `--bindings` | Explicit source→target id bindings as a JSON object keyed by entity type, e.g. `{"credentials":{"<sourceId>":"<targetId>"}}`. Only `credentials` is honoured today; these bindings are applied before `--credential-matching-mode` resolution runs. |

Requires the API key to hold:

- `workflow:import` — always
- `dataTable:create` — when the package references data tables and `--data-table-missing-mode` is `create`
- `variable:create` — when the import actually creates a variable, i.e. `--variable-missing-mode` is `create-with-value` (the default) or `create-stub` and at least one referenced variable does not already resolve. A package whose variables all resolve creates nothing and needs neither this scope nor a variables-enabled license.
- `tag:create` — when the import would create a tag (under `--tag-missing-mode create`, the instance default; tags that match, are dropped, or belong only to skipped workflows need no scope)
- `tag:update` — when the import would rename or reconcile a tag (under `--tag-conflict-policy rename`).

When the import is blocked, the command exits non-zero and lists the blocking
issues. Examples:

- a workflow conflict under `--workflow-conflict-policy=fail`
- an unresolved credential under `--credential-missing-mode=must-preexist`
- a schema-incompatible data table
- a workflow using a node type this instance does not have under
  `--missing-node-type-mode=fail`
- an unresolved variable under `--variable-missing-mode=must-preexist`, or a
  creating variable mode whose new variables would exceed
  the instance variable limit

Under the default `--credential-missing-mode=create-stub`, missing credentials
are stubbed instead of blocking the import.
