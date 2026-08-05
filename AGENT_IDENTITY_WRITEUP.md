# Agent Identity — Build vs. Plan (first notes)

> Draft / working notes, not the final readout. Compares what we actually built against
> the 2-day hackathon plan: what matched, what we changed and why, what we skipped, and
> what we learned. Branch: `afitzek/track-2-implementation`.

## TL;DR

We proved the headline the plan set out to prove — **an internal construct (an Agent) can
hold a real, verifiable identity and cross a real n8n-owned boundary as itself** — and it's
green end-to-end (GATE-2 in-process, GATE-6 over real HTTP). Along the way one "free" wiring
the plan assumed turned out to be a trap, so Track 3 took a different shape than written, and
we went *past* the plan on the protocol side (RFC 9728/8414 discovery, audience scoping). The
single most novel idea in the plan — **on-behalf-of-a-human delegated tokens** — is still not
built.

---

## What each track became

| Track | Plan intent | What we built | Verdict |
|---|---|---|---|
| **1 — Service-account User** | Mark a `User` as SA; impersonation as the "what can it touch" tool | Dedicated `User.type='serviceAccount'` column (not the password-null pending shape); passwordless + personal project; impersonation with an `act` claim | Built as intended (pre-session) |
| **2 — Inbound M2M auth** | `client_credentials`, token endpoint, verify into MCP Trigger + public API + triggers | All of it, **plus** RFC 8707 resource/audience scoping (`aud` claim, audience isolation) — which the plan explicitly put *out* of scope | Built + **extended** (pre-session) |
| **3 — Agent ↔ SA** | 1:1 SA per agent; wire SA into `AgentsCredentialProvider.user`; agent mints its own token → MCP Trigger | 1:1 SA per agent ✓; **did NOT** wire the credential provider (see broken assumption); a new `n8nInternalOAuth2` marker credential that mints **per tool call** via `client_credentials`, endpoint **discovered** via RFC 9728→8414 | Built, **reshaped** (this session) |

---

## Coverage: plan's table vs. reality

| Scenario | Plan said | Actually |
|---|---|---|
| External system → n8n REST API | Yes (Track 2) | ✅ Yes |
| Webhook-triggered external call | Yes (Track 2) | ✅ Yes |
| **Agent proves its own identity via an MCP Trigger** | Yes (Track 3 proof) | ✅✅ **Yes — the headline, proven GATE-2 + GATE-6** |
| Agent/workflow → third-party API via stored creds, *attribution improved* | Yes (wire SA into `AgentsCredentialProvider`) | ❌ **No — we deliberately left the provider untouched.** This scenario is a gap. |
| Agent → another workflow directly as a tool | No | No (unchanged, by design) |
| Two n8n instances calling each other | No | No |
| Agent ↔ external/cross-org agent | No | No |
| Agent on behalf of a specific person | No (stretch) | No — still autonomous-only |

---

## The one assumption that broke

**Plan (Track 3):** *"Wire that service-account user into `AgentsCredentialProvider`'s `user`
param… Confirmed free: the provider takes a plain `User`… No provider changes needed, only
what each caller passes."*

Type-wise that was true. **Semantically it was a trap.** A service account lives in *its own
personal project*, so `getCredentialsAUserCanUseInAWorkflow(agentSA, {projectId})` intersects
the SA's (empty) credential set with the agent's project → **∅**. Passing the SA into the
provider would have *removed* the agent's credential access, not governed it — a regression,
worst exactly on the autonomous runtime paths that matter most.

