# n8n Hub: nodes as a platform

**Status:** Build-guidance draft for Notion (`n8n hub` page)
**Date:** 2026-05-10
**Author:** Filipe Tavares (drafted with Claude)

---

## Strategic framing

n8n's moat is the integration layer: 400+ nodes, with auth, retries, pagination, schema, and a credential store users already populated. That moat is currently locked behind one consumer — workflows.

**The bet:** make every n8n node callable from outside a workflow, over MCP and a typed SDK, using credentials the user already connected. n8n becomes the universal integration layer; workflows are the first consumer, not the only one.

**Workflows are not legacy.** They remain n8n's orchestration product (triggers, branching, scheduling, HITL, sub-workflows). Nodes-as-platform is a complementary surface for two new audiences who need integrations but not orchestration:

- **AI agents** want their LLM to "just have tools." Today they install per-vendor MCP servers (Slack, Notion, Sheets, …), each with its own auth dance. We replace all of them with one auth handshake to n8n.
- **Backend developers** want to call Slack, Sheets, Postgres, Linear from their app without managing OAuth, refresh tokens, retries, or vendor SDKs.

Existing n8n users benefit too: their connected credentials become reusable in agents and code.

This proposal is **additive**. We don't deprecate anything. We expose what we already have through two new doors.

---

## TL;DR

- **What:** Single-node execution exposed through (a) MCP server with **dynamic tool search**, (b) typed SDK whose surface is generated from the user's instance, (c) shared `POST /executions/node` API.
- **Why:** Three audiences (agent builders, backend devs, existing users) want our integration layer without writing a workflow. Competitors (Composio, Arcade, Zapier) are circling this space; our edge is integration depth + a credential store users already populated.
- **Demo:** A multi-step task that *only n8n can do well* — Claude pulls a Postgres query, joins with a Linear lookup, posts a formatted summary to Slack. Three credentials, three integrations, zero per-vendor setup. Then the same flow as a 15-line SDK script.

---

## The MCP tool-search pattern (centerpiece)

**Problem:** if we register every (node × resource × operation) tuple as an MCP tool, the catalog explodes to thousands of tools. Anthropic's own guidance is ≤30 tools per agent for usable quality. Slack MCP works because it exposes ~10 curated tools — not 200.

**Solution:** Don't register all tools at once. Expose **a small set of meta-tools** that let the agent discover and load the specific tools it needs for the task.

```
User: "I want to build a voice agent."
Agent calls: n8n_search_tools({ query: "voice agent" })
n8n returns: [
  { id: "elevenlabs.textToSpeech", description: "...", inputSchema: {...} },
  { id: "deepgram.transcribe", description: "...", inputSchema: {...} },
  { id: "openai.chatComplete", description: "...", inputSchema: {...} },
  { id: "twilio.makeCall", description: "...", inputSchema: {...} },
  ...up to N most relevant
]
Agent now has ~10 focused tools loaded for this session.
Agent calls: n8n_execute_tool({ id: "elevenlabs.textToSpeech", credentialId, params })
```

The MCP surface is **two or three core tools, not thousands**:

| Tool | Purpose |
|---|---|
| `n8n_search_tools(query, filters?)` | Semantic search over the user's available nodes/operations. Returns ranked list with input schemas. Filters by category (e.g., "messaging", "databases"), by credential availability ("only tools where I have a credential connected"), or by node name. |
| `n8n_execute_tool(toolId, credentialId, params)` | Generic executor. Looks up the (node, resource, operation), validates params against schema, dispatches to `POST /executions/node`. |
| `n8n_list_credentials(nodeType?)` | List the user's connected credentials, optionally filtered by what's needed for a tool. Lets the agent pick the right `credentialId` without the user pasting it manually. |

This pattern has three large benefits:

1. **Solves the tool-count UX problem.** Claude/Cursor never see >30 tools at a time.
2. **Onboarding is one click.** "Install n8n MCP" gives an agent access to *everything*, not "install Slack MCP, then Notion MCP, then…"
3. **Composability.** Agents naturally chain: search → list creds → execute. No fragile pre-baked toolset.

