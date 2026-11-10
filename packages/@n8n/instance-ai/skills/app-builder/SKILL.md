---
name: app-builder
description: >-
  Load before calling the apps tool. Use when the user wants to build or change
  an n8n App: a small web app, form, dashboard, tracker or other browser UI that
  n8n hosts. Also load when the conversation lists app targets or a pending app.
recommended_tool_groups:
  - tools
---

# App Builder

An n8n App is a static browser app (Vue 3 and Vite). n8n stores its source,
builds it in a sandbox and hosts the build on the apps domain. The `apps` tool
puts the source of an app into your sandbox workspace and saves it back. You
edit the files with the workspace tools.

## What an app can do today

- Apps run in the browser. They reach n8n only through their bindings (see
  [Call n8n](#call-n8n)). Without a binding, keep data in component state or
  `localStorage`.
- Use only the dependencies of the scaffold: `vue`, `vite` and
  `@vitejs/plugin-vue`, plus `@n8n/app-sdk`, which n8n supplies. You cannot
  change `package.json` or `package-lock.json`, so do not add `@n8n/app-sdk`
  to them. Write routing, state and UI components yourself.
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
   - Before the first `create`, make sure you understand what the user wants to
     achieve, who will use the app, its core data, its essential actions, and its
     required views. Do not propose a blueprint while a material part of the
     request is unclear. Use `ask_user` to clarify it. Prefer selectable options
     with a recommended default. Do not ask about minor styling or details with
     safe defaults.
   - New app: call `apps` with `action: "create"` and a short blueprint. The
     user can review the description and edit the name, namespace, visibility,
     and theme before approval. Include a high-level binding plan for the
     workflows, data tables, and agents the app is likely to need. Do not delay
     the blueprint to design every resource or find every resource id. Mark a
     resource as `existing` and include its id only when you already know it.
     Otherwise, mark it as `new`. Do not create or change a resource before the
     user approves the blueprint. Approval creates the app. Build from the
     blueprint returned by the tool, not from your proposal. Then call `apps`
     with `action: "open"` and the returned `app.id` before you edit files. After
     the app is open, inspect the available resources, refine the implementation
     details, create what is missing, and add the bindings the app needs. If the
     user cancels, do not create, open, or edit app files.
   - If the conversation lists a pending app, use `create`. n8n reuses the
     pending id after approval.
   - Existing app: use the `appId` from the conversation context. If the
     conversation has no id, call `list` (optionally with a `search` text) and
     pick the app by name. If several apps match, ask the user which one. Then
     call `open`.
   - `open` returns the app folder, `apps/<appId>`. It keeps a folder that is
     already open, with your uncommitted edits.
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

## Call n8n

A binding gives the app access to one workflow, data table or agent of its
project under a key. The app uses the key, never a resource ID.

1. Call `bindings` with the `appId`. The result lists each binding with its
   `key`, `kind`, resource name and permissions, and `types` describes the
   input, output and row shapes. Use only keys from this list in the source.
2. If the app needs a resource without a binding, add one with `bind`:
   - `{ key, kind: 'dataTable', dataTableId, permissions }` with permissions
     from `read`, `insert`, `update` and `delete`.
   - `{ key, kind: 'workflow', workflowId }`.
   - `{ key, kind: 'agent', agentId, permissions }` with permissions from
     `chat` and `history`.

   Find the ID with the data table, workflow or agent tools. The resource must
   be in the project of the app. The key is a short camelCase name, for
   example `tasks`. `bind` with an existing key replaces that binding.
3. Remove a binding that the app no longer uses with `unbind` and its `key`.
4. Grant only the permissions that the app uses. Every visitor who can open
   the app can use its bindings. On an `instance` app, this is every user of
   the instance. Ask the user before you give an `instance` app write access, a
   workflow or agent chat.
5. Read `warnings` in each result. A missing resource or an unpublished
   workflow or agent gives the app an error. Tell the user about it.

Each binding change saves a new version of the app, like a commit. You can
change bindings before the first commit and while the app folder is open. A
binding change keeps an open folder on the current draft, so you do not need
to `discard`. If a commit reports that the app draft changed, use `discard` as
described in [Workflow](#workflow). The live app gets the new bindings when the
user publishes.

Import the client from `@n8n/app-sdk`. It calls the API of the app origin, so
it works on the preview and on the published app:

```js
import { n8n, N8nAppError } from '@n8n/app-sdk';

// Workflow: `output` holds the items of the node that ran last.
const run = await n8n.workflows.submit.run({ email });
if (run.status !== 'success') throw new Error(run.error ?? run.status);

// Data table: each call needs the matching permission. Without `read`,
// `update` and `delete` return only the `id` of each row.
const { data, count } = await n8n.tables.tasks.list({ sortBy: 'createdAt:desc', take: 50 });
await n8n.tables.tasks.insert([{ title: 'New task' }]);
await n8n.tables.tasks.update({ filters: [{ columnName: 'id', value: 1 }] }, { done: true });

// Agent: `text()` reads the whole reply. Iterate the chat to stream events.
const reply = await n8n.agents.support.chat(message).text();

// Visitor: the signed-in n8n user.
const { user } = await n8n.me();
```

Every call throws `N8nAppError` with `status`, `code` and `message` on failure.
Show the user a short error message, and a loading state while a call runs.

## Several apps

One conversation can build several apps for one requirement, for example a
dashboard for all users and an admin app for the project. Create one app for
each audience or access level. Each app has its own folder. Commit each app separately and always pass
the right `appId`.

## Publishing and access

You cannot publish apps. Tell the user to publish with the Publish button of
the app. The app uses the visibility that the user approved in the blueprint.
The user can change it in the app settings.
