---
title: Authorization
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: guillaumejacquart
---

# Authorization

The [Authentication](authentication.md) page explained how n8n knows who sends a request.

This page explains what that user may do, which project owns each resource, and how an admin can block an action that a role allows.

## Roles and scopes

A **scope** is one permission, e.g. `workflow:publish`. A **role** is a set of scopes. `@n8n/permissions` defines every scope, for both the backend and the editor.

Each user has two kinds of role:

- **Global role:** Applies to the whole instance, e.g. owner, admin, or member.
- **Project role:** Applies to the resources of one project, e.g. editor or viewer.

A route declares the scope that it needs. n8n first checks the global role of the user, and then the role of the user in the project of the resource. For example, the route that updates a workflow needs `workflow:update`:

```ts
@Patch('/:workflowId')
@ProjectScope('workflow:update')
async update(
	req: WorkflowRequest.Update,
	_res: unknown,
	@Param('workflowId') workflowId: string,
	@Body body: UpdateWorkflowDto,
) {
```

A list route must filter its results to the projects where the user has the scope.

## Ownership

Most apps tie a resource to the user who created it. In n8n, a project owns every workflow, agent, credential, and data table instead. Each user has a personal project, and can also be a member of team projects. Work in a team project stays with the team when a user leaves.

A user accesses a resource through a project, with their role in that project. This is usually the project that owns the resource. To give another project access, a user shares a workflow or a credential with it. Sharing does not change the owner. Owners and admins can access every resource through their global role.

To change the owner, a user transfers a workflow, credential, or folder to another project. When an admin deletes a user or a project, the admin can also transfer its resources.

## Policies

A **policy** allows an admin to block an action that a role permits, e.g. a publication with a blocked node or credential type. n8n runs policy checks when a user saves, transfers, or imports a workflow or credential, or publishes a workflow. An execution runs them when it starts and when it decrypts a credential.

A check that fails or times out also blocks the action. The [policy README](../../packages/cli/src/modules/policy-infrastructure/README.md) shows how to write a policy check.

## Quiz

1. A list route returns workflows. How does it check the scope of the user?
   - A. It checks each row through the URL.
   - B. It filters the list on the projects where the user has the scope.
   - C. It checks only the global role.
   - D. It does not check.
2. A user shares a workflow with a team project. Which project owns the workflow?
   - A. The team project.
   - B. The project that owned it before.
   - C. Both projects.
   - D. No project. The user owns it.
3. A policy check times out during a publication. What happens?
   - A. The publication goes ahead.
   - B. n8n retries the check until it answers.
   - C. The publication is blocked.
   - D. n8n skips that check.

<details>
<summary>Answers</summary>

1. B. A list route must filter its results to the projects where the user has the scope.
2. B. Sharing does not change the owner.
3. C. A check that fails or times out also blocks the action.

</details>
