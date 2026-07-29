/**
 * @deprecated Import from `@n8n/composables/useToast` instead. This re-export
 * shim keeps existing `@/app/composables/useToast` call sites working during
 * the CAT-3686 frontend-modularization migration and will be removed once
 * importers are retired per-directory. (N8N-66)
 *
 * Nothing but the re-export belongs here: the bootstrap registration this file
 * used to carry now lives in `@/app/init/toastNotifier`, called from
 * `initializeCore()`, so deleting this file is behaviour-neutral. `useToast.test.ts`
 * guards that.
 */
export { useToast } from '@n8n/composables/useToast';