**Implementation:**
- `n8n_search_tools` runs over the same registry that `createAiTools` already iterates (`packages/cli/src/tool-generation/`). Embedding-based search if we want quality; keyword + tag matching is fine for v1. Tag categories already exist on nodes via `description.codex`.
- The "tools" returned are derived from `INodeTypeDescription` at request time — no static registration.
- "Filter by available credentials" is a join with the user's credentials table.

**This is the pattern. Everything else in the doc serves it.**

---

## What we're building

A single primitive — **execute a node with a credential** — exposed via three surfaces:

```
              ┌────────────────────────────────┐
   Claude  ──▶│  n8n MCP server                │
   Cursor  ──▶│  - n8n_search_tools            │──┐
   Custom  ──▶│  - n8n_execute_tool            │  │
              │  - n8n_list_credentials        │  │
              └────────────────────────────────┘  │
                                                  ▼
                                  ┌──────────────────────────────┐
              ┌──────────────────▶│  POST /executions/node        │──▶ Node executor
   Backend  ──▶│   n8n SDK         │  (shared execution API)       │   (1-node workflow
   Scripts ──▶│   typed proxy     │                                │    under the hood)
              └──────────────────┘  └──────────────────────────────┘
                                                  │
                                                  ▼
                            Existing credential store (unchanged)
                            Existing executions table (mode='single-node')
                            Existing billing hooks (reused)
```

**Key design decisions:**

- **Credentials never leave n8n.** Clients pass `credentialId`; the executor resolves and decrypts server-side. No secret material on the wire.
- **Single execution primitive.** MCP and SDK are two clients of the same API.
- **Action nodes only.** No triggers, no schedule, no webhooks. We later clarify which utility nodes (Set/Code/IF) are exposed.
- **Single-node executions are real executions** — they show up in the executions view, count toward billing, are auditable.
- **Registry-driven, not hardcoded.** Tool schemas are derived from `INodeTypeDescription` at request time. Adding a new node to n8n automatically adds it to MCP and SDK.

---

## Hero scenarios

These showcase **integration depth + zero setup** — the things only we can do.

### 1. Voice agent (the user's example)

A developer is building a Twilio-based voice agent and asks Claude to wire it up. Claude calls `n8n_search_tools({ query: "voice agent" })`, gets back ElevenLabs, Deepgram, OpenAI, Twilio tools. The user has Twilio and OpenAI credentials connected to n8n already; ElevenLabs needs a one-click OAuth. Five minutes later the agent works end-to-end. **Compare to:** install Twilio SDK, OpenAI SDK, ElevenLabs SDK, Deepgram SDK, manage four sets of API keys, write the glue.

### 2. Cross-system AI summary (the killer demo)

User in Claude Desktop: *"Summarize yesterday's PRs from our top three repos, cross-reference them with the linked Linear tickets, and post the digest to #engineering."* Claude calls:

1. `n8n_search_tools({ query: "github linear slack summary" })` → 8 tools loaded.
2. `github.searchPullRequests({ credentialId, query: "merged:>=2026-05-09" })`
3. `linear.getIssues({ credentialId, ids: [...extracted from PR descriptions] })`
4. `slack.sendMessage({ credentialId, channel: "#engineering", text: summary })`

**Three integrations, three credentials, zero per-vendor MCP setup.** This is the demo that closes the deal.

### 3. Backend script with a connected Sheet

```ts
import { createClient } from '@n8n/sdk';
const n8n = createClient({ baseUrl, token });

const rows = await n8n.googleSheets.readRows({
  credentialId: 'cred_abc',
  spreadsheetId: '1xyz',
  range: 'A1:D100',
});
```

No OAuth library. No token refresh. No `googleapis` SDK. The same Sheets credential that runs in production workflows.

---

## Pricing model — the existential question

This is **not** an open question. Without a model, the proposal is unshippable. Three real options:

