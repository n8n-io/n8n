# Page examples

Three complete `content` arrays (the `content` you pass to `create-page` /
`set-content`), from simple to a `code` block with an action. Call
`apps(action="code-api")` before writing any `code` block — the types below
assume it.

## How `render` output works

- A `code` block is TSX. Write the markup as JSX: `<div class="p-md">{name}</div>`.
- JSX escapes every text child and every attribute value. You do not escape
  `ctx.query`, `ctx.params` or `ctx.input` values yourself.
- A URL attribute (`href`, `src`, `action`, `formaction`, `poster`) is kept
  when it is relative (no scheme) or uses `http:`, `https:`, `mailto:` or
  `tel:`. Any other scheme (`javascript:`, `data:`, …) is dropped.
- `raw(html)` inserts trusted HTML as-is. Use it only for markup you built
  or escaped yourself.
- `render` may return JSX, a string, a number, `null`, `undefined`, a boolean
  or an array of those. `null`, `undefined` and booleans render nothing. A
  string returned from `render` is raw HTML, as before; template strings
  still work, but then you own the escaping.
- `class` and `className` both produce `class`; `htmlFor` produces `for`; a
  `style` object becomes a `style` attribute.

## 1. Orders dashboard (index page, route `""`)

Typed blocks only: a heading and a table over an existing Data Table.

```json
[
  { "id": "h1", "type": "header", "data": { "text": "Orders", "level": 1 } },
  {
    "id": "t1",
    "type": "table",
    "data": {
      "source": { "dataTableId": "dt_orders" },
      "columns": ["customer", "status", "total"],
      "sortBy": ["createdAt", "DESC"],
      "limit": 50
    }
  }
]
```

No `code` needed: a straight, unfiltered listing is exactly what the `table`
block is for.

## 2. Client detail (route `:id`, child of the index page)

A dynamic segment plus a `code` block that reads one row and a related
workflow's last run, something a typed block can't express.

```json
[
  { "id": "h1", "type": "header", "data": { "text": "Client {{ params.id }}", "level": 1 } },
  {
    "id": "code1",
    "type": "code",
    "data": {
      "source": "export async function render(ctx: PageContext) {\n  const clients = await ctx.dataTables.get('clients');\n  const { data } = await clients.getManyRowsAndCount({\n    filter: { type: 'and', filters: [{ columnName: 'external_id', condition: 'eq', value: ctx.params.id }] },\n    take: 1,\n  });\n  const client = data[0];\n  if (!client) return <p class=\"text-muted\">Client not found.</p>;\n  const run = await ctx.workflows.execute('wf_client_health', { clientId: ctx.params.id });\n  const health = run.status === 'success' ? JSON.stringify(run.data) : 'unavailable';\n  return (\n    <div class=\"p-md\">\n      <h2>{client.name}</h2>\n      <p>Status: {client.status}</p>\n      <p>Health: {health}</p>\n    </div>\n  );\n}\n"
    }
  }
]
```

The same `source`, readable:

```tsx
export async function render(ctx: PageContext) {
  const clients = await ctx.dataTables.get('clients');
  const { data } = await clients.getManyRowsAndCount({
    filter: { type: 'and', filters: [{ columnName: 'external_id', condition: 'eq', value: ctx.params.id }] },
    take: 1,
  });
  const client = data[0];
  if (!client) return <p class="text-muted">Client not found.</p>;
  const run = await ctx.workflows.execute('wf_client_health', { clientId: ctx.params.id });
  const health = run.status === 'success' ? JSON.stringify(run.data) : 'unavailable';
  return (
    <div class="p-md">
      <h2>{client.name}</h2>
      <p>Status: {client.status}</p>
      <p>Health: {health}</p>
    </div>
  );
}
```

Notes:

- `ctx.params.id` matches the `:id` segment because the page's route is
  `:id`.
- `{client.name}` and `{health}` are escaped by JSX. `code` block output is
  not sanitized, so a value you put into `raw()` or into a returned string is
  inserted as-is.
- `ctx.workflows.execute` only runs a published workflow whose first
  trigger is an Execute Workflow Trigger; build and publish that workflow
  with `workflows` / `build-workflow` first.

## 3. Intake form with a custom action (route `intake`)

A `form` block for the common case, plus a `button` wired to a `code`
block's `actions` for one-off custom logic (here, marking a submission
reviewed) that no typed block covers.

```json
[
  { "id": "h1", "type": "header", "data": { "text": "New client intake", "level": 1 } },
  {
    "id": "f1",
    "type": "form",
    "data": {
      "workflowId": "wf_intake",
      "submitLabel": "Submit",
      "successMessage": "Thanks — we'll be in touch."
    }
  },
  { "id": "d1", "type": "divider", "data": {} },
  {
    "id": "b1",
    "type": "button",
    "data": {
      "label": "Flag for review",
      "style": "secondary",
      "target": { "kind": "action", "blockId": "code1", "action": "flagForReview" }
    }
  },
  {
    "id": "code1",
    "type": "code",
    "data": {
      "source": "export function render(ctx: PageContext) {\n  return null;\n}\n\nexport const actions = {\n  async flagForReview(ctx: ActionContext) {\n    const flags = await ctx.dataTables.get('intake_flags');\n    await flags.insertRows([{ flaggedBy: ctx.viewer?.email ?? 'anonymous', flaggedAt: new Date().toISOString() }]);\n    return { redirect: ctx.page.path };\n  },\n};\n"
    }
  }
]
```

Notes:

- `form` posts straight to the workflow's Form Trigger — no `code` needed
  for the common submit path.
- The `button`'s `target.blockId` names the `code` block that owns the
  action, and `action` must match a key of that block's exported `actions`.
- `render` on `code1` returns `null` because this block exists only to host
  an action, not to render visible content — a valid, common pattern.
- `flagForReview` runs server-side against `ActionContext` (which extends
  `PageContext` with `ctx.input`, the POSTed body) and returns an
  `ActionResult`; here it redirects back to the same page.
- Never put a credential or secret value in what `render` or an action
  returns — fetch it with `ctx.credentials.get(name)` and use it only in
  server-side calls (`ctx.fetch`, `ctx.workflows.execute`, …), never echo it
  into the HTML.

## 4. Reusable pieces: function components and lists

A function component is a function that takes `props` and returns JSX. Pass
children between the tags; read them from `props.children`.

```tsx
const Card = (props: { title: string; children?: Renderable }) => (
  <section class="p-md">
    <h2>{props.title}</h2>
    {props.children}
  </section>
);

export async function render(ctx: PageContext) {
  const orders = await ctx.dataTables.get('orders');
  const { data } = await orders.getManyRowsAndCount({ take: 10 });
  return (
    <>
      <Card title="Open orders">
        <ul>{data.map((row) => <li>{row.customer}: {row.total}</li>)}</ul>
      </Card>
      <a href={ctx.query.back}>Back</a>
    </>
  );
}
```

`<>...</>` (a Fragment) renders its children with no wrapping element. The
`href` comes from the URL: JSX keeps it when it is a safe URL and drops the
attribute otherwise.

Shared components used by several blocks belong in the App's components module
(`update-app` → `components`) and are imported with `import { Card } from
'app/components'`; see [components.md](components.md) for the `Card`/`Badge` example.
