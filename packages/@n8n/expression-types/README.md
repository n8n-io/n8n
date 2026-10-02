# @n8n/expression-types

TypeScript types of the n8n expression environment: the globals of a node parameter
expression (`$json`, `$input`, `$('Node')`, `$now`, …), the Code node globals, and the
extension methods that n8n adds to strings, numbers, arrays, objects, and dates.

The node contracts build in the AI builder sandbox uses it to type-check `={{ … }}` strings
and Code node JavaScript in a `@n8n/workflow-sdk/next` source.

- `.` loads the global declarations and exports `ItemScope<I, C>` and `CodeScope<I, C>`:
  `I` is the item of the node before, `C` maps each earlier node name to its item.
- `./globals` exports the global names of each scope. It loads no global declarations.
- `./plugin` is a tsserver plugin. It shows the errors of each `'={{ … }}'` string, and of
  each call with one `'{{ … }}'` string (e.g. `expr()`), in a field that also takes a
  function. Add `"plugins": [{ "name": "@n8n/expression-types/plugin" }]` to the
  `compilerOptions` of tsconfig. It needs TypeScript 6 or older: the native TypeScript 7
  server loads no plugins.
- `./check` is the check itself, with no TypeScript API: `shadowOf` builds the shadow file,
  `locate` and `findingOf` map its errors back and decide which count, and
  `sandboxRuleIssues` adds n8n's sandbox rules. The build worker
  (`instance-ai/assets/workflow-diagnostics.mts`, TypeScript 7) and the plugin (TypeScript 6)
  find the spans and run it.

`src/extensions.ts` is generated from the doc metadata of `n8n-workflow`. Run
`pnpm gen-extensions` after a change to the expression extensions.

Based on the expression types prototype (contexts, shapes, and the extension generator).
