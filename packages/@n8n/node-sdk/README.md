# @n8n/node-sdk

Define n8n nodes as typed action contracts. One action is one operation, for example
`notion.databasePage.getAll`. One declaration gives the contract document, the run-time
validator, the `run()` input type, the n8n node type (`toNodeType`), and the typed module
that the AI workflow builder reads (`generateNodeModule`).

See `packages/@n8n/nodes-core/src/nodes/**` and `packages/@n8n/nodes-integrations/src/nodes/**` for real nodes.

For how the packages fit together, and how a node is installed, versioned and run in n8n, see
[docs/architecture.md](docs/architecture.md).

## Imports

| Import | For | Contents |
|---|---|---|
| `@n8n/node-sdk` | node authors | `defineNode`, `t` (schema builders), `provider` (`input`, `is`), `defineResource`, `ref`, `parse`, `matches`, `validate`, `list`, `isRecord`, `isHttpError`, `UserError`, `OperationalError`, `path`, paging helpers, author types |
| `@n8n/node-sdk/credentials` | node authors | `defineCredential`, `credential`, `compat`, `field` (credential fields). Auth schemes only in the `auth: (a) => …` callback |
| `@n8n/node-sdk/testing` | node authors | `runAction`, `mockHttp` |
| `@n8n/node-sdk/host` | n8n core and cli | node and credential types (`toNodeType`, `toVersionedNodeType`, `toCredentialType`, …), loaders, Node Contract range, egress checks, `permissionsOf` (the permissions of a contract), `exampleOf` |
| `@n8n/node-sdk/registry` | registry, pack, store | manifests (`toContract`, `lintContract`, `parseManifest`), hashes, semver, `diffContracts`, the store layout (`storeReader`, `addToStore`, signatures), fixtures |
| `@n8n/node-sdk/codegen` | instance-ai, compat | `generateNodeModule`, `toTs`, model catalog, provider connections and fields |
| `@n8n/node-sdk/mcp` | tooling | `liftMcpTool`: an MCP tool as a derived manifest |
| `@n8n/node-sdk/openapi` | cli | `mapOpenApi`: the HTTP guest configs of a dereferenced OpenAPI 3 document |
| `@n8n/node-sdk/pack`, `/publish`, `/sandbox` | tooling | pack, publish and sandboxed run of bundles |
| `@n8n/node-sdk/lint` | lint configs | the `n8n-contract` plugin for oxlint (`jsPlugins`) and ESLint (`plugins`): `no-raw-error`, and `no-redefault` (ESLint only, it reads types) |

```ts
import { defineNode, t } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';
```

`src/__tests__/exports.test.ts` lists each name of the root, so a new root export is a decision.

## Developer CLI: `n8n-node-next`

```sh
n8n-node-next new <service> [--dir <path>]  # scaffold a project
n8n-node-next check                         # tsc --noEmit --strict, contract checks and lint
n8n-node-next test                          # run src/**/*.test.ts with node:test (via tsx)
n8n-node-next describe [actionId]           # print the typed module the AI builder reads
n8n-node-next run <actionId> --input '<json>' [--credential-file f.json | --credential-env PREFIX]
```

In the monorepo, run it as `node packages/@n8n/node-sdk/src/cli/n8n-node-next`.
The CLI runs from source through tsx, so it does not need a build. A project imports the
built SDK, so build `@n8n/node-sdk` before you run `check`, `test` or `run` on a project.

A project follows one convention: `src/index.ts` exports `node` and `actions` (array). The
credential types come from `node.credential`. `new` writes an `AGENTS.md` that explains the format.

`check` prints one line per problem: `<file>: <action id>: <schema path>: <problem>`. It checks:

- unique action ids that start with the node id, and the prose budgets (`lintContract`)
- each `examples` value against its schema
- that `deriveOutput` gives items that also match `output`
- that each scope an action lists is a scope of the node's credential
- that each `$credentials.<field>` template names a credential property
- the AST rules of `@n8n/node-sdk/lint` on `src` (oxlint, test files excluded), one line per
  finding: `<file>:<line>:<column>: <problem> (<rule>)`

`run` calls the live API and prints the output items as JSON. On failure it prints
`{ "error": { "message", "path"?, "httpStatus"? } }` to stderr and exits with 1.
`--credential-env TODO` reads the field `apiKey` from `TODO_API_KEY`.
`--credential-file` reads `{ "type": "todoApi", "data": { "apiKey": "..." } }`.

## Local npm registry

During the POC, contract versions go to a local Verdaccio only. Run these steps from the repository root:

```sh
# 1. Start Verdaccio. Without TESTCONTAINERS_RYUK_DISABLED, the container stops when the command exits.
TESTCONTAINERS_RYUK_DISABLED=true pnpm --filter n8n-containers services --services npmRegistry
export N8N_NODE_CONTRACTS_NPM_REGISTRY=http://localhost:<port>  # the URL that step 1 prints

# 2. Get a token. Each start gives an empty registry, so do this step after each start.
export NPM_TOKEN=$(curl -s -X PUT -H 'content-type: application/json' \
  -d '{"name":"n8n-maintainer","password":"n8n-maintainer"}' \
  "$N8N_NODE_CONTRACTS_NPM_REGISTRY/-/user/org.couchdb.user:n8n-maintainer" \
  | sed -n 's/.*"token": *"\([^"]*\)".*/\1/p')

# 3. Make a signing key one time.
openssl genpkey -algorithm ed25519 -out ~/n8n-contracts-dev.pem
export N8N_NODE_CONTRACTS_SIGNING_KEY_FILE=~/n8n-contracts-dev.pem

# 4. Publish the HEAD of each contract of nodes-core and nodes-integrations.
pnpm publish:contracts
```

