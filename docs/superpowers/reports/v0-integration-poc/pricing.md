# v0 Platform API: Pricing & Rate Limits

## Summary

v0 prices generation usage as **token-metered credits** rather than a fixed per-message fee, and bundles a monthly credit allowance into each subscription. Platform API access is gated behind a paid plan (free tier is UI-only by all available signals). For an n8n PoC this means cost is variable and depends primarily on prompt + generated-code token volume, and rate-limit headroom is generous on a per-account basis but creates a clear scaling ceiling for any pooled-key model.

## Plan tiers

Sourced from <https://v0.app/pricing> (fetched 2026-04-27):

| Tier | Price | Monthly credits | Notes |
|---|---|---|---|
| Free | $0 | $5 included | 7 messages/day cap; no team seats; **no API access mentioned** |
| Team | $30/user/mo | $30/user + $2/day login bonus | Shared chats, team collab |
| Business | $100/user/mo | $30/user + $2/day login bonus | Training opt-out by default |
| Enterprise | Custom | Custom | SAML SSO, RBAC, priority access, no-training guarantee |

**API access tier:** the pricing page does not explicitly list "Platform API" as a tier feature. Empirically, API keys are issued from `v0.app/chat/settings/keys` ([Quickstart](https://v0.app/docs/api/platform/quickstart)) and the Free tier's 7 msg/day cap effectively rules it out for production. *Estimate: Premium/Team and above; needs confirmation.*

## Per-generation cost

There is **no flat per-message price**. Credits are consumed at model token rates ([pricing page](https://v0.app/pricing)):

| Model | Input $/1M | Cache read $/1M | Output $/1M |
|---|---|---|---|
| v0 Mini | $1 | $0.10 | $5 |
| v0 Pro | $3 | $0.30 | $15 |
| v0 Max | $5 | $0.50 | $25 |
| v0 Max Fast | $30 | $3 | $150 |

A single chat creation that emits ~5k output tokens on v0 Pro costs roughly $0.075 (estimate). Follow-up messages benefit from cache reads and are typically cheaper. **Unknown:** whether the SDK exposes per-call cost; follow-up: probe `x-ratelimit-*` response headers and `v0.rateLimits.find()` against a real key.

## Rate limits

From the [Platform API overview](https://v0.app/docs/api/platform): **10,000 API requests/day, 1,000 chat messages/day, 100 deployments/day, 1 GB uploads/day, 50 GitHub imports/day.** Per-project: 1,000 chats; per-chat: 10,000 messages. RPM/RPS and concurrency are not published; the dedicated `/rate-limits` page returns 404.

## Implications for n8n productionisation

- **BYOK (per-tenant key):** zero cost exposure for n8n, billing scales naturally per customer, no shared-quota contention. Cost: setup friction (Team-plan signup, key generation, secrets storage). Best fit for the PoC and likely launch.
- **n8n-pooled key:** zero customer setup, but n8n absorbs unbounded token cost (Max Fast at $150/M output is a footgun) and the 1k-msg/day account ceiling means a single noisy tenant can starve the rest. Requires markup + hard per-tenant quota enforcement.
- **Hybrid:** n8n-pooled trial credits (capped to the $5 free-tier equivalent), then mandatory BYOK to continue. Lowest activation friction with bounded n8n cost; recommended path post-PoC.
