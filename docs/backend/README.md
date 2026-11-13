---
title: Start here
last_reviewed: 2026-11-05
contact: ivov
---

# Start here

This guide is for an engineer who knows TypeScript, Node.js, and SQL, and who is about to start working on the n8n backend. On this page you run n8n, and you build one workflow and one agent. The rest of the guide follows these two threads through the backend.

## Run n8n

You need Node.js 24 or newer, and pnpm. From the root of the repository, install and build:

```bash
pnpm install
pnpm build
```

Then start n8n with an empty data folder:

```bash
N8N_USER_FOLDER=$HOME/.n8n-onboarding pnpm start
```

Open `http://localhost:5678` and create the owner account.

You started one process that serves the editor in your browser and keeps its data in a SQLite file in the data folder.

## Build a workflow

A **workflow** is a graph of **nodes**. Each node is one step, such as an HTTP call or a data transformation. Data moves between nodes as **items**, which hold plain JavaScript objects. A workflow starts at a **trigger** node, which decides when the workflow runs.

Build a workflow that greets a caller by name:

1. Create a workflow, and name it `Day 1`.
2. Add a **Webhook** trigger. Set **HTTP Method** to `POST`, **Path** to `hello`, and **Respond** to **When Last Node Finishes**.
3. Add an **Edit Fields (Set)** node after the trigger. Add a field `greeting`, switch its value to Expression, and enter `{{ 'Hello, ' + $json.body.name }}`.
4. Save the workflow.

The text in `{{ }}` is an **expression**: a small piece of JavaScript that reads the item that comes into the node. Here it reads the request body that the webhook received.

## Run it from the editor

Click **Execute**. The editor now waits for one call to the webhook URL for manual executions. Call it:

```bash
curl -s -X POST localhost:5678/webhook-test/hello \
  -H 'content-type: application/json' \
  -d '{"name":"Nathan"}'
```

```json
{"greeting":"Hello, Nathan"}
```

The canvas marks each node with a check and shows `1 item` on each connection. The backend sent the result of each node to your browser tab while the workflow ran. The editor started this **execution**, so it is a **manual execution**.

## Publish it

A saved workflow is simply a **draft**. The backend runs only the **published version** in production. You can edit the draft while another version stays published.

Click **Publish**, and call the production URL:

```bash
curl -s -X POST localhost:5678/webhook/hello \
  -H 'content-type: application/json' \
  -d '{"name":"Nathan"}'
```

```json
{"greeting":"Hello, Nathan"}
```

Unlike the manual execution, this **production execution** does not show live on the canvas. Open the **Executions** tab of the workflow to see it.

## Look at the database

Each execution is one row in the table `execution_entity`, plus its data. The data folder holds the SQLite file:

```bash
sqlite3 $HOME/.n8n-onboarding/.n8n/database.sqlite \
  "select id, mode, status from execution_entity;"
```

```text
1|manual|success
2|webhook|success
```

The mode records how the execution started.

## Build an agent

An **agent** answers messages with an AI model. A user builds an agent in n8n, and gives it instructions and tools. A message to an agent starts an **agent turn**, which runs outside the workflow engine.

To build the agent:

1. Open **Overview**, select the **Agents** tab, and click **Create agent**.
2. Select a model, and add a credential with an API key for its provider (e.g. Anthropic or OpenAI). Ask your team for a dev key for that provider.
3. Enter the instructions `Greet the user by name.`
4. Click **Test agent**, and send `My name is Nathan.`
5. Click **Publish**.

The agent page also has skills, tools, and triggers. Like a workflow, an agent has a draft and a published version.

## What comes next

| When | Read | You learn |
|---|---|---|
| Day&nbsp;1 | [How n8n runs](how-n8n-runs.md) | How one process becomes a cluster |
| Week&nbsp;1 | [Workflow publication](workflow-publication.md), [Workflow execution](workflow-execution.md), [Agent publication](agent-publication.md), [Agent turn](agent-turn.md) | The code path behind each Day 1 step |
| Month&nbsp;1 | Area pages, as needed | The design and pitfalls of each area |

Each page names a contact person to ask about its topic. A topic that another team owns names its own contact. For an area without a page, find its path in `OWNERS` and ask the team that owns it.

Finally, this guide explains high-level concepts, not implementation details. Before your first PR, read `AGENTS.md` at the repository root for the coding conventions. For a common task, point your coding agent to its skill, e.g. `n8n:db-migrations` for a migration. For n8n as users see it, read [docs.n8n.io](https://docs.n8n.io).
