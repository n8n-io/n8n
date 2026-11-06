---
title: Permissions
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: guillaumejacquart
---

# Permissions

[Authentication](authentication.md) explained how n8n knows who sends a request. This page explains what that caller may do, which project owns each resource, and how an admin can refuse an action that a role allows.

## Scopes and roles

A permission in n8n is a **scope**, a string such as `workflow:publish`. A **role** is a set of scopes. Each user has one global role: owner, admin, member, or chat user. A chat user can use workflows through chat, but cannot build them.

Workflows, agents, and credentials belong to a **project**, not to a user. Each user has a personal project, and team projects need a license. Membership in a project gives the user a project role, such as editor or viewer.

Each route declares the scope that it needs, with `@GlobalScope` or `@ProjectScope`. For a project scope, n8n finds the resource ID in the URL and the project of that resource. Then it checks the role of the user in that project. A list route cannot check each row through its URL. It asks for the projects where the user has the scope, and it filters the list on those projects.

Roles and scopes are rows in the database, so an admin can create custom roles with `feat:customRoles`. The global admin role needs `feat:advancedPermissions`. `@n8n/permissions` defines every scope, and the editor uses the same package.

## Ownership

The workflow table has no owner column. Rows in `shared_workflow` and `shared_credentials` link a resource to a project, with a role such as `workflow:owner` or `credential:user`. To find the project that owns a workflow, or the workflows of a project, filter the sharing table on the owner role.

n8n caches the owner project of each workflow. Code that changes owners in bulk must call `invalidateWorkflowProjectCacheByIds`.

A user can move a workflow to another project. n8n unpublishes the workflow, replaces all its sharings with one owner row, and publishes it again. A policy of the target project can refuse the new publication, and the workflow then stays unpublished.

An admin who deletes a user or a team project can select a project to receive its resources. Without that project, n8n deletes the workflows and credentials that the user or the project owns.

## Policies

A **policy** lets an admin refuse an action that the role of a user allows, for example a publication that uses a blocked node type. A policy feature adds a class with `@PolicyCheck()`. n8n runs every check at fixed points, such as a workflow save, a publication, or the start of an execution.

Every check must pass. A refusal answers 403. A check that throws or times out also blocks the action, and the answer is 503. An instance without checks behaves as if policies did not exist. `packages/cli/src/modules/policy-infrastructure/README.md` shows how to write a check.

## Quiz

1. You need all workflows that a project owns. Where do you look?
   - A. The `projectId` column of the workflow table.
   - B. The `shared_workflow` table, filtered on the role `workflow:owner`.
   - C. The folders of the project.
   - D. The `project_relation` table.
2. You write code that moves many workflows to another project. What else must it do?
   - A. Nothing.
   - B. Restart the leader, so that the triggers move.
   - C. Call `invalidateWorkflowProjectCacheByIds`.
   - D. Update the `projectId` column of each workflow.
3. A policy check times out during a publication. What happens?
   - A. The publication goes ahead.
   - B. n8n retries the check until it answers.
   - C. The publication is blocked, and the answer is 503.
   - D. The publication is blocked, and the answer is 403.

<details>
<summary>Answers</summary>

1. B. The workflow table has no owner column. The sharing table links each workflow to its projects.
2. C. Without that call, other code reads the old project from the cache until the entry expires.
3. C. A check that throws or times out blocks the action. The answer 403 is for a refusal.

</details>
