import { computed, inject } from 'vue';
import { CanvasKey } from '@/constants';

export function useCanvas() {
	const canvas = inject(CanvasKey);

	const connectingHandle = computed(() => canvas?.connectingHandle.value);

	return {
		connectingHandle,
	};
}
