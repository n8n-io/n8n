import { computed, inject } from 'vue';
import { CanvasKey } from '@/constants';

export function useCanvas() {
	const canvas = inject(CanvasKey);

	const connectingHandle = computed(() => canvas?.connectingHandle.value);
	const isExecuting = computed(() => canvas?.isExecuting.value);

	return {
		isExecuting,
		connectingHandle,
	};
}
