# n8n AI Gateway — MVP Specification

---

## Why We're Building This

Setting up AI workflows in n8n today requires users to:

1. Choose an AI provider (OpenAI, Google, Anthropic, etc.)
2. Create an account with that provider
3. Generate API keys
4. Configure credentials in n8n
5. Understand model names and capabilities

This friction kills adoption — especially for users who just want to try AI workflows quickly. Many users never complete step 1.

**n8n AI Gateway** removes this barrier entirely. Users get instant access to AI models through n8n itself, with zero provider setup. One toggle, and every AI node in their workflows just works.

---

## Core Concept

```
┌─────────────────────────────────────────────────────┐
│                   n8n Workflow                      │
│                                                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│   │ Trigger  │──▶│ AI Agent │──▶│ Output Node  │    │
│   └──────────┘   └──────────┘   └──────────────┘    │
│                       │                             │
│                       ▼                             │
│              ┌────────────────┐                     │
│              │ Model Source:  │                     │
│              │ n8n AI Gateway │                     │
│              └───────┬────────┘                     │
└──────────────────────┼──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  n8n Backend   │
              │  (proxy layer) │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   OpenRouter   │  ◀── MVP provider
              │   (or future   │      (swappable)
              │    provider)   │
              └────────────────┘
```

### Dedicated Gateway Node (decided)

The gateway uses a **dedicated `lmChatN8nAiGateway` sub-node** that acts as a
LangChain chat model. When the gateway is enabled and a user creates an AI
Agent, the canvas auto-creates and connects this node — no manual wiring.

The node has **no user-facing model selection**. It resolves the model at
execution time from the workflow-level category override (if set) or the
global default category. This means changing the global/workflow setting
affects all future executions without modifying the workflow.

Provider-specific nodes (OpenAI, Anthropic, Gemini) also accept the
`n8nAiGatewayApi` credential via a hidden `useAiGateway` parameter, allowing
power users to route specific provider nodes through the gateway. This is a
secondary path — the dedicated node is the primary integration point.

---

## Model Selection Strategy

Rather than asking users to pick specific models (which requires knowledge of the AI landscape), we offer **intent-based categories** that n8n maps to concrete models behind the scenes.

### Model Categories

| Category | Intent | Example Mapping (MVP) |
| --- | --- | --- |
| **Balanced** (default) | Good quality at reasonable cost | GPT-4.1-nano or Claude 3.5 Haiku |
| **Cheapest** | Minimize token spend | GPT-4.1-nano or Gemini 2.0 Flash-Lite |
| **Fastest** | Lowest latency | Gemini 2.0 Flash |
| **Best Quality** | Maximum capability | Claude 4 Sonnet or GPT-4.1 |
| **Reasoning** | Complex multi-step tasks | o4-mini or Claude 4 Sonnet (thinking) |
| **Manual** | User picks a specific model | Full model list from OpenRouter |

> **Key principle:** n8n controls the model mapping per category. This lets us swap underlying models as the landscape evolves (e.g., when a new model offers better price/performance) without users needing to change anything.
>

### Manual Override

Power users can select "Manual" to browse and pick a specific model from the provider's catalog. This is always available but not the default path.

---

## Settings & Configuration

### Three Levels of Configuration

