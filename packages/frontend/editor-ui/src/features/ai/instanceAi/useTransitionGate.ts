import { nextTick, ref } from 'vue';

export function useTransitionGate(options: { isBlocked?: () => boolean } = {}) {
	const isEnabled = ref(false);
	let renderToken = 0;

	function enableAfterStableRender() {
		const currentRenderToken = ++renderToken;
		void nextTick(() => {
			void nextTick(() => {
				if (currentRenderToken === renderToken && !(options.isBlocked?.() ?? false)) {
					isEnabled.value = true;
				}
			});
		});
	}

	function suppress() {
		renderToken += 1;
		isEnabled.value = false;
	}

	function suppressUntilStableRender() {
		isEnabled.value = false;
		enableAfterStableRender();
	}

	return {
		isEnabled,
		enableAfterStableRender,
		suppress,
		suppressUntilStableRender,
	};
}
