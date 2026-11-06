---
title: AI for building
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: Cadiac
---

# AI for building

[Agent turn](agent-turn.md) showed how an agent answers the users of an automation. This page explains how AI builds and fixes workflows and agents for the user who builds them, inside the editor and from outside it.

| Feature | What a user does with it | Code |
|---|---|---|
| n8n Assistant | Asks the assistant in the editor to build, fix, or explain a workflow | `instance-ai` module, `@n8n/instance-ai` |
| Workflow builder | Uses the older AI builder in the editor | `workflow-builder` module, `@n8n/ai-workflow-builder.ee` |
| MCP server | Connects an external AI client, such as a desktop app, to build and run workflows | `mcp` module |

> **The Assistant builds workflows only in a sandbox.** Without a sandbox, the Assistant cannot build workflows.

> **An MCP client sees only the workflows that its user can access and that have MCP access turned on.**

## n8n Assistant

The n8n Assistant is an agent inside each instance. An orchestrator agent plans the work and calls tools: tools for workflows, executions, and credentials, a tool that builds workflows, and the tools of external MCP servers.

The Assistant also builds agents. It gets the tools for this when the `agents` module is on and an admin turns on agents in the settings.

The browser sends a message with `POST /instance-ai/chat/:threadId`, and reads the answer as server-sent events from `GET /instance-ai/events/:threadId`. Each event goes into a durable log, the table `instance_ai_events`. A browser that reconnects therefore reads the events that it missed, also from another main. In multi-main, the event bus relays the events to the other mains.

The threads, the messages, and the memory of the Assistant are in the n8n database. `@n8n/instance-ai` does not import the CLI. It reaches the workflow, execution, and credential services through an adapter service.

The Assistant runs on mains only. The `instance-ai` module also starts on workers and webhook processes, but only to report failed executions to a main for [self-healing](#self-healing).

## Sandbox

The Assistant writes the source code of a workflow with `@n8n/workflow-sdk`, and compiles it in a remote sandbox. The sandbox keeps file writes and commands off the n8n host.

- `N8N_INSTANCE_AI_SANDBOX_ENABLED` turns the sandbox on. It is off by default.
- The default provider is the n8n sandbox service. Daytona is the other provider.
- Each thread has one sandbox. Its ID comes from the thread, so another main or a restarted process finds the same sandbox.

When the Assistant builds an agent, it calls the `agents` module, which does not use this sandbox.

## Self-healing

Self-healing lets the Assistant investigate a failed production execution and suggest a fix. `N8N_INSTANCE_AI_WORKFLOW_SUGGESTIONS_ENABLED` turns it on, on each process before startup. It is off by default.

A failure on a worker or a webhook process goes to a main as a workflow ID and an execution ID, over pubsub. The main then starts one investigation for each workflow. If the main loses the notification or the Assistant is at its limit of concurrent runs, n8n does not retry. A later failure can start a new investigation.

## Workflow builder

The workflow builder is the older AI builder in the editor. Its routes are under `/ai`, and they need `feat:aiBuilder`. `quota:aiCredits` limits how much a user can build. The `workflow-builder` module stores the sessions of the builder.

The older AI features in the editor, such as Ask AI, call an AI service of n8n through `@n8n_io/ai-assistant-sdk`. `N8N_AI_ENABLED` turns these older features on. It has no effect on the Assistant.

## MCP server

The MCP server lets an external AI client use the instance. It serves `POST /mcp-server/http` on mains only. A client signs in with an API key, a token-exchange JWT, or an OAuth token from the `oauth-server` module. n8n therefore starts `oauth-server` before `mcp`.

An admin turns on MCP access for the instance, and each workflow has its own MCP access setting. An admin can also give MCP access to each new workflow automatically.

The tools of the server search, run, test, and publish workflows. They also build workflows from `@n8n/workflow-sdk` code, so an external client can do much of what the Assistant does.

## Platform use

AI for building has no separate backend. The Assistant and the MCP server start ordinary executions through `WorkflowRunner`. A change to executions, nodes, credentials, or pubsub can therefore break an AI feature. Run the AI tests too, not only the tests next to your change.

## Quiz

1. With no sandbox, a user asks the Assistant to build a workflow. What happens?
   - A. The Assistant builds the workflow on the main.
   - B. The Assistant cannot build the workflow.
   - C. The Assistant builds the workflow on a worker.
   - D. The Assistant uses the older workflow builder.
2. An MCP client signs in for a user who can access a workflow. Can the client see that workflow?
   - A. Yes. The access of the user is enough.
   - B. Yes, if the workflow is published.
   - C. Only if an admin is the user.
   - D. Only if the workflow has MCP access turned on.
3. With self-healing on, a production execution fails on a worker. What does the worker do?
   - A. It runs the Assistant to investigate the failure.
   - B. It tells a main over pubsub.
   - C. It retries the execution.
   - D. Nothing.
4. During a long Assistant run, a browser reconnects to another main. What does it get?
   - A. Only the events after the reconnection.
   - B. An error.
   - C. The events that it missed.
   - D. A new run of the same message.

<details>
<summary>Answers</summary>

1. B. The Assistant compiles workflow code only in a sandbox, so building needs one.
2. D. A client sees only the workflows that its user can access and that have MCP access turned on.
3. B. The Assistant runs on mains only, so a worker reports the failure to a main.
4. C. Every event goes into `instance_ai_events`, so any main can replay the events.

</details>
