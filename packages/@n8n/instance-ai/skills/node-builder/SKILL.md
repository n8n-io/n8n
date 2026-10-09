---
name: node-builder
description: >-
  Load before you write a custom node: new actions for a service or an API
  operation that no installed node or action covers. Covers the node project
  in the sandbox and the custom-nodes tool (scaffold, pack, test, publish).
  Do not load it for a plain REST call: use the HTTP Request node.
recommended_tools:
  - custom-nodes
  - credentials
  - nodes
---

# Node Builder

A custom node is a TypeScript project with `@n8n/node-sdk`. It has one or
more actions. You write it in the sandbox. n8n runs a published action only
in its WebAssembly sandbox.

## When to build a node

1. Search first with `nodes(action="search")`. Use a node or action that it
   finds.
2. For a plain REST call, use the HTTP Request node. The user can save that
   request as a custom action in the editor.
3. Build a node only when no node covers the operation and the user wants a
   reusable action, or the call needs code (e.g. signing, dependent calls,
   special pages). Tell the user what you will build before you start.

## Process

1. `custom-nodes(action="scaffold", slug)` makes the project in
   `nodes/<slug>`. Use the service name in lower case as the slug, e.g. `acme`.
2. Read `nodes/<slug>/AGENTS.md` once. It is the full API reference. Do not
   read the SDK source.
3. Write the files with the workspace file tools. Replace the example action.
4. `custom-nodes(action="pack", slug)` runs `check` and packs each action.
   Fix each error and pack again.
5. `custom-nodes(action="test", slug, actionId, params, credentialId)` runs
   one action against the live API. Use a real credential of the user: find
   it with `credentials(action="list")`. If there is none, ask the user to add
   one. Fix the code until the test gives the expected items.
6. `custom-nodes(action="publish", slug, actionId, summary)` publishes the
   tested code as a private version. The tool asks the user for approval: do
   not ask in chat first. Publish refuses code that changed after its last
   test: test it again.
7. Load `workflow-builder` and use the action in a workflow. Its module is
   `@n8n/nodes/<nodeId>`, e.g. `@n8n/nodes/acme`.

## Project rules

- `src/index.ts` exports `node` and `actions` (an array). Add each new action
  to `actions`.
- Put each credential type in `src/credentials.ts`. That module exports only
  credential types. Pack rejects a credential type in another file.
- Do not install packages. Do not run `npm install` or `pnpm install` in
  `nodes/<slug>`: imports resolve from the workspace. Import only
  `@n8n/node-sdk` and its subpaths.
- The action runs with web APIs only. Do not use Node.js modules or globals
  (`Buffer`, `process`, `require`), timers (`setTimeout`, `setInterval`),
  `fetch`, `Intl`, or `\p{…}` in a regular expression. Send each request with
  `http.request`. n8n does the retries.

## Versions

The first publish is `1.0.0`. When publish names a needed bump, set
`version` on the changed action in its source, e.g. `version: '1.1.0'`.
Then test and publish again.

Keep old input valid. A change that breaks old input needs a new action id,
e.g. a removed or renamed input field, a new required field, or a changed
field type. A new major needs migration fixtures, and this tool cannot send
them.
