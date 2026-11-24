# promotions

Move projects between n8n instances through a Git repository. One instance
**promotes** its projects to a branch. Another instance **applies** that branch
to itself.

Setup has two parts:

| Part | Command topic | What it holds |
|------|---------------|---------------|
| Provider | `promotion-provider` | The credentials for a Git host. A GitLab provider can also list its repositories and branches. |
| Environment | `promotion-environment` | One direction: the repository, the provider, and the branch settings |

An environment has one direction: `promote` pushes to Git, `apply` imports from
Git. The instance can have one environment for each direction, so it can promote
to one repository and apply from another. A project can have its own environment
for each direction. A direction without a project environment uses the instance
environment.

Requires the Promotions feature to be licensed. The API key scopes are:

- `promotions:manageProviders`: create, update and delete providers, and list
  the repositories and branches of a provider
- `promotions:readProviders`: list and get providers
- `promotions:manageEnvironments`: create, update and delete environments,
  connect and disconnect them, and link projects
- `promotions:readEnvironments`: list and get environments, their projects and
  their missing projects
- `promotions:promote`: preview and promote. Every member can add it to a key.
  The key promotes only the projects where the role of its owner can promote:
  instance owners and admins in every project, project admins and editors as
  the `promotion-settings` option `--who-can-promote` allows. Only instance
  owners and admins can promote all team projects
- `promotions:apply`: preview, apply and continue
- `securitySettings:manage`: get and update the promotion settings

A scope lets the key start the operation. The role of the key owner still
decides what the operation can read and write. For example, the change details
show variable values only when that role can list variables.

## Setup example: Git over SSH

```bash
# 1. Create a provider. An SSH provider returns a public key.
#    Note the `id` in the response. Step 3 needs it as `providerId`.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin

# 2. Add that public key to the repository as a deploy key.

# 3. Create an environment for each direction you want to use.
cat promote.json | n8n-cli promotion-environment create --stdin
cat apply.json | n8n-cli promotion-environment create --stdin

# 4. Promote from this instance, or apply to it.
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

## Setup example: GitLab

A GitLab provider lists the repositories and branches that its token can
access. Use these lists to fill in the environment JSON, so you do not have to
type the remote URL or the branch names.

```bash
# 1. Create a GitLab provider. Keep the token in a file, not on the command line.
PROVIDER_ID=$(n8n-cli promotion-provider create --file=gitlab-provider.json --format=id-only)

# 2. Find the repository. Note its `remoteUrl` and `fullPath`.
n8n-cli promotion-provider list-repositories "$PROVIDER_ID" --search=flows --json

# 3. List the branches of that repository. The default branch has `isDefault: true`.
n8n-cli promotion-provider list-branches "$PROVIDER_ID" acme/flows --json

# 4. Create an environment for each direction. Use the `remoteUrl` from step 2
#    and a branch name from step 3. Then promote and apply as in the SSH
#    example.
n8n-cli promotion-environment create --file=promote.json
```

Steps 2 and 3 use `--json` because the table shortens values longer than 60
characters and adds `...`. A remote URL in a nested GitLab group is often
longer. JSON output shows the full values, so copy them from there.

`gitlab-provider.json` for step 1:

```json
{
  "name": "GitLab",
  "type": "gitlab",
  "config": { "schemaVersion": 1, "baseUrl": "https://gitlab.example.com" },
  "auth": { "authType": "token", "password": "<GitLab access token>" }
}
```

Give the token the `api` and `write_repository` scopes. The `api` scope is
required to open merge requests. Give the token user the Developer role or
higher. Protected branches can require the Maintainer role to push. Approve in
n8n merges the merge request, so the token user needs the Maintainer role, or
permission to merge, on the base branch.

## `promotion-provider create`

Create a provider from JSON. Read the JSON from stdin or from a file. Secrets
stay out of the command line this way.

```bash
# SSH. n8n generates the key pair and returns the public key.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin

# HTTP(S). For `git`, `token` means a username and a password, not a Git host API token.
n8n-cli promotion-provider create --file=provider.json

