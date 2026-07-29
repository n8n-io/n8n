/**
 * @deprecated Import from `@n8n/composables/useStorage` instead. This composable
 * moved into `@n8n/composables`, which now sits below `@n8n/stores` (N8N-100),
 * so stores can consume it without depending back on the app. This re-export
 * keeps existing importers — and their `vi.mock` of this path — working until
 * they are repointed in stage 6.
 */
export { useStorage } from '@n8n/composables/useStorage';
