# Disallow `eval`, the `Function` constructor, and `child_process` process-spawning functions (`exec`, `spawn`, etc.) in community nodes (`@n8n/community-nodes/no-dangerous-functions`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Community nodes run inside the n8n runtime, often on shared infrastructure. Functions that execute arbitrary code from strings or spawn operating-system processes are a primary vector for remote code execution and command injection, and have no legitimate use in a community node. This rule bans them outright:

- **`eval(...)`** — executes arbitrary code from a string.
- **`Function(...)` / `new Function(...)`** — the `Function` constructor is an `eval` equivalent that builds a callable from a string body.
- **`child_process` process spawners** — `exec`, `execSync`, `execFile`, `execFileSync`, `spawn`, `spawnSync`, and `fork`.

The `child_process` functions are detected only when they originate from the `child_process` / `node:child_process` module (via `import` or `require`), so unrelated methods such as `RegExp.prototype.exec` are not affected.

This complements [`no-restricted-imports`](no-restricted-imports.md) (which blocks the `child_process` module entirely on n8n Cloud) and [`no-restricted-globals`](no-restricted-globals.md), providing a clear, specific error and defense-in-depth that also applies when the import restrictions are relaxed.

## Examples

### ❌ Incorrect

```typescript
import { exec } from 'child_process';

eval(userProvidedCode);

const compiled = new Function('return ' + expression);

exec(`rm -rf ${userInput}`);
```

### ✅ Correct

```typescript
// Parse data instead of evaluating it.
const value = JSON.parse(rawJson);

// Use n8n helpers and well-scoped library APIs instead of spawning processes.
const response = await this.helpers.httpRequest({ url });
```
