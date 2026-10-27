# Code execution and sandboxing

Applies to: `packages/cli`, `packages/core`, `packages/workflow`, Code and Merge nodes.

Every sandbox n8n has shipped was eventually escaped, so the bar is reachability: if sandboxed code can reach it, assume it can climb out.

Flag changes that:

- Give a sandboxed context new access to Node.js builtins, `process.env`, dynamic `require`/`import`, the filesystem, or the network
- Add a global, helper, or bridge callable from inside the sandbox that hands back a host-realm value — one returned object, thrown error, or callback is enough to walk `constructor` back out
- Weaken a prototype sanitizer, a blocklist, or the allowed globals
- Weaken file access restriction enforcement, or let unsanitized input reach a file path or an n8n internal directory

Two guards that did not hold before:

- `typeof value === 'string'` before a blocklist check: `['__proto__']` reports `'object'` yet coerces to `__proto__` as a key. Compare `String(value)`
- An AST check covering computed member expressions only — the same name also arrives as a call argument or a template literal, neither a string literal
