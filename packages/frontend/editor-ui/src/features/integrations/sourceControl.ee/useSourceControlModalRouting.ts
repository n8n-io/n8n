import { useToast } from '@/app/composables/useToast';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useI18n } from '@n8n/i18n';
import { useRoute, useRouter } from 'vue-router';

type SourceControlModalDirection = 'push' | 'pull';

export function useSourceControlModalRouting() {
	const route = useRoute();
	const router = useRouter();
	const sourceControlStore = useSourceControlStore();
	const i18n = useI18n();
	const toast = useToast();

	async function navigateToSourceControlModal(direction: SourceControlModalDirection) {
		// Navigate to route with sourceControl param - modal will handle data loading and loading states
		return await router.push({
			query: {
				...route.query,
				sourceControl: direction,
			},
		});
	}

	function handlePushError(error: unknown) {
		if (error instanceof Error && error.message === 'source_control_not_connected') {
			toast.showError(
				{ ...error, message: '' },
				i18n.baseText('settings.sourceControl.error.not.connected.title'),
				i18n.baseText('settings.sourceControl.error.not.connected.message'),
			);
			return;
		}

		toast.showError(error, i18n.baseText('error'));
	}

	async function openPullModal(): Promise<void> {
		await navigateToSourceControlModal('pull');
	}

	/**
	 * Prefetches push status and opens the push modal when there are changes to push.
	 * Shows an info toast when everything is already up to date.
	 */
	async function openPushModal(): Promise<void> {
		try {
			const status = await sourceControlStore.prefetchPushStatus();

			if (!status.length) {
				toast.showMessage({
					title: i18n.baseText('settings.sourceControl.modals.push.everythingIsUpToDate'),
					message: '',
					type: 'info',
				});
				return;
			}

			await navigateToSourceControlModal('push');
		} catch (error) {
			handlePushError(error);
		}
	}

	return { openPushModal, openPullModal };
}
