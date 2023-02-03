import { n8nFEHooks_ENABLE_LOGS, n8nFEHooks_ENABLE_TRACKING } from '@/hooks/constants';
import { useUsersStore } from '@/stores/users';

export const hooksTelemetryIdentify = () => {
	const store = useUsersStore();
	const userId = store.currentUserId;

	if (n8nFEHooks_ENABLE_LOGS) {
		console.log('Analytics.identify:', { userId });
	}

	if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
		window.analytics.identify(userId);
	}
};
