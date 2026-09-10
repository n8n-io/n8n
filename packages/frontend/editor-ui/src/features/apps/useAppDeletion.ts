import type { DescribedBinding } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { escapeHtml } from '@/app/utils/htmlUtils';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';

/** Confirm-then-delete for Apps and Bindings. Pages are derived, not stored — deleting one is an Instance AI hand-off, not this. */
export function useAppDeletion() {
	const i18n = useI18n();
	const toast = useToast();
	const message = useMessage();
	const appsStore = useAppsStore();

	/** @returns whether the app was deleted (false if cancelled or the request failed) */
	const confirmAndDeleteApp = async (projectId: string, app: App): Promise<boolean> => {
		const response = await message.confirm(
			i18n.baseText('apps.delete.confirm.message', { interpolate: { name: escapeHtml(app.name) } }),
			i18n.baseText('apps.delete.confirm.title'),
			{
				confirmButtonText: i18n.baseText('generic.delete'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (response !== MODAL_CONFIRM) return false;

		try {
			await appsStore.deleteApp(projectId, app.id);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.delete.error'));
			return false;
		}
	};

	/** @returns whether the binding was deleted (false if cancelled or the request failed) */
	const confirmAndDeleteBinding = async (
		projectId: string,
		appId: string,
		binding: DescribedBinding,
	): Promise<boolean> => {
		const copy =
			binding.kind === 'dataTable'
				? ('apps.connections.delete.confirm.dataTable' as const)
				: ('apps.connections.delete.confirm' as const);
		const response = await message.confirm(
			i18n.baseText(`${copy}.message`, {
				interpolate: { name: escapeHtml(binding.name) },
			}),
			i18n.baseText(`${copy}.title`),
			{
				confirmButtonText: i18n.baseText('generic.disconnect'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (response !== MODAL_CONFIRM) return false;

		try {
			await appsStore.deleteBinding(projectId, appId, binding.key);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.connections.delete.error'));
			return false;
		}
	};

	return { confirmAndDeleteApp, confirmAndDeleteBinding };
}
