import { n8nCloudHooks_ENABLE_LOGS, n8nCloudHooks_ENABLE_TRACKING } from '@/hooks/constants';
import { useUsersStore } from '@/stores/users';

export const hooksTelemetryIdentify = () => {
	const store = useUsersStore();
	const userId = store.currentUserId;

	if (n8nCloudHooks_ENABLE_LOGS) {
		console.log('Analytics.identify:', { userId });
	}

	if (n8nCloudHooks_ENABLE_TRACKING && window.analytics) {
		window.analytics.identify(userId);
	}
};
