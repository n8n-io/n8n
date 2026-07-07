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
```

| Flag | Description |
|------|-------------|
| `-w, --workflow-id` | Workflow ID to include. Repeat the flag to export several. |
| `-f, --folder-id` | Folder ID to include with its nested folders. Repeat the flag to export several. |
| `-p, --project-id` | Project ID to include. Repeat the flag to export several. |
| `-o, --output` | File to write the package to. Defaults to `export.n8np`. |

Provide at least one `--workflow-id`, `--folder-id`, or `--project-id`. Requires
the API key to hold `workflow:export` when exporting workflows or folders, or
`project:export` when exporting projects.

## `package import`

Import a `.n8np` archive into a project.

```bash
n8n-cli package import --file=export.n8np --conflict-policy=fail
n8n-cli package import --file=export.n8np --project=<id> --conflict-policy=new-version
n8n-cli package import --file=export.n8np --conflict-policy=fail --credential-missing-mode=must-preexist
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` package file. (required) |
| `--conflict-policy` | What to do when a workflow already exists by source ID: `new-version`, `fail`, or `skip`. (required) |
| `--project` | Target project ID. Defaults to your personal project. |
| `--folder` | Target folder ID within the project. Defaults to the project root. |
| `--workflow-id-policy` | Whether imported workflows keep their source ID (`source`) or receive a new one (`new`). |
| `--credential-matching-mode` | How credential references are matched on the target instance: `id-only` (default, match by id), `name-and-type` (match by exact name and type), or `type-only` (match by type). For `name-and-type` and `type-only`, candidates are ranked by scope — owned by the target project, then shared into it, then global — and ties within a scope use the most recently updated credential. |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved. `create-stub` (instance default) creates empty placeholder credentials in the target project; `must-preexist` requires every referenced credential to already exist. |

Requires the API key to hold the `workflow:import` scope. When the import is
blocked — for example by a workflow conflict under `--conflict-policy=fail`, or
by an unresolved credential under `--credential-missing-mode=must-preexist` —
the command exits non-zero and lists the blocking issues. With the default
`create-stub` mode, missing credentials are stubbed instead of blocking the import.
