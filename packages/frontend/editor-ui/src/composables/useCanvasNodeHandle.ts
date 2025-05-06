/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { CanvasNodeHandleKey } from '@/constants';
import { computed, inject } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import { CanvasConnectionMode } from '@/types';

export function useCanvasNodeHandle() {
	const handle = inject(CanvasNodeHandleKey);

	const label = computed(() => handle?.label.value ?? '');
	const isConnected = computed(() => handle?.isConnected.value ?? false);
	const isConnecting = computed(() => handle?.isConnecting.value ?? false);
	const isReadOnly = computed(() => handle?.isReadOnly.value);
	const isRequired = computed(() => handle?.isRequired.value);
	const maxConnections = computed(() => handle?.maxConnections.value);
	const type = computed(() => handle?.type.value ?? NodeConnectionTypes.Main);
	const mode = computed(() => handle?.mode.value ?? CanvasConnectionMode.Input);
	const index = computed(() => handle?.index.value ?? 0);
	const runData = computed(() => handle?.runData.value);

	return {
		label,
		isConnected,
		isConnecting,
		isReadOnly,
		isRequired,
		maxConnections,
		type,
		mode,
		index,
		runData,
	};
}
