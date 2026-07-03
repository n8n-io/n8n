# AGENTS.md

Extra information, specific to the frontend codebase. Use this when doing any frontend work.

- When reviewing CSS/SCSS/Vue changes in `@n8n/design-system` or `editor-ui`, always use `n8n:design-system` skill.
- ALWAYS follow the guides in `@n8n/design-system/src/styleguide/*.mdx`
- PREFER using **semantic tokens** for styling from `@n8n/design-system/src/css/_tokens.scss` or `@n8n/design-system/src/css/_primitives.scss`.
- AVOID using legacy tokens from `@n8n/design-system/src/css/_tokens.legacy.scss`
- PREFER using existing components from `@n8n/design-system` over creating new ones
- AVOID importing `element-plus` or `reka-ui` directly in `editor-ui` — import the equivalent `@n8n/design-system` component instead (an ESLint `no-restricted-imports` warning enforces this; type-only imports are allowed during migration). Common mappings: Collapsible → `N8nCollapsiblePanel`, DropdownMenu → `N8nDropdownMenu`, `Primitive` → native HTML.
- When rendering `el-plus` popovers/dropdowns/selects inside `N8nDialog`, prefer to keep them in the dialog stacking context with `:teleported="false"` unless they intentionally need to escape.
- Available icon names are in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`.
  Use keys from `updatedIconSet` only — `deprecatedIconSet` entries must not be used in new code.
- Use centralized constants from `@/app/constants/durations` instead of hardcoding:

```typescript
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';

useDebounceFn(() => { ... }, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
```

Categories: `UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`.
