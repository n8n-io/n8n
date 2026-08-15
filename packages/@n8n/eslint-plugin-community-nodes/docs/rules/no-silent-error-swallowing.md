# Disallow webhook lifecycle methods (checkExists, create, delete) from silently swallowing errors in catch blocks (`@n8n/community-nodes/no-silent-error-swallowing`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Webhook trigger nodes register, verify, and clean up webhooks on a third-party
service through the `webhookMethods` lifecycle (`checkExists`, `create`,
`delete`). When these methods catch an error and silently discard it — an empty
`catch` block, or one that only returns `true`/`false` without logging or
rethrowing — real failures become invisible. The user sees a webhook that
"succeeded" while it was never registered, a stale webhook that is never cleaned
up, or a workflow that quietly stops firing with no diagnostic to explain why.

This rule flags `catch` blocks inside the `checkExists`, `create`, and `delete`
methods of a node's `webhookMethods` that:

- have an empty body, or
- contain only a `return true`, `return false`, or bare `return` statement.

Handle the error instead: log it (so it surfaces in execution logs) and/or
rethrow it. A `catch` that logs before returning, rethrows, or returns a
computed value is allowed.

## Examples

### ❌ Incorrect

```typescript
webhookMethods = {
  default: {
    async checkExists(this: IHookFunctions): Promise<boolean> {
      try {
        return await this.helpers.httpRequest({ url });
      } catch (error) {}
    },
    async create(this: IHookFunctions): Promise<boolean> {
      try {
        return await this.helpers.httpRequest({ url });
      } catch (error) {
        return false;
      }
    },
  },
};
```

### ✅ Correct

```typescript
webhookMethods = {
  default: {
    async checkExists(this: IHookFunctions): Promise<boolean> {
      try {
        return await this.helpers.httpRequest({ url });
      } catch (error) {
        this.logger.error('checkExists failed', { error });
        return false;
      }
    },
    async create(this: IHookFunctions): Promise<boolean> {
      try {
        return await this.helpers.httpRequest({ url });
      } catch (error) {
        throw error;
      }
    },
  },
};
```
