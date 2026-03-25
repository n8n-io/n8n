# `@clack/core`

Clack contains low-level primitives for implementing your own command-line applications.

Currently, `TextPrompt`, `SelectPrompt`, and `ConfirmPrompt` are exposed as well as the base `Prompt` class.

Each `Prompt` accepts a `render` function.

```js
import { TextPrompt, isCancel } from '@clack/core';

const p = new TextPrompt({
  render() {
    return `What's your name?\n${this.valueWithCursor}`;
  },
});

const name = await p.prompt();
if (isCancel(name)) {
  process.exit(0);
}
```
