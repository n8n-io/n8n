---
name: n8n:verify-telemetry
description: >-
  Verifies product telemetry, audit (log streaming) events and the derived
  Prometheus counters on a local n8n stand, and produces the evidence block
  that goes into the PR. Use after adding or changing a `telemetry.track`
  event, a relay handler for an `eventService.emit` event, an `n8n.audit.*`
  event or a metric, when a ticket mentions telemetry, audit log, log
  streaming, instrumentation or observability, or when a reviewer asks for
  proof that an event fires.
---

# Verify telemetry locally

Unit tests prove the handler is wired. This skill proves the signal leaves the
instance, and ends with an **evidence block** that goes into the PR under
`## Telemetry` and into the report to the user. Adding or naming events is the
job of `n8n:telemetry`; this skill only verifies.

## What the stand gives you

- n8n from this checkout's `dist`, with its own `N8N_USER_FOLDER`.
- Every telemetry call (backend RudderStack, browser RudderStack, PostHog)
  lands in `<stand>/capture.log` instead of n8n's real endpoints.
- Audit events in `<stand>/home/.n8n/n8nEventLog.log`.
- `GET /metrics` with the `n8n_audit_*_total` counters.
- Licensed features faked at boot, for license-gated modules such as
  `sso-saml`, `sso-oidc`, `ldap`, `external-secrets` or `log-streaming`.

Scripts live in `scripts/`; run them, do not read them unless they fail.
`<stand>` is `$N8N_STAND_DIR`, default `/tmp/n8n-telemetry-stand`.

## Workflow

1. **Build.** `pnpm build > build.log 2>&1` once, then
   `pnpm build --filter n8n > build.log 2>&1` after every code change. The
   stand runs `dist`, not the sources.
2. **Start.** `bash .agents/skills/verify-telemetry/scripts/stand.sh up feat:saml,feat:oidc`.
   List only the license features the surface needs; pass nothing for
   community features. The command waits for `/healthz` and prints the URL and
   the file paths. Rerun `up` after each rebuild (`down` first).
3. **Session.** `stand.sh owner` creates the instance owner and saves a cookie
   jar. `stand.sh api-key saml:manage,oidc:manage` saves a public API key.
   Both print the `curl` flags to use.
4. **Trigger** the action through every write path the ticket names: REST with
   the cookie jar, public API with the key, and the UI when the browser event
   matters. Put JSON bodies in files and send them with `--data-binary @file`.
   Repeat each path at least once with a change that produces a known payload.
5. **Collect.** `stand.sh evidence n8n.audit.<name> "<Telemetry event name>"`
   prints the block below. RudderStack flushes in batches: if the telemetry
   count lags the audit count, wait ten seconds and rerun.
6. **Report.** Paste the block into the PR under `## Telemetry` and into the
   final message, with one `Action:` line that says what was triggered, how
   many times and through which paths. Also say what was not verified.
7. **Stop.** `stand.sh down`, or `stand.sh reset` to also delete the data.

## Evidence block

`stand.sh evidence` prints exactly this; keep the shape.

```markdown
### Local verification: n8n.audit.sso.settings.updated, User updated single sign on settings
Stand: n8n 2.44.0 · 9431c12a15 · 2026-10-16T17:09Z
Action: 9 saves: REST SAML ×2, toggle ×2, REST OIDC ×2, public API ×2, UI ×1

| Signal | Source | Count |
|---|---|---|
| Audit `n8n.audit.sso.settings.updated` | n8nEventLog.log | 9 |
| Telemetry `User updated single sign on settings` | backend RudderStack | 9 |
| Telemetry `User updated single sign on settings` | browser RudderStack | 1 |
| Counter `n8n_audit_sso_settings_updated_total` | GET /metrics | 9 |

<details><summary>Last audit event</summary> …json… </details>
<details><summary>Last telemetry payload, backend RudderStack</summary> …json… </details>
```

Counts must agree across the sources; explain every difference, for example a
browser event that fires once more per UI save. PostHog rows are the same
instance events forwarded by the backend and equal the backend RudderStack
count. The audit log rotates and the counter restarts with each n8n start, so
after a rebuild collect the final block from one fresh run (`reset`, `up`).

## Rules

- Never point a stand at the real telemetry endpoints or the real PostHog
  project. The script sets the hosts; do not override them.
- No secrets in the block: strip tokens, passwords, keys, certificates and
  metadata XML before pasting. Local test accounts are fine.
- One evidence block per surface. A path you could not drive on the stand, for
  example an IdP round trip, is listed as not verified, not skipped silently.
- Do not commit `.claude/launch.json`, the stand directory or `capture.log`.

## More detail

[reference.md](reference.md): environment table, how license faking works and
its limits, HTTPS OIDC discovery stub, driving the UI, reading the files by
hand, troubleshooting.
