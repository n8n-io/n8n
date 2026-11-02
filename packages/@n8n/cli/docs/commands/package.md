# package

Export and import Agents and workflows as portable n8n packages (`.n8np` archives).

> **Beta feature:** n8n packages are still under development and there may be breaking changes on APIs.

## `package export`

Export Agents, workflows, folders, or projects into a gzipped `.n8np` archive.
Each exported folder includes its nested folders. Combine Agent, workflow, and
folder IDs in one selection. Use project IDs separately for whole-project exports.

```bash
n8n-cli package export --agent-id=reviewer --agent-id=helper --dependency-policy=include-in-package -o agents.n8np
n8n-cli package export --agent-id=reviewer --workflow-id=tool -o mixed.n8np
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
| `--agent-id` | Agent ID to include. Repeat the flag to export several. |
| `-w, --workflow-id` | Workflow ID to include. Repeat the flag to export several. |
| `--folder-id` | Folder ID to include with its nested folders. Repeat the flag to export several. |
| `-p, --project-id` | Project ID to include. Repeat the flag to export several. |
| `-o, --output` | File to write the package to. Defaults to `export.n8np`. |
| `--include-variable-values` | `true` (default) or `false`. Whether values of variables referenced by the exported Agents and workflows are bundled into the package. When `false`, variables still travel as name/type files (and in the package requirements), just without their values. |
| `--include-tags` | `true` (default) or `false`. Whether tags assigned to the exported workflows are bundled into the package. When `false`, no tag data is included in the package. |
| `--include-archived-workflows` | `false` (default) or `true`. Whether folder and project exports include their archived workflows. When `true`, they travel with `isArchived: true` and are archived on import. Workflows given by `--workflow-id` always export, also when archived. |
| `--dependency-policy` | Policy for workflow and agent dependencies outside the selected package contents. `fail` (default) aborts when a required definition is absent from the package. `include-in-package` adds accessible dependencies recursively. `reference-only` records external requirements without including their definitions. |
| `--version-policy` | Which version of each workflow and agent to export. `latest` (default) exports the current draft. `published-strict` requires a published version. `prefer-published` uses the published version when available and the draft otherwise. `ignore-unpublished` skips unpublished selections. Skills always export their latest saved version. |
| `--credential-export-policy` | Whether expression values from credential data are bundled into the package: `expression-values-only` (default on the instance) includes credential fields whose value is an n8n expression (for example `={{ $secrets.apiKey }}`); `no-values` keeps credential data out of the package, so each credential file carries only its id, name and type. Literal values never travel either way. |

Provide at least one `--agent-id`, `--workflow-id`, `--folder-id`, or `--project-id`.
Explicit Agent selections require `agent:export`. Workflow and folder selections
require `workflow:export`. Mixed selections require both grants. Whole-project
exports require `project:export`, including projects with Agents.

Export summaries include Agent counts from the server, including added dependencies.
JSON output includes these counts and the selected Agent IDs.

`--version-policy` applies to workflows and agents, including agents in a
project export. The selected version supplies the definition and its references.
Workflow names, settings (including `errorWorkflow`), and tags always use their
current values. Agent IDs, names, and MCP availability also use their current
values. Under `ignore-unpublished`, dependencies that cannot be included cause
the export to fail only when `--dependency-policy` is `fail` or
`include-in-package`. With `reference-only`, the export records them as external
requirements.

Skills have no published versions. The package always contains the latest saved
version of each skill that an exported Agent uses. This also applies under
`published-strict`. The package does not pin a skill version.

`--dependency-policy` also applies to workflows and agents. Dependencies include
static workflow references and disabled agent references. With `fail`, include
the required definitions in your selection. With `include-in-package`, n8n adds
accessible dependencies recursively. With `reference-only`, external dependencies
are listed in the package requirements. Their definitions and dependencies must
already exist on the target instance.

## `package import`

Import Agent-only, mixed Agent/workflow, or whole-project `.n8np` archives.
The Agents module must be enabled when the archive contains Agents.
Use this command for selected-Agent exports. Agent content is not supported by
`package import-selection`, directory imports, or Promotions.

```bash
n8n-cli package import --file=agents.n8np --id-policy=source --publishing-policy=match-source
n8n-cli package import --file=export.n8np
n8n-cli package import --file=export.n8np --project-id=<id> --conflict-policy=skip
n8n-cli package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist
n8n-cli package import --file=export.n8np --project-id=<id> --credential-conflict-policy=overwrite
n8n-cli package import --file=export.n8np --conflict-policy=fail --bindings='{"credentials":{"<sourceId>":"<targetId>"}}'
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` package file. (required) |
| `--conflict-policy` | What to do when an Agent or workflow matches an existing destination. `new-version` (CLI default) replaces its definition. It also archives or restores a matched workflow to match the package. These transitions require `workflow:delete`. `fail` blocks the import. `skip` leaves it unchanged. All modes create entities without a match. The policy also applies to the skills of imported Agents: `new-version` saves a changed skill as a new version, `skip` keeps the existing skill, and `fail` blocks the import when a matched skill has other content. The import creates a skill that does not exist. See [Skills](#skills). |
| `-p, --project-id` | Target project ID. Defaults to your personal project. (alias: `--project`) |
| `--folder-id` | Target folder ID within the project. Defaults to the project root. (alias: `--folder`) |
| `--publishing-policy` | Publication policy for Agents and workflows. `preserve-published-state` (instance default) keeps new entities unpublished. It republishes an updated entity only if it was published and the package contains the source-published version. `match-source` publishes that version, or unpublishes when the source has no published version. Both policies leave publication unchanged when the source publishes a version absent from the package. `publish-all` requests publication. `unpublish-all` leaves imported entities unpublished. Skipped entities remain unchanged. Archived workflows remain unpublished. |
| `--id-policy` | Only `source` is supported. New Agents and workflows use the package IDs. An ID already used by an unmatched Agent or workflow, in any project, blocks the import. Matched entities keep their destination IDs. Agent and workflow identity maps remain separate. |
| `--missing-node-type-mode` | Handling for missing workflow node types and Agent node tool types or versions. `fail` (instance default) blocks the import before writes. `import-anyway` saves the definitions but blocks publication of affected entities. |
| `--project-conflict-policy` | What to do when a project in the package already exists on the instance, matched by ID, and by default how its contents are treated too (project packages only): `merge` (instance default) is purely additive — the existing project's name, description, icon and custom span attributes are left alone and the package's contents are added alongside; `overwrite` makes the package authoritative, replacing those details (a detail the package omits is left as it is, not cleared) and, via `--folder-conflict-policy`, removing contents the package does not carry; `fail` rejects the import before anything is written. |
| `--folder-conflict-policy` | What to do when a package folder already exists in the target project. **Defaults to whatever `--project-conflict-policy` is**, so you state the intent once; for a workflow package, which defines no projects, it defaults to `merge`. `merge` reuses the existing folder and merges the package's children into it; `fail` rejects the import; `overwrite` additionally removes workflows the package does not contain, at the project root and in package-defined folders (see `--overwrite-deletion-policy`), and is rejected unless `--project-conflict-policy` is also `overwrite`. Folders the package does not define are removed too, but only once nothing is left inside them, so target-only content is never swept up. Requires a folders-enabled license when the package contains folders, and the `workflow:delete` and `folder:delete` scopes for `overwrite`. |
| `--overwrite-deletion-policy` | How `--folder-conflict-policy=overwrite` removes a workflow the package does not contain: `archive` (instance default) archives it, keeping it and its execution history recoverable; `hard-delete` archives it — the step that unpublishes it — then deletes the workflow and its executions permanently. Each entry in `removedWorkflows` reports what actually happened in its `deletion` field, so a `hard-delete` whose row cannot be dropped yet (unpublishing defers trigger teardown) shows as `archived` rather than failing the import. Ignored unless the folder conflict policy is `overwrite`. |
| `--credential-matching-mode` | How credential references are matched on the target instance: `id-only` (default, match by id), `name-and-type` (match by exact name and type), or `type-only` (match by type). For `name-and-type` and `type-only`, candidates are ranked by scope — owned by the target project, then shared into it, then global — and ties within a scope use the most recently updated credential. |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved. `create-stub` (instance default) creates empty placeholder credentials in the target project; `create-with-values` also creates them, seeded from the expression data bundled in the package (a reference the package carries no data for falls back to an empty stub). A credential created with package data is listed under `credentials.seeded` when the package confirms that it carries all source data, and under `credentials.incomplete` otherwise. The import does not publish the imported version of an Agent or workflow that uses an incomplete credential (`incomplete-credential`). An active earlier version stays active. `must-preexist` requires every referenced credential to already exist. |
| `--credential-conflict-policy` | What to do when a referenced credential matches an existing credential and the package has a different name or different values for it. `keep-existing` (instance default) never changes a matched credential. `overwrite` writes the package name and the expression values from the package to a matched credential that a project of the import owns, and lists it under `credentials.updated`. It keeps all other stored values: secrets, other fields, the OAuth connection, and array fields. It never changes a global credential that a different project owns, or a managed, end-user (resolvable) or instance-level credential. `fail` rejects the import when `overwrite` would change a matched credential. No policy writes a match that would not change. `overwrite` and `fail` compare stored values, so they need the `credential:update` permission on each matched credential that a project of the import owns, also when it would not change. |
| `--data-table-matching-mode` | How data tables referenced by the package are matched on the target instance: `by-id` (default and only mode) matches the target-project table with the same id — imported tables keep their source id — and never falls back to name matching. |
| `--data-table-missing-mode` | What to do when a referenced data table is absent in the target project. `create` (instance default) creates it from the package schema — keeping the source id, with no rows; `must-preexist` requires it to already exist; `do-nothing` skips creation. Under the `keep-existing` and `fail` schema conflict policies, matched tables are schema-validated (all package columns present with the same name and type), even under `do-nothing`. Under `overwrite-non-destructive`, a matched table blocks the import only when a change removes or retypes a column. The import never imports table rows. Matched tables change only under `--data-table-schema-conflict-policy=overwrite` or `overwrite-non-destructive`, which keep their rows. |
| `--data-table-schema-conflict-policy` | How strictly a matched data table's schema is compared. Under `keep-existing` and `fail`, every package column must exist on the matched target table with the same name and type. A missing column or a type mismatch rejects the import. `keep-existing` (instance default) ignores additional columns the target table has of its own; `fail` is the strict drift-detection choice and rejects those too. `keep-existing` and `fail` never alter the matched target table. `overwrite` changes the matched target table to match the package. It can remove or retype columns. The values in those columns are removed. Rows and other columns are kept. When the package has column ids, a column that is only renamed keeps its values. The changes apply to all workflows that use the table. `overwrite-non-destructive` makes the same changes as `overwrite`, but rejects the import and writes nothing when a change removes or retypes a column. A target-only column counts as removed. |
| `--variable-missing-mode` | What to do when a referenced variable is absent from both the target project and global scope: `create-with-value` (instance default) creates it with the package value and reports it under `variables.created`, falling back to an empty stub under `variables.stubbed` when the package carries no value for it; `create-stub` always creates an empty value; `do-nothing` reports unresolved names without creating anything; `must-preexist` rejects the import. What happens to a variable that *does* resolve is `--variable-conflict-policy`'s job. Requires a variables-enabled license only when the import creates a variable. |
| `--variable-conflict-policy` | What to do when a referenced variable resolves in the target project or global scope but the package bundles a different value for it. `keep-existing` (instance default) leaves the target value alone and reports the name under `variables.matched`; `overwrite` silently replaces the value of the existing variable at whichever scope it was found — including a global variable other projects also read — and reports the name under `variables.updated`; `fail` rejects the import. No policy touches a resolved variable when there is nothing to change: either the package bundles no value for it (values excluded at export, or an exported value that was itself empty), or the value it bundles already matches the target's. Under `overwrite`, a project package whose projects hold *different* values for a name they all resolve to one row — a global none of them shadows — is rejected: one row cannot carry both values. Requires a variables-enabled license only when the import overwrites. |
| `--variable-parent-policy` | Where `create-with-value` and `create-stub` place missing variables for workflow/folder packages (`project`, the behaviour when omitted, uses the target project; `global` uses global scope). Must be omitted for project packages, which reject it with a 400 — their placement follows the package layout, so a variable bundled under a project is created in that project and one bundled at the top level is created globally. |
| `--tag-missing-mode` | What to do when a tag referenced by the package's workflows is absent on the target instance — tags are matched by source id, never by name. `create` (instance default) creates the tag globally with its source id and name; `do-nothing` imports the workflows without the missing tags and lists them under `tags.skipped`. |
| `--tag-conflict-policy` | What to do when a referenced tag conflicts on the target instance — the same-id target tag carries a different name (rename drift), or the tag's name is held by a different tag (name collision). `skip` (instance default) imports the workflows without the conflicted tags and lists them under `tags.skipped`; `fail` rejects the import; `rename` renames a drifted target tag to the package name and reconciles a name collision by re-keying the existing tag to the package (source) id, keeping its name and taggings; a drifted tag whose package name is held by another tag still rejects the import. |
| `--bindings` | Explicit source→target id bindings as a JSON object keyed by entity type, e.g. `{"credentials":{"<sourceId>":"<targetId>"}}`. Only `credentials` is honoured today; these bindings are applied before `--credential-matching-mode` resolution runs. |

Requires the API key to hold:

- `workflow:import` — when the package contains workflows
- `agent:import` and `agent:read` — when the package contains Agents
- `agent:create`, `agent:update`, `agent:publish`, or `agent:unpublish` — when the import plans that action. Skipped Agents require no write grants.
- `skill:create` — when the import creates a project or instance skill. The skills of one Agent need only the Agent grants.
- `skill:update` — when the import saves a new version of a matched project or instance skill.
- `workflow:delete` — when `--conflict-policy=new-version` archives or restores a matched workflow, or when the effective folder conflict policy is `overwrite` (set directly, or inherited from `--project-conflict-policy=overwrite`)
- `folder:delete` — when the effective folder conflict policy is `overwrite` (set directly, or inherited from `--project-conflict-policy=overwrite`)
- `dataTable:create` — when the package references data tables and `--data-table-missing-mode` is `create`
- `dataTable:update` — when `--data-table-schema-conflict-policy` is `overwrite` or `overwrite-non-destructive` and changes at least one matched table
- `variable:create` — when the import actually creates a variable, i.e. `--variable-missing-mode` is `create-with-value` (the default) or `create-stub` and at least one referenced variable does not already resolve. A package whose variables all resolve creates nothing and needs neither this scope nor a variables-enabled license.
- `variable:update` — when the import would overwrite a variable, i.e. `--variable-conflict-policy=overwrite` and at least one resolved variable's value differs from the package's. `keep-existing` (the default) never overwrites and needs neither this scope nor a variables-enabled license.
- `credential:create` — when `--credential-missing-mode=create-with-values` and the import creates at least one credential.
- `credential:update` — when `--credential-conflict-policy=overwrite` and the import changes at least one matched credential.
- `tag:create` — when the import would create a tag (under `--tag-missing-mode create`, the instance default; tags that match, are dropped, or belong only to skipped workflows need no scope)
- `tag:update` — when the import would rename or reconcile a tag (under `--tag-conflict-policy rename`).

Mixed packages require both import grants. Destination-project permissions and
dependency permissions still apply. The CLI uses the public API and its existing
validation, save, and publication services.

The three main policies apply to all Agents and workflows in the archive.
There are no per-kind overrides. Use `--conflict-policy`, `--id-policy`, and
`--publishing-policy`. The old workflow-specific flag names are rejected.
The API fields are `conflictPolicy`, `idPolicy`, and `publishingPolicy`.
The API rejects the old workflow-specific and Agent-specific policy fields.

Human and JSON results include `agents`, `bindings.agents`, and `counts.agents`.
Each Agent summary reports its source and destination IDs, name, project,
active version, import status, separate `publishing` outcome, and `channels`.
Publication failures retain successfully imported definitions. The command
returns success for these results and reports the publication failure separately.

The import never connects a channel with a credential from the package. The
external app of a channel, such as a Slack app, must send events to the
destination Agent. Each entry in `channels` has one of these statuses:

- `reused`: the destination Agent already had this channel. The import keeps
  its connection and applies the package settings.
- `setup-required`: the import saved the package settings without a
  connection. Open `setupUrl` and set up the channel. `reason` is
  `new-channel` or `destination-draft`.

The import does not import or stub a credential that only a channel uses.
When the publishing policy requests publication, a channel that needs setup
blocks it with the reason `channel-setup-required`. The definition import stays
saved. If no version of the Agent is active, `publishing.state` is `blocked`
with `blockedReason`. If an earlier published version stays active,
`publishing.state` is `unchanged` with `skippedPublishReason`.

For created and updated Agents, the import removes destination channels that
the package does not contain. Skipped Agents stay unchanged.

When the import is blocked, the command exits non-zero and lists the blocking
issues. Examples:

- an Agent or workflow conflict under `--conflict-policy=fail`
- an invalid Agent definition or an unresolved Agent dependency
- a skill problem, for example a skill conflict under `--conflict-policy=fail`
- a project that already exists under `--project-conflict-policy=fail`
- a workflow that `--folder-conflict-policy=overwrite` would remove but you lack
  `workflow:delete` on
- an unresolved credential under `--credential-missing-mode=must-preexist`
- a matched credential that the package would change under
  `--credential-conflict-policy=fail`, or a matched credential that you cannot
  update under `--credential-conflict-policy=overwrite` or `fail`
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

### Skills

The import plans the skills of each imported Agent together with that Agent.
It does not change the skills of skipped Agents.

- `--conflict-policy` applies to skills too. `new-version` saves a changed skill
  as a new skill version. `skip` keeps the existing skill. `fail` blocks the
  import when a matched skill has other content. A matched skill with the same
  content stays unchanged. The import creates a skill that does not exist.
- Under every policy, the import is blocked when a package skill ID belongs to
  another project, another Agent or the instance, or when its scope already has
  a skill with that name. `skip` does not prevent this.
- A new version of a project or instance skill applies to all Agents on the
  instance that follow the skill. This includes Agents that are not in the
  package, and their drafts.
- A skill conflict returns HTTP 422, not 409. This also applies under
  `--conflict-policy=fail`. The import plans a skill as part of each Agent that
  uses it. It reports every skill problem as an `agent-invalid` issue on that
  Agent, with the issue path `skills.<skillId>`.

## `package import-selection`

Import a chosen subset of workflows from a `.n8np` project package. Workflow and
folder packages are not supported. The command imports workflows listed in
`--selected-workflow-ids` and removes workflows listed in `--deleted-workflow-ids`
(archived by default; see `--overwrite-deletion-policy`). It leaves workflows
outside both lists and other projects unchanged. It can also create folders and
referenced resources under the fixed policies below.

The selection belongs to one source project (`--selected-project-id`). The command
writes selected workflows into the target instance project with the same ID.
It creates that project if it does not exist. There is no separate target option.

These policies are fixed:

| Resource | Policy |
|----------|--------|
| Projects | Merge the selected project with the target project. |
| Folders | Merge all packaged folders in the selected project, including folders with no selected workflows. |
| Tags | Create missing tags referenced by imported workflows. Skip tag conflicts. |
| Data tables | Match referenced tables by ID. Create missing tables. Reject incompatible schemas. |
| Credentials | Match referenced credentials by ID. They must already exist. Keep their current names and values. |
| Variables | Referenced variables must already exist. Keep their current values. |

An imported workflow's destination ID must not appear in `--deleted-workflow-ids`.
The command rejects this overlap before any writes, including with the `skip`
policy. It checks the destination ID even if the workflow is absent or archived.

The result lists removed workflows under `removedWorkflows`. Each entry has a
`deletion` field of `archived` or `deleted` that reports what actually happened.
With the default `--overwrite-deletion-policy=archive` the command archives each
workflow, so it and its execution history stay recoverable. `hard-delete` also
removes the workflow permanently. A workflow can stay `archived` under
`hard-delete` when deferred trigger teardown blocks the delete. The command skips
absent workflows and omits them from this list.

```bash
n8n-cli package export --project-id=<id> --output=project.n8np
n8n-cli package import-selection --file=project.n8np --selected-project-id=<id> --selected-workflow-ids=<id1>,<id2>
n8n-cli package import-selection --file=project.n8np --selected-project-id=<id> --selected-workflow-ids=<id1> --deleted-workflow-ids=<id3>
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` project package file. (required) |
| `--selected-project-id` | Source project ID for the selection. The target project uses the same ID. (required) |
| `--selected-workflow-ids` | Source workflow IDs to import. Comma-separate them, or repeat the flag. Only these workflows are imported. |
| `--deleted-workflow-ids` | Target workflow IDs to remove. Separate IDs with commas, or repeat the flag. The removal manner follows `--overwrite-deletion-policy`. Absent workflows are ignored. |
| `--conflict-policy` | What to do when a workflow already exists by source ID: `new-version` (default), `fail`, or `skip`. |
| `--id-policy` | Only `source` is supported. New workflows use the package IDs. An ID already used by an unmatched workflow, in any project, blocks the import. Matched workflows keep their destination IDs. |
| `--overwrite-deletion-policy` | How `--deleted-workflow-ids` removes each target workflow: `archive` (default) archives it, keeping it and its execution history recoverable; `hard-delete` archives it — the step that unpublishes it — then deletes the workflow and its executions permanently. A workflow can stay `archived` under `hard-delete` when deferred trigger teardown blocks the delete. Each `removedWorkflows` entry reports the actual result in its `deletion` field. |

Requires the API key to hold:

- `workflow:import` — always
- `workflow:delete` — when `--deleted-workflow-ids` contains IDs or an imported workflow changes between archived and unarchived
- `project:create` and `project:update` — always, even when the selected project already exists
- `folder:create` and `folder:update` — when the package contains folders, including folders outside the selected project
- `tag:create` — when the import creates a missing tag referenced by an imported workflow

Packages with folders also require a license that supports folders. The user must
have permission to create data tables when the import creates missing tables.

When the import is blocked, the command exits non-zero and lists the blocking
issues.
