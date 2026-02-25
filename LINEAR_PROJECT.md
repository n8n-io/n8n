Project Name: Instance AI Agent

Summary: An autonomous AI agent that is the primary interface to n8n — users describe what they need, and the agent builds, runs, debugs, and fixes workflows autonomously until the job is done.

Description:

## Vision

Instance AI is an autonomous agent built into every n8n instance. The goal is that most users never have to see or touch an actual workflow. They describe what they need in natural language, and the agent handles the full lifecycle: building the workflow, executing it, inspecting the results, debugging failures, and iterating — all in an autonomous loop until the task is accomplished.

The agent is **LLM-agnostic** and designed to work with any capable language model provider.

### The Autonomous Execution Loop

The core differentiator is the agent's ability to operate in a closed loop:

1. **Build** — Create or modify a workflow based on the user's intent
2. **Execute** — Run the workflow (directly or via MCP tools)
3. **Inspect** — Read execution logs, check outputs, identify failures
4. **Evaluate** — Run n8n's native workflow evaluations (eval triggers + metrics) to get structured, quantitative feedback on output quality — not just "did it error" but "did it produce the right result"
5. **Debug** — Analyze errors and evaluation results, adjust the workflow, fix issues
6. **Repeat** — Loop back to step 2 until the task succeeds and evaluations pass

The user only sees the final result. The workflow is an implementation detail, not something the user needs to manage.

### Guardrails

Tools declare whether they require user confirmation. Destructive or high-impact operations (deleting workflows, modifying production automations, creating credentials) require explicit user approval before execution. Safe, read-only operations (listing, inspecting, evaluating) proceed autonomously. This keeps the loop fast for safe operations while giving users control over irreversible actions.

### Transparency via the Execution Engine

Everything the agent does is a workflow, and every workflow runs through n8n's execution engine. This means all agent activity — including the autonomous loop iterations — is fully observable through the standard execution log. Users can inspect what the agent did, how it debugged, and what it changed, using the same tools they already know.

## Current Capabilities

- Workflow Management — List, create, update, delete, and activate workflows
- Execution Management — Run workflows, inspect results, debug failures
- Credential Management — Create, update, test, and manage credentials (secrets never exposed)
- Node Discovery — Browse and understand available node types

## Planned Capabilities

- Browser Automation — Browser control via DevTools MCP as MVP to demonstrate feasibility of the approach; scope to expand based on learnings
- Self-Augmentation via MCP — The agent can create n8n workflows and register them as custom MCP tools within itself, enabling it to extend its own
capabilities on the fly to solve problems it couldn't before
- Rich Chat Components — Each tool defines a rendering type; the chat UI renders domain-specific rich components (execution timeline views, workflow canvas
	previews, credential cards, etc.) instead of plain text
- Streaming-First UX — All responses stream to the user in real-time for minimal time-to-first-token

## MCP Integration (Core Architecture)

MCP is the extensibility backbone and the key to the autonomous loop. It connects two critical capabilities:

**Self-Augmentation:** When the agent encounters a task it can't handle natively, it creates an n8n workflow, registers it as a custom MCP tool, and can immediately use it — for this request and all future ones. The agent grows its own toolset over time.

**Capability Repository:** Self-created tools are stored in a managed repository of capabilities. This provides governance over the agent's growing toolset — discoverability (what tools exist), quality tracking (which tools work reliably), versioning, and cleanup of stale or broken capabilities. The repository prevents tool sprawl and ensures the agent's self-created tools remain trustworthy.

**Autonomous Execution:** The agent uses its tools (native + MCP) to execute workflows, read execution logs, run evaluations, and debug failures without user intervention. It loops through build → run → inspect → evaluate → fix cycles until the job is done and evaluations pass, only surfacing results (or asking for clarification) to the user.

## Frontend Architecture

The chat UI goes beyond text. Tools declare their rendering type, and the frontend renders rich, domain-specific components:

- Executions → Familiar execution list/detail views
- Workflows → Embedded canvas previews
- Credentials → Credential cards with test status
- Errors → Structured error displays with suggested fixes

Streaming support is first-class — partial results render progressively.

## Development Approach

This project is built entirely using AI development tools. All architectural decisions, trade-offs, and context must be documented in a way that is
consumable by LLMs working on the codebase (CLAUDE.md files, inline documentation, decision records).

---
## Milestones

1. **Core Agent & Native Tools** — Agent framework, native tool definitions, backend API, streaming infrastructure
2. **Autonomous Execution Loop** — The agent can build, run, inspect logs, evaluate outputs (using n8n's native eval triggers and metrics), debug, and re-run workflows in a closed loop until the task succeeds and evaluations pass
3. **MCP Self-Augmentation** — Workflow-to-MCP-tool pipeline, tool registration, self-extending agent capabilities
4. **Rich Chat Components** — Tool rendering type system, domain-specific UI components (execution views, workflow previews, credential cards), progressive streaming renders
5. **Browser Automation (MVP)** — DevTools MCP integration to prove browser control feasibility
6. **Production Readiness** — Error handling, testing, performance, documentation, GA hardening
