# v0 Integration PoC — Report

**Owner:** Danny Martini
**Period:** 2026-04-22 → 2026-04-28
**Spec:** [`docs/superpowers/specs/2026-04-22-v0-integration-poc-design.md`](../../specs/2026-04-22-v0-integration-poc-design.md)
**Plan:** [`docs/superpowers/plans/2026-04-22-v0-integration-poc.md`](../../plans/2026-04-22-v0-integration-poc.md)
**Branch:** `fe-builder`
**Notion:** [Spike on Vercel's v0](https://www.notion.so/33b5b6e0c94f803e8d01faf2600e95d5)

---

## TL;DR

- **It works.** A user can publish a workflow, click **Frontend** on the canvas, type a prompt, and get back a real running v0-generated React/Next.js app in an iframe that calls their workflow's webhook. Iteration is preserved across reloads via a `chatId` stored in `workflow.staticData`.
- **The interesting half is integration UX, not technical feasibility.** The v0 Platform API is well-shaped, the SDK is typed, our backend wrapper is ~150 lines. The hard problems are in iteration friction and security model — both productionable but neither fully resolved here.
- **Lock-in is low.** `chat.latestVersion.files` is plain source; `chats.downloadVersion` returns a zip. Customers can leave with a `pnpm install && pnpm build` away.
- **Cost is variable, not flat.** Token-metered credits with model rates from $1/M input on v0 Mini up to $150/M output on v0 Max Fast. Recommend BYOK at launch.
- **Recommendation: GO** to a productionisation phase, scoped narrowly. Detailed roadmap below.

---

## What we built

Eight vertical slices, each commitable:

1. **Walking skeleton** — module + canvas button + drawer + iframe, against a fake v0 client. ([`8aaa3ba883`](#))
2. **Real v0-sdk** — wired behind `V0_API_KEY`, with a runtime type guard and schema validation at the BE↔v0 boundary. ([`355d3d6731`](#))
3. **GET + rehydration** — drawer pulls messages and `demoUrl` from v0 on open; nothing cached locally beyond `chatId`. ([`9a54386028`](#))
4. **Endpoint context + pure core** — every prompt to v0 carries the workflow's webhook URL, method, and request/response examples sourced from the editor's loaded run data. Also adds a Clear button. ([`ada92a625a`](#))
5. **Preconditions + error wrapping** — empty endpoints → 400, v0 throws → 502 with the upstream message preserved. ([`22810065c6`](#))
6. **Playwright smoke** — one e2e test, janitor-clean. ([`5d639e22df`](#))
7. **Investigations** — the eight notes referenced below. ([`4cf60d3ea8`](#))
8. **This report** + draft PR.

Plus a polish commit: [`968aa3c9e0`](#) (activation gate using the right state source) and [`4e05b983cb`](#) (drawer height fix so the iframe stays visible).

### Architecture in one paragraph

A new opt-in backend module `packages/cli/src/modules/frontend-builder/` exposes three REST endpoints (`GET`/`POST /messages`/`DELETE` under `/workflows/:workflowId/frontend`). It wraps `v0-sdk` behind a small `IV0Client` interface so a `FakeV0Client` can be swapped in for tests and dev-without-credentials. State is minimal — only `{ chatId }` lives in `workflow.staticData`; v0 is authoritative for messages and `demoUrl`. The frontend has a canvas-level **Frontend** button and a side drawer that hydrates from the GET endpoint and sends prompts via the POST. The composable sources request/response examples from `workflowsStore.getWorkflowRunData` so v0 sees real shapes from the user's most recent execution.

### Responsibility line

- **v0 owns:** generated code, hosting (`*.vusercontent.net` preview URL), chat iteration state, source-file access via `downloadVersion`.
- **n8n owns:** the API contract (Webhook Triggers), example data (from the editor's loaded run data), the entry point (drawer), persistence of `chatId`, and — where productionised — the escape hatch (download zip).
- **Open by design:** memory/storage for the generated FE, auth on webhooks called by the FE, custom domains. All covered as follow-ups below.

---

## Findings

### 1. Ejectability — low lock-in

[Deep dive →](./ejectability.md)

`chat.latestVersion.files` is plain `{ name, content, locked }` records — no opaque blobs. `downloadVersion({ chatId, versionId, format: 'zip', includeDefaultFiles: true })` returns a complete Next.js scaffold. Output is React + TypeScript + Tailwind + shadcn/ui — all OSS, all portable. Customers can self-host with `pnpm install && pnpm build`. Recommend exposing a "Download source" action in the drawer.

### 2. Vercel project linking — productionisation, not PoC

[Deep dive →](./vercel-linking.md)

The v0 SDK has no custom-domain surface — domains are a Vercel concern. v0 projects can be *linked* to Vercel projects via `vercelProjectId`; from there, customers manage domains through Vercel directly. Three productionisation paths: n8n hosts on its own Vercel, BYO Vercel via OAuth, or eject. **Recommend (a) for launch, (b) as the first paid step.**

### 3. CORS — no n8n changes needed

[Deep dive →](./cors.md)

n8n's existing webhook CORS works. The Webhook Trigger node's `supportsCORS: true` + default `allowedOrigins: '*'` is sufficient (verified end-to-end with a real iframe call). The mid-spike "CORS bug" turned out to be free pinggy.io's HTML interstitial blocking browser-User-Agent preflights. Switched to `cloudflared` and everything worked. n8n's `Content-Security-Policy: sandbox` on webhook responses is unrelated — CSP doesn't apply to fetch/XHR responses. **For productionisation: customers should narrow `allowedOrigins` from `*` to their FE's hosted origin; the n8n UI could surface a hint when a workflow is bound to a v0 frontend.**

### 4. Auth — public + payload validation for now, signed URLs later

[Deep dive →](./auth.md)

The iframe's code is fully visible; nothing bundled into it (API keys, bearer tokens) is secret. Three options evaluated: **(a)** public webhook + payload validation (recommend default; suitable for forms/lead capture), **(b)** short-lived signed URL via a token endpoint (recommend for tenant isolation), **(c)** session-forwarding from the editor (only viable when the FE is never exported; fights ejectability).

### 5. Pricing — token-metered, BYOK at launch

[Deep dive →](./pricing.md)

Token rates from $1/M input (v0 Mini) to $150/M output (v0 Max Fast). Account-level limits are 10k API requests/day and 1k chat messages/day. Free tier is UI-only; Platform API access starts at the Team tier ($30/user/mo). **A pooled-key model is dangerous** at these rates and ceilings — one noisy tenant on Max Fast can starve everyone. **Recommend BYOK for launch**, with a hybrid (capped trial credits then mandatory BYOK) as the production target.

### 6. Iteration UX — auto-pin first, persistent test webhooks later

[Deep dive →](./iteration-ux.md)

Today's loop has 8 manual steps per iteration: edit → publish → run → find execution → pin data → return to drawer → send. Three optimisations:

- **Option B: auto-pin latest execution** — about a day of work, removes 4–5 steps. Recommended first.
- **Option A: persistent test webhooks** — removes the publish requirement entirely but is a 2–3 week effort touching load-bearing infra. Treat as its own spike.
- **Option C: live execution view** — 3–5 days, useful when latest-isn't-the-one-you-want. Layer onto B if friction persists.

### 7. Persistent state — workflow-as-backend

[Deep dive →](./persistent-state.md)

Browser storage (localStorage/IndexedDB) is free out of the box and sufficient for "remember last input" cases. For state that outlives the browser, the natural fit is **a separate workflow webhook acting as the storage backend** — composes with how n8n already works, no schema changes. A first-class FE state backend in the module is a valid step 2 once concrete patterns emerge. Vercel-attached storage couples us to Vercel and complicates ejection — skip.

### 8. Instance AI integration — small adapter, big UX work

[Deep dive →](./superagent-outline.md)

The same backend module powers the Instance AI ("superagent") flow. Tool surface: `generate_frontend({ workflowId, prompt, forceNew? })` returning `{ chatId, demoUrl, assistantMessage }`. ~2–3 days for the tool adapter and registration. The bigger work is owned by the Instance AI team: in-chat iframe rendering, streamed status during the 10–30s generation, error translation, and deciding whether one Instance AI conversation maps 1:1 to one v0 chatId.

---

## Recommendation: **GO**, scoped narrowly

The PoC validated the technical premise: v0 + n8n is a clean integration that produces working frontends bound to live workflows in a few seconds, with low ejection risk and no n8n-side blockers. The remaining questions are productionisation choices, not feasibility ones.

For the next phase, scope to:

1. **Iteration UX Option B** — the single biggest UX lift for the smallest cost.
2. **BYOK key management** — config surface, secrets storage, per-tenant key validation. Required before opening to customers.
3. **Download source action** — a one-day trust-signal feature with outsized procurement value.
4. **CORS hint in the workflow UI** when a workflow has a bound v0 frontend.
5. **Instance AI tool adapter** — once #1 lands, plumb the same backend into the Instance AI flow as a parallel surface.

Defer:

- Custom domains / BYO Vercel — wait for first customer demand.
- First-class FE state backend — wait for patterns to emerge.
- Persistent test webhooks — its own spike, valuable but big.
- Session-forwarded auth — valuable only for embedded-only mode.

---

## Follow-up tickets to file

- `feat(frontend-builder): auto-pin latest execution on follow-up message` — implements Iteration UX Option B.
- `feat(frontend-builder): download source as zip` — wraps `v0.chats.downloadVersion`, returns `application/zip` from a new GET endpoint.
- `feat(frontend-builder): BYOK key surface` — config UI + secret storage + validation; replaces the current single-instance `V0_API_KEY` env var.
- `chore(frontend-builder): UI hint to narrow `allowedOrigins` when a workflow has a bound v0 frontend.`
- `feat(instance-ai): generate_frontend tool` — adapter wrapping `FrontendBuilderService`.
- `spike: persistent test webhooks during drawer session` — separate 2–3 week spike to remove the publish requirement.
- `fix(frontend-builder): drawer optimistic display shows raw prompt instead of composed prompt` — hydrate after send, or have the POST return the composed user message; small UX cleanup.

---

## Appendix: smoke verification

End-to-end demo verified through the editor against the real v0 API:

- Drawer opens; chat history rehydrates from v0 across page reloads.
- Sending a prompt with the workflow's webhook URL + method context yields a real Next.js form bound to the live webhook URL.
- Submitting the iframe-rendered form actually triggers the workflow (verified through cloudflared tunnel; pinggy free tier blocks it via interstitial).
- Iteration with a real response example: pinned execution data flows into the next prompt; v0 acknowledges the response shape and adapts the UI.

The Playwright smoke at `packages/testing/playwright/tests/e2e/frontend-builder/smoke.spec.ts` protects this flow in CI against the deterministic FakeV0Client.