```
┌──────────────────────────────────────────────┐
│  Level 1: Global Settings                    │
│  "Default model source for all workflows"    │
│  ┌─────────────────────────────────────────┐ │
│  │  Level 2: Workflow Settings             │ │
│  │  "Override for this workflow"           │ │
│  │  ┌─────────────────────────────────────┐│ │
│  │  │  Level 3: Node Credentials          ││ │
│  │  │  "Override for this node"           ││ │
│  │  └─────────────────────────────────────┘│ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Resolution order: **Node → Workflow → Global** (most specific wins).

### Level 1: Global Settings Page

A new section in **Settings → AI Gateway**:

- **Default Model Category** — one of the six categories above
- **Usage overview** — current period token usage and remaining credits

### Level 2: Workflow Settings

In the workflow settings panel, an optional override:

- **Model Category** — inherit / override category for this workflow

### Level 3: Node Credentials (BYOK)

The existing credentials system remains unchanged. Users who bring their own API keys (BYOK) configure them at the credential level as they do today. This is the escape hatch for users who want direct provider access, specific model versions, or enterprise billing.

### New Credential Type: n8n AI Gateway

For provider-specific nodes (OpenAI node, Gemini node, etc.), we introduce a new credential option in the "Credential to connect with" dropdown:

- **n8n AI Gateway** — routes requests through the gateway, consuming gateway credits
- Existing credentials (OpenAI API Key, Google AI, etc.) — works exactly as today

This means even when using an "OpenAI" node, users can choose to route through n8n AI Gateway and still use selected OpenAI model.

---

## Usage in Workflows

### Scenario 1: AI Agent Node (Primary Path)

The AI Agent node gets a gateway model automatically:

1. User creates a workflow with an AI Agent node
2. The canvas auto-creates an **n8n AI Gateway Model** (`lmChatN8nAiGateway`)
   sub-node and connects it to the AI Agent's `ai_languageModel` input
3. No credential setup needed — the gateway node uses the auto-provisioned
   `n8nAiGatewayApi` credential
4. At execution, the node resolves the model from the workflow category
   override or global default (e.g., "Balanced" → `openai/gpt-4.1-nano`)
5. Changing the global default category affects all future executions without
   modifying existing workflows

### Scenario 2: Provider-Specific Nodes (OpenAI, Gemini, etc.)

Provider-specific nodes also support the gateway credential (secondary path):

1. The "Credential to connect with" dropdown shows a new option: **n8n AI Gateway**
2. Selecting it routes requests through the gateway
3. The gateway maps the request to the appropriate model based on the user's selection
4. Token consumption is deducted from gateway credits

Users can still select their own API keys from the dropdown — BYOK and gateway coexist.

### Scenario 3: AI Builder (?)

AI Builder already consumes AI credits for workflow generation. With the gateway:

1. AI Builder generates workflows using standard AI nodes (AI Agent, etc.)
2. These nodes automatically inherit the user's model source setting
3. Both building and running workflows draw from the **same unified credit pool**
4. Users see one balance — no confusion about "builder credits" vs "execution credits"

---

## MVP Provider: OpenRouter

### Why OpenRouter

- **Single integration** gives access to all major models (OpenAI, Anthropic, Google, Meta, etc.)
- **Unified API** — one credential, one format, multiple providers
- **Model routing** — supports fallbacks and load balancing natively
- **Transparent pricing** — per-token pricing across all models

### Transparency Principle

From the user's perspective, **n8n provides the AI capability**. Users don't need to know about OpenRouter. The integration is an implementation detail that can be swapped in the future for:

- A different aggregator
- Direct provider contracts
- n8n's own inference infrastructure

The abstraction layer (model categories, settings, credential type) stays the same regardless of what's behind it.

### Architecture

```
User's n8n instance
       │
       ▼
n8n Backend (proxy)
       │
       ├── Auth: n8n account/license validates the user
       ├── Rate limiting & quota enforcement
       ├── Model category → concrete model resolution
       ├── Usage tracking & metering
       │
       ▼
OpenRouter API
       │
       ├── Routes to: OpenAI, Anthropic, Google, etc.
       └── Returns: unified response format
