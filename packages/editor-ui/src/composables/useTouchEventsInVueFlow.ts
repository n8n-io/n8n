import { ref } from 'vue';
import type { VueFlowStore } from '@vue-flow/core';

export const useTouchEventsInVueFlow = (vueFlowStore: VueFlowStore) => {
	const isPanning = ref(false);
	const startX = ref(0);
	const startY = ref(0);

	const handleTouchStart = (event: TouchEvent) => {
		const touch = event.touches[0];
		startX.value = touch.clientX;
		startY.value = touch.clientY;

		if (event.touches.length > 1) {
			isPanning.value = true;
		}
	};

	const handleTouchMove = (event: TouchEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (isPanning.value && vueFlowStore.vueFlowRef.value) {
			const touch = event.touches[0];
			const x = touch.clientX - startX.value;
			const y = touch.clientY - startY.value;

			vueFlowStore.panBy({ x, y });

			startX.value = touch.clientX;
			startY.value = touch.clientY;
		}
	};

	const handleTouchEnd = () => {
		isPanning.value = false;
	};

	const addTouchListeners = () => {
		const canvas = vueFlowStore.vueFlowRef.value;
		if (canvas) {
			canvas.addEventListener('touchstart', handleTouchStart);
			canvas.addEventListener('touchmove', handleTouchMove);
			canvas.addEventListener('touchend', handleTouchEnd);
		}
	};

	const removeTouchListeners = () => {
		const canvas = vueFlowStore.vueFlowRef.value;
		if (canvas) {
			canvas.removeEventListener('touchstart', handleTouchStart);
			canvas.removeEventListener('touchmove', handleTouchMove);
			canvas.removeEventListener('touchend', handleTouchEnd);
		}
	};

	return {
		addTouchListeners,
		removeTouchListeners,
	};
};
