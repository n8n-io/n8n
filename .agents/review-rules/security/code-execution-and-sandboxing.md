# Code execution and sandboxing

Applies to: `packages/cli`, `packages/core`, `packages/workflow`.

Flag changes that:

- Weaken expression evaluation sandbox protections
- Reduce isolation in Code node sandboxes (JavaScript/Python)
- Grant sandboxed contexts new access to Node.js builtins or external modules
- Introduce prototype pollution or constructor access bypasses
- Weaken prototype sanitizers or function context validators
- Expose `process.env` access in Code nodes

Higher scrutiny applies to the expression engine and the code execution nodes —
a regression there is reachable by any workflow author.
