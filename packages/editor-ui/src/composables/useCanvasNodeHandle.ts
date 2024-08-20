/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { CanvasNodeHandleKey } from '@/constants';
import { computed, inject } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import { CanvasConnectionMode } from '@/types';

export function useCanvasNodeHandle() {
	const handle = inject(CanvasNodeHandleKey);

	const label = computed(() => handle?.label.value ?? '');
	const connected = computed(() => handle?.connected.value ?? false);
	const type = computed(() => handle?.type.value ?? NodeConnectionType.Main);
	const mode = computed(() => handle?.mode.value ?? CanvasConnectionMode.Input);

	return {
		label,
		connected,
		type,
		mode,
	};
}
