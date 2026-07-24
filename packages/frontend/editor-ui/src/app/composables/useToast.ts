import { ElNotification } from 'element-plus';
import { setNotify } from '@n8n/composables/useToast';

// Register element-plus's notification function so package-side `useToast`
// (`@n8n/composables`) can issue notifications without importing element-plus
// directly. Runs on first import; `editor-ui` imports this module during
// bootstrap, before any consumer runs.
setNotify(ElNotification);

/**
 * @deprecated Import from `@n8n/composables/useToast` instead. This re-export
 * shim keeps existing `@/app/composables/useToast` call sites working during
 * the CAT-3686 frontend-modularization migration and will be removed once
 * importers are retired per-directory. (N8N-66)
 */
export { useToast } from '@n8n/composables/useToast';
