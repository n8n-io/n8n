# package

Export and import workflows as portable n8n packages (`.n8np` archives).

> **Beta — disabled by default.** These commands call beta endpoints that the
> target instance must opt into with `N8N_PUBLIC_API_PACKAGES_ENABLED=true`, and
> the n8n Packages feature must be licensed. While disabled, the instance returns
> `404` and the CLI prints a hint explaining how to enable it.

## `package export`

Export one or more workflows into a gzipped `.n8np` archive written to disk.

```bash
n8n-cli package export --workflow-id=abc --output=export.n8np
n8n-cli package export -w abc -w def -o team.n8np
```

| Flag | Description |
|------|-------------|
| `-w, --workflow-id` | Workflow ID to include. Repeat the flag to export several. (required) |
| `-o, --output` | File to write the package to. Defaults to `export.n8np`. |

Requires the API key to hold the `workflow:export` scope.

## `package import`

Import a `.n8np` archive into a project.

```bash
n8n-cli package import --file=export.n8np --conflict-policy=fail
n8n-cli package import --file=export.n8np --project=<id> --conflict-policy=new-version
```

| Flag | Description |
|------|-------------|
| `--file` | Path to the `.n8np` package file. (required) |
| `--conflict-policy` | What to do when a workflow already exists by source ID: `new-version`, `fail`, or `skip`. (required) |
| `--project` | Target project ID. Defaults to your personal project. |
| `--folder` | Target folder ID within the project. Defaults to the project root. |
| `--workflow-id-policy` | Whether imported workflows keep their source ID (`source`) or receive a new one (`new`). |
| `--credential-matching-mode` | How credential references are matched on the target instance (`id-only`). |
| `--credential-missing-mode` | What to do when a referenced credential cannot be resolved (`must-preexist`). |

Requires the API key to hold the `workflow:import` scope. When the import is
blocked — for example by a workflow conflict under `--conflict-policy=fail`, or
by a credential that does not exist on the target instance — the command exits
non-zero and lists the blocking issues.
