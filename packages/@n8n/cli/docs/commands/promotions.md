# promotions

Move projects between n8n instances through a Git repository. One instance
**promotes** its projects to a branch. Another instance **applies** that branch
to itself.

Setup has two parts:

| Part | Command topic | What it holds |
|------|---------------|---------------|
| Provider | `promotion-provider` | The credentials for a Git host |
| Environment | `promotion-environment` | One direction: the repository, the provider, and the branch settings |

An environment has one direction: `promote` pushes to Git, `apply` imports from
Git. The instance can have one environment for each direction, so it can promote
to one repository and apply from another. A project can have its own environment
for each direction. A direction without a project environment uses the instance
environment.

Requires the Promotions feature to be licensed. The API key scopes are named
`gitConnection:*`.

## Setup example

```bash
# 1. Create a provider. An SSH provider returns a public key.
#    Note the `id` in the response. Step 3 needs it as `providerId`.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin

# 2. Add that public key to the repository as a deploy key.

# 3. Create an environment for each direction you want to use.
cat promote.json | n8n-cli promotion-environment create --stdin
cat apply.json | n8n-cli promotion-environment create --stdin

# 4. Connect each environment.
n8n-cli promotion-environment connect env-1
n8n-cli promotion-environment connect env-2

# 5. Promote from this instance, or apply to it.
n8n-cli promotion-environment promote env-1 --message="Promote team projects"
n8n-cli promotion-environment apply env-2
```

`promote.json` and `apply.json` for step 3:

```json
{
  "name": "Production",
  "scope": "instance",
  "providerId": "prov-1",
  "remote": { "schemaVersion": 1, "remoteUrl": "git@github.com:acme/flows.git" },
  "direction": "promote",
  "settings": { "schemaVersion": 1, "baseBranchName": "main", "createBranchOnPromotion": false }
}
```

```json
{
  "name": "Production",
  "scope": "instance",
  "providerId": "prov-1",
  "remote": { "schemaVersion": 1, "remoteUrl": "git@github.com:acme/flows.git" },
  "direction": "apply",
  "settings": { "schemaVersion": 1, "branchName": "main" }
}
```

## `promotion-provider create`

Create a provider from JSON. Read the JSON from stdin or from a file. Secrets
stay out of the command line this way.

```bash
# SSH. n8n generates the key pair and returns the public key.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin

# HTTP(S). `token` means a username and a password, not a Git host API token.
n8n-cli promotion-provider create --file=provider.json
```

| Field | Description |
|-------|-------------|
| `name` | Display name. |
| `type` | `git`. |
| `auth.authType` | `ssh-key` or `token`. |
| `auth.keyType` | For `ssh-key`: `ed25519` (default) or `rsa`. |
| `auth.username`, `auth.password` | For `token`: the HTTP(S) credentials. Both are required. |

The response holds the provider fields at the top level, with `publicKey` beside
them. `publicKey` is `null` for a `token` provider. Add an SSH public key to the
remote as a deploy key.

Capture the new ID for the environment you create next:

```bash
# Just the ID.
PROVIDER_ID=$(n8n-cli promotion-provider create --file=provider.json --format=id-only)

# Or keep the whole response and read both values from it.
n8n-cli promotion-provider create --file=provider.json --json > provider-out.json
jq -r '.id' provider-out.json
jq -r '.publicKey' provider-out.json
```

## `promotion-provider list` / `get` / `update` / `delete`

```bash
n8n-cli promotion-provider list
n8n-cli promotion-provider list --limit=10
n8n-cli promotion-provider get prov-1
echo '{"name":"GitHub (deploy)"}' | n8n-cli promotion-provider update prov-1 --stdin
n8n-cli promotion-provider delete prov-1
```

`list` leaves out the public key. Read it with `get`.

`update` takes `name`, `auth`, or both. Sending `auth` replaces the credentials
of every environment that uses the provider. The authentication method cannot
change. For `ssh-key`, leave out `keyType` to keep the current algorithm when
you rotate the key.

