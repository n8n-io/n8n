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

A project follows one convention: `src/index.ts` exports `node`, `actions` (array) and
`credentials` (array). `new` writes an `AGENTS.md` that explains the format.

`check` prints one line per problem: `<file>: <action id>: <schema path>: <problem>`. It checks:

- unique action ids that start with the node id, and the prose budgets (`lintContract`)
- each `examples` value against its schema
- that `deriveOutput` gives items that also match `output`
- that each credential type the node or an action lists is in `credentials`
- that each `$credentials.<field>` template names a credential property

`run` calls the live API and prints the output items as JSON. On failure it prints
`{ "error": { "message", "path"?, "httpStatus"? } }` to stderr and exits with 1.
`--credential-env TODO` reads the field `apiKey` from `TODO_API_KEY`.
`--credential-file` reads `{ "type": "todoApi", "data": { "apiKey": "..." } }`.

## Credentials

```ts
export const todoApi = defineCredential({
	name: 'todoApi',
	displayName: 'Todo API',
	properties: [
		{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
	],
	authenticate: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	test: { request: { baseURL: 'https://api.todo.example.com/v1', url: '/me' } },
});
```

`defineCredential` returns an n8n `ICredentialType`. List its `name` in `defineNode({ credentials })`.
In n8n, `httpRequestWithAuthentication` applies it. `runAction` applies it the same way.
`authenticate` can also be a function `(credentials, request) => Promise<request>`.

## Testing: `@n8n/node-sdk/testing`

```ts
const fetch = mockHttp([{ method: 'GET', path: '/items', query: { limit: 2 }, reply: { json: { items: [] } } }]);
const result = await runAction(getManyItems, { input: { limit: 2 }, credential, credentials, fetch });
// { ok: true, items: [...] } or { ok: false, error: { message, path?, httpStatus? } }
```

`runAction` fills in parameter defaults, validates the input, runs `run()` with a fetch-based
HTTP client that applies the credential, and validates each output item. It needs no n8n instance.
`mockHttp` records `fetch.calls` and fails each request that no route matches.
