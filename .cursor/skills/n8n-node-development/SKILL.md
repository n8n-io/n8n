---
name: n8n-node-development
description: Guides adding or changing n8n built-in nodes, credentials, triggers, polling nodes, webhooks, and node workflow tests in packages/nodes-base.
---

# n8n Node Development

## Start Here

Read `packages/nodes-base/AGENTS.md`, then inspect a nearby node with the same shape:

- Declarative node: routing plus `requestDefaults`.
- Programmatic node: `execute`.
- Webhook trigger: `webhook` plus `webhookMethods`.
- Polling trigger: `poll` and `getWorkflowStaticData('node')`.

## Implementation Rules

- Split operation and field descriptions into focused files when nearby nodes do.
- Use clear `displayName`, `description`, defaults, and `displayOptions`.
- Use `noDataExpression: true` for resource and operation selectors.
- Use `NodeOperationError` for user input failures and `NodeApiError` for external API failures.
- Support `continueOnFail` when the node pattern supports it.

## Testing

- Mock external APIs with `nock`.
- Prefer existing `NodeTestHarness` workflow-test fixtures for execution behavior.
- Run node tests from the package:

```bash
cd packages/nodes-base
pnpm test <test-file>
```
