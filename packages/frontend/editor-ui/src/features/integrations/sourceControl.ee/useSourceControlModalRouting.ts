import { useRoute, useRouter } from 'vue-router';

type SourceControlModalDirection = 'push' | 'pull';

export function useSourceControlModalRouting() {
	const route = useRoute();
	const router = useRouter();

	async function navigateToSourceControlModal(direction: SourceControlModalDirection) {
		// Navigate to route with sourceControl param - modal will handle data loading,
		// loading states, and backend errors (e.g. admin push required for legacy repos).
		return await router.push({
			query: {
				...route.query,
				sourceControl: direction,
			},
		});
	}

	async function openPullModal(): Promise<void> {
		await navigateToSourceControlModal('pull');
	}

	async function openPushModal(): Promise<void> {
		await navigateToSourceControlModal('push');
	}

	return { openPushModal, openPullModal };
}
