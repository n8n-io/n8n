# n8n AI Gateway — MVP Specification

---

## Why We're Building This

Setting up AI workflows in n8n today requires users to:

1. Choose an AI provider (OpenAI, Google, Anthropic, etc.)
2. Create an account with that provider
3. Generate API keys
4. Configure credentials in n8n
5. Understand model names and capabilities

This friction kills adoption — especially for users who just want to try AI
workflows quickly.

**n8n AI Gateway** removes this barrier entirely. Users get instant access to
AI models through n8n itself, with zero provider setup. One toggle, and every
AI node in their workflows just works.

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
│            ┌────────────────────┐                    │
│            │ lmChatN8nAiGateway │  ← auto-wired     │
│            │ (gateway sub-node) │    on creation     │
│            └────────┬───────────┘                    │
└─────────────────────┼───────────────────────────────┘
                      │ credential: n8nAiGatewayApi
                      │ (auto-provisioned)
                      ▼
              ┌────────────────┐
              │   OpenRouter   │  ◀── MVP provider
              │   (direct call,│      (swappable)
              │    no proxy)   │
              └────────────────┘
```

### Dedicated Gateway Node (implemented)

The gateway uses a **dedicated `lmChatN8nAiGateway` sub-node** that acts as a
LangChain chat model. When the gateway is enabled and a user creates an AI
Agent, the canvas **auto-creates and connects** this node — no manual wiring.

The node resolves the model at execution time from the workflow-level category
override (if set) or the global default category. Changing the setting affects
all future executions without modifying the workflow.

Provider-specific nodes (OpenAI, Anthropic, etc.) also accept the
`n8nAiGatewayApi` credential via a hidden `useAiGateway` parameter, allowing
power users to route specific provider nodes through the gateway.

---

## Model Selection Strategy

Rather than asking users to pick specific models (which requires knowledge of
the AI landscape), we offer **intent-based categories** that n8n maps to
concrete models behind the scenes.

### Model Categories

| Category | Intent | OpenRouter Model (MVP) |
| --- | --- | --- |
| **Balanced** (default) | Good quality at reasonable cost | `openai/gpt-4.1-mini` |
| **Cheapest** | Minimize token spend | `openai/gpt-4.1-nano` |
| **Fastest** | Lowest latency | `google/gemini-2.0-flash` |
| **Best Quality** | Maximum capability | `anthropic/claude-4-sonnet` |
| **Reasoning** | Complex multi-step tasks | `openai/o4-mini` |
| **Manual** | User picks a specific model | Full model list from OpenRouter |

> **Key principle:** n8n controls the model mapping per category. This lets us
> swap underlying models as the landscape evolves without users needing to
> change anything.

### Manual Override

Power users can select "Manual" to browse and pick a specific model from the
provider's catalog. This is always available but not the default path.

---

## Settings & Configuration

### Three Levels of Configuration

```
┌──────────────────────────────────────────────┐
│  Level 1: Global Settings                    │
│  "Default model category for all workflows"  │
│  ┌─────────────────────────────────────────┐ │
│  │  Level 2: Workflow Settings             │ │
│  │  "Override category for this workflow"  │ │
│  │  ┌─────────────────────────────────────┐│ │
│  │  │  Level 3: Node Credentials          ││ │
│  │  │  "Override for this node"           ││ │
│  │  └─────────────────────────────────────┘│ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

Resolution order: **Node → Workflow → Global** (most specific wins).

### Level 1: Global Settings Page (implemented)

A new section in **Settings → AI Gateway**:

- **Default Model Category** — one of the categories above
- **Usage overview** — current period token usage stats

### Level 2: Workflow Settings (implemented)

In the workflow settings panel, an optional override:

- **Model Category** — inherit or override category for this workflow

### Level 3: Node Credentials (BYOK)

The existing credentials system remains unchanged. Users who bring their own
API keys configure them at the credential level as they do today.

### Credential Type: n8nAiGatewayApi (implemented)

Auto-provisioned at startup from environment variables. Contains:

- `apiKey` — OpenRouter API key
- `url` — OpenRouter base URL

Appears automatically in LLM node credential dropdowns. No manual
configuration required.

```json
"credentials": {
  "n8nAiGatewayApi": {
    "id": "<auto-provisioned>",
    "name": "n8n AI Gateway"
  }
}
```

---

## Usage in Workflows

### Scenario 1: AI Agent Node (Primary Path — implemented)

1. User creates a workflow with an AI Agent node
2. Canvas auto-wires the `lmChatN8nAiGateway` sub-node
3. Model is resolved at execution from workflow/global category setting
4. No credential setup needed — auto-provisioned credential is used

### Scenario 2: Provider-Specific Nodes (implemented)

When using provider-specific nodes (OpenAI, etc.):

1. The credential dropdown shows **n8n AI Gateway** as an option
2. Selecting it routes requests through OpenRouter via the gateway credential
3. The user selects the model explicitly in the node UI

### Scenario 3: AI Builder (future)

AI Builder could share the same credit pool as the gateway, so both building
and running workflows draw from one unified balance.

---

## MVP Provider: OpenRouter

### Why OpenRouter

- **Single integration** gives access to all major models
- **Native format endpoints** — supports both OpenAI (`/chat/completions`)
  and Anthropic (`/messages`) response formats
