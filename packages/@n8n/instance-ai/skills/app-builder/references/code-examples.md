# Page examples

Three complete `content` arrays (the `content` you pass to `create-page` /
`set-content`), from simple to a `code` block with an action. Call
`apps(action="code-api")` before writing any `code` block — the types below
assume it.

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
      "source": "export async function render(ctx: PageContext) {\n  const clients = await ctx.dataTables.get('clients');\n  const { data } = await clients.getManyRowsAndCount({\n    filter: { type: 'and', filters: [{ columnName: 'external_id', condition: 'eq', value: ctx.params.id }] },\n    take: 1,\n  });\n  const client = data[0];\n  if (!client) return '<p class=\"text-muted\">Client not found.</p>';\n  const run = await ctx.workflows.execute('wf_client_health', { clientId: ctx.params.id });\n  const health = run.status === 'success' ? JSON.stringify(run.data) : 'unavailable';\n  return `<div class=\"p-md\"><h2>${client.name}</h2><p>Status: ${client.status}</p><p>Health: ${health}</p></div>`;\n}\n"
    }
  }
]
```

Notes:

- `ctx.params.id` matches the `:id` segment because the page's route is
  `:id`.
- Every value interpolated into the returned string is escaped or comes
  from a trusted lookup (`client.name`); never splice raw `ctx.query` or
  `ctx.input` values into HTML without escaping them yourself — `code`
  block output is not sanitized.
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
      "source": "export async function render(ctx: PageContext) {\n  return '';\n}\n\nexport const actions = {\n  async flagForReview(ctx: ActionContext) {\n    const flags = await ctx.dataTables.get('intake_flags');\n    await flags.insertRows([{ flaggedBy: ctx.viewer?.email ?? 'anonymous', flaggedAt: new Date().toISOString() }]);\n    return { redirect: ctx.page.path };\n  },\n};\n"
    }
  }
]
```

Notes:

- `form` posts straight to the workflow's Form Trigger — no `code` needed
  for the common submit path.
- The `button`'s `target.blockId` names the `code` block that owns the
  action, and `action` must match a key of that block's exported `actions`.
- `render` on `code1` returns `''` because this block exists only to host
  an action, not to render visible content — a valid, common pattern.
- `flagForReview` runs server-side against `ActionContext` (which extends
  `PageContext` with `ctx.input`, the POSTed body) and returns an
  `ActionResult`; here it redirects back to the same page.
- Never put a credential or secret value in the string `render` returns —
  fetch it with `ctx.credentials.get(name)` and use it only in server-side
  calls (`ctx.fetch`, `ctx.workflows.execute`, …), never echo it into the
  HTML.
