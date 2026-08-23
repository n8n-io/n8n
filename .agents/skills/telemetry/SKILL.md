---
name: n8n:telemetry
description: >-
  Guides adding, changing, and reviewing telemetry through the `@n8n/telemetry`
  event registry. Use when working on telemetry, analytics, tracking, product
  events, `track()` calls, or RudderStack/PostHog product events, in frontend
  or backend code — and whenever you need to find which registered telemetry
  events exist, what an event means, or what properties it carries.
---

# Telemetry

## The registry

Events migrated to the registry live in `packages/@n8n/telemetry` as one entry per event — its exact emitted name, a description, and a zod schema typing its properties — organized per product domain in `src/events/` and composed into `TELEMETRY_EVENT.<DOMAIN>.<EVENT>`. The package defines registered events and never depends on transport SDKs.

**To find which events are registered, what they mean, or what properties they carry, run the catalog first:**

```bash
pnpm --filter @n8n/telemetry catalog          # human-readable, grouped by domain
pnpm --filter @n8n/telemetry catalog --json   # structured, for programmatic use
```

The registry is being adopted incrementally. Events not yet registered do not appear in the catalog, so search `track()` call sites when the catalog has no match.

Pass the entry itself to `track()` — it resolves the emitted name internally:

```ts
import { TELEMETRY_EVENT } from '@n8n/telemetry';

telemetry.track(TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT, {
	name: experimentName,
	variant,
});
```

Both `track()` implementations accept registry entries and plain strings. Plain strings remain supported for events that have not yet migrated:

- Frontend: `packages/frontend/editor-ui/src/app/plugins/telemetry/index.ts`
- Backend: `packages/cli/src/telemetry/index.ts`

Entries get property autocomplete and compile-time checks — typo'd, missing, or wrongly typed properties fail typecheck. When the telemetry transport is initialized, `track()` additionally validates registered-event payloads via `getEventValidationError` (shared from `@n8n/telemetry`) and logs a warning on mismatch, including unrecognized properties that slipped past structural typing. A validation warning does not stop the event from being emitted.

## Adding an event

1. **Check the catalog first** (`pnpm --filter @n8n/telemetry catalog`). If an existing event covers the same user action from another surface, augment it with a property instead of adding a near-duplicate event.
2. **Pick the domain by the event's subject** — what the event is about, never the surface that triggered it. `User opened Credential modal` is CREDENTIALS whether opened from the NDV, template setup, or chat. The trigger context goes into a `source` property.
3. **Name it with the house grammar:** sentence case, actor first, past-tense verb, specific object (`User pinned node data`). No template interpolation in names — variability goes into properties. The name must snake_case cleanly into a BigQuery table name: no punctuation beyond spaces, no casing that collides after snake_casing.
4. **Write the entry `description`** stating what the event means and when it fires — a registry test rejects blank descriptions. Document individual properties with `.describe()` where the key alone is not obvious.
5. **Type the properties with zod (`import { z } from 'zod/v4'`):** `snake_case` keys, explicit `.optional()` where a call site may omit a value, `z.looseObject()`/`.catchall()` for genuinely dynamic remainders. Schemas must stay JSON-Schema-representable — no transforms, refinements, or `z.date()` (a registry test enforces this via `z.toJSONSchema()`).
6. **Place the emission:** frontend via `useTelemetry().track(...)`; backend either through a `RelayEventMap` handler in `packages/cli/src/events/relays/telemetry.event-relay.ts` (event-bus-driven) or a direct `Telemetry.track(...)` call — both reference the same registry entry.

## Hard rules

- **Never rename an emitted event.** BigQuery materializes one table per event name; a rename orphans downstream history. A rename is delete + create, names are never reused, and removals must be coordinated with the data team before deleting the registry entry.
- **Never duplicate an event name** — one entry per event across all domains, referenced by every call site (even FE + BE). CI fails on collision.
- **Properties evolve additively only.** Changing a property's type forks warehouse columns even under a stable name. Mark deprecations on the schema (`.meta({ deprecated: true })`) instead of removing.
- **Breaking changes need a data-team heads-up** in Slack plus a Notion note before they ship.

## Testing

Do not retype event-name literals in tests:

- In call-site tests, mock `useTelemetry().track` or the backend `Telemetry.track` service and expect the registry entry itself with the payload.
- In frontend transport tests, expect `window.rudderanalytics.track` to receive `entry.name` and the augmented payload.
- In backend transport tests, expect the RudderStack payload's `event` field to equal `entry.name` and its `properties` to include the event payload.

## Related

Experiment exposure and metric events follow `n8n:experiments` (`.agents/skills/experiments/SKILL.md`).
