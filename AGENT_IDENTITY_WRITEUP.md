# Agent Identity — Build vs. Plan (first notes)

> Draft / working notes, not the final readout. Compares what we actually built against
> the 2-day hackathon plan: what matched, what we changed and why, what we skipped, and
> what we learned. Branch: `afitzek/track-2-implementation`.

## TL;DR

We proved the headline the plan set out to prove — **an internal construct (an Agent) can
hold a real, verifiable identity and cross a real n8n-owned boundary as itself** — and it's
green end-to-end (proven both in-process and over real HTTP; runbook §4). Along the way one
"free" wiring the plan assumed turned out to be a trap, so Track 3 took a different shape
than written, and we went *past* the plan on the protocol side (RFC 9728/8414 discovery,
audience scoping). The single most novel idea in the plan — **on-behalf-of-a-human delegated
tokens** — is still not built, and the repo now contains a constraint that makes building it
a design decision rather than an extension (see [Gaps](#gaps-we-wanted-to-research-but-didnt-reach)).

One **security finding** exists only because the tracks were built separately: `disabled` is
the only kill switch a service account has, and Track 2/3's machine path never reads it —
see [Where the tracks meet](#where-the-tracks-meet).

---

## What each track became

| Track | Plan intent | What we built | Verdict |
|---|---|---|---|
| **1 — Service-account User** | Mark a `User` as SA; impersonation as the "what can it touch" tool | Dedicated `User.type='serviceAccount'` column (not the password-null pending shape); passwordless + personal project; impersonation with an `act` claim | Built as intended (pre-session) |
| **2 — Inbound M2M auth** | `client_credentials`, token endpoint, verify into MCP Trigger + public API + triggers | All of it, **plus** RFC 8707 resource/audience scoping (`aud` claim, audience isolation) — which the plan explicitly put *out* of scope | Built + **extended** (pre-session) |
| **3 — Agent ↔ SA** | 1:1 SA per agent; wire SA into `AgentsCredentialProvider.user`; agent mints its own token → MCP Trigger | 1:1 SA per agent ✓; **did NOT** wire the credential provider (see broken assumption); a new `n8nInternalOAuth2` marker credential that mints **per tool call** via `client_credentials`, endpoint **discovered** via RFC 9728→8414 | Built, **reshaped** (this session) |

---

## Track 1 foundations (what Tracks 2–3 stand on)

Full implementation log:
[Service Accounts POC: implementation, then two impersonation bugs](https://app.notion.com/p/n8n/Service-Accounts-POC-implementation-then-two-impersonation-bugs-3b15b6e0c94f81d5b233e50b357409a5).

**The model.** A service account is a row in the same `user` table, with the same roles,
scopes, credential ownership and project membership. The only difference is that it isn't a
person: no password ever, no login, managed entirely through impersonation. Nothing
downstream — RBAC, credential sharing, project scoping — had to be taught anything new.

**`password: null`, not token-exchange's `INVALID_PASSWORD_PLACEHOLDER`.** That sentinel
exists because those users *are* people who should look fully set up; we want the opposite —
an SA should be invisible to every onboarding path. `null` gets that free from filters that
already existed: password reset can't find it (`user.repository.ts:86`, the
`password: Not(IsNull())` at `:92`), no invite mail is sent, login compares against null.
Cost is two one-line fixes — `computeIsPending` (`user.ts:125`) and the pending-users SQL
(`user.repository.ts:320`).

**Separate `serviceAccount:*` scopes, not `user:*`** (`global-scopes.ee.ts:59–64`).
`user:list` is already granted to every member (`:188`), so reusing it would leak SAs;
`user:create` carries seat/invite/email meaning an SA has none of; and impersonation has to
be grantable and revocable on its own.

**`password IS NULL` is used all over as shorthand for "a real person", and an SA breaks it
both ways** — it reads as half-set-up where it should be active, and inactive where it should
be visible. Swept in `buildUserQuery` (`user.repository.ts:411`, now defaults to
`type = 'user'`), `computeIsPending`, `countUsersByRole` (`:103`, feeds seat telemetry),
`findEligibleByProjectOrGlobalRoles` (`:187`), and three predicates in `project.repository.ts`
collapsed into one `CREATOR_IS_ACTIVATED` constant (`:15`).

**The guard that mattered most.** Invite-acceptance gated on `if (invitee.password) throw`.
An SA has none, so it **passed** — the endpoint would have handed it a password and a session
cookie, turning it into a human login that keeps its role and its credentials. Now blocked
before the password check (`invitation.controller.ts:126`), with the same guard on `me`
(`me.controller.ts:58,206,274,325`), all four MFA enrolment routes
(`mfa.controller.ts:70,82,127,214`) and impersonation entry (`impersonation.controller.ts:36`).

**The lockout bug.** Both impersonation transitions revoke the cookie they replace, and a
session token's only varying field is `iat`, in whole seconds — so leaving impersonation
within a second of entering it re-minted a **byte-identical** token that was already revoked,
locking the operator out of their own session. Fixed with a random `jti` on transition tokens
only (`auth.service.ts:74,334,343`), leaving normal session tokens unchanged.

**Two things that were blockers, not polish.** `isWithinUsersLimit()` is false on *any*
seat-capped licence, so without exempting SAs every non-owner cookie issuance throws
`USERS_QUOTA_REACHED` and impersonation never starts (`auth.service.ts:302–315`). And the MFA
gate reads `user.mfaEnabled`, always false on an SA, so an MFA-enforced instance would 401 the
session and push it to an enrolment screen it can never complete — fixed by gating on the
human instead (`auth.service.ts:401–420`, actor-hash binding at `:484–496`).

---

## Coverage: plan's table vs. reality

| Scenario | Plan said | Actually |
|---|---|---|
| External system → n8n REST API | Yes (Track 2) | ✅ Yes |
| Webhook-triggered external call | Yes (Track 2) | ✅ Yes |
| **Agent proves its own identity via an MCP Trigger** | Yes (Track 3 proof) | ✅✅ **Yes — the headline, proven in-process and over real HTTP (runbook §4)** |
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

## Where the tracks meet

Tracks 1 and 2/3 were built separately against the same account. These four properties exist
only *between* them, and none is visible from inside either track.

### 1. `disabled` is a kill switch for the human path only

⚠️ The one item here worth fixing in code.

Each decision was right on its own. Track 1 chose `password: null`, which makes
`createJWTHash` permanently constant for an SA — so hash-based revocation does nothing to it,
as the code itself says (`auth.service.ts:486–491`). That leaves `disabled` as the **only**
kill switch an SA has. Track 2/3 then added a second way in that never reads it.

**Enforced** (all on the human path): `auth.service.ts:465` (the impersonated account), `:508`
(the human behind it), `impersonation.controller.ts:50` (entering impersonation) and `:132`
(restoring the session afterwards).

**Not enforced** (machine path): `exchangeClientCredentials` never loads the `User` at all
(`oauth-server.service.ts:411–464`) — it checks the client secret, then mints against
`credential.userId`. Verify does load the `User` but only checks that it *exists*
(`oauth-token.service.ts:312`) before `resource.authorize(user)` (`:322`).

**So:** disabling a service account stops a person impersonating it, and does **not** stop it
minting new tokens or using ones it already holds. The UI switch
(`service-accounts.service.ts:148`) looks like a kill switch and isn't one.

- **Minimum fix:** reject on `disabled` in `exchangeClientCredentials`, and at
  `oauth-token.service.ts:312`.
- **Better fix:** a `sessionEpoch` counter on `user`, folded into `createJWTHash` and checked
  at verify — bumping it revokes everything for that account. Worth having for humans too, and
  it also covers §4.

### 2. Two ways into one account, not equally tight

Track 1 gave the SA no password *specifically* so that no secret could ever authenticate as
it — the only way in was a human already holding `serviceAccount:impersonate`. Track 2/3 gives
it a reversibly-encrypted `clientSecret` that does exactly that, from anywhere, with no human
involved.

Not wrong — n8n has to present the secret outbound (decision 4) — but it retires the guarantee
the `password: null` choice was made for, so it belongs next to the at-rest-downgrade note in
`SERVICE_ACCOUNT_PROOF.md` § *Security notes*, not only in the Track 3 rationale.

### 3. The newer path is narrow; the older one is wide

An OAuth token only works against the exact URL it was minted for. The impersonation cookie
has no such restriction — it satisfies `validateCookieToken` (`auth.service.ts:358`) and
`authenticateUserByCookie` (`:391`) unconditionally, so anything reachable by cookie inherits
impersonation without having been reviewed for it: `webhook-helpers.ts:574` and
`n8n-identifier.ts:66`. Worth remembering when webhook auth comes back into scope.

### 4. Neither path can cancel a single session

**Cookie side:** hash revocation does nothing for an SA (see §1), so it only works through the
*human's* hash — they change password or rotate MFA and their impersonation sessions die.
Coarse, but real. **Machine side:** no revocation list for minted tokens and no `disabled`
check, so a leaked token is good until it expires; rotating the client secret doesn't touch
tokens already issued. The `sessionEpoch` idea in §1 covers both.

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
4. **Reversible `clientSecret` (bcrypt → n8n `Cipher`).** Why: an HTTP mint needs to *recover* the secret; bcrypt is one-way. Right? Defensible — n8n must present the secret outbound anyway, and this matches how *all* n8n credentials are stored (instance key already the crown jewel). Documented as a deliberate at-rest tradeoff; inbound verify stays constant-time. See also [Where the tracks meet §2](#2-two-ways-into-one-account-not-equally-tight) — it also relaxes a Track 1 guarantee.
5. **Audience auto-derived → then discovered** (canonical `resource` from PRM). Why: robustness + protocol-honesty. Right? Yes — also fixed a latent bug (we were guessing `/oauth/token`; the AS actually advertises `/mcp-oauth/token`).
6. **Eager provisioning on agent create + lazy backfill.** Right? Yes — flag-gated, non-breaking when off.
7. **Audit rows on mint + verify** (stretch goal #2). Right? Yes — high demo value, reused `EventService`, near-free. Covers the *token* lifecycle only; see the attribution gap in [Known rough edges](#known-rough-edges-track-1-follow-ups-still-open).

---

## Shortcuts we took (and the upgrade path)

- **Provisioning isn't atomic, and the transaction style is a known review blocker.**
  `ServiceAccountsService.create/.delete` open their own transactions and take no `ctx`, so
  WP2 uses **compensation** (tear down the SA if a later step fails) instead of one enclosing
  transaction. They also do it via `this.userRepository.manager.transaction(...)`
  (`service-accounts.service.ts:114,232`) — reaching into `.manager` from a *service*, which
  `AGENTS.md` names as a reviewer-rejected anti-pattern. It isn't lint-enforced (the rule
  catches the *import*, not `.manager`), so it passed CI. One fix covers both: accept a `ctx`
  and inject `TransactionRunner`, as `oauth-token.service.ts:62` already does.
- **Discovery fallback + no caching + `ssrf:'disabled'`.** If discovery fails we fall back to the hardcoded endpoint; metadata is re-fetched every tool call; SSRF is disabled because the target is the same instance. Fine for an internal PoC. → cache metadata (CacheService); flip SSRF for external.
- **Credential selection is fixed to the acting SA's internal cred.** No per-AS credential binding yet (in-code TODO).
- **Three security items deferred as in-code TODOs:** (a) confused-deputy guard — validate discovered `resource` == intended target; (b) credential selection keyed on discovered AS issuer; (c) external-AS SSRF/issuer-allowlist. A fourth is now on the list: the `disabled` check on the machine path ([Where the tracks meet §1](#1-disabled-is-a-kill-switch-for-the-human-path-only)).
- **No node `typeVersion` bump** — the new auth option is a backward-compatible enum add.
- **Inline / sub-agents have no SA** → the mint hook fails closed. Acceptable; noted.
- **Provisioning actor = instance owner** (the `AgentsService.create` chain carries no human `User`).
- **License seats: issuance is resolved, the reported count isn't.** SAs are exempt from the quota check at cookie issuance (`auth.service.ts:302–315`) and creation skips it (`service-accounts.service.ts:112–113`), so nothing is blocked today. Still open: if a real seat count is ever added it must filter `type = 'user'` — the note is already at `user.repository.ts:98–101`, and `countUsersByRole` already does it.
- **No data migration for the secret** — bcrypt is one-way and Track 2 is unshipped, so dev/demo rows are recreated rather than migrated.

---

## Known rough edges (Track 1 follow-ups still open)

Open, low-severity, recorded nowhere else.

- **`PATCH /me/settings` 403s in every SA session.** Correctly guarded
  (`me.controller.ts:325`), but the frontend calls it unprompted from
  `useCalloutHelpers.ts:118` and `app/stores/workflows.store.ts:319,362`. Visible effect:
  dismissed callouts don't stay dismissed while impersonating.
- **`PersonalizationModal.vue:564`** sends you to the homepage whenever you aren't already
  there. The SA fix routed *around* it (`users.store.ts:418`) rather than fixing it, so it
  still yanks a human who followed a deep link on first login. Pre-existing wart.
- **An SA can ask for a workflow review but can never be a reviewer** —
  `user.repository.ts:187–205` filters to real users, partly because sorting downstream
  assumes a real email address. Probably right; worth confirming as a product decision.
- **Attribution gap.** Events and `updatedAt` during impersonation record the *SA*; the human
  shows up only in logs and the five `service-account-*` events
  (`relay.event-map.ts:325–354`). Track 3's audit rows cover tokens, not what the SA then did.
- **Multi-tab.** Tab B keeps a stale user in memory while its requests already go out as the
  SA. Fixes itself on the next navigation.

---

## Gaps we wanted to research but didn't reach

### Delegated / on-behalf-of tokens — and what now stands in the way

Still the biggest open item, but "no delegation exists" is the wrong framing.

**It already exists.** Impersonation is real RFC 8693 delegation with a real `act` claim
(`auth.service.ts:32–48`), checked on every request (`:497`). The gap is narrower: delegation
works for **human→SA in the browser** and not on the **machine path**, where
`generateAccessTokenOnly` → `generateTokenPair` (`oauth-token.service.ts:53,69`) emits **no
`act` at all**.

**The obstacle: "who is acting" already has two opposite answers in the same vocabulary.**

| Path | Resolves to | Meaning |
|---|---|---|
| `scoped-jwt.strategy.ts:63`, `mcp-api-key.service.ts:76` | `actor ?? subject` — the **actor wins** | a service acts *for* a user, using its own authority |
| Impersonation (`auth.service.ts:37–43`) | the **subject** acts; `act` is ignored for authorization | a human drops their own authority and takes the SA's |

Both are deliberate. So an on-behalf-of token is a **third** choice, not an extension of
either — it has to pick one and say which.

**The concrete trap.** Don't route it through `req.tokenGrant`: both
`scoped-jwt.strategy.ts:87` and `mcp-api-key.service.ts:76` read
`tokenGrant.actor ?? tokenGrant.subject`, so filling in `actor` with the triggering human
would **silently swap who is in charge** — agent to human, with no error anywhere. The warning
is already in the `auth.service.ts` doc comment; it needs to be a design input, not something
found afterwards.

### Other gaps

- **`AgentsCredentialProvider` attribution** — traceability of third-party credential use to the SA. Dropped when decision 1 was made (the provider is genuinely untouched: it does not appear in `git diff --name-only master..HEAD`); worth revisiting as a separate, non-scoping mechanism (e.g. attribution metadata, not access-scoping).
- **Second call site** (`delegate-sub-agent-tool.ts`) for an agent-to-agent demo beat — not done.
- **External OAuth2 AS support** — designed-for (the discovery seam + credential↔AS binding), not built.
- **Cross-instance / cross-org** — out of scope, as planned.

---

## Lessons

1. **A "free" type-compatible seam can still be semantically wrong.** The credential-provider `user` param accepted an SA, but SA project-scoping inverts the intent. Separate *identity that authorizes* from *identity a token represents* — they're different axes.
2. **The protocol loop was already half-built.** n8n *serves* RFC 9728 + 8414 on the resource side; only the client was hardcoding. Completing it was cheap and let us honestly claim "pure OAuth2 transport/discovery" for the internal case.
3. **Tests can pass through a fallback and hide a broken primary path.** The real-HTTP proof was green via the hardcoded fallback because the test server's `webhookBaseUrl` port didn't match — discovery was silently `ECONNREFUSED`-ing. Fix: assert the *observable* (the discovered `token_endpoint` value), not just the end result.
4. **The "real boundary" proof has a cost.** Choosing a real HTTP `client_credentials` round-trip over an in-process mint is what forced the reversible-secret change. Worth it for the demo, but the coupling was not obvious up front.
5. **A service account is a user-shaped hole — every implicit "is this a real person?" test is a latent bug, front end and back.** `password IS NULL`, `personalizationAnswers == null`, `settings == null`, `mfaEnabled === false` are all used as shorthand for "half-set-up human", and every one of them broke. **Corollary: fix the gate, not the stored data.** Backfilling `personalizationAnswers` at creation was rejected because it stores a claim the account can never make, is read as real downstream (`templates.store.ts:170`), ties SA creation to a versioned survey schema, and would only have helped SAs created *after* the fix. The guard went on the gate instead (`users.store.ts:418`). Same shape as lesson 1 — a seam that type-checks but means the wrong thing — except in data rather than an API.

---

## Where it stands

All green: full monorepo build (69/69), 280+ unit/integration tests, 0 lint errors. Proof
gates GATE-1/2/3/4/6 pass. Runbook: `packages/cli/src/modules/oauth-server/SERVICE_ACCOUNT_PROOF.md`.
Everything is on `afitzek/track-2-implementation` (Track 3 + discovery uncommitted).