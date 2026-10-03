# The Node Contract over JSON-RPC

The WIT files in `wit/` are the source of truth for the runtime interface. A WASM component
uses them directly. A process runner and a container runner use JSON-RPC 2.0 with the fixed
mapping below. Each WIT type has exactly one JSON form, so a runner in any language can be
checked against the same fixtures.

`<kind>.openrpc.json` (OpenRPC 1.3) lists every method of one kind interface with its parameters,
result, error, direction (`x-direction`) and version (`x-since`). `scripts/spec.ts` generates
these files from the WIT with this mapping. Do not edit them: run `pnpm spec:generate`.

## Type mapping

| WIT | JSON |
|---|---|
| `bool` | `true` or `false` |
| `u8`, `u16`, `u32`, `s32`, `f64` | number |
| `u64` | number. A value above 2^53 − 1 is an error. |
| `string` | string |
| `json` (the alias in `types`) | the JSON value inline, not its text |
| `list<u8>` | base64 string (RFC 4648, with padding) |
| `list<T>`, `tuple<…>` | array |
| `option<T>` | the value, or `null` for none. In a record and in parameters, a none field is left out. |
| `option<json>` | In a record and in parameters: the value inline, and a none field is left out. Elsewhere (a function result, an item of a list or tuple): `{ "some": <value> }`, or `null` for none, because a JSON value can be `null`. |
| `record` | object |
| `enum` | the case name as a string |
| `variant` | `{ "tag": "<case>", "val": <payload> }`. A case without a payload has no `val`. |
| `result<T, E>` of a function | `T` is the JSON-RPC `result`. `E` is in the JSON-RPC `error`: `code` −32000, `message` is `E` for a string, the case name for a variant, else `E.message`. `data` is `E`. |
| `result<_, E>` of a function | the JSON-RPC `result` is `null` |
| `resource` handle (`own` or `borrow`) | integer. The side that creates the resource numbers it. |

Names in data change from kebab case to lower camel case: record fields, parameters, enum
cases and variant tags. `timeout-ms` → `timeoutMs`, `is-empty` → `"isEmpty"`, `chat-model` →
`"chatModel"`. So the JSON has the names of the TS types of the SDK. `%name`, a WIT keyword
used as a name, loses its `%`: `%type` → `type`, `%list` → `list`.

## Methods

The method name is `<interface>.<function>`. A resource method is
`<interface>.<resource>.<method>` with the handle in `self`. Parameters are by name, an object
with the WIT parameter names in lower camel case. Method names keep the WIT spelling.

The mapping adds these methods. Their names are in brackets, so they never collide with a WIT
function (`data-tables.table.drop` deletes a table; `data-tables.table.[drop]` frees the handle):

| Method | Params → result |
|---|---|
| `[initialize]` | `{ nodeContract }` → `{ nodeContract, kind }` |
| `[reset]` | `{}` → `null`. Drops the component instance. The next `[initialize]` starts a fresh one. |
| `<interface>.<resource>.[new]` | the constructor parameters → handle |
| `<interface>.<resource>.[drop]` | `{ self }`. A notification. |
| `<interface>.<resource>.[take]` | `{ self, max }` → `{ outputs, done, error? }`, for a resource with `next` |

The host calls the exports of the guest. The guest calls the imports of the host. Both sides
send requests on the same connection, so the guest can call `http.request` while the host
waits for `action.item-run.next`. The host sends number ids and the guest sends string ids,
so the ids of the two sides never collide. While the guest waits for the answer to its call,
the host sends only that answer. A runner may stop the connection when another message comes.

A WIT function without a result is a notification: the caller sends no `id` and gets no
answer. `log.log` and each `[drop]` are notifications, so a log line or a freed handle costs
no round trip.

`[take]` calls `next` until the end, an error, or `max` outputs, and gives all of them in one
answer. The guest can call the host between two outputs, as in `next`. `done` is true at the
end of the run. `error` is the error that ended the run; the outputs before it stay in
`outputs`. With `[take]`, a run of one item costs 2 round trips plus one per host call:
`[new]` and `[take]`, with `[drop]` as a notification.

A host gives an optional import only to a bundle whose manifest needs it. The host answers a
call to another import with `code` −32601 (method not found). A WASM runner stops the
component (a trap) before such a call gets to the host, because a WIT function without a
`result` cannot give an error. The component then answers each later call with that error.

A `chunk-run` (Node Contract 2.5.0) runs many items of a `per-item` action in one run. Before
the work of an item, the guest sends the notification `chunk.item` with the index of the item.
The host then applies the input of that item to the host calls that follow. The host accepts
only the next index (0, 1, 2, …), and fails the run on another index or on a host call before
the first item. `[take]` gives one `item-outcome` per item: `output` or `failed`.

## Guest rules

- A run starts its work at the first `next` (or `[take]`), not in the constructor. A WIT
  constructor has no error result, so an error in it stops a component (a trap). The JS guest
  of the SDK starts `run()` at the first `next`.
- A guest writes logs only through `log.log`.

## Start of a connection

The host sends `[initialize]` with `{ nodeContract }`, the version that the host implements.
The guest answers with the `nodeContract` and the `kind` of its bundle. The host closes the
connection when the bundle version is outside the configured range (`N8N_NODE_CONTRACT_RANGE`)
or needs a newer minor than the host implements.

A runner that serves more than one session sends `[reset]` after a session, then `[initialize]`
for the next one. The new instance shares no state with the old one: it gets its own memory, CPU
budget, memory limit and handle tables, and it evaluates the bundle again. The process arguments
(component, bundle, grants, limits) stay the same, so a runner reuses a process only for sessions
with the same arguments. `[reset]` also clears the error of a stopped component.

## Transports

- Process runner: one JSON message per line (newline-delimited JSON) on stdin and stdout.
  Stderr is for crash output.
- Container or microVM: the same newline-delimited messages on a Unix or vsock socket. When
  only HTTP is open, use one WebSocket with one message per text frame.

## Example

```json
{"jsonrpc":"2.0","id":1,"method":"action.item-run.[new]","params":{"input":{"limit":2},"items":[{}]}}
{"jsonrpc":"2.0","id":1,"result":7}
{"jsonrpc":"2.0","id":2,"method":"action.item-run.[take]","params":{"self":7,"max":100}}
{"jsonrpc":"2.0","method":"log.log","params":{"level":"debug","message":"query page 1"}}
{"jsonrpc":"2.0","id":"g1","method":"http.request","params":{"request":{"method":"POST","target":{"tag":"path","val":"/query"},"query":[],"headers":[],"body":{"page_size":2}}}}
{"jsonrpc":"2.0","id":"g1","result":{"status":200,"headers":[["content-type","application/json"]],"body":{"results":[]}}}
{"jsonrpc":"2.0","id":2,"result":{"outputs":[],"done":true}}
{"jsonrpc":"2.0","method":"action.item-run.[drop]","params":{"self":7}}
```
