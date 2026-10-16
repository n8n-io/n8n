# verify-telemetry reference

## Stand layout

| Path | Content |
|---|---|
| `<stand>/home/.n8n/` | database, encryption key, `n8nEventLog.log` (every event bus message, audit included) |
| `<stand>/capture.log` | one JSON line per request the telemetry clients sent: `{at, method, url, body}` |
| `<stand>/n8n.log` | n8n stdout and stderr (`run` prints to the terminal instead) |
| `<stand>/owner.json`, `cookies.txt`, `api-key.txt` | local test credentials, mode 600 |
| `<stand>/oidc/` | self-signed certificate and the discovery stub, only after `stand.sh oidc-stub` |

## Environment the script sets

| Variable | Value | Why |
|---|---|---|
| `N8N_USER_FOLDER` | `<stand>/home` | isolated database and event log |
| `N8N_PORT` | `$N8N_STAND_PORT`, default 5678 | |
| `N8N_SECURE_COOKIE` | `false` | sessions over http |
| `N8N_DIAGNOSTICS_ENABLED` | `true` | telemetry on |
| `N8N_DIAGNOSTICS_CONFIG_BACKEND`, `_FRONTEND` | `stand;http://127.0.0.1:4545` | backend and browser RudderStack post to the capture server |
| `N8N_DIAGNOSTICS_POSTHOG_API_KEY`, `_API_HOST` | `stand`, `http://127.0.0.1:4545` | PostHog posts to the capture server, nothing reaches the real project |
| `N8N_METRICS`, `N8N_METRICS_INCLUDE_MESSAGE_EVENT_BUS_METRICS` | `true` | `n8n_audit_*_total` counters on `/metrics` |
| `N8N_STAND_LICENSE_FEATURES` | the features given to `up` or `run` | read by the preload |
| `NODE_OPTIONS` | `--require=<skill>/scripts/license-preload.cjs` | license faking |
| `NODE_EXTRA_CA_CERTS` | `<stand>/oidc/cert.pem` when it exists | trust for the OIDC stub |

Override the port with `N8N_STAND_PORT`, the capture port with
`N8N_STAND_CAPTURE_PORT`, the directory with `N8N_STAND_DIR`.

## License faking

`scripts/license-preload.cjs` runs before n8n through `NODE_OPTIONS`. It hooks
`Module._load`, finds the `License` class and makes `isLicensed()` return
`true` for the features in `N8N_STAND_LICENSE_FEATURES`; everything else goes
to the original method. It runs in the main thread only and removes itself
from `process.env.NODE_OPTIONS`, so the xmllint worker and the task runners do
not inherit it. Without that, every SAML save fails with
`Invalid SAML metadata`.

Limits: quotas (`getValue`) are untouched, `getPlanName` stays unlicensed, and
the frontend shows the feature as licensed only where it asks `isLicensed`.
Check `GET /rest/settings` → `enterprise.<feature>` after `up`. With a real
development license set `N8N_LICENSE_ACTIVATION_KEY` instead and pass no
features.

`E2E_TESTS=true` with `PATCH /rest/e2e/feature` is not enough: license-gated
modules check the flag while booting, before any request can enable it.

## Reading the files by hand

Audit, one JSON per line; the user fields are prefixed with `_` because log
streaming can redact them:

```bash
grep '"n8n.audit.sso.settings.updated"' <stand>/home/.n8n/n8nEventLog.log | tail -1
```

Telemetry, where `url` tells the source: `/v1/batch` is the backend RudderStack
SDK (batched, flushed every few seconds), `/v1/track`, `/v1/page`,
`/v1/identify` are the browser SDK, `/batch/` and `/flags/` are PostHog:

```bash
node -e 'for (const l of require("fs").readFileSync("<stand>/capture.log","utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); let b; try { b = JSON.parse(r.body) } catch { continue } for (const m of b.batch ?? (b.event ? [b] : [])) if (m.event === "User updated single sign on settings") console.log(r.url, JSON.stringify(m.properties)) }'
```

Counters follow the audit name: `n8n.audit.a.b.c` becomes
`n8n_audit_a_b_c_total`. A counter exists only after its first event.

```bash
curl -s localhost:5678/metrics | grep sso_settings
```

## Driving the UI

The owner credentials are in `<stand>/owner.json`. Sign in at
`http://localhost:5678/signin`, make the change, save, then run `evidence`
again: the browser event shows up as `browser RudderStack` with the properties
the frontend sends (for example `identity_provider`), the backend event as
`backend RudderStack`. Do not repeat the credentials in chat.

Claude Code: run the stand through the preview instead of a background
process. Put this in `.claude/launch.json` (git-excluded, never commit it):

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "n8n-telemetry-stand",
      "runtimeExecutable": "bash",
      "runtimeArgs": [".agents/skills/verify-telemetry/scripts/stand.sh", "run", "feat:saml,feat:oidc"],
      "port": 5678
    }
  ]
}
```

`run` behaves like `up` but keeps n8n in the foreground.

## OIDC discovery stub

Saving an OIDC configuration fetches the discovery document, and openid-client
accepts https only and requires `issuer` to equal the discovery URL without
`/.well-known/openid-configuration`. `stand.sh oidc-stub` creates a self-signed
certificate for `127.0.0.1`, starts `scripts/oidc-discovery-stub.py` on
port 8765 and prints the discovery URL. Start it **before** `up` so
`NODE_EXTRA_CA_CERTS` picks up the certificate. The stub serves the discovery
document and an empty JWKS; it does not complete a login.

SAML needs real IdP metadata only for login; for a settings save the
integration fixture is enough:

```bash
node -e 'const s=require("fs").readFileSync("packages/cli/test/integration/saml/sample-metadata.ts","utf8"); const m=s.match(/sampleMetadata =\s*(\x27[\s\S]*?\x27);/); process.stdout.write(new Function("return "+m[1])())' > <stand>/idp-metadata.xml
```

## Troubleshooting

| Symptom | Cause, fix |
|---|---|
| `up` fails: port in use | another stand or dev server, `stand.sh down` or set `N8N_STAND_PORT` |
| `enterprise.<feature>` is `false` in `/rest/settings` | feature not passed to `up`, or the name is wrong: use the `feat:*` keys from `LICENSE_FEATURES` in `@n8n/constants` |
| SAML save returns `Invalid SAML metadata` | the preload reached the xmllint worker; make sure `NODE_OPTIONS` carries nothing else that re-adds it |
| `500 Failed to parse request body` | inline JSON with escaped quotes in `curl -d`; write the body to a file |
| telemetry count lags the audit count | RudderStack batches, wait ten seconds and rerun `evidence` |
| OIDC save: `Failed to discover OIDC metadata` | stub not running, or n8n started before the certificate existed |
| nothing in `capture.log` | `N8N_DIAGNOSTICS_ENABLED` overridden to `false` in the environment |
