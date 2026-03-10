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

### Why Not a Dedicated Node?

We considered a dedicated "n8n AI Gateway" node but rejected it because:

1. **Doesn't work out of the box.** Users would still need to drag the node into workflows and wire it up manually. The goal is zero-config AI — existing AI nodes should just work.
2. **Misses the credit unification opportunity.** AI Builder already has its own free credit system for generating workflows. By operating at the settings/credentials level, the AI Gateway can share a unified credit pool with AI Builder — one balance for all AI usage in n8n, whether it's building workflows or running them.

Instead, the gateway operates at the **settings and credentials level** — it's a model source that any compatible AI node can consume transparently.

---

## Model Selection Strategy

Rather than asking users to pick specific models (which requires knowledge of the AI landscape), we offer **intent-based categories** that n8n maps to concrete models behind the scenes.

### Model Categories

| Category | Intent | Example Mapping (MVP) |
| --- | --- | --- |
| **Balanced** (default) | Good quality at reasonable cost | GPT-4.1-mini or Claude 3.5 Haiku |
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

The AI Agent node gets a model automatically based on settings resolution:

1. User creates a workflow with an AI Agent node
2. No credential setup needed — the node detects the global/workflow model source
3. Model is auto-assigned based on the active category (e.g., "Balanced" → GPT-4.1-mini)
4. User can override the model in the node's settings if needed

### Scenario 2: Provider-Specific Nodes (OpenAI, Gemini, etc.)

When using provider-specific nodes:

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

### Frontend: Canvas

- [ ]  Update AI Agent node to auto-pick model from gateway settings
- [ ]  Add "n8n AI Gateway" option to credentials picker

### Frontend: Settings

- [ ]  AI Gateway settings page (model source, category, usage overview)
- [ ]  Workflow settings override for model source / category (?)

### Backend

- [ ]  OpenRouter proxy integration
- [ ]  Model category → model resolution
- [ ]  Workflow execution integration

```
        "n8nAiGateway": {
          "id": "n8nAiGateway",
          "name": "n8n AI Gateway"
        }
```

- [ ]  Usage metering and credit tracking (?)
- [ ]  Unified credit pool with AI Builder (?)
