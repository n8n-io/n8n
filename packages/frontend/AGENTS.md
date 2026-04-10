# AGENTS.md

Extra information, specific to the frontend codebase. Use this when doing any frontend work.

- For CSS/SCSS/Vue style changes and updates touching `@n8n/design-system` or `editor-ui`, follow `design-system-rules` skill.
- Prefer using tokens and primitives from `@n8n/design-system/src/css/_primitives.scss` and `@n8n/design-system/src/css/_tokens.scss`.
- Available icon names are in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`.
Use keys from `updatedIconSet` only — `deprecatedIconSet` entries must not be used in new code.
- Use centralized constants from `@/app/constants/durations` instead of hardcoding:

```typescript
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';

useDebounceFn(() => { ... }, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
```

Categories: `UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`.
