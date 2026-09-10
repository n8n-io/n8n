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
  - workflows
  - workspace_write_file
  - workspace_str_replace_file
  - workspace_read_file
  - workspace_execute_command
  - workspace
---

# App Builder

You build small static web apps that n8n serves at `/apps/<namespace>/`. The
source lives in the sandbox workspace under `apps/<namespace>/`; `apps` has
these actions: `create` registers an app and installs its dependencies,
`publish` builds the current source into the served version after the user
confirms, `restore` brings the stored source back into a workspace that does
not have it, `add-component` copies a component from this skill's own catalog
(built on `@ark-ui/vue`) into an app — `create` uses it for the two the
starter page needs, and every other component goes through it too — and
`bind`/`unbind`/`bindings` manage the n8n workflows the app may call (see
"Calling n8n workflows").

The user sees a live preview of the source in the workspace. n8n runs a dev
server for it: every file you write appears in the preview by itself (hot
module reload), without a build. The preview is the source of truth while you
work; publishing only changes what `/apps/<namespace>/` serves. The user can
also publish with the Publish button above the preview, without you.

## The loop

1. `apps(action="create", name)` once per app. Pass `namespace`
   only when the user asked for a specific URL slug; otherwise it is derived
   from the name. The result carries `app.id`, `app.namespace`,
   `workspacePath` (the absolute app directory) and `installed`. If the
   result is `{ denied, reason }` the namespace is taken: pick another and
   call again. `installed: false` comes with a `warnings` entry that holds the
   `npm install` log; fix the cause, then run `npm install` in the app
   directory with `workspace_execute_command`.
   Pass `projectId` only when the user names a project; otherwise the app
   lands in the project bound to this conversation, else the personal one.
2. Edit files under `workspacePath` with `workspace_write_file` and
   `workspace_str_replace_file`. The template's `AI_RULES.md` describes the
   layout. Do not start a dev server and do not run a build to check your
   work: the live preview updates on its own. Never run a build to check your
   work. Tell the user what changed and stop; the preview shows it.
3. Preview errors (compile errors, uncaught exceptions) arrive as context on
   the user's next message. Fix them before anything else. A
   `binding_not_found` or `invalid_input` error from `n8n.workflows.run`
   means the key is not bound or the input does not match the workflow's
   fields: read the `bind` result or call `apps(action="bindings", appId)`,
   then fix the call or re-bind. You cannot see the page: do not claim visual
   results.
4. Publish only when the user asks to publish, deploy, share or go live:
   `apps(action="publish", appId)`. The user sees a confirmation card first
   ("Publish <name> to /apps/<namespace>/") and can approve, decline, or
   approve for the rest of the conversation. `{ denied, reason:
   "user_declined" }` means they declined: stop, do not call it again unasked.
   On approval n8n snapshots your current edits, runs `npm run build` in its
   own build sandbox and packages `dist/`. Success returns `url`, `versionId`,
   `namespace`, `projectId`; it stores a version and updates
   `/apps/<namespace>/`. Give the user the `url`.
5. On `{ error, stage, message, log }` read `log` (last 4 KB of the build
   output), fix the cause, publish again. Do not retry the same publish
   without a change.
   - `snapshot` or `restore`: n8n could not capture or unpack your source;
     `message` says why. Usually transient: try once more.
   - `install`: `npm install` failed. Check `package.json` dependency names
     and versions; the sandbox has npm and network access to the registry.
   - `build`: `npm run build` exited non-zero. Missing imports and
     syntax errors show up here. Exit code 134 or 137 means the build ran
     out of memory (the sandbox has 512 MiB): drop the heavy dependency, do
     not retry with a bigger heap.
   - `check`: the output is not a servable static site: `dist/index.html`
     is missing, a `server/` directory exists, or a tarball is over 20 MB.
   - `store`: n8n rejected the upload; `message` says why.

For an already bound app (the conversation names an app id) skip step 1.
Before you edit, confirm that `apps/<namespace>/` exists in this workspace
(`workspace_execute_command` with `ls apps/<namespace>`). If it exists, just
edit: n8n restored it when the user opened the preview, and its `npm install`
may still be running. Call `apps(action="restore", appId)` only when it is
missing: it unpacks the newest stored source into `apps/<namespace>/` (with the
SDK the app was created with), refreshes `src/n8n-bindings.d.ts` from the
current bindings, installs the dependencies and returns `workspacePath`,
`versionId` and `installed`. A directory that holds only that generated file
(from a `bind` before the restore) counts as empty. n8n stores a snapshot of
the source after every turn, so this is your latest work, not only the last
published build. Then continue with step 2. `{ denied, reason }` means there
is nothing to restore (no source stored yet) or the directory already has
files; read `reason`.

## Rules

- Static export only. No server code, no SSR, no API routes, no server
  functions. Everything runs in the browser.
