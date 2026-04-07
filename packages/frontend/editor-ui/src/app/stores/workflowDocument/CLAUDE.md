# workflowDocument store — Agent Guidelines

## Core pattern: apply/public method split

Every composable in this folder follows a two-layer pattern:

**Public methods** (exposed) — represent user intent. Handle normalization,
deduplication, and preparation. Call apply methods internally.

**Apply methods** (private) — the **only** functions that mutate refs. Each
apply method writes to the ref and fires an event hook. Never expose apply
methods from the composable.

```
Component → publicMethod() → normalize → applyXxx() → ref + event hook
```

This split exists to support CRDT in the future: local user actions,
remote CRDT sync, and undo/redo all converge on the same private apply
methods inside the composable.

## Event hooks

Every composable exposes change notifications via `createEventHook` from
`@vueuse/core`. Event payloads must extend `ChangeEvent` from `./types.ts`:

```typescript
import { createEventHook } from '@vueuse/core';
import type { ChangeEvent, ChangeAction } from './types';

type MyChangeEvent = ChangeEvent<{ /* domain-specific fields */ }>;
const onMyChange = createEventHook<MyChangeEvent>();
```

- Fire `void onMyChange.trigger(...)` inside every apply method
- Expose only the `.on` subscriber: `onMyChange: onMyChange.on`
- Use `CHANGE_ACTION.ADD | UPDATE | DELETE` for the `action` field

## Adding a new composable — checklist

1. Create event hook with typed payload extending `ChangeEvent`
2. Write private `apply*()` methods — each mutates the ref and fires the hook
3. Write public methods — normalize input, then call apply
4. Return: readonly refs, public methods, `onXxxChange: hook.on`
5. Never return apply methods

## Anti-patterns

| Don't | Do instead |
|-------|------------|
| Mutate refs outside apply methods | All ref writes go through apply |
| Expose apply methods from composable | Keep them private (not in return) |
| Use action objects / `onChange` router | Public methods call apply directly |
| Use `dataPinningEventBus` or global event bus | Use scoped `createEventHook` |
| Import global stores inside composable | Inject dependencies via function params |

## Dependency injection

Composables receive external dependencies as constructor params, not via
global store imports. This keeps them testable and makes coupling explicit:

```typescript
export function useWorkflowDocumentFoo(deps: {
  getNodeByName: (name: string) => INodeUi | undefined;
}) { ... }
```

## Reference implementation

See `useWorkflowDocumentActive.ts` — the simplest complete example of the
apply/public pattern with event hooks.
