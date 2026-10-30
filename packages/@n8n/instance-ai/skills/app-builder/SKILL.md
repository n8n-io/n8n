---
name: app-builder
description: >-
  Load before calling the apps tool. Use when the user wants to build or change
  an n8n App: a small web app, form, dashboard, tracker or other browser UI that
  n8n hosts. Also load when the conversation lists app targets or a pending app.
recommended_tools:
  - apps
---

# App Builder

An n8n App is a static browser app (Vue 3 and Vite). n8n stores its source,
builds it in a sandbox and hosts the build on the apps domain. The `apps` tool
puts the source of an app into your sandbox workspace and saves it back. You
edit the files with the workspace tools.

## What an app can do today

- Apps run in the browser only. They cannot call n8n workflows, data tables or
  agents yet. Keep data in component state or `localStorage`.
- Use only the dependencies of the scaffold: `vue`, `vite` and
  `@vitejs/plugin-vue`. You cannot change `package.json` or
  `package-lock.json`. Write routing, state and UI components yourself.
- Use relative URLs or `location.origin`. Never hardcode a host: the preview
  and the published app run on different hosts.
- Put styling in the source.

## Scaffold

A new app starts from this source:

- `index.html` loads `/src/main.js`.
- `src/main.js` mounts `src/App.vue` on `#app`.
- `vite.config.js` uses the Vue plugin.
- `package.json` and `package-lock.json` are fixed.

Add components under `src/`. Keep files small and focused.

## Workflow

1. **Propose or open the app.**
   - Before the first `create`, make sure you understand the audience, core data,
     essential actions and required views. If a material choice is unclear, use
     `ask_user` to clarify it. Prefer selectable options with a recommended
     default. Do not ask about minor styling or details with safe defaults.
   - New app: call `apps` with `action: "create"` and a short blueprint. The
     user can review the description and edit the name, namespace, visibility,
     and theme before approval. Approval creates and opens the app. Build from
     the blueprint returned by the tool, not from your proposal. If the user
     cancels, do not create or edit app files.
   - If the conversation lists a pending app, use `create`. n8n reuses the
     pending id after approval.
   - Existing app: use the `appId` from the conversation context. If the
     conversation has no id, call `list` (optionally with a `search` text) and
     pick the app by name. If several apps match, ask the user which one. Then
     call `open`.
   - An approved blueprint and `open` return the app folder, `apps/<appId>`.
     `open` keeps a folder that is already open, with your uncommitted edits.
2. **Apply the selected theme.**
   - For `light`, build only a light theme.
   - For `dark`, build only a dark theme.
   - For `both`, add light and dark styles. Use
     `@media (prefers-color-scheme: dark)` so the app responds to the theme
     switch in the preview and to the browser setting when opened directly.
3. **Edit the folder in batches.** Read with `workspace_read_files` and change
   files with `workspace_edit_files`. Put all the files of one step into one
   call, not one call for each file. Use the single-file tools only for a single
   file. Read only what you need: use `grep` to find text, and read line ranges
   of large files. `workspace_edit_files` runs every operation and reports each
   one, so fix only the operations that failed. Never change `package.json` or
   `package-lock.json`.
4. **Build before you commit.** In the app folder, run `npm ci` once, then
   `npm run build`. Fix every error and build again until the build passes.
   Use `npm ci`, not `npm install`: `npm install` can change
   `package-lock.json`, and n8n then rejects the commit.
5. **Commit once for each finished change.** A commit saves the folder (without
   `node_modules` and `dist`) as one version, and n8n builds it again. Never
   commit half-done work: every commit is a version.
6. **Check the build.** A commit returns `buildStatus`. On `failed`, read
   `diagnostics` (stage, message, log), fix the source and commit again. After
   three failed builds in a row, stop and explain the problem to the user.

If a commit reports that the app draft changed, someone else saved a newer
version. Your folder is kept. Note your changes, call `discard` to load the
newer draft, and apply your changes again. `discard` keeps `node_modules`, so
you do not need to run `npm ci` again.

## Several apps

One conversation can build several apps for one requirement, for example a
public dashboard and an admin app. Create one app for each audience or access
level. Each app has its own folder. Commit each app separately and always pass
the right `appId`.

## Publishing and access

You cannot publish apps. Tell the user to publish with the Publish button of
the app. A new app is visible to the members of its project. The user can
change this in the app settings.
