# Persistent state for v0-generated frontends

## Summary

The PoC treats every generated frontend as stateless: each load is a fresh page,
nothing survives a refresh. Real frontends usually need to keep something
around — auth tokens, user identity, form drafts, undo history, theme. For the
spike this is fine; for productionisation we need a story for both
browser-local state and server-side state. Browser storage is free out of the
box. Server-side state should ride on n8n itself, ideally via a workflow
webhook before we commit to a typed first-class store.

## Browser storage today

The generated FE runs in an iframe served from `*.vusercontent.net`, so it
inherits all standard browser storage APIs scoped to that origin: `localStorage`
(~5 MB), `sessionStorage`, `IndexedDB`, and cookies. For a PoC this is "free" —
nothing to build. Caveats worth naming:

- Storage is scoped per origin, so each chat's preview URL keeps its own
  silo. Two demo URLs from the same workflow do not share state.
- Anything in browser storage is wiped if the user clears site data or opens
  the iframe in a different browser/device.
- `localStorage` is synchronous and capped; `IndexedDB` is the right tool for
  anything bigger or structured.

For most "remember my last input" or "keep me signed in on this device" needs,
this is enough.

## Server-side options for productionisation

For state that needs to outlive the browser — multi-device usage, admin
inspection, audit trails — three shapes:

- **(a) Workflow webhook as the storage backend.** The generated FE hits a
  separate "save state" webhook on the same workflow (or a sibling one); n8n
  persists into workflow data, a Data Table, or external services (KV, S3,
  databases) via existing nodes. v0 already wires `fetch` calls based on the
  prompt, so a single sentence ("persist user data to this URL") is likely
  sufficient. Composes naturally with how n8n already works.
- **(b) First-class FE state backend in the `frontend-builder` module.** A
  dedicated endpoint per generated FE
  (`POST/GET /rest/workflows/:id/frontend/state`), backed by a small table or
  a JSON column on the workflow. Bigger commitment, zero setup for users.
- **(c) Vercel-attached storage** (KV / Postgres add-ons). Lowest effort
  inside v0, but couples us tightly to the Vercel ecosystem and complicates
  ejection.

## Auth state crossover

Auth tokens are the most common persistent need; see
[auth.md](./auth.md). If we adopt the "session-forward from the n8n editor"
model, the iframe receives a token via `postMessage` and stashing it in
`sessionStorage` is enough — no server-side state required for the spike.

## Recommendation

For the spike: say nothing, the FE stays stateless. For productionisation:
start with **(a) workflow-as-backend**; it composes with n8n and needs no new
schema. Promote to **(b)** only once concrete patterns justify a typed,
first-class store. Skip **(c)** unless we deliberately want Vercel lock-in.