**Consequence / reinterpretation:** we separated two axes the plan conflated —
- *identity that authorizes credential access* (left as-is: project scope), and
- *identity that a minted token represents* (the new bit: the agent's SA, threaded only for minting).

So "the agent acts as itself" is realized through **token minting**, not through
credential-provider scoping. This is arguably a cleaner model, but it means the plan's
"attribution improved for third-party credential use" was **not delivered**.

---

## Assumptions confirmed / extended

- **Confirmed:** `oauth-server` had `authorization_code`+DCR but **no** `client_credentials` — it was net-new (Track 2). "MCP APIs" = the **MCP Trigger node** auth path (not the instance MCP server). SA discriminator = a dedicated `type` column (chosen over reusing password-null).
- **Extended beyond plan:** resource/audience scoping was built (plan said "a plain token is enough"). And we added a whole **protocol-discovery layer** the plan never mentioned: the mint now discovers its token endpoint + canonical resource from n8n's *own* RFC 9728 / 8414 metadata instead of hardcoding. The guiding contract:

  > The auth transport and discovery are pure OAuth2 (RFC 9728 → 8414 → 8707/6749) with no
  > n8n-invented handshake; the identity model and the credential↔(AS, resource) binding are
  > n8n domain data that OAuth2 deliberately doesn't own.

---

## Design decisions — what, why, right?

1. **Leave `AgentsCredentialProvider` untouched.** Why: the ∅ trap. Right? Yes — avoided breaking every agent run; kept identity-for-mint and identity-for-authz as separate concerns.
2. **Identity-less marker credential** (`n8nInternalOAuth2`) that resolves the *acting* SA's credential from execution context, rather than storing a secret or hard-referencing one SA. Why: generalizes ("also works for authenticated users"), keeps the node dumb. Right? Yes — it's the seam that makes per-AS credentials a future config change, not a redesign.
3. **Real HTTP `client_credentials` self-call**, not in-process mint. Why: exercises the actual boundary (the whole point of the proof). Right? Yes for proof value — but it *forced* decision 4.
4. **Reversible `clientSecret` (bcrypt → n8n `Cipher`).** Why: an HTTP mint needs to *recover* the secret; bcrypt is one-way. Right? Defensible — n8n must present the secret outbound anyway, and this matches how *all* n8n credentials are stored (instance key already the crown jewel). Documented as a deliberate at-rest tradeoff; inbound verify stays constant-time.
5. **Audience auto-derived → then discovered** (canonical `resource` from PRM). Why: robustness + protocol-honesty. Right? Yes — also fixed a latent bug (we were guessing `/oauth/token`; the AS actually advertises `/mcp-oauth/token`).
6. **Eager provisioning on agent create + lazy backfill.** Right? Yes — flag-gated, non-breaking when off.
7. **Audit rows on mint + verify** (stretch goal #2). Right? Yes — high demo value, reused `EventService`, near-free.

---

## Shortcuts we took (and the upgrade path)

- **Provisioning isn't atomic.** Reused `ServiceAccountsService.create/.delete` open their own transactions and take no `ctx`, so WP2 uses **compensation** (tear down the SA if a later step fails) instead of one enclosing transaction. → Make those services accept a `ctx`.
- **Discovery fallback + no caching + `ssrf:'disabled'`.** If discovery fails we fall back to the hardcoded endpoint; metadata is re-fetched every tool call; SSRF is disabled because the target is the same instance. Fine for an internal PoC. → cache metadata (CacheService); flip SSRF for external.
- **Credential selection is fixed to the acting SA's internal cred.** No per-AS credential binding yet (in-code TODO).
- **Three security items deferred as in-code TODOs:** (a) confused-deputy guard — validate discovered `resource` == intended target; (b) credential selection keyed on discovered AS issuer; (c) external-AS SSRF/issuer-allowlist.
- **No node `typeVersion` bump** — the new auth option is a backward-compatible enum add.
- **Inline / sub-agents have no SA** → the mint hook fails closed. Acceptable; noted.
- **Provisioning actor = instance owner** (the `AgentsService.create` chain carries no human `User`).
- **License seat-counting for SA users** — untouched, still unresolved (as the plan flagged).
- **No data migration for the secret** — bcrypt is one-way and Track 2 is unshipped, so dev/demo rows are recreated rather than migrated.

---

## Gaps we wanted to research but didn't reach

- **Delegated / on-behalf-of tokens** — the plan called this "the single most novel idea." Not built; we only mint autonomous (agent-as-itself) tokens. `sub` is the SA; there's no human-alongside claim. **This is the biggest open item.**
- **`AgentsCredentialProvider` attribution** — traceability of third-party credential use to the SA. Dropped when decision 1 was made; worth revisiting as a separate, non-scoping mechanism (e.g. attribution metadata, not access-scoping).
- **Second call site** (`delegate-sub-agent-tool.ts`) for an agent-to-agent demo beat — not done.
- **External OAuth2 AS support** — designed-for (the discovery seam + credential↔AS binding), not built.
- **Cross-instance / cross-org** — out of scope, as planned.

---

## Lessons

1. **A "free" type-compatible seam can still be semantically wrong.** The credential-provider `user` param accepted an SA, but SA project-scoping inverts the intent. Separate *identity that authorizes* from *identity a token represents* — they're different axes.
2. **The protocol loop was already half-built.** n8n *serves* RFC 9728 + 8414 on the resource side; only the client was hardcoding. Completing it was cheap and let us honestly claim "pure OAuth2 transport/discovery" for the internal case.
3. **Tests can pass through a fallback and hide a broken primary path.** GATE-6 was green via the hardcoded fallback because the test server's `webhookBaseUrl` port didn't match — discovery was silently `ECONNREFUSED`-ing. Fix: assert the *observable* (the discovered `token_endpoint` value), not just the end result.
4. **The "real boundary" proof has a cost.** Choosing a real HTTP `client_credentials` round-trip over an in-process mint is what forced the reversible-secret change. Worth it for the demo, but the coupling was not obvious up front.

---

## Where it stands

All green: full monorepo build (69/69), 280+ unit/integration tests, 0 lint errors. Proof
gates GATE-1/2/3/4/6 pass. Runbook: `packages/cli/src/modules/oauth-server/SERVICE_ACCOUNT_PROOF.md`.
Everything is on `afitzek/track-2-implementation` (Track 3 + discovery uncommitted).
