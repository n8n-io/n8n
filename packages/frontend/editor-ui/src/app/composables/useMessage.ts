/**
 * @deprecated Import from `@n8n/design-system` instead. This re-export shim keeps
 * existing `@/app/composables/useMessage` call sites working during the CAT-3686
 * frontend-modularization migration and will be removed once importers are
 * retired per-directory. (N8N-37)
 */
export { useMessage } from '@n8n/design-system';
export type { MessageBoxConfirmResult } from '@n8n/design-system';
