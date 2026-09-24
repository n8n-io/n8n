# CONTEXT-142 verdict: how an MCP client confirms a preference write

Spike branch: `spike-mcp-preference`. Everything below was measured against a
locally built n8n (master + the spike prototype on this branch) on 2026-09-15,
with Claude Code 2.1.236 as the real client and a raw JSON-RPC harness
(`context-142-harness.mjs`) as ground truth.

## Recommendation

Build the MCP preference write on **MRTR elicitation with a model-mediated
fallback, gated by a dedicated OAuth scope**:

1. **Elicitation is real and works today** — as the multi-round-trip
   (`input_required`) flow of the 2026-07-28 protocol, not as the push-style
   `elicitInput` the ticket assumed. It works over n8n's stateless transport
   because the retry carries everything back. Claude Code already completes
   the round-trip.
2. **The fallback is the model-mediated `confirmed: true` argument.** It must
   exist: the same client that elicits in one session rides the legacy leg in
   another (measured, see below). When the client can elicit, the elicit
   branch takes precedence, so `confirmed: true` cannot bypass the user.
3. **Ship the `aiPreference:write` OAuth scope regardless.** It is the only
   confirmation-independent gate that covers every client, and the consent
   ceremony absorbs it with a ~30-line change (measured, screenshot below).
4. **A preference written through an accepted elicitation should start
   active, not pending.** The user answered an explicit question. Pending is
   worth considering only for the model-mediated path; see the trade-off
   below rather than a hard verdict.

## What the ticket got wrong (and why it matters)

- **n8n is not on SDK 1.26.0 for the MCP server.** The instance server runs
  `@modelcontextprotocol/server` **2.0.0** (v2 family); SDK 1.26.0 remains
  only for the OAuth endpoints and the McpTrigger node. On the 2026-07-28
  revision there is **no server→client request channel at all** —
  `server.elicitInput()` throws before any wire traffic
  (`_assertPushApiInServedEra`). Elicitation is instead **MRTR**: the tool
  handler returns `resultType: 'input_required'` with embedded
  `inputRequests`; the client shows the question to the user and **retries
  the same `tools/call`** with `inputResponses`; the handler reads them via
  `acceptedContent()` / `inputResponse()`.
- **Statelessness is therefore not the blocker.** The prior belief
  ("stateless transport rules out elicitation") was true for the 2025
  push-style model and is false for MRTR. What statelessness does rule out is
  elicitation for **2025-era clients**: their capability declaration lives in
  `initialize`, which a per-request server instance never saw, so the
  capability view is empty and the SDK refuses the round.

## Evidence 1: ground-truth harness (raw wire, all 8 scenarios pass)

`MCP_TOKEN=<api key> node context-142-harness.mjs` against a local instance
(API key auth = all tools). Modern-era requests need the 2026-07-28 routing
headers (`Mcp-Method`, `Mcp-Protocol-Version`, `Mcp-Name`) or the server
answers `-32020`.

| # | scenario | result |
|---|----------|--------|
| 1 | modern era, `elicitation: {form:{}}` declared, first call | `input_required`, `inputRequests.confirm` |
| 2 | retry, `action: accept`, `confirm: true` | row persisted, id returned |
| 3 | retry, `action: accept`, `confirm: false` | not saved, "user answered no" |
| 4 | retry, `action: decline` | not saved |
| 5 | retry, `action: cancel` | not saved |
| 6 | modern era, no elicitation capability, unconfirmed | fallback: "ask the user, re-call with confirmed: true", nothing saved |
| 7 | same, `confirmed: true` | row persisted, tagged `model-mediated` |
| 8 | 2025-era stateless legacy leg (no envelope) | fallback branch, nothing saved |

Persistence cross-checked via `GET /rest/ai-preferences`: exactly the two
rows from scenarios 2 and 7 existed; decline/cancel/no persisted nothing.

## Evidence 2: Claude Code 2.1.236 (the real client)

Connected via `claude mcp add --transport http` with a bearer header. Two
headless (`claude -p`) sessions, same client, same server:

- **Session 1 handshook with `initialize` at `protocolVersion: 2025-11-25`**
  — and its declaration includes `elicitation: {}`. Claude Code *supports*
  elicitation on the 2025 protocol. But every `tools/call` in that session
  rode n8n's stateless legacy leg (no per-request envelope), where the
  declaration is lost, so the tool served the **fallback**: first call
  returned the "ask the user" instruction, the model re-called with
  `confirmed: true`, row saved (`confirmationPath: model-mediated`).
- **Session 2 handshook with `server/discover` (2026-07-28)** and every
  `tools/call` carried the full envelope (`clientCapabilities:
  { elicitation: {} }`). The tool returned `input_required`; Claude Code
  **completed the MRTR round-trip**, retrying with `inputResponses:
  { confirm: { action: 'cancel' } }` — auto-cancel, because a headless
  session has no UI to show the form. Honest client behavior.
