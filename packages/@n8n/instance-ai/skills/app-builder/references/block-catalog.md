# Block catalog

`Page.content` is an array of blocks: `{ id, type, data }`. `id` is optional
when you write it — the `apps` tool generates one for any block missing it —
but every block must have a unique `id` once validated. Keep ids short and
stable across `set-content` calls to the same page so users can tell "same
block, edited" from "new block" in a diff.

Field limits below are enforced by `appContentSchema`; a `create-page` or
`set-content` call that violates one comes back as `{ denied: true, issues }`
with the exact zod path.

## Typed blocks

### `header`

```json
{ "id": "h1", "type": "header", "data": { "text": "Open orders", "level": 2 } }
```

`level` is 1-6. `text` (also `paragraph.text` and `list.items[]`) may carry inline
formatting only: `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<s>`, `<mark>`, `<code>`, `<br>`
and `<a href="https://…">`. Everything else is stripped on render; interpolated values are
escaped. For any other markup use an `html` block.

### `paragraph`

```json
{ "id": "p1", "type": "paragraph", "data": { "text": "Showing orders placed by {{ viewer.email }}." } }
```

### `list`

```json
{
  "id": "l1",
  "type": "list",
  "data": { "style": "unordered", "items": ["Fast shipping", "30-day returns"] }
}
```

`style` is `ordered` or `unordered`. Each item is interpolated text, max 200
items.

### `image`

```json
{
  "id": "img1",
  "type": "image",
  "data": { "url": "https://cdn.example.com/logo.png", "alt": "Company logo", "caption": "" }
}
```

`url` must be `https:` (or `http://localhost` in dev). No inline/base64
images.

### `divider`

```json
{ "id": "d1", "type": "divider", "data": {} }
```

### `table`

```json
{
  "id": "t1",
  "type": "table",
  "data": {
    "source": { "dataTableId": "dt_abc123" },
    "columns": ["name", "status", "total"],
    "filter": {
      "type": "and",
      "filters": [{ "columnName": "status", "condition": "eq", "value": "open" }]
    },
    "sortBy": ["createdAt", "DESC"],
    "limit": 50,
    "editable": false,
    "deletable": false
  }
}
```

Renders rows from a Data Table (build it first with `data-tables`, then pass
its id here). `columns` omitted = every column. `filter` mirrors the
`data-tables` query filter and its string values may hold `{{ params.x }}` /
`{{ query.x }}` — e.g. filter a `/clients/:id` page's table to that client.
`sortBy` is `[column, "ASC" | "DESC"]`. `limit` defaults to 50, max 200. `id`,
`createdAt`, `updatedAt` are hidden unless you list them in `columns`.

`editable` and `deletable` both default to `false`. Set `editable: true` to
add an "Edit" link to each row. The link opens the row inline with one input
per shown column. "Save" posts to the block's built-in `update` action. Set
`deletable: true` to add a "Delete" button to each row. It posts to the
block's built-in `delete` action. Only the shown columns are writable;
`id`, `createdAt` and `updatedAt` are never writable.

Limitation: the `update` and `delete` actions cannot re-apply the block's
`filter`. A visitor who may edit or delete can address any row of the Data
Table by its `id`, not only the rows the block shows. Enable these flags
only on pages for trusted viewers.

### `form`

```json
{
  "id": "f1",
  "type": "form",
  "data": {
    "workflowId": "wf_xyz789",
    "submitLabel": "Send",
    "successMessage": "Thanks — we got it."
  }
}
```

Renders the fields of a workflow's **Form Trigger** (build the workflow
first with `workflows`/`build-workflow` — it must start with a Form Trigger
and be published) and posts to it on submit. `successMessage` is
interpolated and shown in place of the form after a successful submit.

### `button`

```json
{
  "id": "b1",
  "type": "button",
  "data": {
    "label": "Approve",
    "style": "primary",
    "target": { "kind": "workflow", "workflowId": "wf_xyz789", "input": { "id": "{{ params.id }}" } }
  }
}
```

`target.kind` is `"workflow"` (runs a published Execute Workflow Trigger
workflow, `input` values are interpolated strings) or `"action"` (posts to
a named action exported by a `code` block elsewhere on the page —
`{ "kind": "action", "blockId": "c1", "action": "approve" }`). `style` is
`primary` or `secondary`.

### `html`

```json
{
  "id": "html1",
  "type": "html",
  "data": {
    "template": "<div class=\"p-md\">{{#if viewer}}Hi {{viewer.email}}{{else}}Hi there{{/if}}</div>"
  }
}
```

Handlebars over `{ params, query, viewer }`. Built-ins only (`#each`, `#if`,
`#unless`, `#with`, `lookup`) — no custom helpers, no partials. Output is
sanitized (a fixed element/attribute allowlist; no `<script>`, `on*`,
`style`, `iframe`, or `<form>`). Use this for static layout and simple
conditionals; use `code` when you need data or logic.

### `code`

```json
{
  "id": "code1",
  "type": "code",
  "data": {
    "source": "export async function render(ctx: PageContext) {\n  const table = await ctx.dataTables.get('orders');\n  const { data } = await table.getManyRowsAndCount({ take: 10 });\n  return <ul>{data.map((r) => <li>{r.name}</li>)}</ul>;\n}\n"
  }
}
```

TSX, evaluated server-side against `PageContext`. JSX compiles to the
built-in `h` / `Fragment` and renders to HTML: text children and attribute
values are escaped, unsafe URL attributes are dropped. `render` may return
JSX, a string (raw HTML), a number, `null`, a boolean or an array of those.
Output is **not sanitized**: `raw(html)` and returned strings are inserted
as-is, and external `<script src>` is allowed. See
[code-examples.md](code-examples.md) for `render` + `actions`, and load
`apps(action="code-api")` for the full type surface before writing one.

## Layout-only block

### `slot`

```json
{ "id": "slot", "type": "slot", "data": {} }
```

Marks where the page content goes inside a layout. A layout must contain
exactly one `slot`; page `content` must not contain one. See
[layouts.md](layouts.md).

## Interpolation reference

`{{ params.<name> }}`, `{{ query.<name> }}`, `{{ viewer.email }}`,
`{{ viewer.id }}` — replaced (empty string if missing) in: `header.text`,
`paragraph.text`, `list.items[]`, `table.filter.filters[].value` (string
values only), `button.target.input` values, `form.successMessage`. Not
available in `html` (gets the same values as its own template context) or
`code` (gets them on `ctx.params` / `ctx.query` / `ctx.viewer`). No
expressions or function calls — value lookup only.