| Option | How | Risk |
|---|---|---|
| **A. SDK/MCP calls = workflow executions** | One execution = one billable unit, regardless of source | A chatty agent burns a month's quota in minutes. Uncompetitive for AI use cases. |
| **B. Separate, cheaper "node call" tier** | Node executions priced lower than workflow executions, separate quota | Fairer pricing, but two meters to manage. Requires billing changes. Cloud-only impact. |
| **C. Free tier + paid SDK/MCP** | Limited free volume; paid plans for production use | Lowest friction for adoption, hardest to model revenue. Composio/Arcade ballpark: ~$0.01-0.05 per call. |

**Recommendation:** ship hackathon as A (free, reuses existing meter). For production, **B with a free tier**: separate cheap meter for node calls (e.g., 10× cheaper than workflow executions), generous free tier to drive adoption, with a "node-call burst" enterprise add-on. This protects workflow margins while opening the new audience.

**Self-hosted is unaffected** by this — node calls are free of n8n's billing on self-hosted. This may turn out to be a major adoption driver for enterprise self-hosted users.

The pricing call needs to be made before launch, not after. **It belongs in the next leadership discussion, not in this doc.**

---

## Security & trust

This is the most consequential change to n8n's threat model since multi-user. **Token theft today** = workflow tampering. **Token theft tomorrow** = silent mass exfiltration via every integration the user's credentials touch.

The product must include, day one of production:

- **Per-token credential scoping.** A token can be limited to specific credentials (e.g., "this token can use Slack-cred-X only"). Default policy: token inherits the user's full credential access; users can tighten.
- **Per-token rate limiting.** Configurable per token, with sane defaults.
- **Audit trail per call.** Every single-node execution records: caller (token/client), credential used, parameters, output size, duration. Surfaced in a "Connected apps" / "Tokens" view.
- **Read vs write scopes per credential.** Phase 2: tag node operations as read or write so a token can be restricted to "read-only Slack."
- **HITL approval for high-risk actions.** Phase 2: configurable per credential or per token (e.g., "always require approval for any `delete` operation"). Reuses workflow HITL primitives.

**Hackathon scope:** reuse existing API keys, no new scoping. Demo OK; ship-blocker for production.

The doc must call this risk out clearly to leadership. It is not "an open question."

---

## What we change in the current product

The research surfaced one consistent theme: **most of this already exists**, in pieces, just not connected. Here's the actual delta.

### Core engine (`packages/cli`, `packages/core`)

- **New:** `POST /executions/node` endpoint. Body: `{ nodeType, nodeVersion?, operation, credentialId, parameters }`. Synthesizes a 1-node workflow, calls existing `ManualExecutionService.runManually()`, returns `{ executionId, status, output }`.
- **New enum value:** `ExecutionEntity.mode = 'single-node'`. No schema migration — `mode` is already extensible.
- **No change:** `WorkflowExecute`, credential resolution, `additionalData.getCredentials`, billing hooks. Already work without a workflow context.
- **Optional, production:** ephemeral execution mode (skip persistence for ultra-fast paths).

### Auth (`packages/cli/src/modules/mcp`, `packages/cli/src/services`)

The big surprise: **n8n is already an OAuth 2.1 provider.** `/mcp-oauth/register` (DCR), `/authorize`, `/token`, `/revoke`, `.well-known/oauth-authorization-server` — all in place. Consent management, token rotation, rate limiting.

What we add:

- **Hackathon:** reuse existing MCP API keys. Zero auth work.
- **Production:** expand the OAuth scope set beyond the current `tool:listWorkflows` / `tool:getWorkflowDetails` to include `node:execute`, `credential:read`, `node:list`, `credential:scope:<id>`. Polish the consent UI. Build a "Connected Apps" management screen for users to see/revoke clients. Add per-token credential scoping to the token generation flow.

We previously thought OAuth-provider was a multi-quarter effort. **It's not. ~1-2 weeks of UX polish on top of solid infrastructure.**

### Tool generation (`packages/cli/src/tool-generation`)