- **The elicit branch blocks the bypass.** In session 2 the model, after the
  cancel, retried with `confirmed: true`. Because the client had declared the
  capability, the handler elicited again instead of honoring the argument.
  The model then correctly told the user nothing was saved.
- **The same client exercises both paths, but the trigger is not pinned
  down.** Across the spike, Claude Code handshook with `initialize` (2025,
  legacy leg, un-elicitable) on two early sessions and with `server/discover`
  (2026-07-28, modern, elicitation) on the rest: 7 legacy probe lines against
  27 modern in the server log. So the fallback is a real path the flagship
  client hits, not a hypothetical for old clients. But a retest of five
  consecutive fresh sessions, including a full MCP remove/re-add, all
  negotiated the modern era, so the legacy leg could not be reproduced on
  demand. What flips a session to the 2025 `initialize` handshake is not
  established here; it may depend on Claude Code's own discovery/caching
  state. Conclusion for the design: the fallback is necessary because the
  legacy path demonstrably occurs, but its real-world frequency is unknown
  and should be read from the `confirmationPath` telemetry in production
  rather than assumed.

- **Interactive session, measured:** the session handshook on the 2025 era
  (legacy leg), so elicitation was unavailable. The tool served the fallback;
  the model called twice ("Called ctx142 2 times") and saved with
  `confirmed: true` **without asking the user anything** - it judged the
  user's original "save this preference" request as the explicit agreement.
  No confirmation UI of any kind appeared. Defensible for an explicit save
  request, but it is the CONTEXT-132 finding reproduced: on the fallback
  path, the confirmation exists only in the model's judgment.

- **Interactive session on the modern era: the elicitation form renders.**
  A later fresh session handshook on 2026-07-28, and Claude Code displayed a
  dedicated panel: `MCP server "ctx142" requests your input`, the tool's
  `message` (truncated to two lines with a "+2 more lines" expander), and the
  boolean rendered as a checkbox using the schema's `title` and
  `description`. The status line showed the MRTR mechanics verbatim
  ("Fulfilling input required by 'tools/call' (round 1)").
- **Cancel and decline both hold.** The user dismissed the first form
  (`action: cancel`, nothing saved); the model re-prompted once, the user
  declined (`action: decline`, nothing saved), and the model stopped
  retrying and reported honestly that the n8n save was declined. The user
  cannot be pushed past the form.
- Side observation: Claude Code also saved the preference to its own local
  memory store. Client-side and n8n-side preference stores will coexist and
  can drift; the tool description should not pretend otherwise.

## Evidence 3: the consent gate (`aiPreference:write`)

Adding the scope took: one entry in `MCP_INSTANCE_SCOPES`
(`packages/@n8n/api-types/src/schemas/mcp.schema.ts`), one `TOOLS_BY_SCOPE`
row (`packages/cli/src/modules/mcp/mcp-scopes.ts`), one FE group + icon
(`mcpAccess/mcp.constants.ts`) and one i18n label. Measured with a
DCR-registered client requesting `workflow:read aiPreference:write`:

- The consent screen renders an **"AI preferences" group with "1 tool"**,
  the requested scopes act as a ceiling ("2 of 2 scopes selected"), and the
  per-group checkboxes allow narrowing. Screenshot:
  `context-142-consent-screen.png` (repo root, this branch).
- The issued token echoes `scope: workflow:read aiPreference:write`, and
  `tools/list` under it returns exactly the 11 `workflow:read` tools plus
  `save_user_preference` (12 total). Registration-time filtering needs no new
  enforcement code.
- Consequence for already-connected clients: a granted scope set is fixed at
  authorization, so existing grants never contain the new scope and the tool
  simply does not register for them until the user re-authorizes. That is the
  desired behavior — the scope is the deliberate opt-in.
- The consent screen is per-client and one-time; elicitation is per-call.
  They compose rather than compete: the scope answers "may this client ever
  write", elicitation answers "does the user want this specific write".

## The fallback, and why -32021 alone is unacceptable

For a non-capable request, returning `inputRequired` anyway would make the
SDK answer `-32021 MissingRequiredClientCapabilityError`. That surfaces to
the model as a protocol error with no user-facing question — the write just
fails, and nothing tells the user why. The fallback instead returns a
successful result instructing the model to ask the user verbatim and re-call
with `confirmed: true`.

Measured reliability, twice: in a headless run where the user pre-authorized
in their prompt, and in an **interactive** run where the user simply asked to
save, the model treated the request itself as confirmation, re-called with
`confirmed: true`, and never put a question to the user. Both saves were
defensible (the user had explicitly asked), but the instruction to confirm
verbatim was skipped both times. Confirmation on this path lives in the
model's judgment, not in a control we hold. That is exactly the CONTEXT-132
concern, now reproduced against the write tool. The unprotected case is a
save the user never asked for; the fallback offers no structural defense
against it.
The mitigations that are structural rather than hopeful: the elicit branch
overrides `confirmed: true` whenever the client can elicit, every write is
tagged with its `confirmationPath` (so we can measure the split in
production), and the row is visible and deletable in Settings → Context →
Preferences.

