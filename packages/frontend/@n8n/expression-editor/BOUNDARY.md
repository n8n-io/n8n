# Boundary: `@n8n/expression-editor`

The n8n expression input exists once, in editor-ui, welded to the NDV. This
package is the seam: the CodeMirror editor, the segment/resolution plumbing and
the fixed/expression mode switch, with the two host-specific halves —
**how a resolvable is evaluated** and **what autocompletes** — handed in.

Two consumers:

| consumer | scope | resolves with |
| --- | --- | --- |
| editor-ui / NDV | `$json`, `$node`, `$input`, run data | `useWorkflowHelpers().resolveExpression`, ndv + workflow stores |
| `@n8n/ui-builder` | `$state`, `$item`, `$index`, `$loading`, `$route`, `$pages` | `@n8n/tournament`, against the live canvas scope |

`@n8n/ui-builder` must not gain a dependency on editor-ui or on workflow/NDV
stores. Dependency direction stays: editor-ui → ui-builder → expression-editor.

## The two injection interfaces

```ts
interface ExpressionResolution {
  resolved: unknown;
  error: boolean;
  fullError: Error | null;
}

interface ExpressionResolver {
  /** One `{{ … }}` resolvable, braces included. Never throws. */
  resolve: (resolvable: string) => ExpressionResolution | Promise<ExpressionResolution>;
  /** Re-resolve every segment when this changes. */
  watchImmediate?: () => unknown;
  /** Re-resolve every segment, debounced, when this changes. */
  watchDebounced?: () => unknown;
}
```

```ts
import type { CompletionSource } from '@codemirror/autocomplete';

// n8nLang(sources) wraps each in ifIn(['Resolvable'], …) so a source only
// fires inside `{{ }}` and never in the surrounding plaintext.
function n8nLang(completionSources?: readonly CompletionSource[]): LanguageSupport;
```

A third, smaller one, because the highlighter reports decoration failures and
only editor-ui has Sentry:

```ts
function setExpressionEditorErrorReporter(report: (error: unknown) => void): void;
```

## What moves

Source-of-truth files leave editor-ui. Where a path had many importers it is
left behind as a shim so no call site changes — this is the whole reason the
migration is one commit and not a rewrite.

| moves to `@n8n/expression-editor` | from |
| --- | --- |
| `src/types.ts` | `app/types/expressions.ts` (minus `ExpressionLocalResolveContext`) |
| `src/utils/expressions.ts` | generic half of `app/utils/expressions.ts` |
| `src/utils/forceParse.ts` | `app/utils/forceParse.ts` |
| `src/utils/parameterMode.ts` | `formatAsExpression` / `parseFromExpression` / `isResourceLocatorParameterType`, from `features/ndv/shared/ndv.utils.ts` |
| `src/codemirror/n8nLang.ts` | same, parameterised by completion sources |
| `src/codemirror/expressionCloseBrackets.ts` + test | same |
| `src/codemirror/expressionDeprecations.ts` + test | same |
| `src/codemirror/resolvableHighlighter.ts` | same, Sentry → injected reporter |
| `src/codemirror/theme.ts` | `components/InlineExpressionEditor/theme.ts` |
| `src/composables/useExpressionEditor.ts` | same, resolver injected |
| `src/components/ExpressionEditorInput.vue` | `InlineExpressionEditor/InlineExpressionEditorInput.vue` |
| `src/components/ExpressionOutput.vue` | same; `html`/`markdown` render modes become scoped slots |
| `src/components/ExpressionModeToggle.vue` | the two-option `N8nRadioButtons` inside `ParameterOptions.vue` |

## What stays in editor-ui

Everything that can only mean something inside a workflow:

- **Completion sources** — `plugins/codemirror/completions/**`. `datatype`,
  `dollar`, `bracketAccess`, `blank`, `nonDollar` all reach for
  `resolveParameter`, the NDV store, external-secrets and environments stores.
  They are the injected argument, not part of the seam.
- **Resolution** — `useWorkflowHelpers`, `workflowExecutionState`,
  `ExpressionLocalResolveContext`, pin data, target item. Packaged as
  `useNdvExpressionResolver()`, which is what editor-ui passes in.
- **Facets** — `TARGET_NODE_PARAMETER_FACET`, `WORKFLOW_DOCUMENT_FACET`. Passed
  through the extensions array rather than baked into the editor state.
- **Telemetry** — `useAutocompleteTelemetry`, the expression-editor-close event.
  The wrapper owns a compartment and reconfigures it.
- **Drag and drop** — `dragAndDrop.ts` reads the NDV store to know what is being
  dragged. The generic half (`dropCursor`) is CodeMirror's own.
- **Keymap / prettier** — `keymap.ts` pulls `format.ts` and therefore prettier,
  for code editors. Handed in as an extension instead of moved, so the package
  does not carry a formatter it never runs.
- **The NDV chrome** — `ExpressionParameterInput.vue`,
  `InlineExpressionEditorOutput.vue` (popover), `OutputItemSelect.vue`,
  `InlineExpressionTip.vue`, `ExpressionEditModal`. Run-data-aware, NDV-only.

## Shims left in editor-ui

Re-export only, so importers are untouched: `app/types/expressions.ts`,
`app/utils/forceParse.ts`, `app/utils/expressions.ts`,
`plugins/codemirror/expressionCloseBrackets.ts`,
`plugins/codemirror/expressionDeprecations.ts`,
`plugins/codemirror/resolvableHighlighter.ts` (also installs the Sentry
reporter), `components/InlineExpressionEditor/theme.ts`.

Thin wrappers, same public shape: `plugins/codemirror/n8nLang.ts` (binds
`n8nCompletionSources()`), `composables/useExpressionEditor.ts` (binds
`useNdvExpressionResolver()` + facets + telemetry),
`components/InlineExpressionEditor/InlineExpressionEditorInput.vue`,
`components/InlineExpressionEditor/ExpressionOutput.vue` (fills the
`html`/`markdown` slots with `RunDataHtml` / `RunDataMarkdown`).

## The ui-builder side

- `uiBuilderCompletions(getScope)` — one `CompletionSource`. At a bare `$` it
  offers the names actually bound in the live scope; after a dot it walks the
  live value and offers its own keys, so `$state.rows[0].` drills into real data
  rather than a schema.
- `tournamentResolver(getScope)` — `ExpressionResolver` over
  `core/expressions.ts`'s `evaluateExpression`, which throws so the preview can
  show the error rather than swallowing it into `undefined`.
- **Live scope bridge** — `renderer/scope-registry.ts`. `UiRenderer` publishes
  the scope it rendered each node in, keyed by node id; the inspector reads the
  selected node's entry. One-directional: the registry is provided by
  `UiBuilderPanel`, is absent in the served runtime, and the renderer only ever
  writes to it. A node inside a repeat renders once per element under one id, so
  only iteration 0 publishes — `$item`/`$index` in the preview are the first
  element, index 0.
