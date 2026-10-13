# Require create and execute scopes for standalone node runs

Date: 2026-10-12

Status: Active

Decision Owner: Assistant

Source: https://linear.app/n8n/issue/AST-1705

## Context

The n8n Assistant can run one node standalone. The caller supplies the node type, the node
parameters, the credentials, and the input items. The service puts the node in a temporary
workflow in the target project, runs it, and deletes the workflow.

`workflow:execute` lets a user run a workflow that already exists. The manual run endpoint
loads the workflow from the database and ignores a definition in the request body. A user
who has `workflow:execute` but not `workflow:create` or `workflow:update` can only run
workflows that someone else wrote.

A standalone node run does not run a stored workflow. The caller writes the node, so the
run is workflow authoring and execution in one step.

## Decision

A standalone node run requires both `workflow:create` and `workflow:execute` in the target
project. The user must hold both scopes. One of the two is not sufficient.

The main reason: the caller defines the node. That is the same power as creating a workflow
and running it. The required scopes match those two actions.

The check runs before the service resolves the node or reads a credential.

## Alternatives Considered

1. **Keep `workflow:execute` alone.** We rejected it because it lets a role that cannot
   author workflows run any node with any parameters. That breaks the contract of an
   execute-only role.
2. **Require `workflow:update` with `workflow:execute`.** We rejected it because
   `workflow:update` applies to a workflow that exists, and this technically creates a new
   workflow it runs.

## Consequences

1. A custom role that has `workflow:execute` but not `workflow:create` cannot use standalone
   node runs. Such a user can still run stored workflows through the Assistant.
2. The built-in project roles do not change in behavior. Each role that has
   `workflow:execute` also has `workflow:create`. A personal project owner has both scopes.
3. Any new path that runs a caller-defined node or workflow must require `workflow:create`
   with `workflow:execute`.

## Links

RFC: -

Documentation: -

Related ADRs: -
