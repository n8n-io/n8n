---
title: Governance
last_reviewed: 2026-11-06
contact: kgrhartlage
---

# Governance

Admins of large teams use governance features to review workflows before publication, hide execution data, count executions, move workflows between instances, and share values between workflows.

## Workflow reviews

A user can ask for a review of a workflow before they publish it. While a review request is open, n8n refuses to publish the workflow. A review request where the reviewer asks for changes also stays open.

## Data redaction

<!-- contact: afitzek -->

Data redaction hides the node data of executions from users. n8n stores the full data, and redacts it only when a user reads an execution. New code that shows execution data must therefore read it through the execution services.

## Insights and usage

Insights shows admins how many executions ran, and how many failed. Insights and billing use [one file](../../packages/@n8n/backend-services/src/executions/counting-rules.ts) to decide which executions count. A new execution mode needs an entry there, and your code must not keep its own list of modes.

## Environments

Two features move workflows between instances, e.g. from staging to production. Environments v1 (`source-control`) syncs the whole instance through one git branch. Environments v2 (`promotions`) moves one team project at a time through a git repository, as an archive called an **n8n package**.

Both features copy entities field by field. A change to an entity can therefore break them without an error:

- Environments v1 syncs a new workflow field only after you add it to the export list.
- A v1 pull writes entities directly, not through the workflow service. A side effect that the workflow service adds, such as an event, does not happen on a pull unless the import code adds it too.
- The package schema lists the fields of a node by hand. Export drops a new node field without an error until you add it there.

The [n8n-packages guide](../../packages/cli/src/modules/n8n-packages/CLAUDE.md) explains how to change the package code.

## Variables

**Variables** are values that many workflows read, e.g. a base URL. An admin sets a variable once, and workflows read it as `$vars`. Variables are not encrypted, so they must not hold secrets.

## Quiz

1. You add a route that shows execution data in a new view. How does the route read the data?
   - A. From the execution repository.
   - B. Through the execution services.
   - C. From the cache of the main.
   - D. From the editor, which redacts it.
2. You add a new execution mode. What else must you change?
   - A. Nothing.
   - B. The counting rules file.
   - C. A list of modes in your module.
   - D. The license of the instance.
3. An Environments v1 pull writes a workflow. Which side effects of the workflow service run?
   - A. All of them.
   - B. Only the ones that the import code adds.
   - C. Only the publication of its triggers.
   - D. None, and none are necessary.

<details>
<summary>Answers</summary>

1. B. n8n redacts the data when a user reads an execution, so new code must read it through the execution services.
2. B. Insights, billing, and execution limits all use the counting rules file to decide which executions count.
3. B. A pull writes through its own import code. A side effect that the workflow service adds must be added there too.

</details>
