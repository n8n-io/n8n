---
name: app-builder
description: >-
  Build and edit end-user-facing web Apps served at /apps/<namespace>/ —
  server-rendered pages made of typed content blocks (header, list, table,
  form, button, image, divider) plus html and code blocks for anything
  custom. Load before calling the apps tool. Use for requests like "build me
  a dashboard for my orders table", "add a page that lists customers", "make
  a form page for the intake workflow", "a website/portal/UI for my data",
  or "change the heading" on an existing app page. Apps are stored and
  served by n8n through the apps tool — never written as files in the
  sandbox workspace. Not for n8n workflows, agents, or data tables on their
  own — build those first with their own skills, then wire them into a page
  with this skill.
recommended_tools:
  - apps
  - data-tables
  - workflows
---

# App Builder

## Routing

This skill owns Apps only: a page tree served at `/apps/<namespace>/…`. It
does not build the things a page displays or acts on:

- A page needs data from a Data Table that doesn't exist yet? Load
  `data-table-manager` and build the table first, then reference its id
  from a `table` or `code` block.
- A page needs to run automation (a form submission, a button click)? Load
  `workflow-builder` and build/publish the workflow first, then reference
  its id from a `form` or `button` block.

Never invent a page's data or logic inline when a proper Data Table or
workflow already exists or is the better fit — reuse it by id.

## Where an App lives

An App is rows in n8n (`apps(action="create")`, `create-page`, `set-content`),
rendered by the server at `/apps/<namespace>/`. Do not scaffold a project,
write HTML/Vue/React files, or run a build in the sandbox workspace — nothing
there is served, and the `code` block already covers custom markup and logic.
The sandbox is fine for scratch work such as inspecting data before you write
a block.

## The loop

1. `apps(action="list")` — find the app the user means, or confirm one
   doesn't exist yet.
2. Create (`apps(action="create")`) or pick the existing app.
3. Plan the page tree: one page per URL segment. An index page (route
   `""`) is top-level only; a detail page under it uses a dynamic segment
   (route `:id`) sharing a name with what its blocks/code read from
   `ctx.params`.
4. Write each page's blocks and call `apps(action="create-page")` /
   `apps(action="set-content")`.
5. If the result carries `issues`, fix the named block/path and resubmit —
   never guess at a second unrelated fix.
6. `apps(action="publish")` once every page you touched is set.
7. Report the app's URL from the result.

Don't call `apps(action="publish")` for content you haven't set yet, and
don't leave a page half-written across turns without telling the user what's
still missing.

## Block catalog (summary)

Every block is `{ id, type, data }`; see
[references/block-catalog.md](references/block-catalog.md) for full fields,
limits, and one example per type: `header`, `paragraph`, `list`, `image`,
`divider` (layout/text), `table` (rows from a Data Table), `form` (fields of
a workflow's Form Trigger), `button` (runs a workflow or a `code` block
action), `html` (Handlebars over params/query/viewer, sanitized), `code`
(TypeScript against `PageContext`, output inserted as-is).

Prefer the typed block that matches the job over `html`/`code` — `table` for
a plain listing, `form` for a plain submission. Reach for `html` or `code`
only when a typed block can't express what's needed.

## `html` vs `code`

- **`html`** for static layout and simple conditionals over
  `params`/`query`/`viewer` (Handlebars `#if`/`#each`/`#with`). Sanitized on
  output — no scripts, no inline styles, no forms. Style it with
  `theme.customCss` or the classes listed in
  [references/styling.md](references/styling.md).
- **`code`** whenever the page needs data (a filtered/joined/computed view a
  `table` block can't express), custom logic, or an action a `button` should
  call. Output is inserted raw — you own escaping.

## Code rules

- Call `apps(action="code-api")` before writing a `code` block and follow
  the returned types exactly — `import`/`require` is not available inside
  the isolate.
- Export `render(ctx: PageContext): Promise<string> | string`, and
  `actions` (an object of named handlers) only if a `button` on the page
  targets one.
- Post to `ctx.actionUrl(name)` as-is: the served page's script adds the
  Authorization header to any form or fetch inside the app, so a code block
  never handles tokens.
- Use `ctx.dataTables` / `ctx.workflows` / `ctx.credentials` for data and
  side effects; never fabricate data.
- Never put a secret or credential value in the string `render`/an action
  returns — resolve it with `ctx.credentials.get()` and use it only in
  server-side calls, not in the HTML.
- External `<script src="...">` is allowed in returned HTML; inline
  `<script>` logic is fine too, but keep output small — this isn't a
  bundler.
- Escape any value you interpolate from `ctx.query`, `ctx.params`, or
  `ctx.input` before splicing it into the returned HTML.
- See [references/code-examples.md](references/code-examples.md) for three
  worked pages, including a `button` → `code` action.

## Styling

Order of preference: `theme.colors` / `radius` / `fontFamily` first, then
`theme.customCss` for anything the fields cannot express, then utility
classes in `html` / `code` output for one block only. Set all of these with
`apps(action="update-app", appId, theme={...})`. Only the utility classes
that the server templates use exist on a served page — see
[references/styling.md](references/styling.md) for the list, the page
anatomy, the theme variables and two examples.

## Route rules

- Only a top-level page can have an empty route (`""`, the index page of
  its level). A sub-page needs a real segment.
- A dynamic segment (`:id`, `:slug`) must be read back under the exact same
  name from `ctx.params` in that page's blocks/code — pick the param name
  once and keep it consistent across the page and any code you write for
  it.
- Reuse an existing sibling route rather than creating a near-duplicate
  page for the same concept.

## Closing facts

- An app has an `auth` setting: `public` (default) or `n8n`. With `n8n`,
  only a signed-in user of this n8n instance can open the app; an anonymous
  visitor is sent to the n8n sign-in page. Change it with
  `update-app` (`auth`). `{{ viewer.email }}` in blocks and `ctx.viewer` in
  code are set for a signed-in viewer and null on a public visit.
- A page's draft (`create-page`/`set-content`) is not visible at the app's
  public URL until `publish`. The preview shown in the artifact reflects
  the draft; the public URL reflects the last publish.
- `delete-page`, `create` (a new app), and `publish` need user approval —
  call the tool and respect a `denied` result rather than asking for chat
  confirmation first.
