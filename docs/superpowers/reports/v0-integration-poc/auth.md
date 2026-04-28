# Webhook authentication for v0-generated frontends

## Summary

The PoC ships v0-generated frontends as bundles served from `*.vusercontent.net`.
The iframe code is fully visible to anyone with the demo URL — anything bundled
into it (API keys, bearer tokens, header secrets) is effectively public. The
spike currently leaves the Webhook Trigger's `Authentication` set to `None`, so
the URL is the only secret. This note enumerates what the Webhook Trigger
already supports and sketches three productionisation paths.

## Existing webhook auth options in n8n

The Webhook Trigger's auth options are defined in
`packages/nodes-base/nodes/Webhook/description.ts` (`authenticationProperty`,
lines 51-75) and the matching credential bindings in `credentialsProperty`
(lines 19-49). Four values are exposed:

- **None** (default) — open endpoint, anyone with the URL can call it.
- **Basic Auth** — uses the `httpBasicAuth` credential
  (`packages/nodes-base/credentials/HttpBasicAuth.credentials.ts`).
- **Header Auth** — uses `httpHeaderAuth`
  (`packages/nodes-base/credentials/HttpHeaderAuth.credentials.ts`); single
  header name + value.
- **JWT Auth** — uses `jwtAuth`
  (`packages/nodes-base/credentials/JwtAuth.credentials.ts`); validates a JWT
  with HS\* or RS\* against a configured secret/JWKS.

The same `description.ts` also exposes an **IP allowlist** option (`ipWhitelist`,
lines 295-302) and **Ignore Bots** — useful hardening levers but not real auth.
None of these options are gated to Cloud; they are all available in self-hosted
n8n. Crucially, every one of them assumes the caller possesses a static secret,
which a public iframe bundle cannot hold.

## Three options for the generated FE

### (a) Public webhook + payload validation
- **How:** keep `Authentication: None`; the workflow's first step validates the
  payload shape (required fields, types, length caps) and rejects garbage.
  Combine with `ipWhitelist` only if the caller is server-side, and with rate
  limiting at the reverse proxy.
- **Secret location:** none — the URL is the only barrier.
- **Stops:** malformed payloads, accidental misuse, drive-by scrapers.
- **Allows:** anyone with the URL to submit valid-shaped requests; spam; abuse
  of downstream paid APIs.
- **Effort:** small.
- **Use case:** intentionally public submissions — lead capture, contact forms,
  feedback widgets.

### (b) Short-lived signed URL
- **How:** add a small token endpoint in the n8n module that mints a
  time-bound, HMAC-signed URL (or token query param) for the target webhook.
  The iframe fetches the signed URL on load, then calls the webhook with it.
  The Webhook node validates the signature in a preceding `Code`/`If` step (or
  via `Header Auth` if the signature is sent as a header).
- **Secret location:** server-side signing key in the n8n instance; the issued
  URL is short-lived and visible to the browser.
- **Stops:** long-term replay, hot-linking from other origins, credential
  stuffing of static tokens.
- **Allows:** an attacker who scripts the token endpoint can still mint tokens
  at the same rate the legitimate FE can — abuse is rate-limited, not
  prevented.
- **Effort:** medium (token endpoint, signature verification, clock skew).
- **Use case:** tenant isolation between multiple v0 frontends on one n8n
  instance; reducing blast radius of a leaked URL.

### (c) Session forwarding from the n8n editor
- **How:** while the iframe is embedded in the editor, n8n issues a per-iframe
  JWT (signed with the existing user session) and passes it via `postMessage`
  or a fragment param. The FE sends it as `Authorization: Bearer …`; the
  Webhook node uses **JWT Auth** to validate. Cookies do not propagate to
  `*.vusercontent.net`, so credentialled `fetch` is not viable.
- **Secret location:** server-side JWT signing key; per-session token in the
  iframe.
- **Stops:** any caller without a valid editor session — the strongest of the
  three.
- **Allows:** nothing meaningful while embedded; **completely breaks** the
  moment the customer ejects the FE and hosts it elsewhere.
- **Effort:** large (JWT issuance, postMessage handshake, refresh on expiry,
  CORS tightening).
- **Use case:** internal-only flows where the FE is never exported.

## Recommendation

Default to **(a)** for the spike's natural use cases (forms, lead capture) —
zero setup, matches the "frictionless building" principle. Add **(b)** as a
follow-up once we have multiple tenants or want abuse-rate ceilings; it pairs
cleanly with the existing `Header Auth` option so no node changes are needed.
Reserve **(c)** for a separate "embedded-only" mode and do not build it until
ejectability is settled — it actively conflicts with the FE being portable.
