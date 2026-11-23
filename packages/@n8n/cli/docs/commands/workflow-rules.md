# workflow-rules (preview)

Check workflow files against the Workflow Rules of an n8n instance. Use it in CI
to stop a workflow that breaks a blocking rule before it reaches production.

The instance must run with `N8N_ENABLED_MODULES=workflow-rules`. The API key
needs the `workflowRules:read` scope.

## `workflow-rules check`

```bash
n8n-cli workflow-rules check .
n8n-cli workflow-rules check workflows --rules workflow-rules.json
n8n-cli workflow-rules check . --output github --fail-on warn
```

The command searches the given files and folders for workflow JSON files. It
reads both layouts that n8n writes to git:

- Source control: `workflows/<id>.json`. The project comes from the `owner`
  field.
- n8n packages: `projects/<slug>-<id>/workflows/<slug>-<id>/workflow.json`. The
  project comes from `projects/<slug>-<id>/project.json`.

Other JSON files with a `name` and a `nodes` array count as workflows too.

| Flag | Description |
|------|-------------|
| `--rules` | A file from `workflow-rules export`. The check then runs offline and calls no instance. Without it, the check calls `POST /api/v1/workflow-rules/check`. |
| `--project` | The project whose rules apply when the project of a file cannot be detected. |
| `--output` | `text` (default), `json`, or `github` for GitHub Actions annotations. |
| `--fail-on` | `block` (default), `warn`, or `never`. |

The command exits with code `4` when a finding reaches `--fail-on`, and with
code `0` otherwise. Exempted findings never fail the check.

Offline checks skip the "Descriptive node names" rule, because it needs the
node type descriptions of an instance.

## `workflow-rules export`

```bash
n8n-cli workflow-rules export --output-file workflow-rules.json
```

Writes the instance rules, every project's rules, the exemptions and the
instance defaults to one file. Commit the file to run offline checks in CI.

## GitHub Actions

Check the workflows of a source control repository on every pull request:

```yaml
name: Workflow Rules
on: pull_request

jobs:
  workflow-rules:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Check workflows
        env:
          N8N_URL: ${{ secrets.N8N_URL }}
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
        run: npx --yes @n8n/cli workflow-rules check . --output github
```

To check without reaching the instance, commit the exported rules and replace
the last step with:

```yaml
      - name: Check workflows
        run: npx --yes @n8n/cli workflow-rules check . --rules workflow-rules.json --output github
```