`delete` fails while an environment still uses the provider.

## `promotion-environment create`

Create an environment for one direction on an existing provider, from JSON.

```bash
n8n-cli promotion-environment create --file=promote.json
```

| Field | Description |
|-------|-------------|
| `name` | Display name. |
| `scope` | `instance` covers the whole instance. `projects` covers the linked projects. The instance can have one environment for each direction. |
| `providerId` | The provider to use. |
| `remote.remoteUrl` | The SSH or HTTP(S) remote URL. Do not put credentials in the URL. |
| `direction` | `promote` or `apply`. |
| `settings.branchName` | For `apply`: the branch to import from. |
| `settings.baseBranchName` | For `promote`: the branch to push to. |
| `settings.createBranchOnPromotion` | For `promote`: required. Push to a new timestamped branch instead of the base branch. |

## `promotion-environment list` / `get` / `update` / `delete`

```bash
n8n-cli promotion-environment list
n8n-cli promotion-environment list --scope=instance --direction=promote
n8n-cli promotion-environment list --provider=prov-1
n8n-cli promotion-environment get env-1
echo '{"name":"Production (EU)"}' | n8n-cli promotion-environment update env-1 --stdin
n8n-cli promotion-environment delete env-1
```

| Flag | Description |
|------|-------------|
| `--scope` | Show only `instance` or only `projects` environments. |
| `--direction` | Show only `promote` or only `apply` environments. |
| `--provider` | Show only the environments that use this provider. Use it to see which environments a provider edit affects. |
| `--limit` | Maximum number of results. |

`update` takes `name`, `providerId`, `remote`, `settings`, or a combination. The
direction and the scope cannot change. `settings` replaces the whole saved
settings and must match the direction, so send every setting you want to keep.

```bash
echo '{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":true}}' \
  | n8n-cli promotion-environment update env-1 --stdin
```

`delete` also removes the project links and the local checkout. The provider
stays. Nothing in Git changes.

## `promotion-environment connect` / `disconnect`

```bash
n8n-cli promotion-environment connect env-1
n8n-cli promotion-environment disconnect env-1
```

`connect` prepares the environment. For Git, it copies the configured branch
into local storage. You can run it again at any time. Connecting one environment
does not make another environment ready.

`disconnect` removes the local checkout. The environment, its credentials, and
the trusted SSH host keys stay.

Both commands work on the instance that handles the request. Another instance in
the deployment can hold a different checkout.

## `promotion-environment promote`

Export all team projects, commit them, and push to the configured branch.

```bash
n8n-cli promotion-environment promote env-1
n8n-cli promotion-environment promote env-1 -m "Promote team projects" --force
```

| Flag | Description |
|------|-------------|
| `-m, --message` | Commit message. If you omit it, the commit uses a generated message. |
| `--force` | Overwrite the remote branch when it has diverged. |

Personal projects are not included. A workflow on the branch that moved to a
personal project is refused, because Apply would delete it on the destination.
Move it back to its team project first. A workflow or folder on the branch that
moved to another team project is also refused while its old project still
exists, because Apply can't move it between projects. Connect the environment first. This command
works on an `instance` Promote environment only. The API key also needs
`variable:list` when the workflows reference variables.

## `promotion-environment list-changes`

List the workflows that differ between a project and the branch of its
promotion environment for one direction.

```bash
n8n-cli promotion-environment list-changes proj-abc promote
n8n-cli promotion-environment list-changes proj-abc apply
```

| Flag | Description |
|------|-------------|
| `--search` | List only the workflows whose name matches this text. |
| `--sort` | Sort by `name`, `updatedAt`, or `status`. The default is `name`. |
| `--order` | Sort order: `asc` or `desc`. The default is `asc`. |

