# v0 Integration PoC: Vercel Project Linking and Custom Domains

## Summary

The v0 SDK exposes no custom-domain primitives — hosting is left to Vercel.
A v0 project can be *linked* to a Vercel project via `vercelProjectId`;
domain management then happens through Vercel's own APIs. For the PoC, ship
the preview path (`*.vusercontent.net`) first and treat custom domains and
BYO-Vercel as follow-ups.

## SDK surface

From `node_modules/v0-sdk/dist/index.d.ts`:

- `v0.projects` — CRUD over v0 projects. `ProjectsCreateRequest` (line 799)
  accepts optional `vercelProjectId`; `ProjectDetail` (line 354) exposes the
  same field plus v0's own `apiUrl`/`webUrl` (not the deployed app).
- `v0.deployments.create({ projectId, chatId, versionId })` (line 733)
  returns `DeploymentDetail { inspectorUrl, apiUrl, webUrl }` — no
  `domains` field.
- `v0.integrations.vercel.projects` (line 1241) — `find()` lists Vercel
  projects connected to the caller's v0 account; `create({ projectId, name
  })` provisions a Vercel project against the linked account and returns
  `VercelProjectDetail { id, name }`.

## Custom domains

No SDK method accepts a domain or alias. A chat's `demoUrl` is a v0 preview
host, not user-mappable. Once a v0 project is linked to a Vercel project,
**domains must be configured via the Vercel REST API or dashboard**
(`/v9/projects/{id}/domains`). Open question: whether
`DeploymentDetail.webUrl` is a stable production alias or per-deployment —
this decides whether one domain config survives re-prompts.

## User-owned projects

`integrations.vercel.projects.create` implies v0 already has a Vercel access
token on file. This is the standard Vercel OAuth flow: user clicks "Connect
Vercel" in n8n, browser redirects to `vercel.com/integrations/...`, Vercel
returns a token to a callback, n8n stores it. The v0 SDK only sees a
`vercelProjectId`; auth lives one layer down.

## Productionisation options

- **(a) n8n-hosted on its own Vercel.** Single n8n-owned account. Calls:
  `chats.create` -> `projects.create({ vercelProjectId })` ->
  `deployments.create`. Customer setup: zero. Trade-off: n8n eats hosting
  cost and abuse surface; custom domains need n8n DNS infra.
- **(b) BYO Vercel.** Customer connects via OAuth. Calls:
  `integrations.vercel.projects.create` (or `find` existing) ->
  `projects.create({ vercelProjectId })` -> `deployments.create`. Setup: one
  OAuth click + a Vercel account. Trade-off: domains, SSL, billing live with
  the customer; n8n stays out of the hosting business.
- **(c) Eject and self-host.** See `ejectability.md`.

## Recommendation

Ship (a) for the PoC — `*.vusercontent.net` is fine for evaluation. First
productionisation step: add (b), a "Connect Vercel" button that calls
`integrations.vercel.projects.create` and lets customers manage domains
themselves. Defer n8n-managed custom domains until there is real demand —
that path needs DNS infrastructure n8n does not currently run.
