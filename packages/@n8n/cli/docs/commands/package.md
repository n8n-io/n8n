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
| `--workflow-version-policy` | Which version of each workflow travels in the package: `latest` (default) exports the latest version whether or not it is published, `published-strict` exports the published version and aborts when any workflow has none, `prefer-published` falls back to the latest version where there is no published one, and `ignore-unpublished` leaves unpublished workflows out of the package entirely. |
| `--credential-export-policy` | Whether expression values from credential data are bundled into the package: `expression-values-only` (default on the instance) includes credential fields whose value is an n8n expression (for example `={{ $secrets.apiKey }}`); `no-values` keeps credential data out of the package, so each credential file carries only its id, name and type. Literal values never travel either way. |

Provide at least one `--workflow-id`, `--folder-id`, or `--project-id`. Requires
the API key to hold `workflow:export` when exporting workflows or folders, or
`project:export` when exporting projects.

A workflow has a latest version (what you see in the editor) and, once
published, a published version; `--workflow-version-policy` picks which one
travels. The chosen version decides which credentials, data tables, variables
and sub-workflows are bundled alongside it, but the workflow's name, settings
(including `errorWorkflow`) and tags are not versioned and always come from the
latest version.

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
| `--project-conflict-policy` | What to do when a project in the package already exists on the instance, matched by ID, and by default how its contents are treated too (project packages only): `merge` (instance default) is purely additive — the existing project's name, description, icon and custom span attributes are left alone and the package's contents are added alongside; `overwrite` makes the package authoritative, replacing those details (a detail the package omits is left as it is, not cleared) and, via `--folder-conflict-policy`, removing contents the package does not carry; `fail` rejects the import before anything is written. |
| `--folder-conflict-policy` | What to do when a package folder already exists in the target project. **Defaults to whatever `--project-conflict-policy` is**, so you state the intent once; for a workflow package, which defines no projects, it defaults to `merge`. `merge` reuses the existing folder and merges the package's children into it; `fail` rejects the import; `overwrite` additionally removes workflows the package does not contain, at the project root and in package-defined folders (see `--overwrite-deletion-policy`), and is rejected unless `--project-conflict-policy` is also `overwrite`. Folders the package does not define are removed too, but only once nothing is left inside them, so target-only content is never swept up. Requires a folders-enabled license when the package contains folders, and the `workflow:delete` and `folder:delete` scopes for `overwrite`. |
| `--overwrite-deletion-policy` | How `--folder-conflict-policy=overwrite` removes a workflow the package does not contain: `archive` (instance default) archives it, keeping it and its execution history recoverable; `hard-delete` archives it — the step that unpublishes it — then deletes the workflow and its executions permanently. Each entry in `removedWorkflows` reports what actually happened in its `deletion` field, so a `hard-delete` whose row cannot be dropped yet (unpublishing defers trigger teardown) shows as `archived` rather than failing the import. Ignored unless the folder conflict policy is `overwrite`. |
| `--credential-matching-mode` | How credential references are matched on the target instance: `id-only` (default, match by id), `name-and-type` (match by exact name and type), or `type-only` (match by type). For `name-and-type` and `type-only`, candidates are ranked by scope — owned by the target project, then shared into it, then global — and ties within a scope use the most recently updated credential. |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved. `create-stub` (instance default) creates empty placeholder credentials in the target project; `must-preexist` requires every referenced credential to already exist. |
| `--data-table-matching-mode` | How data tables referenced by the package's workflows are matched on the target instance: `by-id` (default and only mode) matches the target-project table with the same id — imported tables keep their source id — and never falls back to name matching. |
| `--data-table-missing-mode` | What to do when a referenced data table is absent in the target project. `create` (instance default) creates it from the package schema — keeping the source id, with no rows; `must-preexist` requires it to already exist; `do-nothing` skips creation. Matched tables are always used as-is and schema-validated (all package columns present with the same name and type), even under `do-nothing`. |
| `--data-table-schema-conflict-policy` | How strictly a matched data table's schema is compared. Every package column must exist on the matched target table with the same name and type — a missing column or a type mismatch always rejects. `keep-existing` (instance default) ignores additional columns the target table has of its own; `fail` is the strict drift-detection choice and rejects those too. Neither policy alters the matched target table — package columns are never added to it. |
| `--variable-missing-mode` | What to do when a referenced variable is absent from both the target project and global scope: `create-with-value` (instance default) creates it with the package value and reports it under `variables.created`, falling back to an empty stub under `variables.stubbed` when the package carries no value for it; `create-stub` always creates an empty value; `do-nothing` reports unresolved names without creating anything; `must-preexist` rejects the import. What happens to a variable that *does* resolve is `--variable-conflict-policy`'s job. Requires a variables-enabled license only when the import creates a variable. |
| `--variable-conflict-policy` | What to do when a referenced variable resolves in the target project or global scope but the package bundles a different value for it. `keep-existing` (instance default) leaves the target value alone and reports the name under `variables.matched`; `overwrite` silently replaces the value of the existing variable at whichever scope it was found — including a global variable other projects also read — and reports the name under `variables.updated`; `fail` rejects the import. No policy touches a resolved variable when there is nothing to change: either the package bundles no value for it (values excluded at export, or an exported value that was itself empty), or the value it bundles already matches the target's. Under `overwrite`, a project package whose projects hold *different* values for a name they all resolve to one row — a global none of them shadows — is rejected: one row cannot carry both values. Requires a variables-enabled license only when the import overwrites. |
| `--variable-parent-policy` | Where `create-with-value` and `create-stub` place missing variables for workflow/folder packages (`project`, the behaviour when omitted, uses the target project; `global` uses global scope). Must be omitted for project packages, which reject it with a 400 — their placement follows the package layout, so a variable bundled under a project is created in that project and one bundled at the top level is created globally. |
| `--tag-missing-mode` | What to do when a tag referenced by the package's workflows is absent on the target instance — tags are matched by source id, never by name. `create` (instance default) creates the tag globally with its source id and name; `do-nothing` imports the workflows without the missing tags and lists them under `tags.skipped`. |
| `--tag-conflict-policy` | What to do when a referenced tag conflicts on the target instance — the same-id target tag carries a different name (rename drift), or the tag's name is held by a different tag (name collision). `skip` (instance default) imports the workflows without the conflicted tags and lists them under `tags.skipped`; `fail` rejects the import; `rename` renames a drifted target tag to the package name and reconciles a name collision by re-keying the existing tag to the package (source) id, keeping its name and taggings; a drifted tag whose package name is held by another tag still rejects the import. |
| `--bindings` | Explicit source→target id bindings as a JSON object keyed by entity type, e.g. `{"credentials":{"<sourceId>":"<targetId>"}}`. Only `credentials` is honoured today; these bindings are applied before `--credential-matching-mode` resolution runs. |