A second `pnpm publish:contracts` publishes only the new versions. Start n8n with
`N8N_NODE_CONTRACTS_NPM_REGISTRY` set, and it lists and runs the registry versions. Stop the
registry with `pnpm --filter n8n-containers services:clean`. This deletes all versions.

The registry refuses an unpublish of an `@n8n-nodes/*` package. Verdaccio ties `npm deprecate` to
the unpublish permission, so only `n8n-maintainer` can yank or revoke
(`pnpm --filter @n8n/nodes-core publish:contracts yank <id>@<version> <reason>`). That user must
not unpublish a contract package.

## Credentials

```ts
export const todoApi = defineCredential({
	id: 'todo.token',
	version: '1.0.0',
	legacyName: 'todoApi',
	displayName: 'Todo API',
	fields: { apiKey: field.secret('API Key') },
	auth: (a) => a.bearer('apiKey'),
});
export const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credential: credential({ types: [todoApi], scopes: { 'items:read': 'Read items' } }),
});
```

A node has one credential: the credential types a user may pick, and the scopes its actions
may list. Credential types are values (`defineCredential`, `compat`) with a declarative `auth`, so
`tsc` rejects a typo, and `toCredentialType` projects one to an n8n `ICredentialType`. A
`defineCredential` type needs a full `version`. An action takes `^<version>` of it;
`todoApi.range('>=1.1 <3')` sets another range. In n8n,
`httpRequestWithAuthentication` applies it. `runAction` applies it the same way. See
[docs/credentials-triggers.md](docs/credentials-triggers.md) for scopes, triggers and bindings.
See [docs/node-contract.md](docs/node-contract.md) for the manifest format, the runtime interface
of each kind, and their one version.

## Errors

The host owns the errors of a run. Node code throws only to stop a run with a reason.

- Any error that `run()` or a request throws fails the run as an n8n node error with the
  index of its item. A batch run has no item index.
- The host gives each error a `failure` cause (`Failure` of `n8n-workflow`), which n8n reads
  without `instanceof`:

  | Error | `failure.cause` |
  |---|---|
  | `HttpError` 429 | `rate-limited`, with `retryAfterMs` from `Retry-After` |
  | `HttpError` 408 or 5xx, a transport failure (`ECONNRESET`, …), `OperationalError` | `temporarily-unavailable` |
  | `HttpError` 401 | `credential-invalid` |
  | `HttpError` other 4xx, `UserError` | `configuration-invalid` |
  | any other error | none |

- Throw `UserError` when the user can fix the cause, and `OperationalError` when a later retry
  can pass. Import both from `@n8n/node-sdk`. Do not throw `Error`: it gets no cause.
- A service that answers an error with status 200 (Slack `{ ok: false }`) declares it once on
  the node. `errorOf` runs for each JSON response of the node's actions and triggers, also for
  declarative `request` and `list` bindings. A message fails the request with a `UserError`,
  which `run()` may catch:

  ```ts
  const slack = defineNode({
    id: 'slack',
    displayName: 'Slack',
    baseUrl: 'https://slack.com/api',
    errorOf: (body) => (isRecord(body) && body.ok === false ? String(body.error) : undefined),
  });
  ```

In the sandbox, the guest runs `errorOf`. Only the message and the failed response of an error
cross the boundary, so the host sees each other guest error as a `UserError`.

## Testing: `@n8n/node-sdk/testing`

```ts
const fetch = mockHttp([{ method: 'GET', path: '/items', query: { limit: 2 }, reply: { json: { items: [] } } }]);
const result = await runAction(getManyItems, { input: { limit: 2 }, credential, fetch });
// { ok: true, items: [...] } or { ok: false, error: { message, path?, httpStatus? } }
```

`runAction` fills in parameter defaults, validates the input, runs `run()` with a fetch-based
HTTP client that applies the credential, and validates each output item. It needs no n8n instance.
`mockHttp` records `fetch.calls` and fails each request that no route matches. When more
routes match, the route with the most listed query parameters answers. A route with `times: n`
answers at most n calls. More than 1000 calls fail the run, because the code under test loops.

## Types

`t.nullable(schema)` accepts the value or `null`. In `run()`, a field with `.default(v)` is always
set (`RunInput`), because n8n and `runAction` fill in the default. Callers can still omit it.

`t.date()`, `t.dateTime()`, `t.uri()`, `t.email()` and `t.uuid()` are strings with a JSON Schema
`format`. `validate` checks these five formats; it ignores other formats.

## Requests

A request `path` is an `EncodedPath`. Only the `path` tag makes one, so `tsc` rejects a plain string
or a template literal. The tag encodes each value as one segment and throws for an empty, `.` or
`..` value:

```ts
await http.request({ path: path`/repos/${input.owner}/${input.repo}/issues` });
// input.repo 'a/../b' sends /repos/<owner>/a%2F..%2Fb/issues
```

Use `url` for an absolute URL, e.g. a `next` link. A declarative `request` or `list` binding encodes
its `{field}` values in the same way.
