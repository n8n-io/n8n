# @n8n/expression-types

TypeScript types of the n8n expression environment: the globals of a node parameter
expression (`$json`, `$input`, `$('Node')`, `$now`, …), the Code node globals, and the
extension methods that n8n adds to strings, numbers, arrays, objects, and dates.

The node contracts build in the AI builder sandbox uses it to type-check `={{ … }}` strings
and Code node JavaScript in a `@n8n/workflow-sdk/next` source. See
`packages/@n8n/instance-ai/assets/workflow-diagnostics.mts`.

- `.` loads the global declarations and exports `ItemScope<I, C>` and `CodeScope<I, C>`:
  `I` is the item of the node before, `C` maps each earlier node name to its item.
- `./globals` exports the global names of each scope. It loads no global declarations.

`src/extensions.ts` is generated from the doc metadata of `n8n-workflow`. Run
`pnpm gen-extensions` after a change to the expression extensions.

Based on the expression types prototype (contexts, shapes, and the extension generator).
