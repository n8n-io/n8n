# Disallow usage of restricted global variables in community nodes (`@n8n/community-nodes/no-restricted-globals`)

💼 This rule is enabled in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

## Rule Details

Prevents the use of Node.js global variables that are not allowed in n8n Cloud. While these globals may be available in self-hosted environments, they are restricted on n8n Cloud for security and stability reasons.

Restricted globals include: `clearInterval`, `clearTimeout`, `global`, `globalThis`, `process`, `setInterval`, `setTimeout`, `setImmediate`, `clearImmediate`, `__dirname`, `__filename`.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // These globals are not allowed on n8n Cloud
    const pid = process.pid;
    const dir = __dirname;

    setTimeout(() => {
      console.log('This will not work on n8n Cloud');
    }, 1000);

    return this.prepareOutputData([]);
  }
}
```

### ✅ Correct

```typescript
import { sleep } from 'n8n-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // Use n8n context methods instead
    const timezone = this.getTimezone();

    // Use the sleep helper instead of setTimeout
    await sleep(1000);

    return this.prepareOutputData([]);
  }
}
```

## Alternatives to restricted timer globals

`n8n-workflow` exports helpers that work the same everywhere, including on
n8n Cloud, instead of reaching for the restricted timer globals directly:

- Instead of `setTimeout(resolve, ms)`, use `await sleep(ms)`.
- Instead of `setTimeout` + `clearTimeout` for a cancellable delay, use
  `await sleepWithAbort(ms, abortSignal)`.
