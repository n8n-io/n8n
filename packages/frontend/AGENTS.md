# AGENTS.md

Extra information, specific to the frontend codebase. Use this when doing any frontend work.

- Frontend feature modules are at `packages/modules/<name>/frontend`, and not in `editor-ui/src/features`.
  Scaffold one with `pnpm n8n-module-sdk create`. Then obey `packages/@n8n/module-cli/frontend-module-guide.md`.
  A module owns its tsconfig, its lint config and its vitest config.
  A module must never import `@/…` or another `@n8n/frontend-module-*`.
- When rendering `el-plus` popovers/dropdowns/selects inside `N8nDialog`, prefer to keep them in the dialog stacking context with `:teleported="false"` unless they intentionally need to escape.
- Available icon names are in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`.
  Use keys from `updatedIconSet` only — `deprecatedIconSet` entries must not be used in new code.
- Use centralized constants from `@/app/constants/durations` instead of hardcoding:

```typescript
import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';

useDebounceFn(() => { ... }, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
```

Categories: `UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`.