- Never call `/rest` or other n8n internal endpoints from the app.
- The app is served under a base path. Every asset and route URL is relative
  or built from the base: `APP_BASE` is set during the build (with a trailing
  slash), the Vue template reads it in `vite.config.ts` and the router uses
  `createWebHistory(import.meta.env.BASE_URL)`. Do not hardcode `/`.
- Default to the Vue template. Use another stack only when the user asks for
  it; then follow `references/frameworks.md` for the static-export and
  base-path settings. Publishing always runs `npm run build` and serves
  `dist/`, so the `build` script must write the static site there.
- The build sandbox has 512 MiB of memory. Keep type checking out of the
  build script.
- Look: build UI from this skill's own catalog components (`Button`, `Input`,
  `Card`, `Dialog`, `Select`, `Tabs`, `Badge`, `Switch`, `Checkbox`, `Tooltip`,
  `DropdownMenu` — see `references/design-system.md` for the full catalog and
  import paths) and Tailwind utilities that read the theme's CSS variables
  (`bg-primary`, `text-muted-foreground`, `rounded-lg`). Only `button` and
  `switch` exist from `create`: call `apps(action: "add-component", appId,
  component: "<name>")` for any other one before importing it, rather than
  hand-writing it.
  No hex colors, no inline styles, no `dark:` variants. Interactive behavior a
  catalog component doesn't cover comes from `@ark-ui/vue` directly (already a
  project dependency — see `references/design-system.md` for components
  outside the curated catalog), styled with the same utilities. Only build a
  different look when the user asks for one — and point them at the app's
  Theme tab for color/font/radius changes instead of hardcoding a look.
- Keep dependencies few. Adding one means you must run `npm install` in the
  app directory yourself (the dev server does not; publishing installs on its
  own), and every dependency costs build memory.
- Never paste file contents into the chat; point at the file path.

## Calling n8n workflows

An app calls an n8n workflow only through `@n8n/app-sdk` and only by a key you
bound first. Bind before you write the code that calls it.

1. Find the workflow. It must be published and start with the trigger "When
   Executed by Another Workflow" (`n8n-nodes-base.executeWorkflowTrigger`) in
   the app's project. `workflows(action="list", projectId)` shows candidates.
   If the user has no such workflow, build one with the `workflows` tool and
   the `workflow-builder` skill, publish it, then continue here.
2. `apps(action="bind", appId, bindings=[{ key: "submit", kind: "workflow",
   workflowId }])`. Choose the key: a short lowercase slug the app uses in
   code (`^[a-z][a-z0-9-]{0,63}$`). Bind asks the user for approval first: it
   exposes the workflow to everyone who can open the app. Tell the user which
   workflow you are about to connect and why; `{ denied, reason: "User denied
   the action" }` means they said no, so do not retry without asking. The
   result lists every binding with its `input` and `output` as JSON Schema
   (draft-07; a passthrough input is `{ type: "object", additionalProperties:
   true }`, an untyped output has items `{ type: "object",
   additionalProperties: true }`), its `outputSource` and `published`,
   plus `warnings` (for example an unpublished workflow: binding works, calls
   fail with `workflow_not_published` until it is published; or a passthrough
   trigger: the input is untyped and unchecked, see below). It also
   rewrites `src/n8n-bindings.d.ts`, so `n8n.workflows.run` is typed for that
   key. The input types come from the published version, the one the runtime runs;
   only an unpublished workflow is typed from its draft (a warning says so).
   After the user publishes a changed trigger, re-bind to refresh the types.
   The output type comes from the latest successful execution of the workflow.
   If `outputSource.kind` is `"unknown"` (the warning says "is untyped"), run
   the workflow once with sample input (`executions(action="run", workflowId,
   inputData)`), then call
   `apps(action="bindings", appId)` to regenerate the typed output. The shape
   reflects that one run: a key another run adds is missing from the type, so
   re-run `bindings` after changing the workflow. `{ denied, reason }` means the workflow is in another project, lacks
   the trigger, or the key is invalid: read `reason`. Every write re-checks
   all bindings, so a `reason` that names another key means that binding's
   workflow was deleted or broken: `unbind` that key first.
3. Call it from the app:

   ```ts
   import { n8n, N8nAppError } from '@n8n/app-sdk';

   try {
     const result = await n8n.workflows.run('submit', { message, count });
     // result.status: 'success' | 'error' | 'waiting' | 'canceled' | 'running'
     // result.output: the items of the workflow's last node (json[]).
     //   "Respond to Webhook" is not supported in a bound workflow; end it with
     //   the node whose items the app needs
     // result.error: when status is 'error'. Generic ("The workflow failed.") unless
     //   the workflow failed in a "Stop and Error" node: then it is that node's message
   } catch (error) {
     if (error instanceof N8nAppError) {
       // error.code, e.g. 'workflow_not_published', 'invalid_input'
       // error.message is safe to show
     }
   }
   ```

   Show `status` and `output` (or `error`) to the user. `status: 'running'`
   means the workflow ran longer than 60 s and continues in n8n; tell the user
   it is still running. See `references/app-sdk.md` for the full API and the
   error codes.