## Should an MCP-written preference start pending?

- **Elicitation-accepted: no.** The user answered an explicit protocol-level
  question. A pending state would be a second confirmation of the same act.
- **Model-mediated: defensible, but priced.** The cost is a state column
  (single-status suffices — `workflow_publication_outbox` precedent — the
  two-axis `workflow_review_request` shape is overkill), one gate in
  `AiPreferenceRepository.visibleTo()` (all four read paths funnel there, so
  pending rows stay out of prompts by construction), and — the expensive,
  easy-to-underestimate part — an approve surface plus a nudge that a pending
  item exists. An approval nobody sees is a silent failure: the model
  believes it saved, the user never activates it.
- **Recommendation:** split by path. Elicitation-accepted writes start
  active. For model-mediated writes the interactive test showed the model
  skips the confirmation it was instructed to relay, so pending (or at
  minimum a prominent post-save notice with one-tap removal) is the only
  structural protection on that path. If pending is judged too expensive for
  the MVP, ship model-mediated writes active but tagged, and treat a
  meaningful model-mediated share in the `confirmationPath` telemetry as the
  trigger to add it.

## Call frequency

From production telemetry (`User called mcp tool`, last 30 days):
~34.1M tool calls from ~76.7k distinct users (~444 calls/user/month); write
tools are ~19.5% of calls, dominated by `update_workflow` /
`create_workflow_from_code`. The deliberate, rare write tools are the right
comparators: `create_folder` 3.7k calls / 1.3k users, `move_workflows_to_folder`
4.7k / 1.3k, `rename_data_table` 2.3k / 1k — **~2–4 calls per using-user per
month**, used by ~2% of MCP users.

A preference write throttled by its description ("only when the user
explicitly asks to remember") lands at or below that band: **order 0–3 calls
per user per month, near zero for most users**, with an elicitation
round-trip doubling the request count of actual writes. This is a rare event;
ceremony cost per write is acceptable, standing infrastructure (pending
queues, inbox surfaces) is not justified by volume.

## What production needs beyond this prototype

- `requestState` stays unused (the retry re-carries the arguments, so
  single-round MRTR needs no server state). If a future flow ever puts data
  in `requestState`, it round-trips through the client as
  attacker-controlled input — `ServerOptions.requestState.verify` with
  `createRequestStateCodec` (HMAC) becomes mandatory; n8n configures neither
  today.
- A real gate for the write tool. The spike registers `save_user_preference`
  whenever `N8N_SPIKE_AI_PREFERENCES` is not `false` (on by default so a
  deployed test build needs no env setup), decoupled from the production
  `111_context_preferences` PostHog flag. Production must put the tool behind
  a proper flag or scope, not a spike env default.
- Telemetry classification: `getToolCallOutcome` in `mcp.service.ts` reads an
  `input_required` result as a plain success. Harmless, but the
  `mcp-tool-called` event should learn an `input_required` outcome so the
  elicitation funnel is measurable.
- The handshake-only instructions block means a preference saved mid-session
  is not reflected in the injected block until reconnect. The tool result
  tells the model what was saved, which covers the session; the gap closes on
  the AIA side via CONTEXT-139's per-turn injection and has no MCP equivalent
  yet.
- i18n, tests (the drift-guard covers the scope map already), and the tool
  description workshopped the way CONTEXT-132 did.
- Claude Code sends no `_meta` envelope on some sessions (2025-era
  handshake); any design must keep both branches. Re-verify era behavior when
  Claude Code updates.

## Open risks

- Only one real client measured. Cursor, VS Code, Claude Desktop (via
  mcp-remote, which historically dropped capabilities) and Gemini CLI were
  out of scope by decision; the fallback path covers them regardless, but
  their elicitation UX is unverified.
- The era flip between Claude Code sessions is observed, not explained. Both
  handshakes occurred (7 legacy vs 27 modern probe lines), but five
  consecutive retests including a remove/re-add all went modern, so the
  legacy leg could not be reproduced on demand and its trigger is unknown.
  Production `confirmationPath` telemetry is the only reliable read of how
  often the fallback carries a real write.
- The elicitation form schema is restricted to flat primitives; the
  confirmation UX is whatever the client renders for a boolean field, and we
  do not control the wording beyond `message`.

## Reproduce

1. Branch `spike-mcp-preference`, `pnpm exec turbo run build --filter=n8n`.
2. `N8N_USER_FOLDER=<scratch> N8N_LOG_LEVEL=debug node packages/cli/bin/n8n start` (Node 24). The tool is on by default; set `N8N_SPIKE_AI_PREFERENCES=false` to disable it.
3. Owner setup → `PATCH /rest/mcp/settings {"mcpAccessEnabled":true}` → `GET /rest/mcp/api-key`.
4. `MCP_TOKEN=<key> node context-142-harness.mjs`.
5. Probe lines: `grep 'CONTEXT-142' <server log>`.
