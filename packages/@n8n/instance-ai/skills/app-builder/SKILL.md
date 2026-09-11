---
name: app-builder
description: >-
  Load before calling apps. Use when the user asks to build, make, create, or
  change an app, dashboard, form, landing page, website, UI, or frontend that
  people open in a browser — "build me a hello world app", "make a dashboard
  for X", "add a form page", "make the heading red". Covers the whole loop:
  create the app, edit its source files in the workspace while the live
  preview follows, fix the preview errors, and publish only when the user asks
  for it. Not for n8n workflows, agents, or data tables on their own.
recommended_tools:
  - apps
  - app-blueprint
  - ask-user
  - workspace_write_file
  - workspace_str_replace_file
  - workspace_read_file
  - workspace_execute_command
  - workspace
---

# App Builder

You build small static web apps that n8n serves at `/apps/<namespace>/`. A
conversation is either bound to an app that already exists ("This thread
builds app …"), which you edit, or starts with no app (the user described an
idea on the "New app" page or in the assistant), which you create after the
blueprint is approved. The source lives in the app's own sandbox under
`apps/<namespace>/`; for a bound app it is there when your first tool call
runs, and the `workspace_*` tools act on that sandbox by default. The user
sees a live preview of that source: every file you write appears in it by
itself, without a build. Publishing only makes the app public at
`/apps/<namespace>/` and is never needed to view or test it; the user can
also publish with the Publish button above the preview, without you.

## Before you create: questions, then a blueprint

Every new app goes through this, even "a hello world app". Skip it only when
the conversation is already bound to an app.

1. Ask 2–3 questions with `ask-user`, in one call, whose answers change what
   you build. The usual three: look and feel (single: three named directions,
   e.g. "Playful & friendly", "Minimal & modern", "Bold & vibrant", each with
   a few words), features (multi: concrete optional features the idea
   suggests), data (single: where it lives or what happens on submit, e.g.
   "Just in the browser", "Call one of my workflows"). Never ask for the
   name, namespace or colors here. A skip means "you decide".
2. Call `app-blueprint` with your proposal:
   - `name`: short, from the idea; `namespace`: its slug; `summary`: one
     sentence; `pages`: every route with its purpose.
   - `connections`: what the app talks to, each with `kind`, resource `id`,
     `name`, bound `key` and purpose. `workflow`: published workflows in the
     project that start with "When Executed by Another Workflow"
     (`workflows(action="list", projectId)`); `dataTable`: a table for data
     that must survive a reload (`data-tables(action="list")`, or one you
     will create); `agent`: a published agent (`agents(action="list")`).
     Empty when the data stays in the browser.
   - `theme`: `primary` hex, `mode`, and where the look asks for it `radius`
     (px), `font`, `density` (`compact`|`comfortable`|`spacious`) and `tone`
     (`neutral`|`tinted`). Playful → warm primary, large radius, spacious,
     tinted; minimal → gray or one cool primary, small radius, neutral; bold
     → saturated primary, tinted, dark mode.
   The user can edit the card. `{ approved: true, blueprint }` carries the
   edited copy: build from it, not from your proposal. `{ approved: false,
   feedback }` means revise and call `app-blueprint` again. Never create an
   app without an approved blueprint, and ask nothing more between the
   blueprint and the build.
3. Build it in this order, then stop and point the user at the preview:
   `apps(action="create", name, namespace, theme)` with the blueprint's
   values; `bind` each connection (creating a missing data table first);
   write the pages and routes; write `BLUEPRINT.md` at the app root (name,
   summary, pages, connections, look) so a later conversation can read it.

## The loop

1. Bound app: skip to step 2, and read `BLUEPRINT.md` when it exists — it
   holds the direction the app was built with. Otherwise
   `apps(action="create", name, namespace, theme)` once, from the approved
   blueprint. Pass `projectId` only when the user names a project. The result
   carries `app.id`, `app.namespace`, `workspacePath` and `installed`.
   `{ denied, reason }` with a taken namespace: append a short suffix, tell
   the user, call again. `installed: false` comes with the `npm install` log
   in `warnings`: fix the cause and run `npm install` in `workspacePath`
   yourself. A `Theme not applied` warning means the CSS was not written:
   continue without it or save the theme again from the Theme tab.
