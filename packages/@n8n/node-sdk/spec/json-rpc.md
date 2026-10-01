# `n8n:action` over JSON-RPC

The WIT files in this folder are the source of truth. A WASM component uses them directly.
A process runner and a container runner use JSON-RPC 2.0 with the fixed mapping below. Each
WIT type has exactly one JSON form, so a runner in any language can be checked against the
same fixtures.

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
| `option<T>` | the value, or `null` for none. In a record, a none field is left out. |
| `option<json>` | `{ "some": <value> }`, or `null` for none, because a JSON value can be `null` |
| `record` | object. Field names change from kebab case to lower camel case: `timeout-ms` → `timeoutMs`. |
| `enum` | the case name as a string, as written: `"GET"`, `"warn"` |
| `variant` | `{ "tag": "<case>", "val": <payload> }`. A case without a payload has no `val`. |
| `result<T, E>` of a function | `T` is the JSON-RPC `result`. `E` is in the JSON-RPC `error`: `code` −32000, `message` is `E` for a string, the case name for a variant, else `E.message`. `data` is `E`. |
| `result<_, E>` of a function | the JSON-RPC `result` is `null` |
| `resource` handle (`own` or `borrow`) | integer. The side that creates the resource numbers it. |

## Methods

The method name is `<interface>.<function>`. A resource method is
`<interface>.<resource>.<method>` with the handle in `self`. A constructor is
`<interface>.<resource>.new` and gives the handle. `<interface>.<resource>.drop` frees an
owned handle. Parameters are by name, an object with the WIT parameter names in lower camel
case. A world-level function has no interface part.

The host calls the exports of the guest. The guest calls the imports of the host. Both sides
send requests on the same connection, so the guest can call `http.request` while the host
waits for `action.run.next`. The host sends number ids and the guest sends string ids, so
the ids of the two sides never collide.

| Direction | Method (`n8n:action@2`) | Params → result |
|---|---|---|
| host → guest | `action.describe` | `{}` → contract document |
| host → guest | `action.run.new` | `{ input }` → handle |
| host → guest | `action.run.next` | `{ self }` → `{ "some": item }`, or `null` at the end |
| host → guest | `action.run.drop` | `{ self }` → `null` |
| guest → host | `http.request` | `{ request }` → `{ status, headers, body }` |
| guest → host | `log.log` | `{ level, message }` → `null` |
| guest → host | `limits.get` | `{}` → `{ maxRequests, maxItems }` |
| guest → host | `binary.*` (2.1.0, draft) | see `n8n-action@2.wit` |

`n8n:action@1` has `action.describe`, `action.run` (`{ input }` → `null`) and the import
`emit` (`{ item }` → `null`). The host runs it through the @1 adapter.

## Start of a connection

The host sends `initialize` with `{ apiVersion }`, the version that the host implements. The
guest answers with the `apiVersion` of its bundle. The host closes the connection when the
bundle version is outside the configured range (`N8N_NODE_CONTRACTS_API_RANGE`) or needs a
newer minor than the host implements.

## Transports

- Process runner: one JSON message per line (newline-delimited JSON) on stdin and stdout.
  The guest writes logs only through `log.log`. Stderr is for crash output.
- Container or microVM: the same newline-delimited messages on a Unix or vsock socket. When
  only HTTP is open, use one WebSocket with one message per text frame.

## Example

```json
{"jsonrpc":"2.0","id":1,"method":"action.run.new","params":{"input":{"limit":2}}}
{"jsonrpc":"2.0","id":1,"result":7}
{"jsonrpc":"2.0","id":2,"method":"action.run.next","params":{"self":7}}
{"jsonrpc":"2.0","id":"g1","method":"http.request","params":{"request":{"method":"POST","target":{"tag":"path","val":"/query"},"query":[],"headers":[],"body":{"some":{"page_size":2}}}}}
{"jsonrpc":"2.0","id":"g1","result":{"status":200,"headers":[["content-type","application/json"]],"body":{"results":[]}}}
{"jsonrpc":"2.0","id":2,"result":null}
```