- **Existing:** `createAiTools()` already iterates `LoadNodesAndCredentials`, filters by `usableAsTool: true`, produces "Tool variant" `INodeTypeDescription` entries. Production code on every n8n instance.
- **New:** `createMcpTools()` alongside it — same iteration, but produces **JSON Schema** for MCP tool inputs (not n8n Tool variants). Plus **`PropertySchemaConverter`** — the actual `INodeProperties[] → JSON Schema` translator.
- **Filter:** action nodes only — exclude `description.polling`, `description.webhooks?.length > 0`, `description.group: ['trigger']`. Define an explicit allow-list for utility nodes (Set, Code, IF) — likely **out** for SDK/MCP since they're transformations, not service actions.
- **Hard parts handled by the converter:**
  - **`displayOptions`** (conditional visibility): expose all fields, document constraints in the tool's description string. Don't try to encode in JSON Schema.
  - **`loadOptions`** (runtime dropdowns): expose **companion enumeration tools** (`slack_channels_list`, `notion_databases_list`) returned by `n8n_search_tools` when relevant.
  - **`resourceLocator`**: accept ID strings as canonical form; URL-extraction lives in a utility tool.
  - **`resourceMapper`**: defer — a small subset of nodes use it; expose as runtime-only via a "configure for node X" companion call.

### MCP server (`packages/cli/src/modules/mcp`)

The current MCP server exposes 14 workflow-level tools. We add **three meta-tools** as described above (`n8n_search_tools`, `n8n_execute_tool`, `n8n_list_credentials`). Existing workflow tools remain — they serve a different audience (workflow management) and don't conflict with node execution.

Search ranking (v1): keyword + tag match against `description.codex.categories`, node `displayName`, operation `displayName` and `description`. Rank boost for nodes the user has credentials for. Embedding-based search is a v2 upgrade.

### SDK (`packages/@n8n/sdk` — new package)

We discovered there's already an internal SDK: **`@n8n/workflow-sdk` with `generateWorkflowCode()`**, used by `@n8n/instance-ai` for AI-assisted workflow building. Action item before building: **assess whether `@n8n/workflow-sdk` can be the foundation for the external SDK, or whether it's too tied to workflow-code-generation to expose externally.** This could shave weeks.

If it's not reusable:
- **Hackathon:** Proxy-based runtime client. `n8n.slack.sendMessage(...)` intercepts via JS Proxy, lazy-fetches schema from `/types/nodes.json`, validates with Zod, dispatches to `POST /executions/node`. Weak types via JSDoc.
- **Production:** static codegen CLI — `npx @n8n/sdk pull --instance https://...` — fetches schemas, generates `.d.ts` per node, ships a versioned npm package. Runtime fallback for `resourceMapper` and `resourceLocator` search-mode. Versioning borrowed from Zapier: pin SDK to n8n version, deprecation warnings on drift, never-break-old-clients on the server.

**Output normalization:** n8n's internal data shape is `Array<{ json, binary, pairedItem }>`. The SDK normalizes to typed return values per operation — backend devs should never see n8n's internal shape. This is a product call, not just engineering.

**Two API levels:**
- **High-level:** `n8n.slack.sendMessage({ credentialId, channel, text })` — the Zapier-style ergonomic surface.
- **Low-level (post-launch):** `n8n.borrowCredential(credentialId)` returns a `fetch`-like client pre-authenticated with the user's token. Power users want this for custom HTTP, S3, Postgres patterns we haven't pre-modeled.

### UX surface (`packages/frontend/editor-ui`)

This is currently undefined and **needs to be**. Without it, the feature is invisible to existing users.

- **Settings → Connected Apps:** list of OAuth clients the user has authorized (e.g., "Claude Desktop"), with revoke. Reuse existing MCP OAuth client management.
- **Settings → API Tokens:** create/list/revoke tokens. Per-token credential scoping (production).
- **Executions view:** filter by `mode`. "Single-node" executions show caller (which token / which client), credential, parameters, output. Single most-used view.
- **Onboarding:** a visible "Connect to your AI agent" entry point in the n8n home/sidebar — turns this feature from hidden API into a product.

### Schema discovery endpoint (already exists)

`GET /types/nodes.json` returns the full node catalog. Editor uses it. SDK and MCP generator use the same data. No new endpoint needed.

