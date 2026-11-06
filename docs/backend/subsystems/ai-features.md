---
title: AI features
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: Cadiac
---

# AI features

AI features make up about 40% of the recent backend commits. [Agent turn](../agent-turn.md) followed one message. This page maps the AI features, how they turn on, and how they use the rest of the platform. Read it when you work on an AI feature, or when your change touches executions, nodes, credentials, or pubsub, which AI features use heavily.

## Features

| Feature | What a user does with it | Module | On by default |
|---|---|---|---|
| Agents | Builds agents with tools, chat channels, and schedules | `agents` | Yes |
| n8n Assistant | Asks the assistant in the editor to build or fix a workflow | `instance-ai` | Yes, except on the Enterprise plan |
| Chat Hub | Chats with models and agents on a chat page | `chat-hub` | No |
| MCP server | Connects an external AI client, such as a desktop app, to the instance | `mcp` | No |
| Workflow builder | Uses the older AI builder in the editor | Core code, and `workflow-builder` | Only with the `feat:aiBuilder` license |

Smaller modules serve these features. `skills` stores reusable instructions, which agents, MCP clients, and the Assistant read. `knowledge` stores files and vector store connections for retrieval. `mcp-registry` turns a catalog of external MCP servers into nodes. `oauth-server` lets MCP clients sign in. `agent-evals` lets a user score an agent against a set of test prompts.

## Runtime

`@n8n/agents` is a library. It gives the agent loop, tools, memory, model catalogs, and sandboxes, and it knows nothing about n8n.

Two products build on it. The `agents` module runs the agents that users build. It owns the message queue, the turn records, and the checkpoints that Week 1 described. The n8n Assistant lives in `@n8n/instance-ai` and its own module. It has its own threads and an event log. It reaches n8n through an adapter service, so that the package does not import the CLI. An experimental flag can run the Assistant as one more agent in the `agents` module.

## Enablement

When an AI feature does not appear, four things can be the cause. Check them in this order.

First, the module must be in the list of modules for the instance. `N8N_DISABLED_MODULES` removes a module. Second, the process must be a main, because only mains serve the REST routes of these features. Third, some features need a license, and use of the AI gateway is a licensed quota. Fourth, most features have a setting that an admin saves in the database. An environment variable can give the default of that setting, but the saved value wins.

PostHog feature flags exist inside these features too. They turn parts of a feature on or off, never the whole feature.

## Platform use

The AI features do not have a separate backend. A workflow tool, Chat Hub, and the Assistant all start ordinary executions through `WorkflowRunner`. An agent can use any node that allows tool use. Model calls use the credentials of the project, or the AI gateway, which gives a credential that no node needs to know about. About half of the pubsub commands relay AI events between mains, because a browser connects to only one main. Agents and chat users have their own permissions and roles.

A change to executions, nodes, credentials, or pubsub can therefore break an AI feature. Run the AI tests too, not only the tests next to your change.

## Testing

Most AI behavior depends on a model, so unit tests cannot cover all of it. **Evals** cover the rest: sets of prompts that a model runs and a score checks. The Assistant evals run in GitHub Actions when a PR opens or becomes ready for review, not on each push. To run them again, start the workflow by hand with the PR number. MCP evals run only by hand.

To run the Assistant locally, you need your own model key and a sandbox. `packages/@n8n/instance-ai/docs/configuration.md` lists the settings, and `packages/@n8n/instance-ai/docs/architecture.md` explains the design.

## Quiz

1. An admin saved the setting of the Assistant as off. The environment variable says on. Is the Assistant on?
   - A. Yes. The environment variable wins.
   - B. Yes, but only for admins.
   - C. It depends on the PostHog flag.
   - D. No. The saved value wins over the environment variable.
2. Why must a process be a main to serve an AI feature?
   - A. Only mains have the model credentials.
   - B. Workers cannot load the modules.
   - C. Only mains serve the REST routes of these features.
   - D. The leader must approve each request.
3. You change how pubsub sends a command. Why run the AI tests too?
   - A. The AI tests are the only tests of pubsub.
   - B. About half of the pubsub commands relay AI events between mains.
   - C. AI features replace pubsub with their own channel.
   - D. The AI tests run on every PR anyway.
4. When do the Assistant evals run in GitHub Actions?
   - A. When a PR opens or becomes ready for review. You can also start them by hand.
   - B. On each push to a PR.
   - C. Only in the merge queue.
   - D. Only once a week.
5. What does a PostHog feature flag do inside an AI feature?
   - A. It turns the whole feature on or off.
   - B. It selects the model.
   - C. It replaces the license check.
   - D. It turns a part of the feature on or off, never the whole feature.

<details>
<summary>Answers</summary>

1. D. An environment variable can give the default of a setting, but the value in the database wins.
2. C. This is the second of the four checks: module, main, license, then setting.
3. B. A browser connects to only one main, so AI events go between mains over pubsub.
4. A. The evals do not run on each push. To run them again, start the workflow by hand with the PR number.
5. D. The module list, the license, and the settings turn a feature on. Flags control parts of it.

</details>
