---
title: The AI platform, from the backend
audience: Backend engineers new to n8n
tier: 3
reading_time: 8 min
last_reviewed: 2026-09-02
owner: "@n8n-io/ai"
---

# The AI platform, from the backend

Read this when you need to know where the AI features live, how they plug into the platform, and which teams own them. This page does not explain their internals. The owning teams document those next to the code.

## What it is

The AI platform is a set of backend modules in `packages/cli/src/modules/` plus supporting packages under `packages/@n8n/`. **Instance AI** is the in-product assistant, "AI Assistant" in the UI. **Agents** are user-built, first-class agent entities with chat channels and scheduled tasks. **Chat Hub** is a chat UI that runs system-generated workflows. The **MCP** module exposes the instance to external MCP clients, and the **MCP registry** pulls a catalog of third-party MCP servers and turns them into nodes. The workflow builder, agent evals, and tool generation are smaller pieces that feed the others. All of them reach LLM providers through user credentials or through the n8n AI proxy and gateway, which is "Gateway credits" in user-facing text and `n8nConnect` or `aiGateway` in code.

## How it plugs in

Every AI feature is a **consumer** of the platform described elsewhere in these documents. It is a module with entities, controllers, and settings. It runs executions through `WorkflowRunner`. It attaches to execution lifecycle hooks. It pushes to the editor through `Push`. It stores blobs through `@n8n/blob-storage`. It gates routes with scopes and, where paid, with `@Licensed`. Two consequences follow. A platform change reaches every AI feature, so the AI teams are consumers you must not break. And an AI feature that needs a new platform capability adds it to the platform, not to itself.

The modules are thin. The logic lives in the packages. Both sit on the platform. The table under "Where to look" maps each module to its package and its owning team.

**Instance AI.** The module registers credential-use policies with the instance credential broker, loads persisted settings, imports its controller, and sweeps interrupted runs at startup. A chat request returns a run id, and an SSE route streams events. The agent loop lives in `@n8n/instance-ai`, which calls back into n8n through an adapter service. The model comes from configuration or from the AI proxy. A sandbox for code execution is optional and provider based. The module marks its settings as managed on Cloud and rejects edits to them there.

**Agents.** The module imports about fifteen controllers, registers blob stores for logs and knowledge, and populates a chat integration registry with Slack, Telegram, Linear, Discord, and n8n chat. Channel reconnection runs on every non-worker process, and scheduled agent tasks run on the leader. The runtime executes the user's agent code in V8 isolates against a bundled SDK. `@n8n/agents` is that SDK.

**Chat Hub.** A chat becomes an ordinary execution: the service builds a workflow from a chat trigger plus a provider model node and runs it. It is off by default through a settings row and a migration that kept it on only for installs that had used it.

**MCP.** The instance MCP server answers at one HTTP path, `GET` and `POST`, without the session middleware, accepting an MCP API key or an OAuth token issued by the shared `oauth-server` module. Scopes map to tools. A workflow is exposed when its settings say so. The registry module fetches a server catalog on the leader and synthesizes a node per server through a node loader.

**Workflow builder.** The module owns one table for builder sessions. The logic is a service in `packages/cli/src/services/` on top of `@n8n/ai-workflow-builder.ee`, exposed under `@Licensed('feat:aiBuilder')`.

**Tool generation.** Not a module. After the node registry is rebuilt, every node marked `usableAsTool` gets a tool variant, and nodes with a send-and-wait operation get a human-in-the-loop variant.

**The AI gateway.** A service is enabled when the license, the configuration, and the proxy base URL agree. At execution time the credentials helper returns a synthetic credential for gateway-managed nodes. Agents, Chat Hub, MCP tools, and Instance AI all consult it.

## Where to look

| Path | Owner |
|---|---|
| `packages/cli/src/modules/instance-ai/`, `packages/@n8n/instance-ai/` | AI Assistant team |
| `packages/cli/src/modules/agents/`, `packages/@n8n/agents/` | Agents team |
| `packages/cli/src/modules/chat-hub/`, `packages/@n8n/chat-hub/` | AI team |
| `packages/cli/src/modules/mcp/`, `packages/cli/src/modules/mcp-registry/`, `packages/@n8n/mcp-apps/` | MCP team |
| `packages/cli/src/modules/workflow-builder/`, `packages/@n8n/ai-workflow-builder.ee/`, `packages/cli/src/services/ai-workflow-builder.service.ts` | AI team |
| `packages/cli/src/modules/agent-evals/` | Agents team |
| `packages/cli/src/tool-generation/` | AI team |
| `packages/@n8n/nodes-langchain/`, `packages/@n8n/ai-node-sdk/`, `packages/@n8n/ai-utilities/` | AI team |
| `packages/cli/src/services/ai-gateway.service.ts` | Relay team |

## What it owns

Instance AI owns twelve tables for threads, messages, resources, checkpoints, observations, and MCP connections. Agents owns twenty-four tables. Chat Hub owns sessions, messages, agents, and tools tables. MCP owns settings rows and an OAuth token audience. The registry owns `mcp_registry_server`. The builder owns `workflow_builder_session`. Agent evals owns four `agent_eval_*` tables.

## Flags

`feat:aiAssistant`, `feat:askAi`, `feat:aiBuilder`, `feat:aiCredits`, `feat:aiGateway`, and `feat:aiGatewayCloudUbb`. No module in this domain carries `licenseFlag`. `agents` and `agent-evals` are opt-in through `N8N_ENABLED_MODULES`. Agent evals hides behind the PostHog flag `101_agent_evals`. `N8N_INSTANCE_AI_*`, `N8N_AGENTS_*`, `N8N_MCP_*`, and `N8N_AI_GATEWAY_ENABLED` configure the rest. Chat Hub and MCP have settings rows that switch them on.

## Per mode

Instance AI, MCP, the builder, and agent evals load on mains only. Agents and Chat Hub load everywhere, and Chat Hub's execution watcher loads only where executions run. Agent tasks are leader-only. On Cloud, Instance AI labels environment-managed settings as managed by Cloud.

## Was, is, goes

**Was.** The AI assistant was a proxy to a hosted service. Chat Hub arrived in October 2025. **Is.** Instance AI became a package and a module in April 2026 and a default module in 2.35. Agents became first-class entities in May 2026. The OAuth server was extracted from the MCP module in June 2026. **Goes.** A June 2026 migration switched Chat Hub off for installs that had not used it. Agent `TODO` markers point at the durable scheduler and at the gateway endpoints. The MCP module documents a protocol revision from July 2026 with a legacy fallback.

## Terms

- **Instance AI and AI Assistant**: the same thing. The first is the code name, the second the UI name.
- **Gateway credits**: the user-facing name of the AI gateway and its budget. Internal identifiers keep the historical names.
- **synthetic credential**: the credential the gateway supplies to a node at run time.
- **tool variant**: a `...Tool` node type generated from a regular node.
- **protected resource**: an MCP or webhook endpoint that the OAuth server issues tokens for.

## Read more

- `packages/@n8n/instance-ai/CLAUDE.md`, `README.md`, and `docs/`
- `packages/@n8n/agents/AGENTS.md`
- `packages/cli/src/modules/mcp/README.md`
- `packages/@n8n/ai-workflow-builder.ee/AGENTS.md`
- `.claude/plugins/n8n/skills/create-instance-ai-eval/`
