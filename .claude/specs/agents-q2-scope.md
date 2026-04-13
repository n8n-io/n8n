# Agents Q2 — Project Scope

**Branch:** `n8n-agents`
**Linear:** https://linear.app/n8n/project/agents-as-first-class-citizen-3bfa6b1e2bb8
**Figma:** https://www.figma.com/design/PeFCNtBUBdtDNonFc9vmqR/Agents-Q2?node-id=0-1&p=f&m=dev
**Target:** 2026-04-27
**Team:** Agent (Yehor Kardash lead)

## P0 Objectives

- Learn what agents users build to expand framework capabilities
- Nail down agent building UX
- MVP: create agents as first-class citizens, connect workflows as tools, invoke from within (workflows) and outside (chat) n8n
- Release: experiment to 5% cloud users (and/or self-hosted)

---

## P0 Linear Tickets

| Ticket | Title | Status | Assignee | Branch impl? |
|--------|-------|--------|----------|--------------|
| AGENT-1 | Creation flow UI | Ready for pick up | — | Partial (list + builder views exist, but not Figma design) |
| AGENT-2 | Integrate agent builder with InstanceAI | Ready for pick up | — | Partial (BuilderCard exists) |
| AGENT-3 | Agent <-> JSON conversion | Review | Yehor | Done (schema introspection + fromSchema + code gen) |
| AGENT-4 | Run agent code in sandbox for JSON schema | Review | Michael Drury | Done (AgentSecureRuntime + describeSecurely) |
| AGENT-5 | Allow running nodes as tools | In Progress | Yehor | Not yet |
| AGENT-6 | Allow running workflows as tools | Review | Yehor | Done (WorkflowToolFactory) |
| AGENT-7 | Chat integrations and triggers | Ready for pick up | — | Partial (Slack done, n8n Chat + Schedule not yet) |
| AGENT-8 | Default agent memory | In Progress | Yehor | Partial (N8NCheckpointStorage exists, full N8nMemory TBD) |
| AGENT-9 | Agent execution logging | Ready for pick up | — | Not yet |
| AGENT-10 | Support top N LLM providers | Ready for pick up | — | Partial (model catalog API exists, UI picker exists) |
| AGENT-11 | Top N memory integrations (Postgres, Redis) | Ready for pick up | — | Not yet |
| AGENT-12 | Agent evals | Ready for pick up | — | Partial (UI panel exists, backend eval runner TBD) |
| AGENT-13 | Create Agent node (workflow) | Ready for pick up | — | Not yet |
| AGENT-14 | "create-tool" tool | Ready for pick up | — | Not yet |
| AGENT-15 | Hardcoded starter templates | Ready for pick up | — | Not yet |
| AGENT-16 | Update home screen | Ready for pick up | — | Partial (agents tab in project header, not full sidebar) |
| AGENT-17 | Memory analysis / footprint | Parked | — | Not yet |

**Progress: ~7% (per Linear milestone)**

---

## Full Figma Scope (3 sections)

### 1. Using the Agent
- Left sidebar: "Agents" section with list + "+ New agent"
- Agent home: icon, name, description, chat input, recent sessions with source icons + timestamps
- Chat view: breadcrumb nav, user/agent messages, collapsible tool calls, message actions (copy/retry/more)
- Settings sidebar (right panel): Model picker, instructions, triggers (n8n Chat/Slack/Schedule), tools list with credentials, advanced section, cancel/save with unsaved indicator
- Activity sidebar: Agent ID, Session ID, model, context usage (tokens/%), cost
- Tools modal: search, connected tools with status, available tools catalog, per-tool gear
- Tool config modals: Slack (credential + channel picker), Workflow (workflow + trigger + message), generic pattern
- Workflow node: "Custom Agent" node in canvas with agent dropdown + prompt

### 2. Creating an Agent
- Via InstanceAI: chat-based creation, progress steps, agent card on completion
- Via "+ New agent": "Let's build something" landing, description input, suggestion cards (SEO Audit, Recruiting Sourcer, etc.), "Create blank" option

### 3. View Agent Session (WIP in Figma)
- Read-only session review with full tool call history

---

## What's Been Implemented

### Backend (`packages/cli/src/modules/agents/`)

**DB:** `agents` table (id, name, code, description, projectId, credentialId, provider, model, integrations JSON, schema JSON) + `agent_checkpoints` table

**API** (`/projects/:projectId/agents/v2`):
- CRUD: POST/GET/PATCH/DELETE agents
- GET `/:agentId/schema` / PATCH `/:agentId/schema` — introspect + update
- GET `/:agentId/credentials` — list user credentials
- GET `/catalog/models` — LLM provider/model catalog
- POST `/:agentId/chat` — SSE streaming chat execution
- POST `/:agentId/build` — SSE streaming AI builder (code generation)
- POST `/:agentId/integrations/connect|disconnect`, GET `/status` — Slack integration
- POST `/:agentId/webhooks/:platform` — inbound Slack webhooks

