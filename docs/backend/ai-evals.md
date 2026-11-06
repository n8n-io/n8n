---
title: AI evals
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: CharlieKolb
---

# AI evals

[AI for building](ai-for-building.md) and [AI context](ai-context.md) showed AI features that call a model. The output of a model changes from one run to the next, so a unit test cannot show that an AI feature gives good results. An **eval**, short for evaluation, runs an AI feature on a set of cases, and scores each result. This page explains the three kinds of evals in n8n.

| Kind | Who runs it | What it tests | Code |
|---|---|---|---|
| Workflow evals | Users | A workflow, often with AI nodes | `packages/cli/src/evaluation.ee/` |
| Agent evals | Users | An agent | `agent-evals` module |
| Assistant evals | n8n engineers | The n8n Assistant | `packages/@n8n/instance-ai/evaluations/` |

> **An eval run does not continue after a restart.** At startup, n8n marks each unfinished run as failed. A user must start the run again.

## Workflow evals

A user adds an **Evaluation Trigger** node, which reads a dataset, and **Evaluation** nodes, which compute metrics. A metric can come from a model that judges the output.

A test run has these steps:

1. n8n runs only the Evaluation Trigger node, to fetch the whole dataset.
2. For each row of the dataset, n8n runs the workflow in the mode `evaluation`. The row is the pinned data of the trigger.
3. The Evaluation nodes compute the metrics of each case.
4. n8n combines the metrics and saves the test run and its cases.

The license limits evals with two quotas:

- `quota:evaluations:maxWorkflows` limits how many workflows can have test runs. A workflow that already has test runs can run again.
- `quota:evaluations:concurrencyLimit` limits how many test runs can be active at the same time.

## Agent evals

Agent evals run a dataset against a real agent and save the result of each case. They can also generate cases, and suggest changes to the instructions of the agent. They do not run in queue mode, because the mocks of agent tools cannot go through the queue. Multi-main needs queue mode, so agent evals run only on a single main. The module is on by default, and the PostHog flag `101_agent_evals` decides which users can use it.

## Assistant evals

n8n engineers run eval scenarios against the n8n Assistant, to check a change to its prompts, tools, or model. The scenarios need an instance with `N8N_INSTANCE_AI_EVAL_INSTANCE=true`, which loads the eval routes.

## Quiz

1. A main restarts during a workflow eval. What happens to the test run?
   - A. It continues from the last case.
   - B. It starts again from the first case.
   - C. n8n marks it as failed, and the user starts it again.
   - D. A worker takes it over.
2. Why do agent evals not run in queue mode?
   - A. Workers have no access to the database.
   - B. The mocks of agent tools cannot go through the queue.
   - C. Agent evals need the leader.
   - D. Workers cannot call models.

<details>
<summary>Answers</summary>

1. C. The runner cannot continue an interrupted run, so n8n marks it as failed at startup.
2. B. The agent runs with mocks of its tools, and the mocks exist only in the process.

</details>
