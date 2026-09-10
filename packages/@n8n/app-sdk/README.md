# @n8n/app-sdk

Browser client for the workflows, data tables and agents bound to a built n8n
app. It calls the app's runtime API, `/apps/<namespace>/api/workflows/<key>`,
`/apps/<namespace>/api/tables/<key>/rows` and
`/apps/<namespace>/api/agents/<key>/chat`, with no dependencies.

```ts
import { n8n, N8nAppError } from '@n8n/app-sdk';

const result = await n8n.workflows.run('submit', { email: 'a@b.c' });
```

`n8n.tables.<key>` reads and writes the rows of a bound data table:
`list({ filter, search, sortBy, take, skip })` returns `{ count, data }`;
`insert(rows)`, `update(filter, data)` and `delete(filter)` return the affected
rows as `{ data }`. Filters use the n8n data table filter shape
(`{ type?: 'and' | 'or', filters: [{ columnName, condition?, value }] }`). A
read-only binding answers writes with a `403 permission_denied` `N8nAppError`.

`n8n.agents.<key>` chats with a bound, published agent as an anonymous visitor:
`chat(message)` returns an async iterable of the agent's SSE events with a
`text()` shortcut that joins the reply; `resume({ runId, toolCallId, resumeData })`
answers a `tool-call-suspended` event (an approval takes `{ approved }`);
`messages()` returns `{ messages, openSuspensions }` for the visitor's session;
`sessionId()` mints the session once and keeps it in `localStorage`.

The app-builder skill in `@n8n/instance-ai` documents the API, the error codes
and the generated `src/n8n-bindings.d.ts` that types the bound keys.

## Compatibility

The SDK is copied into the app at create time (`vendor/n8n-app-sdk.tgz`) and
never changes afterwards. The runtime API contract is additive-only: new
fields, endpoints and error codes may appear, nothing is renamed, removed or
retyped, so any SDK version keeps working. A breaking change, if ever needed,
ships under a new path next to the existing one.
