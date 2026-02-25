# Instance AI

An AI agent embedded directly into n8n that helps users create, manage, debug, and run workflows through a conversational chat interface.

## What is Instance AI?

Instance AI is an AI-powered assistant that has full access to your n8n instance. Instead of navigating menus and editors, you can ask the agent in natural language to:

- **Create and modify workflows** — describe what you want and the agent builds it
- **Run and debug executions** — trigger workflows, inspect results, diagnose failures
- **Manage credentials** — create, test, and organize integration credentials
- **Discover nodes** — find the right nodes and understand their configuration

The agent uses tool calls to interact with n8n APIs on your behalf, with the same permissions as your user account.

## Quick Start

1. Set the model environment variable:
   ```bash
   export N8N_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
   ```

2. Start n8n — the Instance AI module is enabled by default.

3. Click the **Instance AI** item in the sidebar (sparkles icon).

4. Start chatting.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design, package map, data flow, dependency inversion |
| [Configuration](./configuration.md) | Environment variables and setup reference |
| [Decision Log](./decisions.md) | Architectural decisions with rationale and trade-offs |

### Features

| Document | Description |
|----------|-------------|
| [Chat & Streaming](./features/chat/) | Real-time chat protocol, chunk types, HTTP streaming |
| [Tool System](./features/tools/) | All 17 native tools — schemas, categories, permissions |
| [Memory System](./features/memory/) | Three-tier memory (recent, working, semantic) |
| [MCP Integration](./features/mcp/) | Extending the agent with external MCP tool servers |

### Internals

| Document | Description |
|----------|-------------|
| [Backend Module](./internals/backend-module.md) | Controller, service, adapter — the CLI integration layer |
| [Frontend Module](./internals/frontend-module.md) | Vue components, Pinia store, API, i18n, routing |

## Key Design Decisions

- **Mastra framework** — provides agent orchestration, tool execution, memory, and MCP support out of the box
- **Dependency inversion** — the agent package defines interfaces; the CLI adapter implements them against real n8n services
- **Streaming-first** — responses stream as newline-delimited JSON chunks for real-time UI updates
- **User-scoped** — agent operates with the authenticated user's permissions, never escalating access
- **Module system** — registered as an n8n backend module, can be disabled via `N8N_DISABLED_MODULES=instance-ai`
