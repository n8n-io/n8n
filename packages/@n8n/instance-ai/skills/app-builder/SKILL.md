---
name: app-builder
description: >-
  SPIKE (hackweek/n8nable-app-spike). Load before calling the `apps` tool, and
  whenever the user asks to build an app, a mini web app, a form/dashboard
  with a UI, or similar — as opposed to a workflow with no UI. Writes a real
  React app into the sandbox workspace, builds it, and publishes it as a
  static site served under /apps/:namespace.
recommended_tools:
  - apps
  - workspace_write_file
  - workspace_execute_command
platforms:
  - daytona
  - n8n-sandbox
---

# App Builder (spike)

This is a hackweek spike skill. It proves the core loop — write real files,
build them in the sandbox, publish and serve the result, calling back into a
real n8n workflow for data — using a deliberately minimal stack. It is not
production-ready: no auth modes, no bindings allow-list enforcement, no
shadcn/ui or theme wiring yet. See the plan/architecture docs for the full
design; this skill only covers what the spike actually builds.

## Routing

Load this skill instead of `workflow-builder` when the user's request is for
something with a visible page/UI a person will open in a browser — a
dashboard, a form, a small internal tool — not a headless automation.

## Default Procedure

1. Call `apps(action="create", name="...")` once, at the start. It returns an
   `appId` and `namespace` — the app will be servable at `/apps/:namespace/`
   once published.
2. Scaffold a minimal Vite + React app in the workspace under `app/` using
   `workspace_write_file`, at minimum:
   - `app/package.json` — `{ "type": "module", "scripts": { "build": "vite build" }, "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" }, "devDependencies": { "@vitejs/plugin-react": "^4.3.1", "vite": "^5.4.0" } }`
   - `app/vite.config.js` — `defineConfig({ plugins: [react()], base: './' })`
   - `app/index.html` — a shell with `<div id="root"></div>` and a module
     script tag pointing at `/src/main.jsx`
   - `app/src/main.jsx` — mounts `<App />` into `#root`
   - `app/src/App.jsx` — the actual UI
3. If the app needs data from a workflow: for this spike, call the workflow's
   webhook URL directly with `fetch()` from a `useEffect` in the component
   that needs it (this stands in for `@n8n/app-sdk`'s `runWorkflow()` — the
   spike has no bindings allow-list yet, so any reachable webhook works, but
   only use a workflow the user actually pointed you at).
4. Run `workspace_execute_command("npm install")` then
   `workspace_execute_command("npm run build")` in `app/`. Read the output —
   a failed build means broken generated code; fix it and rebuild, don't
   publish a broken build.
5. Call `apps(action="publish", appId, distPath="app/dist")`. It returns the
   app's URL.
6. Tell the user the app is live at that URL. Do not claim it works without
   having seen a successful build in step 4.

## Editing After the First Build

Per this feature's own research (select-to-prompt over full visual editing
for a first iteration): a follow-up request just re-runs steps 2-5 for the
changed files — edit with `workspace_write_file`/`workspace_str_replace_file`,
rebuild, republish. There is no live-reload in this spike (see the
architecture doc's "reality check" on why) — every change is a rebuild.

## What This Spike Deliberately Skips

- No shadcn/ui, no theme-driven CSS variables — plain HTML/CSS is fine.
- No bindings allow-list — don't build this as if arbitrary workflow access
  is a real security boundary yet; it is not enforced in the spike.
- No auth modes — published apps are served unauthenticated.
- No AppVersion/rollback — publishing overwrites the previous build.

Do not present the spike's shortcuts as production behavior to the user.
