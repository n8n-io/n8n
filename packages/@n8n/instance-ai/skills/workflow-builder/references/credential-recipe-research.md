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
  - setup_workflow
---

# Credential Recipe Research

A recipe is only as good as the documentation it came from. This is a
procedure, not guidance: execute every step with the `research` tool and keep
only findings you can point to on a fetched page. Guessed URLs are how users
end up on the wrong page with a key that can't be verified.

Inputs: the service name and the API host(s) the workflow's nodes call.

## 1. Auth scheme (template)

Fetch the provider's authentication docs — `research(action="web-search")`
with `"<service> API authentication"`, then `fetch-url` the best docs hit.
Record the scheme EXACTLY as documented: header name, prefix word, casing
(`Authorization: Key {{api_key}}` vs `Bearer {{api_key}}` vs a custom header
like `xi-api-key`). If the documented auth is basic, digest, or OAuth, stop:
that is not expressible as a template — use the matching generic type instead
(see the workflow-builder skill's credential ladder).

## 2. Key page (docsUrl)

Find where a logged-in user CREATES or COPIES the key. The URL is not shown
in the form — the n8n Assistant help thread presents it as THE place to get
the value, so a wrong URL sends the user to a dead end with full confidence:

- Search `"<service> dashboard API keys"`, and scan the fetched auth docs for
  phrases like "get your key from", "Dashboard → API Keys", "console",
  "settings".
- The answer normally lives on an app/console/dashboard host —
  `console.apify.com/settings/integrations`,
  `elevenlabs.io/app/settings/api-keys`, `replicate.com/account/api-tokens`,
  `app.tavily.com/home` — not under `/docs`, `/reference`, or
  `/documentation`.
- Accept a docs-domain URL only when the fetched page shows keys are actually
  issued there (some ReadMe-style logged-in portals do).
- NEVER construct a dashboard path by analogy (`/account/api-keys`,
  `/dashboard/keys`, …). Dashboards are apps behind a login: a fetch answers
  200 for any invented route, so the path cannot be verified by fetching.
  Emit a deep dashboard URL only when it appears VERBATIM on a page you
  fetched; when the docs only describe navigation ("Dashboard → API Keys")
  without a literal URL, use the dashboard/app root they reference — a
  shallower real page beats a deeper invented one.
- Nothing conclusive after both steps → omit docsUrl. Never pass off the API
  reference as the key page.

## 3. Verification endpoint (testUrl)

Find a documented, side-effect-free GET that rejects a bad key with 401/403.
Check the API reference in this order and stop at the first qualifying hit:

1. Account/profile/me endpoints — `/v1/account`, `/v2/users/me`, `/v1/user`.
2. Usage/quota endpoints — e.g. fal's `/v1/models/usage`, Tavily's `/usage`.
3. List/discovery endpoints — `/v1/templates`, `/v1/models`, `/v1/voices`.

Rules, all mandatory:

- The endpoint must appear on a page you fetched — never construct a path by
  analogy with other APIs.
- Never one of the workflow's own endpoints, never a resource or action URL,
  never anything that can trigger billable work. Setup rejects workflow-URL
  collisions, and the probe reports unexpected statuses as "could not be
  verified" — an invented URL only costs the user trust.
- Skip endpoints that answer 2xx regardless of the key: auth-optional
  endpoints (Pexels search) or services that signal auth errors in the
  response body (Apollo's `auth/health`, TikTok) — a status probe cannot
  verify through them.
- Nothing qualifies → omit testUrl. The credential saves fine and the card
  honestly reports it could not be verified, which beats a false green.

## 4. Compose

Fill `credentialHints` (field list and example in Recipe fields below)
from the findings above only. `suggestedName` names the service ("Apify API
Token"); never include a real secret.

## Recipe fields

When the workflow authenticates a service through Simplified Custom Auth,
include `credentialHints` in the same `setup_workflow` call so the
setup card pre-fills the credential and the user only pastes their secret —
instead of facing an empty JSON template they'd have to decode from the
provider's docs. Before composing the hints, execute the lookup procedure in
sections 1–3 above — the template, `docsUrl` and `testUrl` must come from the
provider documentation it has you fetch, never from memory:

- `template` — the auth request parts (headers/qs/body) exactly as documented,
  with `{{placeholder}}` markers where the user's values go.
- `placeholders` — one entry per marker: `name`, user-facing `title`, an
  optional `info` clarifying the value itself — its format or which of the
  provider's tokens it is (e.g. "Starts with tvly-"). Never where to obtain
  it, and never a URL or domain: the user asks the n8n Assistant for that from
  the credential form. `type` is `password` unless clearly non-secret (at
  least one placeholder must stay `password`). Add `optional: true` only when
  the provider documents the value as optional (e.g. an org/region
  qualifier) — template entries referencing an empty optional placeholder are
  omitted from the request.
- `docsUrl` — the provider page where a logged-in user CREATES/COPIES the
  secret (e.g. `https://replicate.com/account/api-tokens`) — never the API
  reference. Not shown in the form: the n8n Assistant help thread uses it to
  send the user to the exact page. Found via the `credential-recipe-research`
  procedure; omit when it finds nothing conclusive.
- `testUrl` — a documented side-effect-free GET that rejects a bad key with
  401/403, used to verify the credential on save and later retests; never one
  of the workflow's own endpoints, never anything billable. Found via the
  `credential-recipe-research` procedure; omit when nothing qualifies — a
  credential without a testUrl saves fine and honestly shows "could not be
  verified", which beats a false green.
- `acceptedStatusCodes` — almost always omit; the user can adjust it later on
  the credential if a service's auth answers 401/403 to valid GETs.
- `suggestedName` — display name for the created credential.

Example — fal.ai's docs say requests use `Authorization: Key <FAL_KEY>` and
`GET https://api.fal.ai/v1/models/usage` is a documented side-effect-free
endpoint that rejects a bad key (the model-serving host `fal.run` is not a
key-check endpoint):

```json
{
	"action": "setup",
	"workflowId": "...",
	"credentialHints": [
		{
			"suggestedName": "fal.ai API Key",
			"template": {
				"headers": { "Authorization": "Key {{api_key}}" }
			},
			"placeholders": [
				{
					"name": "api_key",
					"title": "fal.ai API key",
					"info": "Key ID and secret, separated by a colon",
					"type": "password"
				}
			],
			"docsUrl": "https://fal.ai/dashboard/keys",
			"testUrl": "https://api.fal.ai/v1/models/usage"
		}
	]
}
```

Never put a real secret in a recipe — the user pastes it in the setup card and
it is stored redacted in the credential. Add `nodeName` when several nodes use
Simplified Custom Auth for different services. You cannot see the secret, but
once setup reports the credential applied, treat it as fully configured — the
`{{placeholder}}` markers live only in the template; the stored values replace
them at request time. If a live test later fails with an auth error, that is
the moment to have the user re-open the credential and re-paste the value.

If the user defers setup instead, don't hand them manual field-by-field
credential instructions for the n8n editor — tell them to reopen setup when
they're ready: the card pre-fills everything except their key.