---

## Distribution & GTM

Engineering effort is the easy part; **getting onto Claude Desktop's first-tier list is the actual battle.** The doc-without-this-section is incomplete.

- **Anthropic partnership.** Featured in the MCP server directory, MCP showcase blog, Anthropic newsletter. We have a credible story: 400+ integrations, one auth.
- **Claude Desktop / Cursor / Zed defaults.** Ship a one-click installer for each.
- **npm presence.** `@n8n/sdk` with strong README, working examples, a landing page (`docs.n8n.io/sdk`).
- **Wedge customer:** target one prominent AI startup (Mendable, Cognition, etc.) to use n8n SDK as their integration layer in a public case study.
- **Content:** blog post series on "skip per-vendor MCP servers," tutorial on building voice/research/coding agents with n8n.
- **Existing-user activation:** in-product banner — "Your credentials are now usable from Claude Desktop. Try it →"

This needs a launch plan owned by marketing/DevRel. Engineering and product can flag the dependencies.

---

## Differentiation vs Composio / Arcade / Zapier

Specific claims, not hand-waving:

| Capability | Composio | Arcade | Zapier NLA | n8n |
|---|---|---|---|---|
| Action catalog size | ~250 | ~150 | ~500 | **400+ (technical depth: DBs, queues, S3)** |
| User's credentials already connected | No | No | Sometimes | **Yes — workflow users come pre-loaded** |
| Self-hostable | No | No | No | **Yes** |
| Workflow orchestration as fallback | No | No | Yes | **Yes — can wrap SDK call in a workflow** |
| OAuth provider for the platform | Yes | Yes | Yes | **Yes (already built)** |

**Our two real edges:**

1. **Zero-friction onboarding for existing users.** "Connect your stack" is solved — they already did it for workflows. Composio onboarding starts from zero credentials.
2. **Self-hosted enterprises.** A self-hosted n8n inside customer infrastructure exposing nodes via SDK is "make every internal service AI-ready without buying an integration platform." This is a category Composio/Arcade can't address.

**Lock-in defense for prospects:** standard MCP protocol, exportable credentials, no proprietary tool format. We say this explicitly in marketing.

---

## Self-hosted vs cloud

Treating these as identical undersells the opportunity.

**Self-hosted (likely the bigger early prize):**
- Customer's n8n is already inside their infrastructure with credentials connected.
- SDK = "make every internal service AI-ready without procurement."
- No billing concerns (they already pay for the n8n license).
- Security model is on-prem — appeals to regulated industries.
- **Recommended launch focus.**

**Cloud:**
- Easier setup, harder ROI conversation.
- Subject to the pricing model (Section "Pricing model").
- Strong story for individual builders / prosumers.
- Free tier + cheap node-call meter is the right shape.

The doc, the marketing, and the sales motion should treat these as two separate value props.

---

## Hackathon scope

**In:**
- `POST /executions/node` backed by 1-node-workflow synthesis.
- `createMcpTools()` deriving JSON Schema for **all** action nodes (not hardcoded). 5-8 hero nodes featured in the demo (Slack, Sheets, Notion, Gmail, HTTP, Postgres, Linear).
- The three MCP meta-tools (`n8n_search_tools`, `n8n_execute_tool`, `n8n_list_credentials`).
- Runtime Proxy SDK (or thin layer over `@n8n/workflow-sdk` if reusable).
- PAT auth (reuse existing MCP API keys).
- Single-node executions appear in existing executions list with `mode='single-node'`.
- Hero demo: cross-system Claude task (PRs + Linear + Slack), plus the SDK script.

**Out:**
- OAuth flow end-to-end in the demo (use API key).
- Typed SDK / codegen CLI.
- New executions UI surface, Connected Apps page.
- Full edge-case handling for `displayOptions` / `loadOptions` / `resourceLocator` / `resourceMapper`.
- Trigger nodes.
- Per-token rate limiting and credential scoping.
- Pricing differentiation.
- HITL.

**Estimated effort:** ~1 engineer-week for a working demo across all four pieces.

---

