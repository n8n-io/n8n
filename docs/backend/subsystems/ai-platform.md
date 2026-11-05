---
title: The AI platform, from the backend
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# The AI platform, from the backend

Read this when you need to know where the AI features live and how they plug into the platform. This page does not explain their internals. The owning teams document those next to the code. `OWNERS` at the repository root names the team for each path.

## What it is

The AI platform is a set of backend modules plus supporting packages under `packages/@n8n/`.

- **Instance AI** is the in-product assistant. The UI calls it "n8n Assistant".
- **Agents** are agents that users build, with chat channels, skills, knowledge, and scheduled tasks.
- **Chat Hub** is a chat UI that runs system-generated workflows.
- **MCP** exposes the instance to external MCP clients. The **MCP registry** turns a catalog of third-party MCP servers into nodes.
- The **workflow builder**, agent evals, and tool generation are smaller pieces that feed the others.

All of them reach LLM providers through user credentials or through the AI gateway. User-facing text calls the gateway "Gateway credits". Code keeps the names `n8nConnect` and `aiGateway`.

## Why it has this shape

- **AI features are consumers of the platform.** Each one is a module with entities, controllers, and settings. It runs executions through `WorkflowRunner`, attaches to lifecycle hooks, pushes to the editor, stores files in blob storage, and gates routes with scopes and licenses. A platform change therefore reaches every AI feature. Do not break these consumers.
- **New capabilities go into the platform.** When an AI feature needs something the platform lacks, add it to the platform, not to the feature. The shared `oauth-server` module, which started inside the MCP module, is an example.
- **Thin modules, logic in packages.** The module wires the feature into n8n. The agent loop, the SDK, and the prompts live in packages such as `@n8n/instance-ai` and `@n8n/agents`. Instance AI calls back into n8n through an adapter service.
- **Chat Hub runs ordinary executions.** The service builds a workflow from a chat trigger and a model node, then runs it. Node type policies apply to these workflows like any other.
- **The gateway acts as a credential.** At run time, `CredentialsHelper.getDecrypted` returns a synthetic credential for nodes that the gateway manages. Nodes do not need special code for the gateway.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Instance AI module | `packages/cli/src/modules/instance-ai/instance-ai.module.ts` | `InstanceAiModule` |
| Instance AI callbacks into n8n | `packages/cli/src/modules/instance-ai/instance-ai.adapter.service.ts` | `InstanceAiAdapterService` |
| Agents module | `packages/cli/src/modules/agents/agents.module.ts` | `AgentsModule` |
| Chat Hub workflows | `packages/cli/src/modules/chat-hub/chat-hub-workflow.service.ts` | `ChatHubWorkflowService` |
| Instance MCP server | `packages/cli/src/modules/mcp/mcp.controller.ts` | `McpController` |
| MCP server catalog | `packages/cli/src/modules/mcp-registry/registry/mcp-registry.service.ts` | `McpRegistryService` |
| Workflow builder service | `packages/cli/src/services/ai-workflow-builder.service.ts` | `WorkflowBuilderService` |
| Workflow builder sessions | `packages/modules/workflow-builder/backend/src/workflow-builder.module.ts` | `WorkflowBuilderModule` |
| Tool variants of nodes | `packages/cli/src/tool-generation/ai-tools.ts` | `createAiTools` |
| AI gateway | `packages/cli/src/services/ai-gateway.service.ts` | `AiGatewayService.getSyntheticCredential` |

The LangChain nodes are in `packages/@n8n/nodes-langchain`. Shared AI helpers are in `packages/@n8n/ai-utilities`. Check them before you write a new helper.

## Per process

The MCP server, the workflow builder, and agent evals load on mains only. Instance AI loads on every process type, but workers and webhook processes only relay eligible failures to the main.

## What is moving

This area changes often. Instance AI now registers the n8n Assistant as an agent on the agents runtime. Skills and knowledge are separate modules that the agents module reads. Read the module code and the package docs before you rely on this page.

## Read more

- `packages/@n8n/instance-ai/CLAUDE.md` and `packages/@n8n/instance-ai/docs/`
- `packages/@n8n/agents/AGENTS.md`
- `packages/cli/src/modules/mcp/README.md`
- `packages/@n8n/ai-workflow-builder.ee/AGENTS.md`
- [Credentials](credentials.md) for instance credentials and the OAuth server
- `.claude/plugins/n8n/skills/create-instance-ai-eval/`
