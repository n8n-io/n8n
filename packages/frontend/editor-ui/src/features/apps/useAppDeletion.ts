import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { escapeHtml } from '@/app/utils/htmlUtils';
import { useAppsStore } from '@/features/apps/apps.store';
import { getPageLabel } from '@/features/apps/pageTree.utils';
import type { App } from '@/features/apps/apps.types';

/** Confirm-then-delete for Apps and Pages, shared by every view that offers a delete action. */
export function useAppDeletion() {
	const i18n = useI18n();
	const toast = useToast();
	const message = useMessage();
	const appsStore = useAppsStore();

	const confirm = async (title: string, text: string) => {
		const response = await message.confirm(text, title, {
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		});
		return response === MODAL_CONFIRM;
	};

	/** @returns whether the app was deleted (false if cancelled or the request failed) */
	const confirmAndDeleteApp = async (projectId: string, app: App): Promise<boolean> => {
		const confirmed = await confirm(
			i18n.baseText('apps.delete.confirm.title'),
			i18n.baseText('apps.delete.confirm.message', { interpolate: { name: escapeHtml(app.name) } }),
		);
		if (!confirmed) return false;

		try {
			await appsStore.deleteApp(projectId, app.id);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.delete.error'));
			return false;
		}
	};

	/** @returns whether the page was deleted (false if cancelled, not found, or the request failed) */
	const confirmAndDeletePage = async (
		projectId: string,
		appId: string,
		pageId: string,
	): Promise<boolean> => {
		const page = appsStore.pages.find((p) => p.id === pageId);
		if (!page) return false;

		const confirmed = await confirm(
			i18n.baseText('apps.page.delete.confirm.title'),
			i18n.baseText('apps.page.delete.confirm.message', {
				interpolate: {
					name: escapeHtml(getPageLabel(page, i18n.baseText('apps.page.home'))),
				},
			}),
		);
		if (!confirmed) return false;

		try {
			await appsStore.deletePage(projectId, appId, pageId);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.page.delete.error'));
			return false;
		}
	};

	return { confirmAndDeleteApp, confirmAndDeletePage };
}