## Path to production

Order matters — each unlocks the next.

1. **Pricing decision** (week 0) — leadership call, no engineering yet.
2. **Tool-search MCP server + full schema converter** (~2-3 weeks) — registry-driven, handles edge cases, includes companion enumeration tools.
3. **Per-token credential scoping + audit trail** (~1-2 weeks) — security ship-blocker.
4. **OAuth provider UX polish + Connected Apps page** (~1-2 weeks) — expanded scopes, consent screens.
5. **Typed SDK with codegen pipeline** (~3-4 weeks) — `n8n types pull`, versioned packages, drift handling. Lower if `@n8n/workflow-sdk` is reusable.
6. **Executions UI for single-node runs** (~1-2 weeks) — filter by source, caller attribution, audit-friendly view.
7. **GTM launch + Anthropic partnership** (~ongoing, parallel from week 4) — owned by marketing/DevRel.
8. **HITL + read/write scopes** (post-launch) — security depth.
9. **Embedding-based tool search** (post-launch) — ranking quality upgrade.

**Total engineering:** ~6-10 engineer-weeks to production-grade. Less than originally estimated because OAuth-provider, credential decoupling, execution-mode tracking, and possibly the SDK foundation are already in the codebase.

---

## Open questions (real ones)

These are not yet decided and need answers:

- **Pricing model.** Section above lays out options; needs leadership pick.
- **`@n8n/workflow-sdk` reusability for the external SDK.** Spike before building from scratch.
- **Utility nodes (Set, Code, IF, Function).** Exposed via SDK/MCP or excluded? Recommendation: exclude. They're transformations, not service actions; their value is inside workflows.
- **Cannibalization signal.** What metrics do we watch to detect workflow-execution decline post-launch? Define before launch.
- **Trigger nodes, eventually.** Out for v1; should we expose webhook/subscription primitives later?
- **Node version negotiation.** When SDK was generated against Slack v2.2 and instance has v2.4, what happens? Need a compatibility check + clear error message.
- **Default scope of a fresh PAT.** Full credential access (matches workflow today) or scoped-by-default (more secure, more friction)? Likely full-by-default with prominent UI to scope down.

---

## Appendix: research file references

Key files surfaced during feasibility research, kept here so engineering can jump in fast.

**Execution:**
- `packages/cli/src/manual-execution.service.ts`
- `packages/cli/src/workflow-runner.ts`
- `packages/core/src/execution-engine/workflow-execute.ts`
- `packages/@n8n/db/src/entities/execution-entity.ts`

**Credentials:**
- `packages/core/src/execution-engine/node-execution-context/base-execute-context.ts`
- `packages/cli/src/credentials/credentials.service.ts`

**Auth:**
- `packages/cli/src/services/public-api-key.service.ts`
- `packages/cli/src/modules/mcp/mcp-api-key.service.ts`
- `packages/cli/src/modules/mcp/mcp-oauth-service.ts`
- `packages/cli/src/modules/mcp/mcp.oauth.controller.ts`

**MCP:**
- `packages/cli/src/modules/mcp/mcp.service.ts`
- `packages/cli/src/modules/mcp/mcp-server-middleware.service.ts`

**Node registry & tool generation:**
- `packages/cli/src/load-nodes-and-credentials.ts`
- `packages/cli/src/node-types.ts`
- `packages/cli/src/tool-generation/ai-tools.ts` (existing precedent — extend with `createMcpTools()`)
- `packages/workflow/src/interfaces.ts`

**Existing internal SDK (investigate for reuse):**
- `packages/@n8n/instance-ai/src/tools/workflows/build-workflow.tool.ts` (uses `@n8n/workflow-sdk`)
- `packages/@n8n/instance-ai/src/tools/workflows/materialize-node-type.tool.ts`

**Schema endpoints:**
- `packages/cli/src/services/frontend.service.ts` (serves `/types/nodes.json`)
- `packages/cli/src/controllers/node-types.controller.ts`

**Frontend SDK precedent:**
- `packages/frontend/@n8n/rest-api-client/src/api/nodeTypes.ts`