Requires the API key to hold:

- `workflow:import` — always
- `workflow:delete` and `folder:delete` — when the effective folder conflict policy is `overwrite` (set directly, or inherited from `--project-conflict-policy=overwrite`)
- `dataTable:create` — when the package references data tables and `--data-table-missing-mode` is `create`
- `variable:create` — when the import actually creates a variable, i.e. `--variable-missing-mode` is `create-with-value` (the default) or `create-stub` and at least one referenced variable does not already resolve. A package whose variables all resolve creates nothing and needs neither this scope nor a variables-enabled license.
- `variable:update` — when the import would overwrite a variable, i.e. `--variable-conflict-policy=overwrite` and at least one resolved variable's value differs from the package's. `keep-existing` (the default) never overwrites and needs neither this scope nor a variables-enabled license.
- `tag:create` — when the import would create a tag (under `--tag-missing-mode create`, the instance default; tags that match, are dropped, or belong only to skipped workflows need no scope)
- `tag:update` — when the import would rename or reconcile a tag (under `--tag-conflict-policy rename`).

When the import is blocked, the command exits non-zero and lists the blocking
issues. Examples:

- a workflow conflict under `--workflow-conflict-policy=fail`
- a project that already exists under `--project-conflict-policy=fail`
- a workflow that `--folder-conflict-policy=overwrite` would remove but you lack
  `workflow:delete` on
- an unresolved credential under `--credential-missing-mode=must-preexist`
- a schema-incompatible data table
- a workflow using a node type this instance does not have under
  `--missing-node-type-mode=fail`
- an unresolved variable under `--variable-missing-mode=must-preexist`, or a
  creating variable mode whose new variables would exceed
  the instance variable limit
- a resolved variable whose value differs from the package's under
  `--variable-conflict-policy=fail`, or, under
  `--variable-conflict-policy=overwrite`, one row the projects of a package
  would overwrite with different values

Under the default `--credential-missing-mode=create-stub`, missing credentials
are stubbed instead of blocking the import.
