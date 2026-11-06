---
title: Start here
audience: Backend engineers new to n8n
tier: 1
last_reviewed: 2026-11-05
contact: ivov
---

# Start here

This guide is for an engineer who knows TypeScript, Node.js, and SQL, and who joins the n8n backend. It assumes nothing about n8n. On this page you run n8n, and you build one workflow and one agent. The rest of the guide follows those two things through the backend.

## Run n8n

Set up the repository as `CONTRIBUTING.md` tells you: Node.js, pnpm, `pnpm install`, and `pnpm build`. Then start n8n with an empty data folder:

```bash
N8N_USER_FOLDER=$HOME/.n8n-onboarding pnpm start
```

Open `http://localhost:5678` and create the owner account. The account exists only in this local instance.

You started one process. It serves the editor in your browser and keeps its data in a SQLite file in the data folder. It also does all the work that this page asks for.

## Build a workflow

A **workflow** is a graph of **nodes**. Each node is one step, such as an HTTP call or a data change. Data moves between nodes as **items**, which are JSON objects. The first node is a **trigger**. The trigger decides when the workflow runs.

To build the workflow:

1. Create a workflow, and name it `Day 1`.
2. Add a **Webhook** trigger. Set **HTTP Method** to `POST`, **Path** to `hello`, and **Respond** to **When Last Node Finishes**.
3. Add an **Edit Fields (Set)** node after the trigger. Add a field `greeting`, switch its value to an expression, and enter `{{ 'Hello, ' + $json.body.name }}`.
4. Save the workflow.

The text in `{{ }}` is an **expression**: a small piece of JavaScript that reads the item that comes into the node. Here it reads the request body that the webhook received.

## Run it from the editor

Click **Execute**. The editor now waits for one call to the test URL of the webhook. Call it:

```bash
curl -s -X POST localhost:5678/webhook-test/hello -H 'content-type: application/json' -d '{"name":"Grace"}'
```

```text
{"greeting":"Hello, Grace"}
```

The canvas marks each node with a check and shows `1 item` on each connection. The backend sent the result of each node to your browser tab while the workflow ran. A run that the editor starts is a **manual execution**.

## Publish it

A saved workflow is a **draft**. The backend runs only the **published** version in production. You can change the draft while an older version stays published.

Click **Publish**, and call the production URL:

```bash
curl -s -X POST localhost:5678/webhook/hello -H 'content-type: application/json' -d '{"name":"Ada"}'
```

```text
{"greeting":"Hello, Ada"}
```

No browser watched this run. Open the **Executions** tab of the workflow to see it.

## Look at the database

Each run is an **execution**: one row in the table `execution_entity`, plus its data. The data folder holds the SQLite file:

```bash
sqlite3 $HOME/.n8n-onboarding/.n8n/database.sqlite "select id, mode, status from execution_entity;"
```

```text
1|manual|success
2|webhook|success
```

The mode records how the run started.

## Build an agent

An **agent** is an AI model with instructions and tools. It answers messages. A message to an agent does not start a workflow execution. It starts an **agent turn**, which a different runtime runs.

To build the agent:

1. Open **Overview**, select the **Agents** tab, and click **Create agent**.
2. Select a model. The model needs a credential for a provider, such as an API key. Ask your team for a development key.
3. Enter the instructions `Greet the user by name.`
4. Click **Test agent**, and send `My name is Ada.`

The agent page also has skills, tools, triggers, and a **Publish** button. Like a workflow, an agent has a draft and a published version.

If you have no model key yet, read the steps and continue. Week 1 follows a turn in the code.

## What comes next

| When | Read | Time |
|---|---|---|
| Day 1 | This page, then [How n8n runs](how-n8n-runs.md). It explains how the one process that you started becomes a cluster | 1 hour |
| Week 1 | The pages in Week 1, in order. Each one follows a step that you did on this page | 2 hours |
| Month 1 | The page for an area, when you start work in it | 15 minutes each |
| When you need it | The page in How to for your task | |

Each page shows a contact below its title. Ask that person about the topic of the page. For an area without a page, find its path in `OWNERS` and ask the team that owns it. When an answer is missing from this guide, add it.

This guide explains ideas, not files. For the rules of the code, read `AGENTS.md` at the root before your first PR. For a task such as a migration or a public API endpoint, use the skill in `.agents/skills/`. For the view of a user, read docs.n8n.io.
