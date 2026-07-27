import { ElNotification } from 'element-plus';
import { registerNotificationState, setNotify } from '@n8n/composables/useToast';
import { useNotificationsStore } from '@n8n/stores/notifications.store';

// Bootstrap wiring for the package-side `useToast` (`@n8n/composables`), which
// sits below the stores tier and so imports neither element-plus nor
// `@n8n/stores`. Runs on first import; `editor-ui` imports this module during
// bootstrap, before any consumer runs.
//
// NOTE: when this shim is retired (stage 6), both registrations must be
// relocated to a bootstrap entry point, not deleted with the file — dropping
// them degrades toasts to a no-op notifier and ignores suppression.
setNotify(ElNotification);
// A thunk, not a value: the store can only be resolved once Pinia is installed,
// which happens after this module is first imported.
registerNotificationState(() => useNotificationsStore());

/**
 * @deprecated Import from `@n8n/composables/useToast` instead. This re-export
 * shim keeps existing `@/app/composables/useToast` call sites working during
 * the CAT-3686 frontend-modularization migration and will be removed once
 * importers are retired per-directory. (N8N-66)
 */
export { useToast } from '@n8n/composables/useToast';
