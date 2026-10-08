import { toValue, type MaybeRefOrGetter } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useDocumentVisibility } from '@/app/composables/useDocumentVisibility';
import { TIME } from '@/app/constants/durations';
import { usePushTrigger } from './usePushTrigger';

/**
 * Returns the workflow ID of a push message that can change the On/Off status or the name of a
 * workflow. The server sends `workflowUpdated` only to the users who have the workflow open.
 */
export function changedWorkflowId(event: PushMessage): string | undefined {
	switch (event.type) {
		case 'workflowActivated':
		case 'workflowPartiallyActivated':
		case 'workflowDeactivated':
		case 'workflowAutoDeactivated':
		case 'workflowUpdated':
			return event.data.workflowId;
		default:
			return undefined;
	}
}

/**
 * Calls `onChange` when the list of automations can be out of date: the user comes back to the
 * tab, or the server reports a change to a listed workflow. The tab check also loads a list
 * again after a failed first load.
 */
export function useAutomationUpdates(
	enabled: MaybeRefOrGetter<boolean>,
	workflowIds: MaybeRefOrGetter<readonly string[]>,
	onChange: () => unknown,
) {
	const { onDocumentVisible } = useDocumentVisibility();
	onDocumentVisible(() => {
		if (toValue(enabled)) void onChange();
	});

	function isListedWorkflowChange(event: PushMessage) {
		const workflowId = changedWorkflowId(event);
		return workflowId !== undefined && toValue(workflowIds).includes(workflowId);
	}

	// A save sends one update, so a run of saves refreshes the list once.
	usePushTrigger(enabled, isListedWorkflowChange, onChange, {
		wait: getDebounceTime(TIME.SECOND),
	});
}