For `promote` the rows are what a promotion would send to the branch, and the
API key needs `gitConnection:push`. For `apply` the rows are what applying the
branch would change on this instance, and the key needs `gitConnection:pull`.
`commitSha` is the commit the rows were read from. Table output shows the rows
only. Use `--json` to get the rows and `commitSha` together. Connect the
environment first. Use the `id` of each row to build a selective promote.

## `promotion-environment promote-selection`

Read a chosen set of a project's workflows now, and push their current state to
the branch of the project's Promote environment, or of the instance Promote
environment.

```bash
n8n-cli promotion-environment promote-selection proj-abc -w wf-1 -w wf-2
n8n-cli promotion-environment promote-selection proj-abc -w wf-1 -m "Promote checkout flow"
```

| Flag | Description |
|------|-------------|
| `-w, --workflow` | Workflow ID to promote. Repeat the flag for more than one. Required. |
| `-m, --message` | Commit message. If you omit it, the commit uses a generated message. |

Archived workflows stay on the branch as archived. A selected workflow that was
deleted leaves this project's branch. A selected workflow that moved into or out
of the project since the branch was written is refused: move it back
first. The request fails before any write if the branch does not hold a
deleted workflow under this project. Connect that environment first. The API key also needs
`variable:list` when the workflows reference variables.

## `promotion-environment apply`

Reset the local checkout to the tip of the configured branch, and import the
package. This overwrites the instance to match the branch.

```bash
n8n-cli promotion-environment apply env-2
n8n-cli promotion-environment apply env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

| Flag | Description |
|------|-------------|
| `--expected-environment-id` | ID of the Apply environment that you reviewed. |
| `--expected-branch` | Branch that you reviewed. |
| `--expected-commit-sha` | Full commit SHA that you reviewed (40 or 64 lowercase hex characters). |

Without the `--expected-*` flags, the command applies the branch tip. With them,
the command applies only the source that you reviewed. Pass all three flags or
none.

| Result | Exit code | What happened |
|--------|-----------|---------------|
| `applied` | `0` | The package was imported. JSON output includes `counts` and `warnings`. |
| `source-changed` | `3` | The environment, branch, or commit is not the one you reviewed. Nothing was imported. Review the changes again. |
| `blocked` | `4` | Preflight found missing bindings, access requirements, or conflicts. A conflict can be a destructive data table change or a project deletion. Nothing was imported. The output shows the `apply-continue` command to run after you resolve them. |

With `--json`, the output is the full result for each status. For `blocked`, the
`preflight` object lists each missing project, missing binding, access
requirement, and conflict. Existing variable values on this instance are kept.

Apply makes the team projects on this instance match the package. It deletes
each team project that the package does not hold, with all its workflows,
credentials, and data tables. Preflight reports each such project as a
`project-deletion` conflict.

Workflows and folders move within their project to match the branch, and folders
take the name on the branch. `counts.workflows.moved` is part of
`counts.workflows.updated`. `counts.folders.moved` and `counts.folders.renamed` are
parts of `counts.folders.updated`. A workflow or folder that the branch and this
instance hold in different projects is refused before any write, and nothing is
imported.

Connect the environment first. This command works on an `instance` Apply
environment only. The API key needs `gitConnection:pull`.

## `promotion-environment apply-continue`

Continue an Apply that was `blocked`, after you resolve the missing bindings, access requirements, or conflicts.

```bash
n8n-cli promotion-environment apply-continue env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

The three `--expected-*` flags are required. Use the `environmentId`,
`git.branchName`, and `git.commitSha` that the blocked Apply reported. The
command runs the preflight again. The results and exit codes are the same as
for `apply`: `blocked` again means that something still blocks, and
`source-changed` means that you must review again. The server keeps no session,
so run the command again when it exits `4`.

Add `--confirm-destructive-changes` to also apply destructive data table
changes and delete projects:

- Removed or retyped columns. The values in those columns are removed. Rows and
  other columns are kept.
