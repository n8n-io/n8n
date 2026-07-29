import { ElNotification } from 'element-plus';
import { setNotify } from '@n8n/composables/useToast';
import { useNotificationsStore } from '@n8n/stores/notifications.store';

// The single bootstrap registration for the package-side `useToast`
// (`@n8n/composables`), which sits below the stores tier and so imports neither
// element-plus nor `@n8n/stores`. Runs on first import; `editor-ui` imports this
// module during bootstrap, before any consumer runs.
//
// Suppression lives here rather than in the package: returning
// `undefined` tells `showMessage` the app declined to show this notification, and
// it drops it without a sticky-queue entry or error telemetry.
//
// The store resolves inside the closure, not at module scope — this module is
// evaluated via `main.ts` -> `router.ts` -> `init.ts`, which is before
// `app.use(pinia)`, so resolving it eagerly would throw `getActivePinia()`.
//
// NOTE: when this shim is retired (stage 6), this registration must be relocated
// to a bootstrap entry point, not deleted with the file — dropping it degrades
// toasts to a no-op notifier.
setNotify((options) => {
	const notifications = useNotificationsStore();
	const suppressed = notifications.areNotificationsSuppressed;
	const allowErrors = notifications.allowErrorNotificationsWhenSuppressed;

	if (suppressed && !(allowErrors && options.type === 'error')) return undefined;

	return ElNotification(options);
});

/**
 * @deprecated Import from `@n8n/composables/useToast` instead. This re-export
 * shim keeps existing `@/app/composables/useToast` call sites working during
 * the CAT-3686 frontend-modularization migration and will be removed once
 * importers are retired per-directory. (N8N-66)
 */
export { useToast } from '@n8n/composables/useToast';
