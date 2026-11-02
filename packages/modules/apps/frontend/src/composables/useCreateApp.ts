import { useRouter } from 'vue-router';

import { APP_DETAIL_VIEW, PENDING_APP_ID_STATE } from '../apps.constants';

export function useCreateApp() {
	const router = useRouter();

	function createApp(projectId: string): void {
		// REVIEW: uuidv7
		const appId = crypto.randomUUID();
		void router.push({
			name: APP_DETAIL_VIEW,
			params: { projectId, appId },
			state: { [PENDING_APP_ID_STATE]: appId },
		});
	}

	return { createApp };
}