- Team projects that the package does not hold. Each project is deleted with
  everything in it. You can't undo this.

The flag applies all such changes when the command runs. This includes changes
and projects that the blocked Apply did not report. Without the flag, a
destructive change or a project deletion blocks the command, and it exits `4`.

## Apply a reviewed commit

```bash
# 1. Review the changes. Take the commit SHA from the same response as the rows:
#    a second request can read a newer commit.
n8n-cli promotion-environment list-changes proj-abc apply --json > reviewed-changes.json
jq '{commitSha, changes}' reviewed-changes.json

# 2. Read the branch of the Apply environment.
n8n-cli promotion-environment get env-2 --jq '.settings.branchName'

# 3. Apply that commit only.
n8n-cli promotion-environment apply env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<sha from step 1>

# 4. On exit code 4, resolve the missing bindings, access requirements, or conflicts.
#    Then run the apply-continue command that step 3 printed.
```

## `promotion-environment apply-selection`

Apply a chosen set of a project's workflow changes from its Apply branch. This is
the apply counterpart of `promote-selection`: build the selection from the `id`
values that `list-changes proj-abc apply` returns.

```bash
n8n-cli promotion-environment apply-selection proj-abc -w wf-1 -w wf-2
n8n-cli promotion-environment apply-selection proj-abc -w wf-1 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

| Flag | Description |
|------|-------------|
| `-w, --workflow` | Workflow ID to apply. Repeat the flag for more than one. Required. |
| `--expected-environment-id` | ID of the Apply environment that you reviewed. |
| `--expected-branch` | Branch that you reviewed. |
| `--expected-commit-sha` | Full commit SHA that you reviewed (40 or 64 lowercase hex characters). |

Selected IDs on the branch are imported. Instance workflows this project owns
whose IDs are absent from the branch are removed. Unselected content stays
unchanged. A selected workflow moves within the project to match the branch,
together with the folders that hold it, and those folders take the name on the
branch. Other folders stay as they are. A selected workflow, or a folder that the
branch holds in this project, that the branch and this instance hold in different
projects is refused before any write. Without the `--expected-*` flags, the command applies the branch tip;
with them, it applies only the source that you reviewed. Pass all three flags or
none.

The results and exit codes are the same as for `apply`: `applied` (`0`),
`source-changed` (`3`), and `blocked` (`4`). When it exits `4`, the output shows
the `apply-selection-continue` command to run after you resolve the bindings; it
resends the same workflow ids. With `--json`, the output is the full result for
each status.

Connect the environment first. The API key needs `gitConnection:pull`. The
environment is the project's own Apply environment when it has one, otherwise
the instance Apply environment.

## `promotion-environment apply-selection-continue`

Continue a selection Apply that was `blocked`, after you resolve the missing
bindings, access requirements, or conflicts.

```bash
n8n-cli promotion-environment apply-selection-continue proj-abc -w wf-1 -w wf-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

Resend the same workflow ids. The three `--expected-*` flags are required: use
the `environmentId`, `git.branchName`, and `git.commitSha` that the blocked Apply
reported. The command runs the preflight again. The results and exit codes are
the same as for `apply-selection`. The server keeps no session, so run the
command again when it exits `4`.

Add `--confirm-destructive-changes` to also apply destructive data table
changes: removed or retyped columns. The values in those columns are removed.
Rows and other columns are kept. The flag applies all such changes when the
command runs. This includes changes that the blocked Apply did not report.
Without the flag, a destructive change blocks the command, and it exits `4`.

## `promotion-environment list-projects` / `add-project` / `remove-project`

Link team projects to a `projects`-scoped environment.

```bash
n8n-cli promotion-environment list-projects env-3
n8n-cli promotion-environment add-project env-3 proj-abc
n8n-cli promotion-environment remove-project env-3 proj-abc
```

A project can have one environment for each direction. A direction without a
project environment uses the instance environment.
