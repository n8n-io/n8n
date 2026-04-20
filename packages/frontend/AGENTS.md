# AGENTS.md

Extra information, specific to the frontend codebase. Use this when doing any frontend work.

- When reviewing CSS/SCSS/Vue changes in `@n8n/design-system` or `editor-ui`, always use `design-system-rules` skill.
- ALWAYS follow the guides in `@n8n/design-system/src/styleguide/*.mdx`
- PREFER using **semantic tokens** for styling from `@n8n/design-system/src/css/_tokens.scss` or `@n8n/design-system/src/css/_primitives.scss`.
- AVOID using legacy tokens from `@n8n/design-system/src/css/_tokens.legacy.scss`
- PREFER using existing components from `@n8n/design-system` over creating new ones
- Available icon names are in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`.
  Use keys from `updatedIconSet` only — `deprecatedIconSet` entries must not be used in new code.
- Use centralized constants from `@/app/constants/durations` instead of hardcoding:

```typescript
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';

useDebounceFn(() => { ... }, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
```

Categories: `UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`.