- **Transparent pricing** — per-token pricing across all models

### Provider is Swappable

From the user's perspective, **n8n provides the AI capability**. Users don't
need to know about OpenRouter. The integration is an implementation detail.
See `ai-gateway-cloud-research.md` for provider comparison and hybrid routing
strategy.

### Backend Implementation (implemented)

LLM nodes call OpenRouter **directly** — no local proxy in the execution path.
The backend module provides admin endpoints only.

```
Execution Engine (LLM nodes)              Frontend (Editor UI)
        │                                     │
        │ credential: n8nAiGatewayApi        │ session auth
        │ (apiKey + baseURL)                 │
        │                                     │
        ▼                                     ▼
  OpenRouter API                    ┌──────────────────────┐
  (direct from node                 │  ai-gateway module   │
   via LangChain ChatOpenAI)        │                      │
                                    │  Admin Controller    │
                                    │  /rest/ai-gateway/*  │
                                    │       │              │
                                    │       ▼              │
                                    │  Services:           │
                                    │  - GatewayService    │
                                    │  - ModelService      │
                                    │  - UsageService      │
                                    └───────┬──────────────┘
                                            │ @openrouter/sdk
                                            ▼
                                    OpenRouter API
```

### Admin API Endpoints (implemented)

| Endpoint | Description |
|---|---|
| `GET /rest/ai-gateway/settings` | Current gateway config |
| `PUT /rest/ai-gateway/settings` | Update config |
| `GET /rest/ai-gateway/model-categories` | List categories with model mappings |
| `GET /rest/ai-gateway/models` | Available models from OpenRouter |
| `GET /rest/ai-gateway/usage` | Token usage stats (in-memory) |

### Usage Tracking (implemented)

In-memory tracking wired to the execution path via `EventService`. The module
listens for `ai-llm-generated-output` events emitted by LangChain's
`N8nLlmTracing` and records model name + token counts.

Limitations:
- Data is lost on restart
- Only LangChain-based nodes emit events (not OpenAI v1 transport)
- No cost data (would need OpenRouter management key)

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `N8N_AI_GATEWAY_ENABLED` | `false` | Enable the AI Gateway module |
| `N8N_AI_GATEWAY_OPENROUTER_API_KEY` | `''` | OpenRouter API key |
| `N8N_AI_GATEWAY_OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter base URL |
| `N8N_AI_GATEWAY_DEFAULT_CATEGORY` | `balanced` | Default model category |

---

## Free Credits & Pricing

### Unified Credit Pool with AI Builder

AI Builder already has a free credit system. The AI Gateway should share the
same credit pool — one balance that covers both building and running workflows.

> **Exact amounts TBD** — needs product decision on credit amounts, rollover,
> plan-based tiers.

### What Happens When Credits Run Out

- Workflows fail gracefully with a clear error message
- Error guides users to add credits or switch to BYOK credentials
- Existing BYOK workflows are never affected

---

## Open Questions

| # | Question | Status |
| --- | --- | --- |
| 1 | Exact monthly free credit amount? | TBD — Product decision |
| 2 | How does this interact with n8n Cloud vs self-hosted? | TBD — see cloud research doc |
| 3 | Should model category mapping be remotely configurable? | Likely yes |
| 4 | Privacy / data processing implications of routing through OpenRouter? | Needs legal review |
| 5 | Provider strategy — OpenRouter only vs hybrid routing? | See `ai-gateway-cloud-research.md` |
| 6 | Native Anthropic endpoint support for Anthropic nodes? | OpenRouter supports `/messages` |

---

## Implementation TODO

### Frontend: Canvas

- [x] Auto-wire `lmChatN8nAiGateway` node when creating AI Agent
- [x] Add "n8n AI Gateway" option to credentials picker

### Frontend: Settings

- [x] AI Gateway settings page (model category, usage overview)
- [x] Workflow settings override for model category

### Backend

- [x] `ai-gateway` backend module (`packages/cli/src/modules/ai-gateway/`)
- [x] Config class with env vars (`N8N_AI_GATEWAY_ENABLED`, `N8N_AI_GATEWAY_OPENROUTER_API_KEY`, etc.)
- [x] Direct execution: nodes call OpenRouter via auto-provisioned credential (no proxy)
- [x] Models list — `GET /rest/ai-gateway/models` (via `@openrouter/sdk`, with caching)
- [x] Model category → model resolution service (+ `resolveAiGatewayModel()` in `@n8n/api-types`)
- [x] Admin endpoints — `GET/PUT /rest/ai-gateway/settings`, `GET /rest/ai-gateway/model-categories`
- [x] `n8nAiGatewayApi` credential type (auto-provisioned at startup with OpenRouter key+URL)
- [x] In-memory usage tracking — `GET /rest/ai-gateway/usage` (wired via `ai-llm-generated-output` events)
- [x] Dedicated `lmChatN8nAiGateway` sub-node with intent-based model selection
- [x] Unit tests (22 passing: model service, gateway service, usage service)

### Not Yet Done

- [ ] Anthropic node support via OpenRouter native `/messages` endpoint
- [ ] Persistent usage tracking (database)
- [ ] Credit system & billing integration
- [ ] Cloud gateway service (separate from n8n monorepo)
- [ ] Provider deep-dive & partnership evaluation (see `ai-gateway-cloud-research.md`)
