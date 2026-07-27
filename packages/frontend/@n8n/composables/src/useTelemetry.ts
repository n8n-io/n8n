/**
 * @deprecated Import from `@n8n/frontend-utils/useTelemetry` instead. The
 * telemetry contract and its DI moved down to `@n8n/frontend-utils`, which sits
 * below `@n8n/stores`, so stores can consume it without the build-fatal
 * `stores → composables` cycle. This re-export keeps existing importers working
 * and will be removed once they are retired. (N8N-100)
 *
 * Must stay a re-export, never a re-implementation: `useTelemetry` resolves a
 * module-level registered instance, so a second copy of this module would
 * silently split the singleton — `editor-ui`'s telemetry plugin registers
 * through this path while `useToast` reads through it. Guarded by
 * `useTelemetry.singleton.test.ts`.
 */
export * from '@n8n/frontend-utils/useTelemetry';
