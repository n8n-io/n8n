import { ElNotification, type NotificationHandle } from 'element-plus';

// Storybook-only support for the settings stories (imported by *.stories.ts files only, not part
// of the library build). Save confirmations reuse n8n's existing app-wide notification — the
// bottom-right Element Plus notification themed by the design system's `notification.scss` (the
// same component `useToast().showMessage` shows in the app) — instead of introducing a new toast
// pattern. The stories call it exactly the way the app does on a successful save.
//
// Each quick-save confirmation REPLACES the previous one instead of stacking: rapid instant saves
// (e.g. flipping a toggle back and forth) would otherwise pile up notifications and eat vertical
// space. The handle is module-scoped so the behavior holds across every story that imports this
// helper, and only the last quick-save toast is closed — unrelated notifications are left alone.
let lastQuickSaveNotification: NotificationHandle | undefined;

export const confirmSaved = (title: string): NotificationHandle => {
	lastQuickSaveNotification?.close();
	lastQuickSaveNotification = ElNotification({ title, type: 'success', position: 'bottom-right' });
	return lastQuickSaveNotification;
};