# GitLab. `token` is a GitLab access token.
n8n-cli promotion-provider create --file=gitlab-provider.json
```

| Field | Description |
|-------|-------------|
| `name` | Display name. |
| `type` | `git` for any Git remote. `gitlab` for a GitLab instance. |
| `config.baseUrl` | For `gitlab`: required. The GitLab URL, for example `https://gitlab.example.com`. Set `config.schemaVersion` to `1`. A `git` provider does not take a `config`. |
| `auth.authType` | `ssh-key` or `token` for `git`. Only `token` for `gitlab`. |
| `auth.keyType` | For `ssh-key`: `ed25519` (default) or `rsa`. |
| `auth.username`, `auth.password` | For `git` with `token`: the HTTP(S) credentials. Both are required. |
| `auth.password` | For `gitlab`: the GitLab access token. n8n ignores `auth.username` and uses `n8n` as the Git username. |

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

## `promotion-provider list-repositories` / `list-branches`

List the repositories and branches that a GitLab provider can access. No
environment is necessary.

```bash
n8n-cli promotion-provider list-repositories prov-1
n8n-cli promotion-provider list-repositories prov-1 --search=flows --limit=10
n8n-cli promotion-provider list-branches prov-1 acme/flows
n8n-cli promotion-provider list-branches prov-1 acme/flows --search=release
```

| Flag | Description |
|------|-------------|
| `--search` | For `list-repositories`: show only repositories whose name or namespace matches. For `list-branches`: show only branches whose name matches. |
| `--limit` | Maximum number of results. Without it, the CLI reads every page. |

`list-repositories` shows `id`, `name`, `fullPath`, `remoteUrl`, and
`defaultBranch`. It lists the repositories where the token has at least the
Developer role. Use `remoteUrl` as `remote.remoteUrl` of an environment.
`defaultBranch` is `null` (`-` in the table) for a repository without commits.

The table shortens values longer than 60 characters and adds `...`. Use
`--json` to see the full `fullPath` and `remoteUrl` values before you copy them.

`list-branches` shows `name` and `isDefault`. Give the repository as one of
these values. Do not URL-encode it.

- The `fullPath` from `list-repositories`, for example `acme/flows`.
- The `id` from `list-repositories`.
- The `remote.repositoryPath` of a GitLab environment.

```bash
REPOSITORY=$(n8n-cli promotion-environment get env-1 --json | jq -r '.remote.repositoryPath')
n8n-cli promotion-provider list-branches prov-1 "$REPOSITORY"
```

`--format=id-only` prints the repository IDs or the branch names.

A `git` provider has no Git host API, so both commands fail with an error. The
API key needs the `gitConnection:discover` scope.

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
| `remote.remoteUrl` | The SSH or HTTP(S) remote URL. Do not put credentials in the URL. For `gitlab`, use a `remoteUrl` from `promotion-provider list-repositories`. |
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
A new provider type or repository closes the open promotion reviews of the
environment in n8n. Their merge requests stay open on the Git host.

```bash
echo '{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":true}}' \
  | n8n-cli promotion-environment update env-1 --stdin
```

`delete` also removes the project links and the local checkout. The provider
stays. Nothing in the Git repository changes. The open promotion reviews of the
environment close in n8n. Their merge requests stay open on the Git host.

## `promotion-environment connect` / `disconnect`

```bash
n8n-cli promotion-environment connect env-1
n8n-cli promotion-environment disconnect env-1
```

`connect` prepares the environment. For Git, it copies the configured branch
into local storage. You can run it again at any time. This command is optional:
the other commands prepare the environment when they need it. Run it to copy
the branch early, or to check the remote and the credentials.

`disconnect` removes the local checkout. The environment, its credentials, and
the trusted SSH host keys stay. The environment still works: the next command
prepares it again.

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
exists, because Apply can't move it between projects. This command works on an
`instance` Promote environment only.

