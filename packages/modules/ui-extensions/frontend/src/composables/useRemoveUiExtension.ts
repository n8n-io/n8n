import { useToast } from '@n8n/composables/useToast';
import { useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useSidePanelStore } from '../ui-extensions.store';
import type { SidePanelView } from '../ui-extensions.types';

/** The pages that this editor removed, so the page view does not show a second toast. */
const removedHere = new Set<string>();

/** Whether this editor removed the record. Reading it forgets the record. */
export function consumeRemovedHere(id: string): boolean {
	return removedHere.delete(id);
}

/**
 * Removes a view or a page of the user after a confirmation. Built-in views and
 * pages are never removed.
 */
export function useRemoveUiExtension() {
	const i18n = useI18n();
	const message = useMessage();
	const toast = useToast();
	const store = useSidePanelStore();

	async function remove(record: Pick<SidePanelView, 'id' | 'kind' | 'title' | 'builtin'>) {
		if (record.builtin) return false;
		const isPage = record.kind === 'page';

		const answer = await message.confirm(
			i18n.baseText(
				isPage ? 'uiExtensions.remove.page.message' : 'uiExtensions.remove.view.message',
				{ interpolate: { title: record.title } },
			),
			i18n.baseText(isPage ? 'uiExtensions.remove.page.title' : 'uiExtensions.remove.view.title'),
			{
				confirmButtonText: i18n.baseText('uiExtensions.remove.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (answer !== 'confirm') return false;

		if (isPage) removedHere.add(record.id);
		try {
			await store.remove(record.id);
		} catch (error) {
			removedHere.delete(record.id);
			toast.showError(
				error,
				i18n.baseText(isPage ? 'uiExtensions.remove.page.error' : 'uiExtensions.remove.view.error'),
			);
			return false;
		}

		toast.showMessage({
			type: 'success',
			title: i18n.baseText(
				isPage ? 'uiExtensions.remove.page.success' : 'uiExtensions.remove.view.success',
				{ interpolate: { title: record.title } },
			),
		});
		return true;
	}

	return { remove };
}
