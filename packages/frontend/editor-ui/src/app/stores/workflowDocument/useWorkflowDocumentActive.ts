import { ref, readonly, computed } from 'vue';
import type { WorkflowHistory } from '@n8n/rest-api-client';

type Action<N, P> = { name: N; payload: P };

type SetActiveStateAction = Action<
	'setActiveState',
	{ activeVersionId: string | null; activeVersion: WorkflowHistory | null }
>;

export type ActiveAction = SetActiveStateAction;

const ACTIVE_ACTION_NAMES = new Set<string>(['setActiveState']);

export function isActiveAction(action: { name: string }): action is ActiveAction {
	return ACTIVE_ACTION_NAMES.has(action.name);
}

/**
 * Composable that encapsulates active state, public API, and mutation logic
 * for a workflow document store.
 *
 * Accepts an `onChange` callback that routes actions through the store's
 * unified dispatcher for CRDT migration readiness.
 */
export function useWorkflowDocumentActive(onChange: (action: ActiveAction) => void) {
	const activeVersionId = ref<string | null>(null);
	const activeVersion = ref<WorkflowHistory | null>(null);
	const active = computed(() => activeVersionId.value !== null);

	function setActiveState(state: {
		activeVersionId: string | null;
		activeVersion: WorkflowHistory | null;
	}) {
		onChange({ name: 'setActiveState', payload: state });
	}

	/**
	 * Apply an active state action to the state.
	 * Called by the store's unified onChange dispatcher.
	 */
	function handleAction(action: ActiveAction) {
		if (action.name === 'setActiveState') {
			activeVersionId.value = action.payload.activeVersionId;
			activeVersion.value = action.payload.activeVersion;
		}
	}

	return {
		active,
		activeVersionId: readonly(activeVersionId),
		activeVersion: readonly(activeVersion),
		setActiveState,
		handleAction,
	};
}