Run [`promote-check`](#promotion-environment-promote-check) first to see what
the Promote does not include.

## `promotion-environment promote-check`

List what a Promote of all team projects does not include. The command changes
nothing.

```bash
n8n-cli promotion-environment promote-check env-1
n8n-cli promotion-environment promote-check env-1 --json
```

```text
Cannot be promoted (2)
These dependencies are in a personal project. Move them to a team project to promote them.
  Credential "My token" (httpHeaderAuth): used by Invoices
  Workflow "Notify owner": stops the Promote; used by Weekly report

Warnings (1)
These references point to something that does not exist on the source instance.
  Variable "API_URL": used by Weekly report
```

The output has the groups and the lines that
[Missing dependencies](#missing-dependencies) describes. It never names the
project or the owner of a dependency. When nothing is missing, the command
prints `No missing dependencies and no warnings.`

The command only shows the lists. It exits `0` with or without entries, also
when an entry stops the Promote.

Use `--json` to get the full check:

- `missingDependencies`: every credential, sub-workflow, and error workflow that
  the workflows of the team projects use and that the Promote does not include.
  A dependency can be in another project, outside your access, or in a personal
  project.
- `warnings`: the references to a credential, workflow, or variable that does
  not exist on this instance.
- `revision`: a hash of the two lists. It changes when one of them changes.

This command works on an `instance` Promote environment only. The API key needs
`promotions:promote`. For a project, use
[`list-changes <projectId> promote`](#promotion-environment-list-changes).

## `promotion-environment list-changes`

Preview what Promote or Apply changes in a project: its projects, folders,
workflows, credentials, data tables, variables, and tags.

```bash
n8n-cli promotion-environment list-changes proj-abc promote
n8n-cli promotion-environment list-changes proj-abc apply --json
```

For `promote` the preview is what a promotion would send to the branch, and the
API key needs `promotions:promote`. For `apply` the preview is what applying the
branch would change on this instance, and the key needs `promotions:apply`.

The table lists each changed resource:

| Column | Description |
|--------|-------------|
| `TYPE` | `project`, `folder`, `workflow`, `credential`, `dataTable`, `variable`, or `tag`. |
| `ID` | The ID of the resource. |
| `NAME` | The name of the resource. A renamed resource shows its new name. |
| `CHANGE` | `added`, `modified`, `archived`, or `deleted`. |
| `FOLDER` | The folder that holds the resource. Empty at the top level of the project. |
| `USEDBY` | For a credential, data table, variable, or tag: the workflows that send it. The table shows up to three IDs. |
| `SELECTABLE` | `true` when you can select the resource. |

To select a workflow, pass its ID to `-w`. To select a folder, pass its ID to
`--folder`. Both flags work in `promote-selection` and `apply-selection`. The
project is always included. You can't select a credential, data table,
variable, or tag. To send one, select a workflow from its `USEDBY` column. With
`--format id-only`, the output lists the IDs of all types. Pass only the
workflow and folder IDs to `-w` and `--folder`.

When an open review holds the changes of the project, the command names the
review and lists nothing. You can promote again when the review is merged or
closed.

After the table, the command lists the
[missing dependencies](#missing-dependencies) of the workflows by group. For
`promote`, it also lists the warnings, and the lists cover every workflow of
the project. To find the entries of a selection, use `--json`: the `consumers`
of each entry hold the IDs of the workflows that use the dependency. The
command prints the lists on stderr, so stdout holds only the table. When
nothing is missing, the command prints only the table.

```text
TYPE      ID    NAME           CHANGE    FOLDER  USEDBY  SELECTABLE
--------  ----  -------------  --------  ------  ------  ----------
workflow  wf-1  Weekly report  modified  -       -       true
workflow  wf-2  Invoices       added     -       -       true

In another project (1)
These dependencies are in other projects that you can access. This Promote does not include them.
  Credential "CRM" (hubspotApi): used by Weekly report, Invoices

Outside your access (1)
You do not have access to these dependencies.
  Workflow "Send alert": used by Weekly report

Cannot be promoted (1)
These dependencies are in a personal project. Move them to a team project to promote them.
  Credential "My token" (httpHeaderAuth): used by Invoices

Warnings (1)
These references point to something that does not exist on the source instance.
  Variable "API_URL": used by Weekly report
```

Use `--json` to get the full preview:

- `commitSha` and `source`: the commit and branch that the preview read. Pass
  them to the `--expected-*` flags of Apply.
- `resources`: every changed resource, and the unchanged resources that give
  context, such as parent folders.
- `dependencies`: the resources that each workflow uses. `included: true` means
  that selecting the workflow sends the resource.
- `blocker`: the open review that holds the changes, if there is one.
- `check`, for `apply` only: what blocks the Apply. `check.missingDependencies`
  holds the missing dependencies of the Apply.
- `missingDependencies` and `warnings`, for `promote` only: the missing
  dependencies and the warnings of the Promote.
- `revision`: the value to pass to `--expected-preview-revision` of
  `promote-selection` or `apply-selection`.

## `promotion-environment list-apply-changes`

Preview what Apply changes on the whole instance: its projects, folders,
workflows, credentials, data tables, variables, and tags.

```bash
n8n-cli promotion-environment list-apply-changes env-2
n8n-cli promotion-environment list-apply-changes env-2 --json
```

Run it before [`apply`](#promotion-environment-apply). This command works on an
`instance` Apply environment only. The API key needs `promotions:apply`.

The table has the same columns as
[`list-changes`](#promotion-environment-list-changes), with two differences:

- `PROJECT` names the project that holds the resource. Empty for instance-wide
  resources, such as a credential that no project holds.
- There is no `SELECTABLE` column. Apply takes every change, so you can't select
  a resource.

Apply deletes each team project that the package does not hold. The table lists
such a project as `deleted`, together with everything in it.

After the table, the command lists the
[missing dependencies](#missing-dependencies) of the workflows by group, as
`list-changes` does for `apply`. The command prints them on stderr, so stdout
holds only the table. When nothing is missing, the command prints only the
table.

Use `--json` to get the full preview:

- `commitSha` and `source`: the commit and branch that the preview read. Pass
  them to the `--expected-*` flags of `apply`.
- `resources` and `dependencies`: as for `list-changes`.
- `check`: what blocks the Apply. A team project that Apply deletes is a
  `project-deletion` conflict. `movedWorkflows` and `movedFolders` list the
  workflows and folders that the branch and this instance hold in different
  projects. Apply can't move them between projects, so it refuses them.
  `missingDependencies` holds the missing dependencies of the Apply.
- `revision`: the value to pass to `--expected-preview-revision`.

## Missing dependencies

A missing dependency is a credential, variable, sub-workflow, or error workflow
that a workflow uses and that is not there after the operation. For Promote, the
branch does not hold it after the Promote. For Apply, the workflow can't use it
on this instance after the Apply. A warning is a reference to something that
does not exist on the source instance. A `$vars.NAME` reference in an
expression is checked. A sub-workflow or an error workflow that is given by an
expression is not checked.

These commands list the missing dependencies and the warnings:

| Command | What it lists |
|---------|---------------|
| `list-changes <projectId> promote` | The missing dependencies and the warnings of a project Promote. |
| `promote-check <id>` | The missing dependencies and the warnings of a Promote of all team projects. |
| `list-changes <projectId> apply` | The missing dependencies of a project Apply. |
| `list-apply-changes <id>` | The missing dependencies of a whole-instance Apply. |
| `apply`, `apply-continue`, `apply-selection`, `apply-selection-continue` | The missing dependencies of an Apply that is `blocked`. |

The output never names the project or the owner of a dependency. It shows the
name, the type, and the workflows that use the dependency. A workflow that does
not exist, or whose name you can't read, shows its ID as its name.

The groups are the same as in the n8n UI. Each group shows its count. A group
without entries is not printed.

| Group | Operation | Meaning |
|-------|-----------|---------|
| `In another project` | Promote | The dependency is in another project that you can access. This Promote does not include it. |
| `Outside your access` | Promote | You do not have access to the dependency. |
| `Outside your access` | Apply | You can't add the dependency from here. It is in a project that you can't access, or the branch does not hold it. |
| `Cannot be promoted` | Promote | The dependency is in a personal project. Move it to a team project to promote it. When you can't access one of the entries, the group says that someone with access must move them. |
| `Needs your action` | Apply | Resolve the dependency on this instance. An entry that stops the Apply must be resolved before you apply. |
| `Warnings` | Promote | The reference points to something that does not exist on the source instance. |
| `Other` | Promote, Apply | The server sent a group that this version of the CLI does not know. The group has no description line. Use `--json` for the details. |

Each line shows one entry:

```text
  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report, Invoices
```

- The type: `Credential`, `Variable`, or `Workflow`. A sub-workflow and an error
  workflow are both `Workflow`. A type that this version of the CLI does not
  know shows as the server sent it.
- The name, and for a credential its credential type.
- For Apply, the reason. See the table below.
- `stops the Promote` or `stops the Apply` when the operation stops on the
  entry. Without it, the operation continues without the dependency.
- `used by`: the workflows that use the dependency. A line names up to five
  workflows and counts the rest, for example `(+2 more)`.
- For a conditional entry, the ID of the workflow and the condition. See
  [Conditional entries](#conditional-entries).

| Reason | Meaning |
|--------|---------|
| `not on this instance and not on the branch` | This instance does not have the dependency, and Apply can't add it. The branch holds the credential without an owner project, or the branch does not hold the workflow. |
| `not on this instance` | The dependency does not exist on this instance. |
| `this project cannot use it` | The credential exists, but it is not shared with the project of the workflow. |
| `has another type on this instance` | A credential with this ID exists, but its type is different. |
| `its type is not installed on this instance` | This instance does not know the credential type. |
| `this project cannot use an instance credential` | The credential on this instance has a usage scope that the project can't use. |
| `archived on this instance` | The sub-workflow or error workflow is archived. |
| `archived by this Apply` | Only for a [conditional entry](#conditional-entries): the Apply archives the sub-workflow or error workflow when the selection includes it. |
| `deleted by this Apply` | Only for a [conditional entry](#conditional-entries): the Apply deletes the sub-workflow or error workflow when the selection includes it. |
| `its caller policy refuses the workflow` | The sub-workflow or error workflow does not let this workflow call it. |

### Conditional entries

`list-changes <projectId> apply` covers every workflow of the project on the
branch, before you select workflows. Some entries for a sub-workflow or an error
workflow depend on the selection. Such a line shows the ID of that workflow
after its name, and the condition at the end. The condition names the workflow
by the same ID, not the workflows after `used by`:

```text
  Workflow "Send alert" (id wf-9): not on this instance; used by Weekly report; only when the Apply does not include wf-9
  Workflow "Notify owner" (id wf-7): archived by this Apply; used by Invoices; only when the Apply includes wf-7
```

| Condition | Meaning |
|-----------|---------|
| `only when the Apply includes <id>` | The entry applies only when the selection of `apply-selection` includes the workflow with this ID. When the Apply archives or deletes that workflow, the reason is `archived by this Apply` or `deleted by this Apply`. The entry can also have another reason, for example `its caller policy refuses the workflow`. |
| `only when the Apply does not include <id>` | The entry applies only when the selection of `apply-selection` does not include the workflow with this ID. |

In the example, the first entry does not apply when the selection includes
`wf-9`. The second entry applies only when the selection includes `wf-7`: the
Apply then archives `wf-7`, which `Invoices` uses. An entry without a condition
applies to every selection. The result of an Apply has no conditional entries.
With `--json`, the entry has the field `condition`: `target-selected` or
`target-not-selected`.

### Output formats

The table and the lists are the output for people. When stdout is a terminal,
the CLI prints them by default. When stdout is not a terminal, for example in a
pipe or in a script, the CLI prints JSON by default. Pass `--format table` to
get the table and the lists there too. `--format id-only` prints the IDs in
place of the table, and keeps the lists. `--format json` gives JSON. `--json`
and `--jq` give JSON too, also when you pass another `--format`.

With JSON, each command prints the API response and no list. The response holds
the same entries: `missingDependencies` and `warnings` for Promote, and
`check.missingDependencies` for Apply.

With `--quiet`, `list-changes`, `list-apply-changes`, and `promote-check` print
nothing: no table, no list, and no JSON. An Apply that is `blocked` prints
nothing and keeps its exit code.

## `promotion-environment promote-selection`

Read a chosen set of a project's workflows and folders now, and push their
current state to the branch of the project's Promote environment, or of the
instance Promote environment.

```bash
n8n-cli promotion-environment promote-selection proj-abc -w wf-1 -w wf-2
n8n-cli promotion-environment promote-selection proj-abc -w wf-1 -m "Promote checkout flow"
n8n-cli promotion-environment promote-selection proj-abc --folder folder-1
n8n-cli promotion-environment promote-selection proj-abc
n8n-cli promotion-environment promote-selection proj-abc -w wf-1 \
  --expected-preview-revision=<revision>
```

| Flag | Description |
|------|-------------|
| `-w, --workflow` | Workflow ID to promote. Repeat the flag for more than one. |
| `--folder` | Folder ID to promote. Repeat the flag for more than one. |
| `-m, --message` | Commit message. If you omit it, the commit uses a generated message. |
| `--expected-preview-revision` | `revision` of the Promote preview that you reviewed, from `list-changes proj-abc promote --json`. |

| Result | Exit code | What happened |
|--------|-----------|---------------|
| `promoted` | `0` | The selection was pushed. JSON output includes `counts` and `git`. |
| `preview-changed` | `3` | Only with `--expected-preview-revision`: the project on this instance or its branch changed since you reviewed the preview. Nothing was pushed. Review the changes again. |

The project's own details (name, icon, description, and telemetry tags) are
always pushed. Without `-w` and `--folder`, the command promotes only the
project, for example a new empty project. A selected folder is pushed with the
folders above it. A renamed or moved folder moves the workflows inside it on the
branch, without changing their content. When the branch already matches the
selection, the command fails with "Nothing to promote".

Archived workflows stay on the branch as archived. A selected workflow that was
deleted leaves this project's branch. A selected workflow that moved into or out
of the project since the branch was written is refused: move it back
first. The request fails before any write if the branch does not hold a
deleted workflow under this project.

## `promotion-environment apply`

Reset the local checkout to the tip of the configured branch, and import the
package. This overwrites the instance to match the branch.

```bash
n8n-cli promotion-environment apply env-2
n8n-cli promotion-environment apply env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha> \
  --expected-preview-revision=<revision>
```

| Flag | Description |
|------|-------------|
| `--expected-environment-id` | ID of the Apply environment that you reviewed. |
| `--expected-branch` | Branch that you reviewed. |
| `--expected-commit-sha` | Full commit SHA that you reviewed (40 or 64 lowercase hex characters). |
| `--expected-preview-revision` | `revision` of the Apply preview that you reviewed, from `list-apply-changes env-2 --json`. |

Without the `--expected-*` flags, the command applies the branch tip. With them,
the command applies only the source that you reviewed. Pass all three flags or
none. With `--expected-preview-revision`, the command applies only when this
instance still matches the preview that you reviewed.

| Result | Exit code | What happened |
|--------|-----------|---------------|
| `applied` | `0` | The package was imported. JSON output includes `counts` and `warnings`. |
| `source-changed` | `3` | The environment, branch, or commit is not the one you reviewed. Nothing was imported. Review the changes again. |
| `preview-changed` | `3` | Only with `--expected-preview-revision`: the Apply preview changed since you reviewed it, because this instance or the branch changed. Nothing was imported. Review the changes again. |
| `blocked` | `4` | The Apply check found missing bindings, access requirements, conflicts, or dependencies outside your access. A conflict can be a destructive data table change or a project deletion. Nothing was imported. The output shows the `apply-continue` command to run after you resolve them. |

A `blocked` Apply prints the count of each cause, and then the
[missing dependencies](#missing-dependencies) by group. `Outside your access`
counts the dependencies that stop the Apply and that you can't add from here:
they are in a project that you can't access, or the branch does not hold them.
Such a dependency is in no other count, so it can be the only cause. Someone
with access must add it to this instance or to the branch. The title of the
group below the counts shows the count of all its entries, also of those that
do not stop the Apply.

```text
Apply is blocked. Nothing was imported.
  Missing projects:    0
  Missing credentials: 1
  Missing variables:   0
  Access requirements: 0
  Conflicts:           0
  Outside your access: 1

Needs your action (2)
Resolve these dependencies on this instance. An entry that stops the Apply must be resolved before you apply.
  Credential "Billing API" (httpHeaderAuth): not on this instance; stops the Apply; used by Weekly report, Invoices
  Workflow "Send alert": archived on this instance; used by Weekly report

Outside your access (1)
You cannot add these dependencies from here: they are in a project that you cannot access, or the branch does not hold them.
  Credential "Shared CRM" (hubspotApi): not on this instance; stops the Apply; used by Invoices

Run with --json for the details. After you resolve them, run:
  n8n-cli promotion-environment apply-continue env-2 --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

With `--json`, the output is the full result for each status. For `blocked`, the
`check` object lists each missing project, missing binding, access
requirement, conflict, and missing dependency. Existing variable values on this
instance are kept.

Apply makes the team projects on this instance match the package. It deletes
each team project that the package does not hold, with all its workflows,
credentials, and data tables. The Apply check reports each such project as a
`project-deletion` conflict.

Workflows and folders move within their project to match the branch, and folders
take the name on the branch. `counts.workflows.moved` is part of
`counts.workflows.updated`. `counts.folders.moved` and `counts.folders.renamed` are
parts of `counts.folders.updated`. A workflow or folder that the branch and this
instance hold in different projects is refused before any write, and nothing is
imported.

This command works on an `instance` Apply environment only. The API key needs
`promotions:apply`.

## `promotion-environment apply-continue`

Continue an Apply that was `blocked`, after you resolve the missing bindings, access requirements, or conflicts.

```bash
n8n-cli promotion-environment apply-continue env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
n8n-cli promotion-environment apply-continue env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha> \
  --expected-preview-revision=<revision> --confirm-destructive-changes
```

The three `--expected-*` flags are required. Use the `environmentId`,
`git.branchName`, and `git.commitSha` that the blocked Apply reported. The
command runs the Apply check again. The results and exit codes are the same as
for `apply`: `blocked` again means that something still blocks, and
`source-changed` or `preview-changed` means that you must review again. The
server keeps no session, so run the command again when it exits `4`.

Setting up bindings changes the preview, so an earlier
`--expected-preview-revision` no longer matches. To continue only with a preview
that you reviewed, run `list-apply-changes env-2 --json` again and pass its new
`revision`.

Add `--confirm-destructive-changes` to also apply destructive data table
changes and delete projects:

- Removed or retyped columns. The values in those columns are removed. Rows and
  other columns are kept.
- Team projects that the package does not hold. Each project is deleted with
  everything in it. You can't undo this.

Without `--expected-preview-revision`, the flag applies all such changes when
the command runs. This includes changes and projects that the blocked Apply did
not report. With `--expected-preview-revision`, the flag covers only the changes
and project deletions of the preview that you reviewed. Without the flag, a
destructive change or a project deletion blocks the command, and it exits `4`.

## Apply a reviewed commit

```bash
# 1. Review the changes. Take the source, commit SHA, and revision from the same
#    response as the rows: a second request can read a newer commit.
n8n-cli promotion-environment list-apply-changes env-2 --json > reviewed-changes.json
jq '{commitSha, source, revision}' reviewed-changes.json

# 2. Apply that commit only, and only while this instance matches the preview.
n8n-cli promotion-environment apply env-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<sha from step 1> \
  --expected-preview-revision=<revision from step 1>

# 3. On exit code 3, the source or this instance changed. Go back to step 1.
# 4. On exit code 4, resolve the missing bindings, access requirements, or conflicts.
#    Then run the apply-continue command that step 2 printed.
```

## `promotion-environment apply-selection`

Apply a chosen set of a project's workflow and folder changes from its Apply
branch. This is the apply counterpart of `promote-selection`. Use the workflow
and folder IDs that [`list-changes proj-abc apply`](#promotion-environment-list-changes)
lists.

```bash
n8n-cli promotion-environment apply-selection proj-abc -w wf-1 -w wf-2
n8n-cli promotion-environment apply-selection proj-abc -w wf-1 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha> \
  --expected-preview-revision=<revision>
n8n-cli promotion-environment apply-selection proj-abc --folder folder-1
n8n-cli promotion-environment apply-selection proj-abc
```

| Flag | Description |
|------|-------------|
| `-w, --workflow` | Workflow ID to apply. Repeat the flag for more than one. |
| `--folder` | Folder ID to apply. Repeat the flag for more than one. |
| `--expected-environment-id` | ID of the Apply environment that you reviewed. |
| `--expected-branch` | Branch that you reviewed. |
| `--expected-commit-sha` | Full commit SHA that you reviewed (40 or 64 lowercase hex characters). |
| `--expected-preview-revision` | `revision` of the Apply preview that you reviewed, from `list-changes proj-abc apply --json`. |

The project's name, icon, description, and telemetry tags always come from the
branch. Without `-w` and `--folder`, the command applies only the project.
Selected IDs on the branch are imported. A selected workflow that this project
owns but the branch does not hold is removed. Unselected content stays unchanged. A selected
workflow or folder is created, or moves within the project to match the branch,
together with the folders above it, and those folders take the name on the
branch. Other folders stay as they are. A selected workflow, or a folder that the
branch holds in this project, that the branch and this instance hold in different
projects is refused before any write. Without the `--expected-*` flags, the command applies the branch tip;
with them, it applies only the source that you reviewed. Pass all three flags or
none. With `--expected-preview-revision`, the command applies only when this
instance still matches the preview that you reviewed.

The results and exit codes are the same as for `apply`: `applied` (`0`),
`source-changed` (`3`), `preview-changed` (`3`), and `blocked` (`4`). When it exits `4`, the output shows
the `apply-selection-continue` command to run after you resolve the bindings; it
resends the same selection. It also shows the
[missing dependencies](#missing-dependencies) by group, as `apply` does. With
`--json`, the output is the full result for each status.

The API key needs `promotions:apply`. The environment is the project's own
Apply environment when it has one, otherwise the instance Apply environment.

## `promotion-environment apply-selection-continue`

Continue a selection Apply that was `blocked`, after you resolve the missing
bindings, access requirements, or conflicts.

```bash
n8n-cli promotion-environment apply-selection-continue proj-abc -w wf-1 -w wf-2 \
  --expected-environment-id=env-2 --expected-branch=main --expected-commit-sha=<full sha>
```

Resend the same `-w` and `--folder` flags. The three `--expected-environment-id`,
`--expected-branch`, and `--expected-commit-sha` flags are required: use the
`environmentId`, `git.branchName`, and `git.commitSha` that the blocked Apply
reported. Setting up bindings changes the preview, so an earlier
`--expected-preview-revision` no longer matches. To apply only a preview that you
reviewed, run `list-changes proj-abc apply --json` again and pass its new
`revision`. The command runs the Apply check again. The results and exit codes are
the same as for `apply-selection`. The server keeps no session, so run the
command again when it exits `4`.

Add `--confirm-destructive-changes` to also apply destructive data table
changes: removed or retyped columns. The values in those columns are removed.
Rows and other columns are kept. The flag applies all such changes when the
command runs. This includes changes that the blocked Apply did not report.
Without the flag, a destructive change blocks the command, and it exits `4`.

## `promotion-environment list-missing-projects` / `create-missing-projects`

Create the team projects of the Apply package that do not exist on this
instance yet. The project Apply flow only works for a project that exists here
with the same ID.

```bash
n8n-cli promotion-environment list-missing-projects env-2
n8n-cli promotion-environment create-missing-projects env-2
n8n-cli promotion-environment create-missing-projects env-2 -p proj-abc -p proj-def
n8n-cli promotion-environment create-missing-projects env-2 --admin proj-abc=user-123
```

Projects are matched by ID, not by name. Each project is created empty, with the
ID, name, icon, description, and telemetry tags from the package. You become its
project admin. Use `--admin <projectId>=<userId>` to add another user as project
admin of a new project. Nothing else is imported. Then apply changes to each project with
`apply-selection`.

Without `-p`, the command creates every missing project. Each result has the
status `created`, `already-exists`, `failed`, or `admin-failed`. For
`admin-failed`, the project exists, but the admin was not assigned. Assign the
admin with `project add-member`. The command exits `1` when a project could not
be created or its admin could not be assigned.

## `promotion-environment list-projects` / `add-project` / `remove-project`

Link team projects to a `projects`-scoped environment.

```bash
n8n-cli promotion-environment list-projects env-3
n8n-cli promotion-environment add-project env-3 proj-abc
n8n-cli promotion-environment remove-project env-3 proj-abc
```

A project can have one environment for each direction. A direction without a
project environment uses the instance environment.

## `promotion-settings get` / `update`

Decide who can promote, approve, and apply in their own projects. Instance
owners and admins can always do all three.

```bash
n8n-cli promotion-settings get
n8n-cli promotion-settings update --who-can-promote=projectAdmins
n8n-cli promotion-settings update --who-can-approve=projectAdminsAndEditors --who-can-apply=instanceAdmins
```

Each setting takes one of these values:

| Value | Who can do it in their projects |
|-------|---------------------------------|
| `instanceAdmins` | Nobody below instance admin (default) |
| `projectAdmins` | Project admins |
| `projectAdminsAndEditors` | Project admins and editors |

A setting that you leave out keeps its value. The settings change the project
admin and project editor roles. Custom project roles keep their own scopes.
