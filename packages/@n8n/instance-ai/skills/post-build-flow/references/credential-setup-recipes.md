# Credential setup recipes

### Choosing the credential type for a service

Pick in this order:

1. **A dedicated credential type** (`slackApi`, `notionApi`, …) whenever one
   exists — search with `credentials(action="search-types")`.
2. **Simplified Custom Auth** (`httpTemplatedCustomAuth`) for any service
   without a dedicated type whose auth is expressible as header/query/body
   values — which covers API keys and bearer tokens (`Authorization: Bearer
<token>` becomes `{"headers":{"Authorization":"Bearer {{api_key}}"}}`, not
   `httpBearerAuth`). Always provide a recipe (below) so the user only pastes
   their secret.
3. **Plain generic types** (`httpBasicAuth`, `httpDigestAuth`, `oAuth2Api`, …)
   only for what a template cannot express: basic auth's base64-encoded pair,
   digest's challenge-response, OAuth flows — or when the user explicitly asks
   for a specific plain type: an explicit user choice wins (setup accepts it
   with `allowPlainGenericAuth: true`).

### Credential recipes for Simplified Custom Auth

When the workflow authenticates a service through Simplified Custom Auth,
include `credentialHints` in the same `workflows(action="setup")` call so the
setup card pre-fills the credential and the user only pastes their secret —
instead of facing an empty JSON template they'd have to decode from the
provider's docs. Before composing the hints, load the
`credential-recipe-research` skill and execute its lookup procedure — the
template, `docsUrl` and `testUrl` must come from the provider documentation
it has you fetch, never from memory:

- `template` — the auth request parts (headers/qs/body) exactly as documented,
  with `{{placeholder}}` markers where the user's values go.
- `placeholders` — one entry per marker: `name`, user-facing `title`, an
  optional `info` clarifying the value itself — its format or which of the
  provider's tokens it is (e.g. "Starts with tvly-"). Never where to obtain
  it, and never a URL or domain: the user asks the AI Assistant for that from
  the credential form. `type` is `password` unless clearly non-secret (at
  least one placeholder must stay `password`). Add `optional: true` only when
  the provider documents the value as optional (e.g. an org/region
  qualifier) — template entries referencing an empty optional placeholder are
  omitted from the request.
- `docsUrl` — the provider page where a logged-in user CREATES/COPIES the
  secret (e.g. `https://replicate.com/account/api-tokens`) — never the API
  reference. Not shown in the form: the AI Assistant help thread uses it to
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

Never put a real secret in a recipe — the user enters it in the credential form opened by setup.
Do not expose the captured value. Add `nodeName` when several nodes use
Simplified Custom Auth for different services. You cannot see the secret, but
once setup reports a credential applied, treat that node as configured
only to the extent reported. Inspect partial results and remaining setup items — the
`{{placeholder}}` markers live only in the template; the stored values replace
them at request time. If a live test later fails with an auth error, that is
the moment to have the user re-open the credential and re-paste the value.

If the user defers setup instead, don't hand them manual field-by-field
credential instructions for the n8n editor — tell them to reopen setup when
they're ready: the card pre-fills everything except their key.
