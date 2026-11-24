import { nextTick, onBeforeUnmount, watch } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { useTrialIntroModalStore } from './stores/trialIntroModal.store';

export function useTrialIntroModalAutoOpen() {
	const trialIntroModalStore = useTrialIntroModalStore();
	const uiStore = useUIStore();

	let stopWatcher: (() => void) | undefined;

	const stopWatching = () => {
		stopWatcher?.();
		stopWatcher = undefined;
	};

	const tryOpen = () => {
		if (!trialIntroModalStore.shouldShowModal || uiStore.isAnyModalOpen) return;
		if (trialIntroModalStore.openIfEligible()) {
			stopWatching();
		}
	};

	stopWatcher = watch(
		() => [trialIntroModalStore.shouldShowModal, uiStore.isAnyModalOpen] as const,
		tryOpen,
	);
	void nextTick(tryOpen);

	onBeforeUnmount(stopWatching);
}
