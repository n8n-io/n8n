import { usePostHog } from '@/app/stores/posthog.store';
import { useUIStore } from '@/app/stores/ui.store';
import { SIDEBAR_EXPANDED_EXPERIMENT } from '@/app/constants/experiments';
import { LOCAL_STORAGE_SIDEBAR_WIDTH } from '@/app/constants';

export function useSidebarExpandedExperiment() {
	const posthogStore = usePostHog();
	const uiStore = useUIStore();

	const applyExperiment = () => {
		if (uiStore.sidebarMenuCollapsed === null) {
			const isVariant =
				posthogStore.getVariant(SIDEBAR_EXPANDED_EXPERIMENT.name) ===
				SIDEBAR_EXPANDED_EXPERIMENT.variant;
			uiStore.sidebarMenuCollapsed = !isVariant;

			if (isVariant) {
				localStorage.setItem(LOCAL_STORAGE_SIDEBAR_WIDTH, '200');
			}
		}
	};

	return { applyExperiment };
}
