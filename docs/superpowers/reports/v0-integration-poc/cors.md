# CORS between v0's iframe and n8n webhooks

## Summary

n8n's existing webhook CORS implementation works correctly with v0-hosted
frontends. During the spike, what looked like a CORS bug turned out to be a
free-tier tunnel interstitial. No n8n changes are needed for the PoC; for
productionisation, customers should narrow the `allowedOrigins` parameter on
their Webhook Trigger.

## What works in n8n today

The Webhook Trigger node declares `supportsCORS: true`, which exposes an
`allowedOrigins` parameter (default `*`). The webhook handler at
`packages/cli/src/webhooks/webhook-request-handler.ts` (`setupCorsHeaders`,
line 180) emits `Access-Control-Allow-Origin`,
`Access-Control-Allow-Methods`, `Access-Control-Max-Age`, and
`Access-Control-Allow-Headers` on both the preflight (`OPTIONS`) and the
actual response. Verified with `curl` using both
`Origin: https://demo-<id>.vusercontent.net` and `Origin: null` — headers are
correct in every case.

## What looked like a CORS bug but wasn't

The browser reported `PreflightMissingAllowOriginHeader` against a tunnelled
n8n. Root cause: free pinggy.io serves an HTML interstitial ("Caution — you
are about to visit a website that is served for free through pinggy.io") to
**browser User-Agents**, while transparently forwarding **curl
User-Agents**. The preflight therefore received HTML with no CORS headers,
and the browser blocked the request. n8n itself was never reached.

## CSP sandbox aside

The same handler sets `Content-Security-Policy: sandbox allow-...` on
webhook responses (omitting `allow-same-origin`) unless
`N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX=true`. This is **not** a CORS
blocker: the `sandbox` directive applies to documents loaded from the
response, not to data returned via `fetch`/XHR. To JavaScript the body is
just bytes.

## Tunnel choice

- `cloudflared` — recommended; no interstitial, no token required.
- `pinggy` with auth token — works (paid / free-with-token).
- `ngrok` with auth token — works.
- Free default `pinggy.io` — avoid; the interstitial breaks browser
  preflights.

## Productionisation

n8n's `allowedOrigins` mechanism is sufficient. Recommendation: customers set
`allowedOrigins` on the Webhook Trigger to their generated frontend's
hosted origin (e.g. `https://*.vusercontent.net`, or a custom domain). The
default `*` is fine for the PoC but too permissive for production. When a
workflow is bound to a v0 frontend, the n8n UI could surface a hint to
tighten this value.