2. Bind first. Anything the app reads or writes that must persist or reach
   n8n goes through a bound data table, workflow or agent; bind it before you
   write the code that uses it (see "Connecting n8n workflows, data tables and
   agents").
3. Add the catalog components the page needs in one call,
   `apps(action="add-component", appId, components=["card", "dialog"])`, then
   edit files under `apps/<namespace>/` with `workspace_write_file` and
   `workspace_str_replace_file`. Never start a dev server or run a build to
   check your work. Tell the user what changed in one or two sentences and
   stop; the preview shows it. Never tell the user to publish, open
   `/apps/<namespace>/` or build to see a change. A change request normally
   needs one or two workspace calls and no `apps` call.
4. Preview errors (compile errors, uncaught exceptions) arrive as context on
   the user's next message. Fix them before anything else. `binding_not_found`
   or `invalid_input` from the SDK means the key is not bound or the input does
   not match: call `apps(action="bindings", appId)` and fix the call or
   re-bind. You cannot see the page: do not claim visual results.
5. Publish only when the user asks to publish, deploy, share or go live:
   `apps(action="publish", appId)`. The user confirms in a card first;
   `{ denied, reason: "user_declined" }` means they said no, so stop. Success
   returns `url`: give it to the user. `{ error, stage, message, log }`: read
   `log`, fix the cause, publish again. Never retry without a change. Exit
   code 134 or 137 in a `build` failure means out of memory (512 MiB): drop
   the heavy dependency, do not retry with a bigger heap.

## Rules

- Static export only: no server code, SSR, API routes or server functions.
- Store data in an n8n data table, never in `localStorage` or in-memory
  arrays, when it must survive a reload or be shared between visitors.
- Only bound keys. Never `fetch` `/rest`, `/webhook`, `/api` or
  `/apps/<namespace>/api` by hand; never put a workflow or table id in the
  app.
- Every asset and route URL is relative or built from the base path
  (`import.meta.env.BASE_URL`); do not hardcode `/`.
- Default to the Vue template; its `AI_RULES.md` describes the layout. Use
  another stack only when the user asks; then follow
  `references/frameworks.md`. Publishing runs `npm run build` and serves
  `dist/`; keep type checking out of the build script (512 MiB build sandbox).
- Look: catalog components (`references/design-system.md`) and Tailwind
  utilities that read the theme's CSS variables (`bg-primary`,
  `text-muted-foreground`). No hex colors, inline styles or `dark:` variants.
  For colors, fonts, radius and density point the user at the app's Theme
  tab instead of hardcoding a look; spacing utilities scale with the theme's
  density (`--space-unit`), so never hardcode px paddings. `@ark-ui/vue` directly only for behavior no catalog
  component covers.
- Keep dependencies few. Adding one means you run `npm install` in the app
  directory yourself; publishing installs on its own.
- All apps are public: anyone with the URL opens the app and can use its
  bound workflows, tables and agents, as the app's project with its
  credentials, and answers a bound agent's approval requests. Bind only what
  may be public.
- Never paste file contents into the chat; point at the file path.
- Do not edit `src/n8n-bindings.d.ts` or `vendor/n8n-app-sdk.tgz`; `apps`
  writes them.

## Connecting n8n workflows, data tables and agents

Workflows, data tables and agents go in separate `bind` calls; each asks the
user for approval with its own card. Tell the user what you connect and why. `bind`,
`unbind` and `bindings` rewrite `src/n8n-bindings.d.ts`, so the SDK is typed
for every bound key. Details of the types, warnings and `denied` reasons:
`references/app-sdk.md`.

### Workflows

1. The workflow must be published, in the app's project, and start with
   "When Executed by Another Workflow" (`n8n-nodes-base.executeWorkflowTrigger`).
   `workflows(action="list", projectId)` shows candidates; build one with the
   `workflow-builder` skill when none fits.
2. `apps(action="bind", appId, bindings=[{ key: "submit", kind: "workflow",
   workflowId }])`; the key is a short lowercase slug the code uses.
   `warnings` in the result name untyped input (passthrough trigger) or output
   (no successful run yet: run it once with `executions(action="run")`, then
   `apps(action="bindings", appId)`).
3. In the app:

   ```ts
   import { n8n, N8nAppError } from '@n8n/app-sdk';

   const result = await n8n.workflows.run('submit', { message, count });
   // result.status: 'success' | 'error' | 'waiting' | 'canceled' | 'running'
   // result.output: items of the workflow's last node; result.error when status is 'error'
   ```

   `status: 'running'` means the workflow ran longer than 60 s and continues
   in n8n. Errors throw `N8nAppError` with `code` and a `message` safe to
   show.

### Data tables

1. `data-tables(action="list", projectId)`, or create one:
   `data-tables(action="create", name, projectId, columns=[{ name, type }])`
   with types `string`, `number`, `boolean`, `date`.
2. `apps(action="bind", appId, bindings=[{ key: "tasks", kind: "dataTable",
   dataTableId, permissions: ["read", "write"] }])`. Request `write` only when
   the app inserts, updates or deletes rows.
3. In the app:

   ```ts
   import { n8n } from '@n8n/app-sdk';

   const { data: tasks } = await n8n.tables.tasks.list({ take: 250, sortBy: 'createdAt:desc' });
   const { data: [created] } = await n8n.tables.tasks.insert([{ title, status: 'todo' }]);
   await n8n.tables.tasks.update({ filters: [{ columnName: 'id', value: task.id }] }, { status: 'done' });
   await n8n.tables.tasks.delete({ filters: [{ columnName: 'id', value: task.id }] });
   ```

   `list` returns `{ count, data }`, at most 250 rows per call (`take`, `skip`).
   Rows are `{ id, createdAt, updatedAt, <column>: <type> | null }`.
4. After a column change on a bound table, call `apps(action="bindings",
   appId)` before touching the code that uses it.

### Agents

`agents(action="list")` shows the ids; the agent must be published or `chat`
fails with `agent_not_published`. `apps(action="bind", appId, bindings=[{ key:
"support", kind: "agent", agentId, permissions: ["chat", "history"] }])`, then
`n8n.agents.support.chat(message)` in the app. Visitors are anonymous, get
their own session and answer the agent's approval cards themselves:
`references/app-sdk.md` ("Agents") describes the chat loop, the approval
cards and `messages()` on load.

## Template

`create` copies `${N8N_SKILL_DIR}/templates/vue` (Vite + Vue 3 + TS +
vue-router + Tailwind v4 on CSS-variable theming, `@ark-ui/vue` as a
dependency) and adds `button` and `switch` from the component catalog. Read
the app's `AI_RULES.md` for the file layout and `BLUEPRINT.md` for its
direction. Add a page: create
`src/pages/<Name>.vue`, add a route in `src/router.ts`, link to it with
`<RouterLink to="/name">`. `template: "none"` gives an empty directory for
other stacks.
