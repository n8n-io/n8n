/**
 * @deprecated Import from `@n8n/frontend-utils/useStorage` instead. This
 * composable moved into `@n8n/frontend-utils`, which sits below `@n8n/stores`,
 * so stores can consume it without depending back on the app. This re-export
 * keeps existing importers — and their `vi.mock` of this path — working, and
 * will be removed once they are retired. (N8N-100)
 */
export { useStorage } from '@n8n/frontend-utils/useStorage';