```

The n8n backend acts as a proxy layer that:

1. Authenticates the user (via n8n account or license)
2. Resolves model category to a concrete model
3. Forwards the request to OpenRouter
4. Tracks token usage for billing/credits
5. Returns the response to the workflow

### Backend Implementation (decided)

The backend is implemented as an `ai-gateway` backend module at
`packages/cli/src/modules/ai-gateway/`. Key decisions:

- **Direct execution (no proxy in MVP)**: LLM nodes call OpenRouter directly via the
  auto-provisioned credential. No local HTTP proxy sits in the execution path. A proxy
  layer can be added later when a cloud gateway materializes.
- **Dedicated gateway sub-node + credential support**: A new `lmChatN8nAiGateway`
  sub-node is the primary integration point. It uses the auto-provisioned
  `n8nAiGatewayApi` credential and resolves the model from settings at execution
  time. Existing LLM nodes also accept `n8nAiGatewayApi` as an alternative
  credential for power-user BYOK+gateway scenarios.
- **Shared model resolution**: The category-to-model mapping and `resolveAiGatewayModel()`
  function live in `@n8n/api-types` so both the backend module and LLM nodes can import
  them. Categories are resolved at the node level before calling `ChatOpenAI`.
- **`@openrouter/sdk` for admin features**: The admin controller uses the OpenRouter SDK
  for typed model listing, with caching. Admin endpoints serve settings, model categories,
  available models, and usage statistics to the frontend.

See [mvp-ai-gateway-backend.md](./mvp-ai-gateway-backend.md) for the full backend spec.

---

## Free Credits & Pricing

### Unified Credit Pool with AI Builder

AI Builder already has a free credit system for workflow generation. The AI Gateway should share the same credit pool — one balance that covers both:

- **AI Builder** — credits consumed when generating/editing workflows
- **AI Gateway** — credits consumed when running AI nodes in workflows

This simplifies the user's mental model: "I have n8n AI credits" rather than separate buckets for building vs. running.

### Monthly Free Tier

Every n8n account includes a monthly allocation of free AI credits to lower the barrier to trying AI workflows.

> **Exact amounts TBD** — needs product decision on:
>
> - Credit amount per month (e.g., equivalent to ~100 AI Agent executions on Balanced tier)
> - How credits are shared between AI Builder and AI Gateway
> - Whether credits roll over
> - Whether free tier differs by plan (Community vs Pro vs Enterprise)

### Paid Usage

Beyond free credits, usage is metered and billed. Pricing structure is a product-level decision not in scope for MVP engineering, but the system must support:

- Per-token metering with category-aware cost tracking
- Usage caps / spending limits
- Clear visibility into consumption

### What Happens When Credits Run Out

- Workflows using the gateway should fail gracefully with a clear error message
- The error should guide users to either add credits or switch to BYOK credentials
- Existing BYOK workflows are never affected

---

## Usage Tracking

### User-Facing Dashboard

The global settings page includes a usage section:

- **Credits remaining** this billing period
- **Credits used** this period (with breakdown by category if feasible)
- **Usage trend** — simple visualization of daily/weekly consumption
- Option to set **usage alerts** (e.g., notify at 80% of credits used)

### Internal Metering

Every gateway request is logged with:

- Timestamp
- Workflow ID + Execution ID
- Model category requested → actual model used
- Input tokens + Output tokens
- Cost (in credits)

This data supports billing, debugging, and future analytics features.

---

## Rollout & Scope

### MVP Scope

This MVP is built in a **separate feature branch** for exploration and validation. It is not currently planned for merge into mainline.

**In scope:**

- Global settings UI for model source selection
- Model category system with OpenRouter mapping
- n8n AI Gateway credential type
- Backend proxy layer for OpenRouter
- Basic usage tracking and credit display
- Integration with AI Agent node
- Integration with provider-specific nodes via credential selection

**Out of scope (for MVP):**

- Production billing integration
- Enterprise SSO/compliance considerations
- Self-hosted gateway infrastructure
- Model fine-tuning or custom model support
- Advanced analytics dashboard
- Multi-region deployment

---

## Open Questions

| # | Question | Status |
| --- | --- | --- |
| 1 | Exact monthly free credit amount? | TBD — Product decision |
| 2 | How does this interact with n8n Cloud vs self-hosted? | TBD |
| 3 | Should we show the actual model name to the user in execution logs? | Leaning yes for debugging |
| 4 | Rate limiting strategy — per-minute, per-hour, per-workflow? | TBD |
| 5 | How to handle OpenRouter downtime / model unavailability? | Need fallback strategy |
| 6 | Should model category mapping be configurable by n8n (server-side) without deploys? | Likely yes — remote config |
| 7 | Privacy / data processing implications of routing through OpenRouter? | Needs legal review |

---

## Implementation TODO

Detailed frontend checklist is in [mvp-ai-gateway-frontend.md](./mvp-ai-gateway-frontend.md).

### Dedicated Gateway Node

- [x]  `LmChatN8nAiGateway` node at `packages/@n8n/nodes-langchain/nodes/llms/LmChatN8nAiGateway/`
- [x]  Node registered in `packages/@n8n/nodes-langchain/package.json`
- [x]  Node uses `n8nAiGatewayApi` credential, resolves model from category at execution time
- [x]  Node supports workflow-level category override via workflow settings, falls back to global default

### Frontend: Settings

- [x]  AI Gateway settings page at `/settings/ai-gateway` — model source selection
- [x]  AI Gateway settings page at `/settings/ai-gateway` — category selection
- [ ]  AI Gateway settings page at `/settings/ai-gateway` — usage overview (credits remaining, credits used, trend)
- [x]  Global Pinia store (`aiGateway.store.ts`) with category/model state fetched from backend API
- [x]  i18n labels for all settings page text
- [x]  Settings sidebar entry and route registration
- [ ]  Workflow settings override for model source / category

### Frontend: Canvas

- [x]  ~~Auto-create and connect provider-specific LLM node when AI Agent is created~~ → Replaced: auto-creates `lmChatN8nAiGateway` instead
- [x]  Auto-create and connect `lmChatN8nAiGateway` node when AI Agent is created
- [x]  ~~Prepopulate LLM node model parameter from AI Gateway store~~ → No longer needed: gateway node has no model param
- [x]  Prepopulate credential from AI Gateway store on new node creation (uses backend-provisioned `n8nAiGatewayApi` credential)
- [x]  `applyAIGatewayDefaultsToLlmNode` helper wired into `useCanvasOperations.addNode`
- [x]  Simplify `useAIGatewayDefaults.ts`: `getGatewayLlmNodeData()` returns `lmChatN8nAiGateway` type directly
- [x]  Simplify `aiGateway.store.ts`: remove `PROVIDER_NODE_MAP` and provider-to-node mapping logic

### Frontend: Credentials / Provider Contracts

- [x]  `N8nAiGatewayApi.credentials.ts` registered in `@n8n/nodes-langchain`
- [x]  OpenAI Chat Model, OpenAI v1/v2 nodes accept `n8nAiGatewayApi` credential via hidden `useAiGateway` parameter, transport layer routes accordingly (kept for BYOK+gateway)

### Backend

- [x]  `ai-gateway` backend module (`packages/cli/src/modules/ai-gateway/`)
- [x]  Config class with env vars (`N8N_AI_GATEWAY_ENABLED`, `N8N_AI_GATEWAY_OPENROUTER_API_KEY`, etc.)
- [x]  ~~OpenRouter proxy~~ → Direct execution: nodes call OpenRouter via auto-provisioned credential
- [x]  Models list — `GET /rest/ai-gateway/models` (via `@openrouter/sdk`, with caching)
- [x]  Model category → model resolution service (+ `resolveAiGatewayModel()` in `@n8n/api-types`)
- [x]  Admin endpoints — `GET/PUT /rest/ai-gateway/settings`, `GET /rest/ai-gateway/model-categories`
- [x]  `n8nAiGatewayApi` credential type (auto-provisioned at startup with OpenRouter key+URL)
- [x]  ~~Internal auth token~~ → Not needed (no proxy; nodes call OpenRouter directly)
- [x]  In-memory usage tracking — `GET /rest/ai-gateway/usage`
- [x]  Unit tests (21 passing: model service, gateway service, usage service)

```json
"credentials": {
  "n8nAiGatewayApi": {
    "id": "<auto-provisioned>",
    "name": "n8n AI Gateway"
  }
}
```

- [ ]  Usage metering and credit tracking (?)
- [ ]  Unified credit pool with AI Builder (?)
