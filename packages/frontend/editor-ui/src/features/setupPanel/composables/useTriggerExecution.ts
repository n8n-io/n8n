import { computed, toValue, type MaybeRef } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { INodeUi } from '@/Interface';
import { useNodeExecution } from '@/app/composables/useNodeExecution';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';

/**
 * Wraps `useNodeExecution` with listening-hint logic for setup-panel cards.
 * Returns everything a card needs: execution state for the button + listening
 * hint text for the callout.
 */
export function useTriggerExecution(node: MaybeRef<INodeUi | null>) {
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();

	const {
		isExecuting,
		isListening,
		isListeningForWorkflowEvents,
		buttonLabel,
		buttonIcon,
		disabledReason,
		hasIssues,
		execute,
	} = useNodeExecution(node);

	const nodeValue = computed(() => toValue(node));

	const nodeType = computed(() =>
		nodeValue.value
			? nodeTypesStore.getNodeType(nodeValue.value.type, nodeValue.value.typeVersion)
			: null,
	);

	const isInListeningState = computed(
		() => isListening.value || isListeningForWorkflowEvents.value,
	);

	const listeningHint = computed(() => {
		if (!isInListeningState.value || !nodeType.value) return '';

		if (nodeType.value.eventTriggerDescription) {
			return nodeType.value.eventTriggerDescription;
		}

		const serviceName = getTriggerNodeServiceName(nodeType.value);
		return i18n.baseText('setupPanel.trigger.listeningHint', {
			interpolate: { service: serviceName },
		});
	});

	const label = computed(() => {
		if (isInListeningState.value) {
			return i18n.baseText('ndv.execute.stopListening');
		}
		return buttonLabel.value;
	});

	const isButtonDisabled = computed(
		() => isExecuting.value || hasIssues.value || !!disabledReason.value,
	);

	const tooltipText = computed(() => {
		if (hasIssues.value) {
			return i18n.baseText('ndv.execute.requiredFieldsMissing');
		}
		return disabledReason.value;
	});

	return {
		// Button state
		isExecuting,
		isButtonDisabled,
		label,
		buttonIcon,
		tooltipText,
		execute,

		// Callout state
		isInListeningState,
		listeningHint,
	};
}
