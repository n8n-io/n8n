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
builds it in a sandbox and hosts the compiled files. The `apps` tool
puts the source of an app into your sandbox workspace and saves it back. You
edit the files with the workspace tools.

## What an app can do today

- Apps run in the browser only. They cannot call n8n workflows, data tables or
  agents yet. Keep data in component state or `localStorage`.
- Use only the dependencies of the scaffold: `vue`, `vite` and
  `@vitejs/plugin-vue`. You cannot change `package.json` or
  `package-lock.json`. Write routing, state and UI components yourself.
- Use app-relative URLs for internal links and assets. Never hardcode a host
  or an app path prefix. Follow the URL and routing rules below.
- Do not add page or theme configuration. Put styling in the source.

## URLs and routing

Apps can run at a domain root or under a path prefix. Preview and published
apps can have different hosts or path prefixes. Read the app root at runtime:

```js
const appRoot = new URL(document.querySelector('base')?.href ?? '/', location.href);
```

- Use `new URL('history', appRoot)` for an internal URL. A leading `/`, such as
  `/history`, points to the domain root. `location.origin` omits the app prefix.
- For path-based routing, remove `appRoot.pathname` before matching a route.
  Include the app root when you call `history.pushState` or `history.replaceState`.
  Handle `popstate` so the browser Back and Forward buttons update the view.
- Do not derive the app root from the current route. A direct visit to a nested
  page must use the same root as a visit to the home page.
- Keep the supplied base element. Do not hardcode a separate base for previews.
  Use only the scaffold dependencies for routing.

## Scaffold

A new app starts from this source:

- `index.html` loads `/src/main.js`.
- `src/main.js` mounts `src/App.vue` on `#app`.
- `vite.config.js` uses the Vue plugin.
- `package.json` and `package-lock.json` are fixed.

Add components under `src/`. Keep files small and focused.

## Workflow

1. **Create or open the app.**
   - New app: call `create` with a name and a namespace. Use lowercase letters,
     digits and single hyphens for the namespace. Derive it from the name. The
     namespace is the subdomain label when n8n uses subdomain hosting.
   - If the conversation lists a pending app, create it with `create`. n8n
     reuses the pending id.
   - Existing app: use the `appId` from the conversation context. If the
     conversation has no id, call `list` (optionally with a `search` text) and
     pick the app by name. If several apps match, ask the user which one. Then
     call `open`.
   - `create` and `open` return the app folder, `apps/<appId>`. `open` keeps a
     folder that is already open, with your uncommitted edits.
2. **Edit the folder in batches.** Read with `workspace_read_files` and change
   files with `workspace_edit_files`. Put all the files of one step into one
   call, not one call for each file. Use the single-file tools only for a single
   file. Read only what you need: use `grep` to find text, and read line ranges
   of large files. `workspace_edit_files` runs every operation and reports each
   one, so fix only the operations that failed. Never change `package.json` or
   `package-lock.json`.
3. **Build before you commit.** In the app folder, run `npm ci` once, then
   `npm run build`. Fix every error and build again until the build passes.
   Use `npm ci`, not `npm install`: `npm install` can change
   `package-lock.json`, and n8n then rejects the commit.
4. **Commit once for each finished change.** A commit saves the folder (without
   `node_modules` and `dist`) as one version, and n8n builds it again. Never
   commit half-done work: every commit is a version.
5. **Check the build.** A commit returns `buildStatus`. On `failed`, read
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
