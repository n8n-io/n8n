# @n8n/telemetry

Registry definitions for telemetry events: event names, descriptions, their zod property schemas, and telemetry constants (e.g. the PostHog events blacklist). Reference entries as `TELEMETRY_EVENT.<DOMAIN>.<EVENT>` and pass them to `track()` for property autocomplete and compile-time checks.

Definitions only — this package never depends on PostHog, RudderStack, or any other transport; zod is the only runtime dependency. Transports live in the editor-ui telemetry plugin and the cli telemetry service.

To find which events are registered, what they mean, and what properties they carry, use the catalog:

```bash
pnpm --filter @n8n/telemetry catalog          # human-readable, grouped by domain
pnpm --filter @n8n/telemetry catalog --json   # structured, for programmatic use
```

The registry is being adopted incrementally. Events not yet registered do not appear in the catalog, so search `track()` call sites when the catalog has no match.

Define an event in its domain file under `src/events/`:

```ts
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOWS_TELEMETRY = defineTelemetryEvents({
	USER_PINNED_NODE_DATA: {
		name: 'User pinned node data',
		description: 'Fires when the user pins run data on a node.',
		properties: z.object({ workflow_id: z.string(), source: z.enum(['canvas', 'ndv']) }),
	},
});
```

Then add the domain to `src/telemetry-events.ts` so it is exported and included in the catalog:

```ts
import type { TelemetryEventRegistry } from './define';
import { PLATFORM_TELEMETRY } from './events/platform';
import { WORKFLOWS_TELEMETRY } from './events/workflows';

export const TELEMETRY_EVENT = {
	PLATFORM: PLATFORM_TELEMETRY,
	WORKFLOWS: WORKFLOWS_TELEMETRY,
} satisfies TelemetryEventRegistry;
```
