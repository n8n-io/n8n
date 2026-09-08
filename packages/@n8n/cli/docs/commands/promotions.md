# promotions

Move projects between n8n instances through a Git repository. One instance
**promotes** its projects to a branch. Another instance **applies** that branch
to itself.

Setup has three parts:

| Part | Command topic | What it holds |
|------|---------------|---------------|
| Provider | `promotion-provider` | The credentials for a Git host |
| Connection | `promotion-connection` | The repository to use, and which provider to use |
| Configuration | `promotion-connection set-config` | The branch settings of one direction |

A connection has up to one configuration for each direction: `promote` pushes to
Git, `apply` imports from Git. A direction with no configuration is not set up.
Create a connection without `configs` to leave both directions unconfigured.
This lets you read the public key of an SSH provider before the remote accepts a
clone.

Requires the Promotions feature to be licensed. The API key scopes are named
`gitConnection:*`.

## Setup example

```bash
# 1. Create a provider. An SSH provider returns a public key.
#    Note the `id` in the response. Step 3 needs it as `providerId`.
echo '{"name":"GitHub","type":"git","auth":{"authType":"ssh-key","keyType":"ed25519"}}' \
  | n8n-cli promotion-provider create --stdin

# 2. Add that public key to the repository as a deploy key.

# 3. Create a connection on the provider, with both directions configured.
cat connection.json | n8n-cli promotion-connection create --stdin

# 4. Clone each direction you want to use.
n8n-cli promotion-connection clone conn-1 promote
n8n-cli promotion-connection clone conn-1 apply

# 5. Promote from this instance, or apply to it.
n8n-cli promotion-connection promote conn-1 --message="Promote team projects"
n8n-cli promotion-connection apply conn-1
```

`connection.json` for step 3:

```json
{
  "name": "Production",
  "scope": "instance",
  "providerId": "prov-1",
  "target": { "schemaVersion": 1, "remoteUrl": "git@github.com:acme/flows.git" },
  "configs": {
    "promote": {
      "settings": {
        "schemaVersion": 1,
        "baseBranchName": "main",
        "createBranchOnPromotion": false
      }
    },
    "apply": { "settings": { "schemaVersion": 1, "branchName": "main" } }
  }
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

Capture the new ID for the connection you create next:

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
of every connection that uses the provider. The authentication method cannot
change. For `ssh-key`, leave out `keyType` to keep the current algorithm when
you rotate the key.

`delete` fails while a connection still uses the provider.

## `promotion-connection create`

Create a connection on an existing provider, from JSON.

```bash
n8n-cli promotion-connection create --file=connection.json
```

| Field | Description |
|-------|-------------|
| `name` | Display name. |
| `scope` | `instance` covers the whole instance. `projects` covers the linked projects. Only one `instance` connection can exist. |
| `providerId` | The provider to use. |
| `target.remoteUrl` | The SSH or HTTP(S) remote URL. Do not put credentials in the URL. |
| `configs` | Optional initial configurations, keyed by direction. Leave it out to configure no direction. |

## `promotion-connection list` / `get` / `update` / `delete`

```bash
n8n-cli promotion-connection list
n8n-cli promotion-connection list --scope=instance
n8n-cli promotion-connection list --provider=prov-1
n8n-cli promotion-connection get conn-1
echo '{"name":"Production (EU)"}' | n8n-cli promotion-connection update conn-1 --stdin
n8n-cli promotion-connection delete conn-1
```

| Flag | Description |
|------|-------------|
| `--scope` | Show only `instance` or only `projects` connections. |
| `--provider` | Show only the connections that use this provider. Use it to see which connections a provider edit affects. |
| `--limit` | Maximum number of results. |

`update` takes `name`, `target`, `providerId`, or a combination. The scope cannot
change. Configurations have their own commands.

`delete` also removes the configurations, the project links, and the local
checkouts. The provider stays.

## `promotion-connection set-config`

Create the configuration of one direction, or replace it.

```bash
echo '{"settings":{"schemaVersion":1,"branchName":"main"}}' \
  | n8n-cli promotion-connection set-config conn-1 apply --stdin

echo '{"settings":{"schemaVersion":1,"baseBranchName":"main","createBranchOnPromotion":false}}' \
  | n8n-cli promotion-connection set-config conn-1 promote --stdin
```

| Field | Direction | Description |
|-------|-----------|-------------|
| `name` | both | Optional display name. |
| `settings.branchName` | `apply` | The branch to import from. |
| `settings.baseBranchName` | `promote` | The branch to push to. |
| `settings.createBranchOnPromotion` | `promote` | Required. Send the current value to keep it. |

The write replaces the whole configuration. Send every setting you want to keep.
An omitted `name` resets it to `Apply` or `Promote`.

## `promotion-connection delete-config`

Delete the configuration of one direction, and its local checkout. Nothing in
Git changes.

```bash
n8n-cli promotion-connection delete-config conn-1 apply
```

## `promotion-connection clone` / `disconnect`

```bash
n8n-cli promotion-connection clone conn-1 promote
n8n-cli promotion-connection disconnect conn-1 promote
```

`clone` copies the configured branch into local storage. You can run it again at
any time. Cloning one direction does not make the other direction ready.

`disconnect` removes the local checkout. The configuration, its credentials, and
the trusted SSH host keys stay.

Both commands work on the instance that handles the request. Another instance in
the deployment can hold a different checkout.

## `promotion-connection promote`

Export all team projects, commit them, and push to the configured branch.

```bash
n8n-cli promotion-connection promote conn-1 --message="Promote team projects"
n8n-cli promotion-connection promote conn-1 -m "Promote team projects" --force
```

| Flag | Description |
|------|-------------|
| `-m, --message` | Commit message. Required. |
| `--force` | Overwrite the remote branch when it has diverged. |

Personal projects are not included. Clone the `promote` direction first. This
command works on the `instance` connection only. The API key also needs
`variable:list` when the workflows reference variables.

## `promotion-connection apply`

Reset the local checkout to the tip of the configured branch, and import the
package. This overwrites the instance to match the branch.

```bash
n8n-cli promotion-connection apply conn-1
```

Clone the `apply` direction first. This command works on the `instance`
connection only.

## `promotion-connection list-projects` / `add-project` / `remove-project`

Link team projects to a `projects`-scoped connection.

```bash
n8n-cli promotion-connection list-projects conn-1
n8n-cli promotion-connection add-project conn-1 proj-abc
n8n-cli promotion-connection remove-project conn-1 proj-abc
```

A project can be linked to one connection only.