4. `apps(action="unbind", appId, key)` removes a binding;
   `apps(action="bindings", appId)` lists them. Both keep
   `src/n8n-bindings.d.ts` current.

Rules:

- Only bound keys. Never `fetch` `/rest`, `/webhook`, `/api`, or
  `/apps/<namespace>/api` by hand; never put a workflow id in the app.
- `src/n8n-bindings.d.ts` and `vendor/n8n-app-sdk.tgz` are generated by
  `apps`. Do not edit them; re-run `bind` to change the types.
- The workflow runs as the app's project, with the project's credentials.
  All apps are public: a bound workflow is callable by anyone with the app
  URL. Do not bind a workflow the user would not expose.
- A passthrough trigger (no declared fields) accepts any input: the app
  cannot type-check it and the server does not validate it. Prefer triggers
  with declared fields; the `bind` result warns about each passthrough one.

## Who may open the app

All apps are public: anyone with the URL opens the app and can run its bound
workflows; `result.principal` is `null`. The runtime API is callable from the
app's own page only (CORS; another site's page gets `403 forbidden_origin`).
Like a public webhook, anyone who can reach the instance can call a bound
workflow, so bind only workflows that may be public.

## Migrating an HTML webhook workflow

Some workflows already act as a crude web app: a Webhook trigger feeds a
Respond to Webhook node that returns raw HTML. When the user asks to replace
one of these with a proper app, treat it as a migration, not a fresh build:

- Read the workflow (`workflows(action="get-json", workflowId)`) and mimic
  its existing HTML as closely as you reasonably can — same layout, copy and
  fields — rather than redesigning it. Still follow this skill's normal
  defaults while you do: reach for a catalog component (`Button`, `Card`,
  `Input`, …) for anything the catalog already covers, and factor markup
  you'd otherwise repeat (a repeated card, a repeated row) into your own
  component instead of copy-pasting it.
- Carry the HTML's color palette into the app's theme instead of hardcoding
  it in component markup: map its accent color onto `--primary` (and
  `--primary-foreground` for contrast) and any secondary/muted tones onto
  `--secondary`, `--muted`, `--accent`, etc. in `theme-overrides.css`'s
  `:root` block — see `references/design-system.md` for the full variable
  list. This keeps the retained palette adjustable from the app's Theme tab
  like everything else, instead of baked into the page.
- The app should call the workflow for its data through a binding (see
  "Calling n8n workflows" above) instead of rendering the HTML it used to
  return. The workflow itself usually needs to change to support that: swap
  its Webhook trigger for "Execute Workflow Trigger"
  (`n8n-nodes-base.executeWorkflowTrigger`) — a bound workflow can't use
  Webhook or Respond to Webhook — and end it with whichever node produces
  the data the app needs. Editing this in the workspace only changes the
  workflow's draft. Never publish it on your own initiative, not even to
  "finish the migration": `bind` requires the workflow already published, so
  publish it (`workflows(action="publish", workflowId)`) only when the user
  asks to publish, deploy, share or go live — the same gate as publishing
  the app itself (step 4 above) — then bind (`apps(action="bind", ...)`)
  and call it with `n8n.workflows.run()`, never by fetching the old webhook
  URL.

## Template

`apps(action="create")` with the default `template: "vue"` copies
`${N8N_SKILL_DIR}/templates/vue` into the app directory (Vite + Vue 3 + TS +
vue-router + Tailwind v4 on CSS-variable theming, with `@ark-ui/vue` already a
dependency), then adds `button` and `switch` from this skill's own component
catalog — the two Home.vue's own demo uses — so a fresh app is never one
hand-edit away from broken imports. Every other component gets added the same
way, on demand, as you need it (see `references/design-system.md`), keeping
the committed `package-lock.json` closer to what an app actually uses.
`template: "none"` gives an empty directory for other stacks; write
`package.json` yourself.

Layout after create:

```
apps/<namespace>/
  AI_RULES.md              stack and conventions for this app
  index.html
  package.json             scripts: build = vite build, typecheck = vue-tsc -b
  vite.config.ts           base: process.env.APP_BASE ?? '/'
  vendor/n8n-app-sdk.tgz   @n8n/app-sdk, written by create (do not edit)
  src/main.ts              style.css + theme-overrides.css + theme mode + router
  src/style.css            Tailwind + the theme's :root/.dark CSS variables
  src/theme-overrides.css  any CSS variable override; edit freely, see design-system.md
  src/theme-mode.ts        light/dark/system; a Theme-tab save always overwrites this one
  src/router.ts            createWebHistory(import.meta.env.BASE_URL)
  src/App.vue              RouterView shell
  src/pages/Home.vue       one component per route
  src/n8n-bindings.d.ts    types for n8n.workflows.run, written by bind (do not edit)
  src/components/ui/       catalog components (button, switch from create; more via add-component)
  src/lib/utils.ts         cn() helper every component imports
```

Add a page: create `src/pages/<Name>.vue`, add a route in `src/router.ts`,
link to it with `<RouterLink to="/name">`.
