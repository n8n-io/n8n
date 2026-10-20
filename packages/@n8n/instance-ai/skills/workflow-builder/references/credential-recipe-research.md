---
name: credential-recipe-research
description: >-
  Lookup procedure for Simplified Custom Auth recipe fields — sources the auth
  template, the key-issuing docsUrl and an auth-rejecting testUrl from the
  provider's real documentation instead of memory. Load before composing
  credentialHints for a service without a dedicated credential type (the
  post-build-flow setup step), or when asked to fix a recipe whose template,
  key page or test endpoint is wrong.
recommended_tools:
  - research
  - workflow_builder_workflows
---
# Credential Recipe Research

Recipe only as good as docs it came from. This is procedure, not guidance: execute every step with `research` tool, keep only findings you can point to on fetched page. Guessed URLs send users to wrong page with key that can't be verified.

Inputs: service name + API host(s) workflow's nodes call.

## 1. Auth scheme (template)

Fetch provider's auth docs — `research(action="web-search")` with `"<service> API authentication"`, then `fetch-url` best docs hit. Record scheme EXACTLY as documented: header name, prefix word, casing (`Authorization: Key {{api_key}}` vs `Bearer {{api_key}}` vs custom header like `xi-api-key`). Documented auth is basic, digest, or OAuth → stop: not expressible as template — use matching generic type instead (see workflow-builder skill's credential ladder).

## 2. Key page (docsUrl)

Find where logged-in user CREATES or COPIES key. URL not shown in form — n8n Assistant help thread presents it as THE place to get value, so wrong URL sends user to dead end with full confidence:

- Search `"<service> dashboard API keys"`, scan fetched auth docs for phrases like "get your key from", "Dashboard → API Keys", "console", "settings".
- Answer normally on app/console/dashboard host — `console.apify.com/settings/integrations`, `elevenlabs.io/app/settings/api-keys`, `replicate.com/account/api-tokens`, `app.tavily.com/home` — not under `/docs`, `/reference`, or `/documentation`.
- Accept docs-domain URL only when fetched page shows keys actually issued there (some ReadMe-style logged-in portals do).
- NEVER construct dashboard path by analogy (`/account/api-keys`, `/dashboard/keys`, …). Dashboards are apps behind login: fetch answers 200 for any invented route, so path can't be verified by fetching. Emit deep dashboard URL only when it appears VERBATIM on fetched page; when docs only describe navigation ("Dashboard → API Keys") without literal URL, use dashboard/app root they reference — shallower real page beats deeper invented one.
- Nothing conclusive after both steps → omit docsUrl. Never pass off API reference as key page.

## 3. Verification endpoint (testUrl)

Find documented, side-effect-free GET that rejects bad key with 401/403. Check API reference in this order, stop at first qualifying hit:

1. Account/profile/me endpoints — `/v1/account`, `/v2/users/me`, `/v1/user`.
2. Usage/quota endpoints — e.g. fal's `/v1/models/usage`, Tavily's `/usage`.
3. List/discovery endpoints — `/v1/templates`, `/v1/models`, `/v1/voices`.

Rules, all mandatory:

- Endpoint must appear on fetched page — never construct path by analogy with other APIs.
- Never workflow's own endpoints, never resource or action URL, never anything that can trigger billable work. Setup rejects workflow-URL collisions; probe reports unexpected statuses as "could not be verified" — invented URL only costs user trust.
- Skip endpoints answering 2xx regardless of key: auth-optional endpoints (Pexels search) or services signaling auth errors in response body (Apollo's `auth/health`, TikTok) — status probe can't verify through them.
- Nothing qualifies → omit testUrl. Credential saves fine, card honestly reports could not be verified — beats false green.

## 4. Compose

Fill `credentialHints` (field list + example in post-build-flow skill) from findings above only. `suggestedName` names service ("Apify API Token"); never include real secret.