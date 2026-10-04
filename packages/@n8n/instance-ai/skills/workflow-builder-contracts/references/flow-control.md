# Flow Control

Import these steps from `@n8n/workflow-sdk/next`.

## Branches

- A branch or body is one part: a step, a macro, or
  `steps(a, b, …)` for several.
- `when({ name, if: (item) => … }, { then: part, else: part })` adds an IF
  node. Without `else`, false items stop. `when` needs `then`. To act on
  the false items only, negate the condition.
- `route(step, { a: part, b: part })` follows each named output; the next
  part only the first.
- `switchOn({ name, on }, { value: part, fallback: part })` adds a Switch node.
- A later trigger in the list starts another flow.

## Merge

- `merge({ name, join }, [part, part, …])` runs the parts on the same items
  and joins them in one Merge node.
- `join` is `'append'`, `'position'` or `{ left, right }`. These are not the
  Merge node action names. `{ left, right }` joins 2 parts by matching fields.

## Loops

- `forEach({ name, batchSize }, body)` runs the body on batches, one after
  the other. Use it only to pace work, e.g. for a rate limit: every node
  already runs once for each item.
- `loop({ name, maxIterations, until, next?, onLimit? }, body)` runs the body
  again until `until` holds. `onLimit: 'continue'` ends at maxIterations:
  'at most N'.
- The state is the item before `loop`: `set` it first.
- A loop body ends with a `set` of the state fields; then `next` is
  optional. There is no loop-state module.

```ts
import { workflow, manual, set, loop } from '@n8n/workflow-sdk/next';

export default workflow(
  'Count',
  manual(),
  set({ name: 'Start', fields: { n: 0 } }),
  loop(
    { name: 'Repeat', maxIterations: 10, until: (out) => out.n >= 3 },
    set({ name: 'Add', fields: { n: (s) => s.n + 1 } }),
  ),
);
```

## Large workflows

Over the box ceiling that the skill names, wrap stages (not a lone
`forEach`) in `group({ name }, part)` or pass
`groupingDecision: 'not_warranted'` and a `groupingReason`.

## Errors

- With `settings: { onError: 'continueRegularOutput' }`, a failed item is only
  `{ error: string }`. Check `item.error === undefined` before you read output
  fields. In a `recover`/`onError` branch, `item.error` is the message text.
