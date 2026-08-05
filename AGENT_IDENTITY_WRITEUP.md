# Agent Identity — Build vs. Plan (first notes)

> Working notes, not the final readout. This compares what we actually built against the
> 2-day hackathon plan: what matched, what we changed and why, what we skipped, and what we
> learned. Branch: `afitzek/track-2-implementation`.
>
> **Quick glossary.** *SA* = service account (a user row that is not a person). *OBO* =
> on-behalf-of (an agent acting for the human who triggered it). *AS* = authorization server
> (here, n8n's own OAuth server). *PRM* = protected-resource metadata (RFC 9728).

## TL;DR

We proved the main thing the plan set out to prove: **an internal construct (an Agent) can
hold a real, checkable identity and cross a real n8n-owned boundary as itself.** It works end
to end — proven both in-process and over real HTTP (runbook §4).

Three things changed along the way:

- One wiring the plan called "free" turned out to be a trap, so Track 3 took a different shape
  than written (see [The one assumption that broke](#the-one-assumption-that-broke)).
- We went **past** the plan on the protocol side: the mint now discovers where to get its token
  using standard OAuth metadata (RFC 9728 → 8414), and tokens are audience-scoped (RFC 8707).
- The plan's most ambitious idea — **on-behalf-of-a-human delegated tokens** — is now built for
  the **internal** case (RFC 8693-correct, proven by GATE-OBO): a human-triggered agent run
  mints a token that says `{sub: human, act: SA}`, and the boundary authorizes **as the human**.
  Delegation for humans coming from an *outside* identity provider is the remaining slice
  (see [Delegated tokens](#delegated--on-behalf-of-tokens--internal-slice-built-this-session)).

There is also one **security finding** that only exists because the tracks were built
separately: `disabled` is the only "off switch" a service account has, and the Track 2/3
machine path never checks it — see [Where the tracks meet](#where-the-tracks-meet).

---

## What each track became

| Track | Plan intent | What we built | Verdict |
|---|---|---|---|
| **1 — Service-account User** | Mark a `User` as an SA; use impersonation as the "what can it touch" tool | A dedicated `User.type='serviceAccount'` column (not the password-null "pending" shape); passwordless, with its own project; impersonation carries an `act` claim | Built as intended (pre-session) |
| **2 — Inbound M2M auth** | `client_credentials`, a token endpoint, verify it in the MCP Trigger + public API + triggers | All of that, **plus** RFC 8707 audience scoping (an `aud` claim, so a token only works at one URL) — which the plan had put *out* of scope | Built + **extended** (pre-session) |
| **3 — Agent ↔ SA** | One SA per agent; wire that SA into `AgentsCredentialProvider.user`; agent mints its own token → MCP Trigger | One SA per agent ✓; **did not** wire the credential provider (see the trap below); a new `n8nInternalOAuth2` marker credential that mints a token **per tool call**, finding the endpoint via RFC 9728→8414 discovery | Built, **reshaped** (this session) |

---

## Track 1 foundations (what Tracks 2–3 stand on)

Full implementation log:
[Service Accounts POC: implementation, then two impersonation bugs](https://app.notion.com/p/n8n/Service-Accounts-POC-implementation-then-two-impersonation-bugs-3b15b6e0c94f81d5b233e50b357409a5).

**The model.** A service account is a row in the same `user` table as a person, with the same
roles, scopes, credential ownership, and project membership. The only difference: it is not a
person. It has no password, can't log in, and is driven entirely through impersonation. Nothing
downstream — RBAC, credential sharing, project scoping — had to learn anything new.

**Why `password: null` (and not token-exchange's `INVALID_PASSWORD_PLACEHOLDER`).** That
placeholder exists to make federated users *look* fully set up. We want the opposite: an SA
should be invisible to every onboarding path. `null` gets that for free from filters that
already exist — password reset can't find it (`user.repository.ts:86`, the
`password: Not(IsNull())` at `:92`), no invite email goes out, and login compares against
null. The whole cost was two one-line fixes: `computeIsPending` (`user.ts:125`) and the
pending-users query (`user.repository.ts:320`).

**Why separate `serviceAccount:*` scopes instead of reusing `user:*`** (`global-scopes.ee.ts:59–64`).
Every member already has `user:list` (`:188`), so reusing it would leak SAs to everyone.
`user:create` implies seats/invites/email that an SA has none of. And impersonation needs to be
granted and revoked on its own.

**`password IS NULL` is used all over the code as shorthand for "a real person" — and an SA
breaks that reading both ways.** It reads as half-set-up where the SA should look active, and
as inactive where it should be visible. We swept those spots: `buildUserQuery`
(`user.repository.ts:411`, now defaults to `type = 'user'`), `computeIsPending`,
`countUsersByRole` (`:103`, which feeds seat telemetry), `findEligibleByProjectOrGlobalRoles`
(`:187`), and three predicates in `project.repository.ts` collapsed into one
`CREATOR_IS_ACTIVATED` constant (`:15`).

**The guard that mattered most.** Invite-acceptance was gated on `if (invitee.password) throw`.
An SA has no password, so it **passed** the guard — the endpoint would have handed it a
password and a session cookie, turning it into a human login that keeps the SA's role and
credentials. That's now blocked *before* the password check (`invitation.controller.ts:126`),
with the same guard on `me` (`me.controller.ts:58,206,274,325`), all four MFA-enrolment routes
(`mfa.controller.ts:70,82,127,214`), and impersonation entry (`impersonation.controller.ts:36`).

**The lockout bug.** Both impersonation transitions revoke the cookie they replace. A session
token's only changing field is `iat`, measured in whole seconds — so leaving impersonation
within one second of entering it re-minted a **byte-identical** token that had just been
revoked, locking the operator out of their own session. Fixed by adding a random `jti` to
*transition* tokens only (`auth.service.ts:74,334,343`); normal session tokens are unchanged.

**Two things that were outright blockers, not polish.** First, `isWithinUsersLimit()` returns
false on *any* seat-capped licence, so without exempting SAs, issuing any non-owner cookie
throws `USERS_QUOTA_REACHED` and impersonation can never start (`auth.service.ts:302–315`).
Second, the MFA gate reads `user.mfaEnabled`, which is always false on an SA — so on an
MFA-enforced instance the SA session would 401 and get pushed to an enrolment screen it can
never complete. Fixed by checking MFA on the *human* instead (`auth.service.ts:401–420`, with
actor-hash binding at `:484–496`).

---

## Coverage: plan's table vs. reality

| Scenario | Plan said | Actually |
|---|---|---|
| External system → n8n REST API | Yes (Track 2) | ✅ Yes |
| Webhook-triggered external call | Yes (Track 2) | ✅ Yes |
| **Agent proves its own identity via an MCP Trigger** | Yes (Track 3 proof) | ✅✅ **Yes — the headline. Proven in-process and over real HTTP (runbook §4).** |
| Agent/workflow → third-party API via stored creds, *attribution improved* | Yes (wire SA into `AgentsCredentialProvider`) | ❌ **No — we deliberately left the provider untouched.** A gap. |
| Agent → another workflow directly as a tool | No | No (unchanged, by design) |
| Two n8n instances calling each other | No | No |
| Agent ↔ external/cross-org agent | No | No |
| Agent on behalf of a specific person | No (stretch) | ✅ **Internal built — a human-triggered chat run mints `{sub: human, act: SA}`, and the boundary authorizes as the human (GATE-OBO). External-IdP delegation is still ahead.** |

---

## The one assumption that broke

**Plan (Track 3):** *"Wire that service-account user into `AgentsCredentialProvider`'s `user`
param… Confirmed free: the provider takes a plain `User`… No provider changes needed, only what
each caller passes."*

The types lined up, so it looked free. **But it was a semantic trap.** A service account lives
in *its own* project. So `getCredentialsAUserCanUseInAWorkflow(agentSA, {projectId})` computes
the overlap between the SA's credentials (none, in the agent's project) and the agent's project
credentials → **empty set**. Passing the SA into the provider wouldn't have *governed* the
agent's credential access — it would have **removed** it. And it would have hurt most on the
autonomous runtime paths, which matter most.

**What we did instead:** we split apart two ideas the plan had merged into one —

- the identity that **authorizes credential access** (left as-is: project scope), and
- the identity that a **minted token represents** (the new part: the agent's SA, threaded only
  for minting).

So "the agent acts as itself" happens through **token minting**, not through
credential-provider scoping. It's arguably a cleaner split — but it means the plan's promise of
"better attribution for third-party credential use" was **not delivered**.

---

## Where the tracks meet

Tracks 1 and 2/3 were built separately against the same account. These four properties only
exist *between* the tracks, and none of them is visible from inside either one.

### 1. `disabled` is an off switch for the human path only

⚠️ The one item here worth fixing in code.

Each decision was fine on its own. Track 1 chose `password: null`, which makes `createJWTHash`
permanently constant for an SA — so hash-based revocation does nothing to it, as the code
itself notes (`auth.service.ts:486–491`). That leaves `disabled` as the SA's **only** off
switch. Then Track 2/3 added a second way in that never checks it.

**Checked** (all on the human path): `auth.service.ts:465` (the impersonated account), `:508`
(the human behind it), `impersonation.controller.ts:50` (entering impersonation), and `:132`
(restoring the session afterwards).

**Not checked** (machine path): `exchangeClientCredentials` never loads the `User` at all
(`oauth-server.service.ts:411–464`) — it checks the client secret, then mints against
`credential.userId`. Verify does load the `User`, but only checks that it *exists*
(`oauth-token.service.ts:312`) before calling `resource.authorize(user)` (`:322`).

**In plain terms:** disabling a service account stops a person from impersonating it, but does
**not** stop it from minting new tokens or using ones it already holds. The UI toggle
(`service-accounts.service.ts:148`) looks like a kill switch but isn't one.

- **Minimum fix:** reject when `disabled` in `exchangeClientCredentials`, and at
  `oauth-token.service.ts:312`.
- **Better fix:** a `sessionEpoch` counter on `user`, folded into `createJWTHash` and checked
  at verify — bumping it revokes everything for that account. Worth having for humans too, and
  it also fixes §4.

### 2. Two ways into one account, not equally tight

Track 1 gave the SA no password *on purpose*, so that no secret could ever authenticate as it —
the only way in was a human already holding `serviceAccount:impersonate`. Track 2/3 then gave
it a reversibly-encrypted `clientSecret` that does exactly that: authenticate as the SA, from
anywhere, with no human involved.

That's not wrong — n8n has to present the secret outbound (see decision 4) — but it quietly
retires the very guarantee the `password: null` choice was made for. So it belongs next to the
at-rest-downgrade note in `SERVICE_ACCOUNT_PROOF.md` § *Security notes*, not only in the Track 3
rationale.

### 3. The newer path is narrow; the older one is wide

An OAuth token only works against the exact URL it was minted for. The impersonation cookie has
no such limit — it satisfies `validateCookieToken` (`auth.service.ts:358`) and
`authenticateUserByCookie` (`:391`) unconditionally, so anything reachable by cookie inherits
impersonation without ever being reviewed for it: `webhook-helpers.ts:574` and
`n8n-identifier.ts:66`. Worth remembering when webhook auth comes back into scope.

### 4. Neither path can cancel a single session

**Cookie side:** hash revocation does nothing for an SA (see §1), so it only works through the
*human's* hash — they change their password or rotate MFA, and their impersonation sessions
die. Coarse, but real. **Machine side:** there's no revocation list for minted tokens and no
`disabled` check, so a leaked token is good until it expires, and rotating the client secret
doesn't touch tokens already issued. The `sessionEpoch` idea in §1 fixes both.

---

## Assumptions confirmed / extended

- **Confirmed:** `oauth-server` already had `authorization_code` + Dynamic Client Registration,
  but **no** `client_credentials` — that was new in Track 2. "MCP APIs" meant the **MCP Trigger
  node** auth path, not the instance MCP server. The SA discriminator is a dedicated `type`
  column (chosen over reusing password-null).
- **Extended beyond the plan:** we built audience scoping (the plan said "a plain token is
  enough"), and we added a whole **protocol-discovery layer** the plan never mentioned — the
  mint now discovers its token endpoint and canonical resource from n8n's *own* RFC 9728 / 8414
  metadata instead of hardcoding them. The guiding rule:

  > The auth transport and discovery are pure OAuth2 (RFC 9728 → 8414 → 8707/6749), with no
  > n8n-invented handshake. The identity model and the credential↔(AS, resource) binding are
  > n8n domain data that OAuth2 deliberately doesn't own.

---

## Design decisions — what, why, was it right?

1. **Leave `AgentsCredentialProvider` untouched.** Why: the empty-set trap. Right? Yes — it
   avoided breaking every agent run, and kept "identity for minting" and "identity for
   authorizing credential access" as separate concerns.
2. **An identity-less marker credential** (`n8nInternalOAuth2`) that finds the *acting* SA's
   credential from execution context, instead of storing a secret or pointing at one fixed SA.
   Why: it generalizes ("also works for authenticated users") and keeps the node dumb. Right?
   Yes — it's the seam that makes per-AS credentials a future config change rather than a
   redesign.
3. **A real HTTP `client_credentials` self-call**, not an in-process mint. Why: it exercises the
   actual boundary, which is the whole point of the proof. Right? Yes for proof value — but it
   *forced* decision 4.
4. **A reversible `clientSecret` (bcrypt → n8n `Cipher`).** Why: an HTTP mint has to *recover*
   the secret to send it, and bcrypt is one-way. Right? Defensible — n8n has to present the
   secret outbound anyway, and this matches how *all* n8n credentials are stored (the instance
   key is already the crown jewel). It's a deliberate at-rest tradeoff; inbound verification
   still uses a constant-time compare. See [Where the tracks meet §2](#2-two-ways-into-one-account-not-equally-tight)
   — it also relaxes a Track 1 guarantee.
5. **Audience auto-derived, then discovered** (canonical `resource` from PRM). Why: robustness
   plus protocol-honesty. Right? Yes — it also fixed a real bug: we were guessing `/oauth/token`,
   but the AS actually advertises `/mcp-oauth/token`.
6. **Eager provisioning on agent create + lazy backfill.** Right? Yes — it's flag-gated and
   non-breaking when the flag is off.
7. **Audit rows for the whole identity story** (started as stretch goal #2). Right? Yes — high
   demo value, reuses `EventService`, near-free. It began as token mint/verify only; this
   session extended it to record both subject and actor, added a server-side event for
   delegation, and wired the account/impersonation lifecycle events that were previously
   emitted but never routed anywhere. See [Audit trail](#audit-trail).
8. **On-behalf-of authorizes as the subject (the human), not the actor.** Why: the agent acts
   *as* the human who triggered it; the SA is kept in `act` for attribution. This is
   deliberately a *third* answer to "who's in charge" — not `actor ?? subject` — and
   deliberately *not* routed through `req.tokenGrant`, which would silently swap authority (see
   [Delegated tokens](#delegated--on-behalf-of-tokens--internal-slice-built-this-session)).
   Right? Yes — it matches the intent of delegation and dodges the documented trap; GATE-OBO
   proves authorization follows the human.
9. **`act` comes from the `actor_token`, not from client auth (RFC 8693).** Why: a first cut
   derived the actor from `client_id`, which merged the OAuth *client* with the RFC *actor* and
   limited actors to SAs. Right? Yes — a two-step mint (the SA gets its own token, then presents
   it as `actor_token`) generalizes to non-SA actors and is RFC-compatible. Corrected mid-build
   after review.

---

## Audit trail

Every step of the identity story now writes an audit event, through the existing pipeline
(`EventService` → the log-streaming relay → `sendAuditEvent`, i.e. the standard audit
destination — no custom logger). All payloads carry **identifiers only** — user ids, client id,
audience, outcome — never secrets or token strings. Where delegation applies, the event records
both the **subject** (`sub`, the human) and the **actor** (`act`, the SA).

**Token lifecycle (3 events).**

| Event | Payload | When |
|---|---|---|
| `n8n.audit.service-account.token.minted` | `{ sub, act?, clientId, aud, outcome }` | The internal mint service issues a token. Autonomous → `sub = SA`, no `act`. Delegated → `sub = human`, `act = SA`. |
| `n8n.audit.service-account.token.exchanged` | `{ sub, act, clientId, aud, outcome }` | The token-exchange grant runs at the AS itself (server-side), so delegation is auditable even for callers that don't go through the mint service. |
| `n8n.audit.service-account.token.verified` | `{ sub, act?, aud, outcome }` | A protected resource verifies an inbound token. `act` is the token's actor, when present. |

**Account & impersonation lifecycle (5 events).** These were already emitted, but no relay
consumed them, so they never reached the audit log. That's now fixed. Each carries the **human
actor** (`userId`) and the SA (`serviceAccountId`):
`n8n.audit.service-account.created`, `.role-changed`, `.deleted`, `.impersonation.started`,
`.impersonation.ended`.

**One nuance to know.** The `minted` event fires only for tokens that go through the internal
mint service (the agent path). A direct external `client_credentials` call to `/oauth/token`
gets a token but no `minted` row. Verification and exchange are audited for everyone, because
they happen server-side. For a delegated mint, the client-side `minted` and the server-side
`exchanged` both fire on purpose (one records "the agent asked", the other "the AS issued"),
and they line up with the `verified` event by their shared `jti` (a correlation id logged at
mint and verify).

### Seeing the trail: the DB sink (PoC)

Audit events travel over the MessageEventBus, so any log-streaming destination can receive
them. For the demo we added a **database sink**, so the trail is visible inside the instance
without having to wire up an external destination. This is what makes the whole audit story
demoable: mint, exchange, verify, and the account/impersonation lifecycle all land in one
queryable table.

- **Opt-in via `N8N_AUDIT_LOG_DB_SINK=true`.** On boot, the log-streaming module adds an
  in-memory destination — `MessageEventBusDestinationDatabase`, subscribed to `*`
  (`log-streaming.module.ts:32`) — that writes every event it receives into a new
  `audit_log_event` table (migration `1785900000001`). It's recreated on every boot and never
  saved to the destinations config, so it needs no serialize/deserialize.
- **The table** (`AuditLogEvent`): `id` (the originating EventMessage uuid — reused as the
  primary key, so re-delivery is idempotent), `eventName` (indexed), `message`, `ts` (the
  event's *own* timestamp, kept separate from `createdAt`, which is ingest time), and `payload`
  (JSON). The destination's `anonymizeAuditMessages` flag is honored.
- **Browsing it:** `GET /rest/eventbus/audit-log-events` (scope `eventBusDestination:list`; not
  license-gated, unlike the streaming-destination endpoints), paginated, with an optional
  `prefix` filter — e.g. `prefix=n8n.audit.service-account` shows just the identity events. A
  settings page (`AuditLogView.vue` + `auditLog.store.ts`) renders it as a filterable,
  server-paginated table.
- **PoC caveats, called out in the code:** the sink subscribes to **all** events (`*`), not
  only `n8n.audit.*`, so filter by prefix to see the audit ones; the table is **unbounded, with
  no pruning**; each event is a separate `save` (no batching); and the store/page are
  deliberately lightweight (the store isn't even in the `STORES` enum). Fine for a demo, not for
  production retention.

---

## Shortcuts we took (and the upgrade path)

- **Provisioning isn't atomic, and its transaction style is a known review blocker.**
  `ServiceAccountsService.create/.delete` open their own transactions and take no `ctx`, so WP2
  uses **compensation** (tear the SA down if a later step fails) instead of one enclosing
  transaction. They also do it via `this.userRepository.manager.transaction(...)`
  (`service-accounts.service.ts:114,232`) — reaching into `.manager` from a *service*, which
  `AGENTS.md` calls a reviewer-rejected anti-pattern. Lint doesn't catch it (the rule catches
  the *import*, not `.manager`), so it passed CI. One fix covers both: accept a `ctx` and inject
  `TransactionRunner`, the way `oauth-token.service.ts:62` already does.
- **Discovery: fallback, no caching, `ssrf:'disabled'`.** If discovery fails we fall back to the
  hardcoded endpoint; metadata is re-fetched on every tool call; SSRF is disabled because the
  target is this same instance. All fine for an internal PoC. → cache the metadata (CacheService);
  turn SSRF back on for external targets.
- **Credential selection is fixed to the acting SA's internal credential.** No per-AS binding
  yet (in-code TODO).
- **Security items deferred as in-code TODOs:** (a) confused-deputy guard — check that the
  discovered `resource` equals the target we meant to call; (b) select the credential by the
  discovered AS issuer; (c) external-AS SSRF/issuer-allowlist. A fourth is now on the list: the
  `disabled` check on the machine path (see [Where the tracks meet §1](#1-disabled-is-an-off-switch-for-the-human-path-only)).
  OBO adds three more (see [Delegated tokens](#delegated--on-behalf-of-tokens--internal-slice-built-this-session)).
- **No node `typeVersion` bump** — the new auth option is a backward-compatible enum value.
- **Inline / sub-agents have no SA** → the mint hook fails closed. Acceptable; noted.
- **Provisioning actor = the instance owner** (the `AgentsService.create` call chain has no
  human `User` to use).
- **License seats: issuance is handled, the reported count isn't.** SAs are exempt from the
  quota check when a cookie is issued (`auth.service.ts:302–315`), and creation skips it
  (`service-accounts.service.ts:112–113`), so nothing is blocked today. Still open: if a real
  seat count is ever added, it must filter `type = 'user'` — the note is at
  `user.repository.ts:98–101`, and `countUsersByRole` already does it.
- **No data migration for the secret** — bcrypt is one-way and Track 2 is unshipped, so
  dev/demo rows get recreated rather than migrated.

---

## Known rough edges (Track 1 follow-ups still open)

Open, low-severity, and recorded nowhere else.

- **`PATCH /me/settings` returns 403 in every SA session.** Correctly guarded
  (`me.controller.ts:325`), but the frontend calls it unprompted from `useCalloutHelpers.ts:118`
  and `app/stores/workflows.store.ts:319,362`. Visible effect: dismissed callouts don't stay
  dismissed while impersonating.
- **`PersonalizationModal.vue:564`** sends you to the homepage whenever you aren't already
  there. The SA fix routed *around* it (`users.store.ts:418`) rather than fixing it, so it still
  yanks a human who followed a deep link on first login. A pre-existing wart.
- **An SA can request a workflow review but can never *be* a reviewer** —
  `user.repository.ts:187–205` filters to real users, partly because the sorting downstream
  assumes a real email address. Probably right; worth confirming as a product decision.
- **Attribution of what the SA then *does*.** The account/impersonation lifecycle is now audited
  (see [Audit trail](#audit-trail)), and tokens carry subject + actor. But regular domain
  events and `updatedAt` written *during* impersonation still record the SA, not the human —
  so "who changed this workflow while impersonating" is still only answerable from logs, not
  from the row itself.
- **Multi-tab.** Tab B keeps a stale user in memory while its requests already go out as the SA.
  It corrects itself on the next navigation.

---

## Gaps we wanted to research but didn't reach

### Delegated / on-behalf-of tokens — internal slice built (this session)

This is no longer the biggest open item. The **internal** case is built and green (GATE-OBO). A
human-triggered agent run now mints an RFC 8693 delegated token — `{sub: human, act: {sub: SA}}`
— instead of the autonomous `sub = SA`, and the MCP-trigger boundary resolves both identities.

**It always partly existed.** Impersonation is real RFC 8693 delegation, with a real `act` claim
(`auth.service.ts:32–48`) checked on every request (`:497`) — but only for **human→SA in the
browser**. The machine path (`generateAccessTokenOnly` → `generateTokenPair`,
`oauth-token.service.ts:53,69`) emitted **no `act`** at all. This slice adds `act` to the machine
path, in the **mirror** direction — impersonation is `sub=SA, act=human`; agent-OBO is
`sub=human, act=SA`.

**"Who is acting" already had two opposite answers. We picked a third, and said which.**

| Path | Resolves to | Meaning |
|---|---|---|
| `scoped-jwt.strategy.ts:63`, `mcp-api-key.service.ts:76` | `actor ?? subject` — the **actor wins** | a service acts *for* a user, using its own authority |
| Impersonation (`auth.service.ts:37–43`) | the **subject** acts; `act` is ignored for authz | a human sets aside their own authority and takes the SA's |
| **Agent-OBO (new)** | the **subject** (the human) authorizes; `act` = SA is kept for attribution | the agent acts *as* the human who triggered it, carrying its own identity alongside |

**We avoided the concrete trap.** The `auth.service.ts` doc comment already warned that
`req.tokenGrant` readers do `actor ?? subject` — so filling in `actor` there would silently
**swap who is in charge**, agent for human, with no error anywhere. We treated that as a design
input, not something to trip over later: **the OBO path does not touch `req.tokenGrant`.** It
lives in the OAuth verify path (`verifyOAuthAccessToken`), which reads the subject from `sub`,
puts the actor in the *separate* `UserWithContext.actor` field (from `act.sub`), and
**authorizes against the subject** (`resource.authorize(user)`, where `user` is the human).
GATE-OBO pins this down: with the same SA and the same resource, a delegated-as-Alice token is
**accepted** (Alice has execute), and an autonomous-as-SA token is **denied** — so authorization
follows the human, not the agent.

**How it's shaped (RFC 8693-correct), in two steps:**

1. The SA mints its **own** access token via `client_credentials` (reusing the existing path).
2. A **token-exchange grant** (`urn:ietf:params:oauth:grant-type:token-exchange`, a sibling
   middleware to `client_credentials` on the same `/oauth/token`) takes a `subject_token` (a
   short-lived, `purpose`-tagged assertion the AS self-mints for the internal human) and an
   `actor_token` (the SA token from step 1), and returns `{sub: human, act: {sub: SA}}`.

The `act` claim comes from the **`actor_token`, not from client authentication**. (A first cut
derived it from `client_id`, which merged the OAuth client with the RFC actor and limited actors
to SAs; the fix means **any principal holding an access token can be an actor**.) The human is
threaded in via `IWorkflowExecuteAdditionalData.actingOnBehalfOfUserId`, set only on the
interactive/chat path where a human is actually present; the autonomous/published path stays
autonomous.

**What "internal" buys, and what "external" still needs.** Internal works because n8n *is* the
human's authority — it can self-mint the `subject_token`. External delegation (a human whose
identity comes from an outside IdP) needs the **real inbound token threaded** from the request
down to the mint, to use as the `subject_token`, validated by the token-exchange module's
existing JWKS/identity-resolution half. Today we thread only a **userId**, not a live token.

**Deferred (in-code TODOs):** `may_act` (is this actor allowed to act for this subject, and may
this client present this actor_token?); decoupling client-auth from the actor so a **non-SA**
actor works in this same slice (today the caller still authenticates as the SA's client);
external-AS `subject_token` threading. Minor: the two-step refactor dropped `userId`/`targetUrl`
from the mint-*failure* warn log (the audit event still carries `sub`/`aud`).

### Other gaps

- **`AgentsCredentialProvider` attribution** — tracing third-party credential use back to the
  SA. Dropped when decision 1 was made (the provider is genuinely untouched — it doesn't appear
  in `git diff --name-only master..HEAD`). Worth revisiting as a *separate*, non-scoping
  mechanism (attribution metadata, not access control).
- **Second call site** (`delegate-sub-agent-tool.ts`) for an agent-to-agent demo beat — not
  done.
- **External OAuth2 AS support** — designed-for (the discovery seam + credential↔AS binding),
  not built.
- **Cross-instance / cross-org** — out of scope, as planned.

---

## Lessons

1. **A "free" seam that type-checks can still be semantically wrong.** The credential-provider
   `user` param accepted an SA, but SA project-scoping inverts what the param is *for*. Keep
   "the identity that authorizes" and "the identity a token represents" as separate axes.
2. **The protocol loop was already half-built.** n8n *serves* RFC 9728 + 8414 on the resource
   side; only the client was hardcoding. Finishing the loop was cheap, and it let us honestly
   claim "pure OAuth2 transport/discovery" for the internal case.
3. **A test can pass through a fallback and hide a broken main path.** The real-HTTP proof was
   green via the hardcoded fallback, because the test server's `webhookBaseUrl` port didn't
   match and discovery was silently failing with `ECONNREFUSED`. Fix: assert the *observable*
   (the discovered `token_endpoint` value), not just the end result.
4. **The "real boundary" proof has a cost.** Choosing a real HTTP `client_credentials`
   round-trip over an in-process mint is exactly what forced the reversible-secret change. Worth
   it for the demo, but the coupling wasn't obvious up front.
5. **A service account is a user-shaped hole — every implicit "is this a real person?" check is
   a latent bug, front-end and back.** `password IS NULL`, `personalizationAnswers == null`,
   `settings == null`, `mfaEnabled === false` are all used as shorthand for "half-set-up human",
   and every one of them broke. **Corollary: fix the gate, not the stored data.** Backfilling
   `personalizationAnswers` at creation was rejected because it stores a claim the account can
   never make, is read as real downstream (`templates.store.ts:170`), ties SA creation to a
   versioned survey schema, and would only have helped SAs created *after* the fix. The guard
   went on the gate instead (`users.store.ts:418`). Same shape as lesson 1 — a seam that
   type-checks but means the wrong thing — only in data rather than an API.

---

## Where it stands

All green. The proof gates GATE-1/2/3/4/6 (autonomous self-auth) **and GATE-OBO** (delegated
`{sub: human, act: SA}` with authorize-as-subject) pass. The OBO slice is RFC 8693-correct
(`act` from the `actor_token`, two-step mint), and the audit trail records subject + actor
across the token lifecycle plus the account/impersonation lifecycle. The oauth-server / OBO /
audit suites are green (255 tests at last run), and cli typecheck + lint are clean. The last
full monorepo build was 69/69 (before OBO; OBO is cli-only plus one rebuilt `n8n-workflow`
interface field, and it composes clean).

The audit events are also browsable in-instance via the opt-in DB sink (see
[Seeing the trail](#seeing-the-trail-the-db-sink-poc)) — a new `audit_log_event` table
(migration `1785900000001`), a `GET /rest/eventbus/audit-log-events` endpoint, and a settings
page; it compiles clean and its tests pass (14).

Runbook: `packages/cli/src/modules/oauth-server/SERVICE_ACCOUNT_PROOF.md`. Everything is on
`afitzek/track-2-implementation` (Track 3 + discovery + OBO + audit + the audit-log DB sink
uncommitted).
