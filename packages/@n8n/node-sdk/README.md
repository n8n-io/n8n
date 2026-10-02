# @n8n/node-sdk

Define n8n nodes as typed action contracts. One action is one operation, for example
`notion.databasePage.getAll`. One declaration gives the contract document, the run-time
validator, the `run()` input type, the n8n node type (`toNodeType`), and the typed module
that the AI workflow builder reads (`generateNodeModule`).

See `packages/@n8n/nodes-base-next/src/nodes/**` for real nodes.

## Developer CLI: `n8n-node-next`

```sh
n8n-node-next new <service> [--dir <path>]  # scaffold a project
n8n-node-next check                         # tsc --noEmit --strict plus contract checks
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

`run` calls the live API and prints the output items as JSON. On failure it prints
`{ "error": { "message", "path"?, "httpStatus"? } }` to stderr and exits with 1.
`--credential-env TODO` reads the field `apiKey` from `TODO_API_KEY`.
`--credential-file` reads `{ "type": "todoApi", "data": { "apiKey": "..." } }`.

## Credentials

```ts
export const todoApi = credentialType({
	id: 'todo.token',
	legacyName: 'todoApi',
	displayName: 'Todo API',
	fields: { apiKey: t.secret('API Key') },
	auth: (a) => a.bearer('apiKey'),
});
export const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credential: credential({ types: [todoApi], scopes: { 'items:read': 'Read items' } }),
});
```

A node has one credential: the credential types a user may pick, and the scopes its actions
may list. Credential types are values (`credentialType`, `compat`) with a declarative `auth`, so
`tsc` rejects a typo, and `toCredentialType` projects one to an n8n `ICredentialType`. In n8n,
`httpRequestWithAuthentication` applies it. `runAction` applies it the same way. See
[docs/credentials-triggers.md](docs/credentials-triggers.md) for scopes, triggers and bindings.
See [docs/node-contract.md](docs/node-contract.md) for the manifest format, the runtime interface
of each kind, and their one version.

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

`nullable(schema)` accepts the value or `null`. In `run()`, a field with `.default(v)` is always
set (`RunInput`), because n8n and `runAction` fill in the default. Callers can still omit it.
