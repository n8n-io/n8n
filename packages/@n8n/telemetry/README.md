# @n8n/telemetry

Definitions of what n8n emits as telemetry: event names, descriptions, their zod property schemas, and telemetry constants (e.g. the PostHog events blacklist). Reference entries as `TELEMETRY_EVENT.<DOMAIN>.<EVENT>` and pass them to `track()` for property autocomplete and compile-time checks.

Definitions only — this package never depends on PostHog, RudderStack, or any other transport; zod is the only runtime dependency. Transports live in the editor-ui telemetry plugin and the cli telemetry service.

To find which events n8n emits, what they mean, and what properties they carry, use the catalog instead of navigating the code:

```bash
pnpm --filter @n8n/telemetry catalog          # human-readable, grouped by domain
pnpm --filter @n8n/telemetry catalog --json   # structured, for programmatic use
```

Define an event in its domain file under `src/events/`:

```ts
export const WORKFLOWS_TELEMETRY = defineTelemetryEvents({
	USER_PINNED_NODE_DATA: {
		name: 'User pinned node data',
		description: 'Fires when the user pins run data on a node.',
		properties: z.object({ workflow_id: z.string(), source: z.enum(['canvas', 'ndv']) }),
	},
});
```
