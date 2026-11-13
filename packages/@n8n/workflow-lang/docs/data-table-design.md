# Native Data Table node: design proposal

Status: built end to end, as the general service effect `ctx.service`
(spec 9.9): the effect in the compiler, the reference runner, the test VM
and `wfrt` (effect kind 6, the `service` event, `POST /_admin/services/<callId>`,
the timeout, the re-send to a new stream client, a fixed table of waiting
calls); the library node `src/nodes/data-table.ts`; the n8n backend
(`compiled-service-calls.ts`, with `EngineDataTablesService`); the test-bed
backend in the engine-test adapter. The converter uses it by default
(`ConvertOptions.services`). The text below is the first proposal; spec 9.9
replaces its `ctx.dataTable` effect.

## Why

The Data Table node (`n8n-nodes-base.dataTable`) runs in the fallback host in
every workflow that uses it. In the corpus sample it is about 1,200 host
nodes (5.7% of all host nodes): `row.get` 537, `row.update` 200,
`row.insert` 199, `row.upsert` 155, `row.rowNotExists` 56,
`row.deleteRows` 44, `row.rowExists` 13. The node itself is cheap. Its cost
is the host step: the IPC frame, the v1 node with n8n-core around it, and
the JSON in both directions.

## What v1 does

The v1 node gets one service for each table from n8n-core
(`additionalData['data-table'].dataTableProxyProvider`,
`IDataTableProjectService`). The node turns its parameters into calls of
that service:

| Operation | Service call |
|---|---|
| `row.get`, `rowExists`, `rowNotExists` | `getManyRowsAndCount({ filter, skip, take, sortBy })` |
| `row.insert` | `insertRows(rows, returnType)` |
| `row.update` | `updateRows({ filter, data, dryRun? })` |
| `row.upsert` | `upsertRow({ filter, data, dryRun? })` |
| `row.deleteRows` | `deleteRows({ filter, dryRun? })` |

A filter is `{ type: 'and' | 'or', filters: [{ columnName, condition, value }] }`
with the conditions `eq`, `neq`, `like`, `ilike`, `gt`, `gte`, `lt`, `lte`,
`isEmpty`, `isNotEmpty`. The service owns the semantics (type coercion of
values to the column types, the system columns `id`, `createdAt`,
`updatedAt`, the order of rows).

## Proposal: a `ctx.dataTable` effect

A new durable effect, one call for each service call:

```ts
ctx.dataTable({
  table: string,               // the table id (resource locator value)
  op: 'list' | 'insert' | 'update' | 'upsert' | 'delete',
  filter?: DataTableFilter,
  rows?: Json[],               // insert
  data?: Json,                 // update, upsert
  returnType?: 'all' | 'id' | 'count',
  skip?: number, take?: number, sortBy?: [string, 'ASC' | 'DESC'],
  dryRun?: boolean,
}): Promise<{ count?: number; data: Json }>
```

* The library node `src/nodes/data-table.ts` maps the v1 parameters to these
  calls and builds the v1 output, as the other library nodes do with
  `ctx.http`. Equivalence tests compare the service calls and the outputs
  with v1 (a recording service in place of `ctx.http`).
* The effect is durable: on replay, wfrt gives the recorded result, so a
  write is not done twice.
* wfrt does not implement the store. It sends the call to a backend and
  waits for the result, as for a host step, but with a small JSON frame and
  no v1 node:
  * **n8n integration:** n8n answers on the existing link to wfrt with its
    own `DataTableService` for the project of the workflow (the same service
    that v1 gets). Access control stays in n8n.
  * **Test bed:** the fallback host answers with its file store
    (`workflow-fallback-host/src/data-table.ts`), which already implements
    the service for the v1 node.
* The semantics stay in one place: the service of n8n (or the test store).
  The library node only maps parameters and output.

## Why not the alternatives

* **`ctx.http` to n8n's REST API.** The workflow would need an API key of
  the instance, the REST API has a different contract (pagination, errors)
  than the service the node uses, and every call would go through HTTP and
  authentication.
* **A store inside wfrt.** It would copy the column types, coercion and
  system columns of n8n's data-table service, and two stores would drift.
* **Keep it in the host.** It works, but each call costs a host step.

## Work

1. Spec: the effect, its frame and its replay (sections 1.2 and 3).
2. wfrt: the effect and the backend link (runtime agent).
3. n8n: the backend handler (compiled-engine module).
4. Host: the test-bed backend over `data-table.ts`.
5. Library node and equivalence tests (this agent).

Open question for the coordinator: one effect type `dataTable`, or a general
"backend service call" effect (`ctx.service({ service: 'dataTable', … })`)
that later serves other n8n-side stores (variables, static data for polling)?
