---
title: Governance
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: afitzek
---

# Governance

[Licensing](licensing.md#feature-map) maps the paid features. This page explains four of them that admins use to control and measure an instance, and the rules of these features that a change elsewhere in the backend must keep.

## Workflow reviews

A user can ask for a review of a workflow before it goes live. While a review request is open, n8n refuses to publish the workflow. A request where the reviewer asks for changes also stays open.

The feature checks the license and the instance setting in every service, not only on its routes. A caller that does not use HTTP, such as another service, then meets the same check. Follow this pattern when a paid feature has entry points outside its routes.

## Data redaction

Data redaction hides the data of executions from the users who view them. The setting of a workflow selects which executions n8n redacts: production executions, manual executions, or both. An admin can set a minimum for the instance. A workflow can be stricter than the minimum, but not weaker, and a weaker update gets 422.

Each execution saves the redaction setting when it starts, on the process that runs it. The `redaction` module therefore runs on every process type. n8n applies the redaction when a user reads the execution, so new code that shows execution data must read it through the execution services.

## Insights and usage

The `insights` module counts finished executions on mains and webhook processes, because only those processes learn that an execution finished. The license decides how much a user can see, for example with `feat:insights:viewDashboard` and `quota:insights:maxHistoryDays`.

The `instance-reporting` module is not on by default. It reports the billable executions of each day to a receiver that the operator sets. It saves each report before it sends it, so a retry sends the same numbers.

Insights, billing, and execution limits all use one file to decide which runs count, as [Observability](observability.md#execution-counts) explains.

## Environments

Two features move workflows between instances, for example from staging to production. An instance uses one of them at a time. Environments v1 (`source-control`) syncs the whole instance through one git branch. Environments v2 (`promotions`) moves one team project at a time as an **n8n package**, through a git repository. An n8n package is a `.n8np` archive with one JSON file for each entity.

Both features copy entities field by field. A change to an entity can therefore break them without an error:

- Environments v1 syncs a new workflow field only after you add it to the export list and to `ExportableWorkflow`.
- A v1 pull writes entities directly, not through `WorkflowService`. A side effect that `WorkflowService` adds, such as an event, does not happen on a pull unless the import code adds it too.
- Each package serializer gives every entity key a decision: `copy`, `transform`, or `exclude`. A new key without a decision fails the build.
- The package schema lists the fields of a node by hand. Export drops a new node field without an error until you add it there.

The [n8n-packages guide](../../packages/cli/src/modules/n8n-packages/CLAUDE.md) explains how to change the package code.

## Quiz

1. A reviewer asks for changes to a workflow. Can a user publish the workflow now?
   - A. Yes. A request for changes closes the review.
   - B. Yes, if the user is an admin.
   - C. No. The open request blocks the publication.
   - D. No. The reviewer must publish it.
2. A workflow has no redaction setting. The instance minimum covers production executions. Does n8n redact them?
   - A. No. The workflow setting wins.
   - B. Yes.
   - C. Only for new workflows.
   - D. Only on mains.
3. An Environments v1 pull writes a workflow. Which side effects of `WorkflowService` run?
   - A. All of them.
   - B. Only the ones that the import code adds.
   - C. Only the publication of its triggers.
   - D. None, and none are necessary.

<details>
<summary>Answers</summary>

1. C. A request where the reviewer asks for changes stays open, and an open request blocks the publication.
2. B. A workflow can be stricter than the instance minimum, never weaker.
3. B. A pull writes through its own import code. A side effect that `WorkflowService` adds must be added there too.

</details>
