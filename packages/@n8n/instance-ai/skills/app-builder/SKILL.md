---
name: app-builder
description: >-
  Load before calling apps. Use when the user asks to build, make, create, or
  change an app, dashboard, form, landing page, website, UI, or frontend that
  people open in a browser — "build me a hello world app", "make a dashboard
  for X", "add a form page", "make the heading red". Covers the whole loop:
  create the app, edit its source files in the workspace, build, open the
  URL, read the build log, fix, build again. Not for n8n workflows, agents,
  or data tables on their own.
recommended_tools:
  - apps
  - workspace_write_file
  - workspace_str_replace_file
  - workspace_read_file
  - workspace_execute_command
  - workspace
---

# App Builder

You build small static web apps that n8n serves at `/apps/<namespace>/`. The
source lives in the sandbox workspace under `apps/<namespace>/`; `apps` has
three actions: `create` registers an app, `build` turns the source into a
published version, `restore` brings the stored source back into a workspace
that does not have it.

## The loop

1. `apps(action="create", projectId, name)` once per app. Pass `namespace`
   only when the user asked for a specific URL slug; otherwise it is derived
   from the name. The result carries `app.id`, `app.namespace` and
   `workspacePath` (the absolute app directory). If the result is
   `{ denied, reason }` the namespace is taken: pick another and call again.
   You need a `projectId`: use the one bound to this conversation, or
   `workspace(action="list-projects")` and ask when there is more than one.
2. Edit files under `workspacePath` with `workspace_write_file` and
   `workspace_str_replace_file`. The template's `AI_RULES.md` describes the
   layout. Do not run `npm run dev`; there is no dev server.
3. `apps(action="build", appId)`. Success returns `url`, `versionId`,
   `namespace`, `projectId`. Give the user the `url`. You cannot see the
   page: after a styling change, grep the built CSS in `dist/assets/` for the
   class you added to confirm it compiled, and do not claim visual results.
4. On `{ error, stage, message, log }` read `log` (last 4 KB of the build
   output), fix the cause, build again. Do not retry the same build without a
   change.
   - `install`: `npm install` failed. Check `package.json` dependency names
     and versions; the sandbox has npm and network access to the registry.
   - `build`: the build command exited non-zero. Missing imports and
     syntax errors show up here. Exit code 134 or 137 means the build ran
     out of memory (the sandbox has 512 MiB): drop the heavy dependency, do
     not retry with a bigger heap.
   - `check`: the output is not a servable static site: `<outDir>/index.html`
     is missing, a `server/` directory exists, or a tarball is over 20 MB.
   - `store`: n8n rejected the upload; `message` says why.
5. Change requests on an existing app: edit, then `build` again. Every build
   is a new version and becomes the live one.

For an already bound app (the conversation names an app id) skip step 1.
Before you edit or build, confirm that `apps/<namespace>/` exists in this
workspace (`workspace_execute_command` with `ls apps/<namespace>`). If it does
not, call `apps(action="restore", appId)`: it unpacks the source of the
latest published version into `apps/<namespace>/` and returns `workspacePath`
and `versionId`. Then continue with step 2. The first build after a restore
installs dependencies again (about 25 s). `{ denied, reason }` means there is
nothing to restore (no version yet) or the directory already has files; read
`reason`.

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
  base-path settings and pass matching `command`/`outDir` to `build`.
- The build runs in 512 MiB of memory. Keep type checking out of the build
  script (`npm run typecheck` is separate; run it before `build` when you
  changed TypeScript). Do not import `@n8n/design-system` components: bundling
  them needs more than 1 GiB and the build dies (see
  `references/design-system.md`).
- Look: Tailwind utilities whose names are the n8n design-system tokens
  (`bg-brand`, `text-text`, `p-md`, `rounded-lg`); the template's
  `src/style.css` sets this up and works in any Vite stack. Tailwind's own
  palette and scales are removed, so read `references/design-system.md` for
  the names before you write classes. No hex colors, no px values, no inline
  styles. Interactive widgets come from `reka-ui`, styled with the same
  utilities. Only build a different look when the user asks for one.
- Keep dependencies few. Adding one means a cold `npm install` on the next
  build, and every dependency costs build memory.
- Never paste file contents into the chat; point at the file path.

## Template

`apps(action="create")` with the default `template: "vue"` copies
`${N8N_SKILL_DIR}/templates/vue` into the app directory: Vite + Vue 3 + TS +
vue-router + Tailwind v4 on the `@n8n/design-system` tokens + reka-ui, with a committed
`package-lock.json` so the first build installs pinned versions. `template: "none"` gives an empty
directory for other stacks; write `package.json` yourself.

Layout after create:

```
apps/<namespace>/
  AI_RULES.md        stack and conventions for this app
  index.html
  package.json       scripts: build = vite build, typecheck = vue-tsc -b
  vite.config.ts     base: process.env.APP_BASE ?? '/'
  src/main.ts        style.css + router
  src/style.css      theme.css + Tailwind + @theme token mapping (the utility names)
  src/router.ts      createWebHistory(import.meta.env.BASE_URL)
  src/App.vue        RouterView shell
  src/pages/Home.vue one component per route
```

Add a page: create `src/pages/<Name>.vue`, add a route in `src/router.ts`,
link to it with `<RouterLink to="/name">`.
