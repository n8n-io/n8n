/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { CanvasNodeHandleKey } from '@/constants';
import { computed, inject } from 'vue';

export function useCanvasNodeHandle() {
	const handle = inject(CanvasNodeHandleKey);

	const label = computed(() => handle?.label.value ?? '');
	const connected = computed(() => handle?.connected.value ?? false);

	return {
		label,
		connected,
	};
}
