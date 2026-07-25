# Common output shapes and field paths

Use this before wiring expressions or Code nodes that read LLM, HTTP, trigger,
or agent outputs. Wrong paths are the most common silent build failure: the
workflow saves and verifies against a flat mock, then every field is empty on
the first real run.

When in doubt, inspect a real item with `debugging-executions` or a one-item
verify run before claiming the path is correct.

## LLM / chat model text

Never assume `$json.text` unless the node definition or a live item proves it.

| Source | Typical text path (simplify on / default) |
| --- | --- |
| OpenAI v2+ text/response | `$json.output[0].content[0].text` — see `knowledge-base/reference/open-ai-output-shape.md` |
| OpenAI v1 text/message | `$json.message.content` |
| Google Gemini text/message | `$json.content.parts[0].text` — **not** `$json.text` |
| Anthropic text/message | `$json.content[0].text` — `content` is an array of blocks |

With `simplify: true` (the default), Gemini emits one item per candidate, so the
candidate fields (`content`, `finishReason`, `index`) sit at the root of `$json`.
Anthropic emits `{ content, merged_response }`.

`parts` / `content` can hold non-text blocks (thinking, tool use, inline data),
so `[0]` is a convenience, not a guarantee — pick the text block. When the
node's **Include Merged Response** option is on, prefer the pre-joined string
(`$json.mergedResponse` on Gemini, `$json.merged_response` on Anthropic).

If simplify is off, read the full provider payload and pick the message part
explicitly. After changing model or simplify settings, re-check the path.

## HTTP list envelopes

Before Loop / Split in Batches / per-item Code:

1. Check whether the HTTP node emitted **one item per record** or **one item
   that is a page envelope** (`{ orders: [...], nextPage }`, `{ tasks: [...] }`,
   `{ data: [...] }`).
2. If the body wraps a list, **unwrap** into one item per record (Code or Split
   Out on the array field) before the loop. Iterating the envelope leaves
   `$json.id` undefined. Passing the envelope through
   (`$input.all().map(i => i.json)`) is **not** an unwrap — emit one item per
   element of the array field.
3. Pagination stop conditions: declare `output` on the HTTP node (envelope
   shape) and run `workflow-sdk validate`. The
   `HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY` rule flags
   `responseIsEmpty` against envelopes and names the fix
   (`paginationCompleteWhen: 'other'` +
   `completeExpression: '={{ $response.body.<field>.length === 0 }}'`). Keep
   `responseIsEmpty` only for bare top-level arrays.
4. Bare JSON arrays of primitives (HN IDs, etc.) become items like
   `{ json: 39101 }`. Read the value as `$json` (or the item itself), not
   `$json.id`.

## Webhook / form / chat triggers

Match the **real** trigger payload, not a flattened invent-your-own mock.

| Trigger | Common mistake | Correct path pattern |
| --- | --- | --- |
| Webhook (generic) | Reading `$json.field` | Often `$json.body.field` — Form is the exception (flat map) |
| Form Trigger | Using `body.field` | Flat `$json.field` in live runs; keep mocks flat |
| Telegram Trigger | Agent `promptType: 'auto'` / `$json.chatInput` | User text is `$json.message.text`; use `promptType: 'define'` with that expression |
| Chat Trigger | Inventing field names | `$json.chatInput` plus `sessionId` |
| Voice / tool-call webhooks | Flat `body.name` | Nesting like `body.message.toolCalls[0].function.arguments` (stringified JSON — **parse** before scoring) |

Mock `output` on webhook triggers must use the platform envelope. Coding against
a flat mock self-verifies green and fails on the first real call.

## Sheets / Excel / Set

- Google Sheets column match / updates: include the match column in
  `columns.schema` when you set "Column to Match On".
- Locator values: empty `document` / `sheet` / `calendar` `__rl.value` crashes
  at runtime — use a real ID, name mode, or `placeholder` / setup, never `""`.
- Set node **v3+** (default 3.5): fields live under `assignments`. The legacy
  `values` shape belongs to v1/v2 — using it on a v3 node emits `{}` and writes
  blank rows.
- Form → Excel/Sheets: every field the user asked for (Date, Category, Amount,
  …) must exist on the Form Trigger **and** be mapped into the write node.

## Agent + memory + model wiring

- Pair compatible AI Agent and Chat Model **typeVersions** (fetch both
  definitions; do not mix an old agent with an incompatible LM subnode).
- Memory `sessionIdType: 'fromInput'` (the default) only works with a connected
  Chat Trigger. For any other trigger — Telegram, Webhook, Form — switch to
  `sessionIdType: 'customKey'` and set `sessionKey` explicitly, e.g.
  `nodeJson(telegramTrigger, 'message.chat.id')`.

## Code node item semantics

- Code nodes **do not run on zero items**. If you need a default when a lookup
  returns nothing, use a node that still fires (or `alwaysOutputData` upstream
  — see Workflow Rules), not "Code that runs when empty".
- Default Code mode is `runOnceForAllItems`: the code runs once with every item
  in `$input.all()` and must return an array of items. For per-item logic set
  `mode: 'runOnceForEachItem'`, read `$json` / `$input.item`, and return a single
  item — `$input.all()` is not available there.
- `splitInBatches` **done** branch emits every item that flowed back into the
  loop input, accumulated across iterations — so a Code node on `done` reading
  `$input.all()` does see all rows. It only carries what actually looped back:
  items dropped by a Filter/IF inside the loop body, or on a branch that never
  reconnects via `nextBatch`, are missing from the done output.

## After build

If verification shows empty fields, wrong counts, or undefined expression
errors, fix the **path or unwrap** first — do not add more nodes until the
shape matches a real upstream item.
