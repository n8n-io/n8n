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
  with this skill (a `form`/`button` for workflows, an `agent-chat` block
  for agents).
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
4. Write each page's blocks and call `apps(action="create-page")` with a
   `title` / `apps(action="set-content")`.
5. If the result carries `issues`, fix the named block/path and resubmit —
   never guess at a second unrelated fix.
6. `apps(action="preview-page", appId, pageId)` renders the draft without
   publishing and returns `errors` (per block id) and `logs` (`ctx.log`
   output of `code` blocks). Fix every error and call it again; publish only
   when `errors` is empty. Pass `path: 'clients/42'` to render a dynamic page
   with real values.
7. `apps(action="publish")` once every page you touched is set.
8. Report the app's URL from the result.

Don't call `apps(action="publish")` for content you haven't set yet, and
don't leave a page half-written across turns without telling the user what's
still missing.

## Block catalog (summary)

Every block is `{ id, type, data }`; see
[references/block-catalog.md](references/block-catalog.md) for full fields,
limits, and one example per type: `header`, `paragraph`, `list`, `image`,
`divider` (layout/text), `table` (rows from a Data Table), `form` (fields of
a workflow's Form Trigger, plus every later **n8n Form** node page and the
Form Ending — see [references/forms.md](references/forms.md)), `button`
(runs a workflow or a `code` block action), `agent-chat` (a chat with a
published agent of the project — see
[references/agent-chat.md](references/agent-chat.md)), `html` (Handlebars
over params/query/viewer, sanitized), `code` (TSX against `PageContext`; JSX
output is escaped, a returned string is inserted as-is).

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
  call. Output is not sanitized: JSX escapes text and attributes for you;
  `raw()` and returned strings are inserted as-is.

## Code rules

- Call `apps(action="code-api")` before writing a `code` block and follow
  the returned types exactly. The only importable module is the App's own
  components module: `import { Card } from 'app/components'`; nothing else
  can be imported inside the isolate.
- Shared markup goes into the App's **components module** (`update-app` →
  `components`, TSX exporting function components); blocks import it from
  `app/components`. A render error keyed `components` means the shared
  module failed — fix the module, not the blocks. See
  [references/components.md](references/components.md).
- `ctx.workflows.submitForm`/`execute` return `{ status: 'waiting',
  executionId }` when the run pauses (Form or Wait node); treat it as
  recorded, not as an error.
- Debug a `code` block with `ctx.log(...)` and read the lines back from
  `apps(action="preview-page")` → `logs[blockId]`; logs never reach the
  published page.
- Write TSX. Return JSX from `render`: `<div class="p-md">{name}</div>`.
  JSX compiles to the built-in `h` / `Fragment`; do not import a library.
- Export `render(ctx: PageContext)`, and `actions` (an object of named
  handlers) only if a `button` on the page targets one. `render` may return
  JSX, a string, a number, `null`, a boolean or an array of those; `null`,
  `undefined` and booleans render nothing.
- JSX escapes every text child and attribute value. Do not escape
  `ctx.query`, `ctx.params` or `ctx.input` values yourself; put them into
  JSX directly.
- Use `raw(html)` only for trusted HTML you built or escaped yourself. A
  string returned from `render` is also raw HTML: template strings still
  work, but then you own the escaping.
- A URL attribute (`href`, `src`, `action`, `formaction`, `poster`) is kept
  when it is relative (no scheme) or uses `http:`, `https:`, `mailto:` or
  `tel:`. Any other scheme (`javascript:`, `data:`, …) is dropped.
- Reuse markup with a function component: a function that takes `props`
  (with `children`) and returns JSX; use it as `<Card title="x">...</Card>`.
- Post to `ctx.actionUrl(name)` as-is: the served page's script adds the
  Authorization header to any form or fetch inside the app, so a code block
  never handles tokens.
- Use `ctx.dataTables` / `ctx.workflows` / `ctx.credentials` for data and
  side effects; never fabricate data.
- Never put a secret or credential value in what `render`/an action
  returns — resolve it with `ctx.credentials.get()` and use it only in
  server-side calls, not in the HTML.
- External `<script src="...">` is allowed in returned HTML; inline
  `<script>` logic is fine too (write it with `raw()`), but keep output
  small — this isn't a bundler.
- See [references/code-examples.md](references/code-examples.md) for worked
  pages, including a `button` → `code` action and a function component.

## Layouts

A page can carry a `layout`: blocks the server renders around the page
content, in place of the built-in menu-and-card shell. A layout is a flat
block list with exactly one `slot` block. The slot is where the page content
goes. Every page below it inherits the layout until one of them sets its own.
Set it with `apps(action="set-layout", appId, pageId, layout=[...])`; pass
`layout: null` to inherit again. Start from a preset: `layoutPreset` on
`create` (default `top-nav`) gives the app its theme and an index page with
the layout — fill the page with `set-content`. Render a menu from `ctx.menu`
in a `code` block (`nav.app-nav`, current item `aria-current="page"`); a
header, footer, hero or sidebar comes from the `app-*` vocabulary, columns
beyond that from `theme.customCss`. See
[references/layouts.md](references/layouts.md) for the presets, the model,
the menu example and the CSS hooks.

## Styling

Order of preference: the `app-*` vocabulary first (`app-container`,
`app-header`, `app-card`, `app-grid-2`, …), then the theme fields
(`theme.colors` / `radius` / `fontFamily` / `contentWidth`), then
`theme.customCss` for anything those cannot express, then utility classes in
`html` / `code` output for one block only. Set the theme with
`apps(action="update-app", appId, theme={...})`. Only the utility classes
that the server templates use exist on a served page — do not invent
Tailwind classes. See [references/styling.md](references/styling.md) for the
vocabulary, the page recipes, the page anatomy, the theme variables and the
utility list.

## Route rules

- Give every page a `title` (`Clients`): the menu and the browser tab show
  it. The route stays a URL segment (`clients`). Without a title the page
  is named after its route.
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
