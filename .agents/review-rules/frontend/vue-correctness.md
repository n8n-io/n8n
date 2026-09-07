# Vue correctness

Applies to: `packages/frontend`.

These fail silently: `vue-tsc` and ESLint pass, the app runs, the value or the
DOM is wrong.

## List identity

The editor patches long-lived lists in place, so `:key` decides whether Vue
reuses the wrong row. Flag an index `:key` on a list that can be reordered,
filtered or shortened, where revealed fields, inputs and refs then follow the
position instead of the item; a key omitting part of what identifies the
instance, e.g. a session key without the execution id, so switching
executions reuses the old component's state; and a key regenerated every
render. Index keys are fine on an append-only list.

## Reactivity

- A `ref` or `computed` read without `.value` outside a template. Templates
  unwrap, script does not, so you hold the wrapper: `activeNode?.type` reads
  `undefined` instead of the type, without throwing.
- A reactive object spread, cloned or deep-merged. `{ ...store }`,
  `structuredClone` and recursive merge helpers detach it, and a merge into a
  shared defaults object leaks one call into the next.
- An `injectStrict` helper such as `injectNDVStore` called outside `setup()`.

## State written after an await

Navigation swaps the active workflow document, and dialogs, threads and NDV
panels unmount mid-request. Flag a continuation writing to a store,
`localStorage` or the route without re-checking what it captured before the
`await`: navigating first and persisting afterwards what the destination was
meant to read, clearing a selection the user has since changed, toasting for a
closed dialog. Ask for a revalidated reference or a request sequence number,
never a lock.

## Payload shape

Backend responses and `/rest/settings` omit optional sections entirely. Flag a
new getter or computed walking more than one level into a response without
optional chaining, e.g. `settings.value.license.planName`. It throws during
boot and takes the view with it.
