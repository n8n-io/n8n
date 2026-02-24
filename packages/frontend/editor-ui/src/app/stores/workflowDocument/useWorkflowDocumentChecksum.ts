import { ref, readonly } from 'vue';

type Action<N, P> = { name: N; payload: P };

type SetChecksumAction = Action<'setChecksum', { checksum: string }>;

export type ChecksumAction = SetChecksumAction;

const CHECKSUM_ACTION_NAMES = new Set<string>(['setChecksum']);

export function isChecksumAction(action: { name: string }): action is ChecksumAction {
	return CHECKSUM_ACTION_NAMES.has(action.name);
}

/**
 * Composable that encapsulates checksum state, public API, and mutation logic
 * for a workflow document store.
 *
 * Accepts an `onChange` callback that routes actions through the store's
 * unified dispatcher for CRDT migration readiness.
 */
export function useWorkflowDocumentChecksum(onChange: (action: ChecksumAction) => void) {
	const checksum = ref<string>('');

	function setChecksum(newChecksum: string) {
		onChange({ name: 'setChecksum', payload: { checksum: newChecksum } });
	}

	/**
	 * Apply a checksum action to the state.
	 * Called by the store's unified onChange dispatcher.
	 */
	function handleAction(action: ChecksumAction) {
		if (action.name === 'setChecksum') {
			checksum.value = action.payload.checksum;
		}
	}

	return {
		checksum: readonly(checksum),
		setChecksum,
		handleAction,
	};
}