**Services:**
- `AgentsService` — CRUD, runtime caching (TTL 30m), schema caching (TTL 10m), `executeForChat()`, `resumeForChat()`, `compileIsolated()`
- `AgentsBuilderService` — AI builds/modifies agent code via streaming
- `AgentSecureRuntime` — sandboxed user code execution
- `WorkflowToolFactory` — n8n workflows as agent tools (chat/manual/schedule/form/executeWorkflow triggers)
- `ChatIntegrationService` — Slack Chat SDK lifecycle, webhook routing
- `AgentChatBridge` — Chat SDK mentions → agent execution, rich interactions
- `ComponentMapper` — tool-call suspensions → Slack Block Kit
- `N8NCheckpointStorage` — conversation state persistence
- `generate-agent-code.ts` — schema ↔ code round-trip

### SDK (`packages/@n8n/agents/`)
- `Agent.fromSchema()` — reconstruct agent from persisted schema
- Schema introspection (describe agent → `AgentSchema`)
- Provider capabilities / model catalog
- Credential provider interface

### Frontend (`packages/frontend/editor-ui/src/features/agents/`)

**Routes:** `/home/agents`, `/projects/:projectId/agents`, `/projects/:projectId/agents/:agentId`

**Views:**
- `AgentsListView` — list with sort/create/delete
- `AgentBuilderView` — tabbed builder (code, overview, tools, prompts, memory, evals, integrations) + chat panel

**Components:**
- `AgentChatPanel` — SSE streaming chat with tool call display
- `AgentCodeEditor` — Monaco TypeScript editor
- `AgentOverviewPanel` — model/credential/instructions/description
- `AgentToolsPanel` — add/remove/configure tools + workflow tools
- `AgentPromptsPanel` — system prompt editing
- `AgentMemoryPanel` — memory config (last messages, semantic recall, working memory)
- `AgentEvalsPanel` — evaluation setup
- `AgentIntegrationsPanel` — Slack connect/disconnect
- `AgentSidebar` — tab navigation
- `AgentListItem`, `AgentMiniEditor`

**API composables:** `useAgentApi`, `useAgentSchema`, `useModelCatalog`

### Other
- InstanceAI: `BuilderCard` for agent creation in InstanceAI chat
- `ProjectHeader` modified for agents tab
- Slack OAuth2 credential updates
- `@n8n/config` agents config
- `@n8n/decorators` route options for SSE/webhooks

---

## P0 Gap Analysis — What's Left

### Must Build

| Area | Tickets | Details |
|------|---------|---------|
| **Creation flow UI** | AGENT-1, AGENT-16 | "New agent" landing page, sidebar nav with agents section, agent home screen (chat-first) |
| **Nodes as tools** | AGENT-5 | Run n8n nodes as agent tools via @n8n/workflow-sdk |
| **Chat integrations + triggers** | AGENT-7 | n8n Chat trigger, Schedule trigger (Slack already done) |
| **Default memory** | AGENT-8 | Full N8nMemory for DB-backed memory (checkpoint storage exists but not full memory) |
| **Execution logging** | AGENT-9 | Agent execution history, similar to workflow executions |
| **LLM providers** | AGENT-10 | Expand provider support beyond current catalog |
| **Agent node** | AGENT-13 | "Custom Agent" workflow node: agent dropdown + prompt |
| **"create-tool" tool** | AGENT-14 | Search tool registry, create tools on the fly |
| **Starter templates** | AGENT-15 | Hardcoded agent templates for onboarding |
| **InstanceAI integration** | AGENT-2 | Full InstanceAI subagent for agent creation |

### Lower Priority P0

| Area | Tickets | Details |
|------|---------|---------|
| **Memory integrations** | AGENT-11 | Postgres, Redis, etc. memory backends |
| **Evals** | AGENT-12 | Agent evaluation framework |
| **Memory footprint** | AGENT-17 | Performance analysis (parked) |

### In Review (nearly done)

| Tickets | Details |
|---------|---------|
| AGENT-3 | Agent <-> JSON conversion (schema introspection, fromSchema, code gen) |
| AGENT-4 | Sandbox schema generation (AgentSecureRuntime) |
| AGENT-6 | Workflows as tools (WorkflowToolFactory) |

### Already Solid (no major changes needed)

- Backend CRUD + streaming API
- Agent SDK (schema introspection, fromSchema, code generation)
- Slack integration plumbing (webhooks, Chat SDK bridge, checkpoint storage)
- Workflow-as-tool resolution
- AI builder (streaming code generation)
- Chat execution with tool calls
