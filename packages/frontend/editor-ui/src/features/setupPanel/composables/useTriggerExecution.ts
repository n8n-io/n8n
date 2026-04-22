import { computed, toValue, type MaybeRef } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { INodeUi } from '@/Interface';
import { useNodeExecution, type UseNodeExecutionOptions } from '@/app/composables/useNodeExecution';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getTriggerNodeServiceName } from '@/app/utils/nodeTypesUtils';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useLogsStore } from '@/app/stores/logs.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/**
 * Wraps `useNodeExecution` with listening-hint logic for setup-panel cards.
 * Returns everything a card needs: execution state for the button + listening
 * hint text for the callout.
 */
export function useTriggerExecution(
	node: MaybeRef<INodeUi | null>,
	options?: UseNodeExecutionOptions,
) {
	const i18n = useI18n();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const logsStore = useLogsStore();

	const {
		isExecuting,
		isListening,
		isListeningForWorkflowEvents,
		buttonLabel,
		buttonIcon,
		disabledReason,
		hasIssues,
		execute,
	} = useNodeExecution(node, options);

	const nodeValue = computed(() => toValue(node));

	const nodeType = computed(() =>
		nodeValue.value
			? nodeTypesStore.getNodeType(nodeValue.value.type, nodeValue.value.typeVersion)
			: null,
	);

	const isInListeningState = computed(() => {
		if (isListening.value || isListeningForWorkflowEvents.value) return true;

		return (
			nodeType.value?.name === CHAT_TRIGGER_NODE_TYPE &&
			logsStore.isOpen &&
			workflowsStore.chatPartialExecutionDestinationNode === nodeValue.value?.name
		);
	});

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

	const hasUpstreamIssues = computed(() => {
		if (!nodeValue.value) return false;
		const parentNames =
			workflowDocumentStore.value?.getParentNodes(nodeValue.value.name, 'ALL') ?? [];
		return parentNames.some((name) => {
			const parentNode = workflowDocumentStore.value?.getNodeByName(name);
			return parentNode?.issues?.parameters || parentNode?.issues?.credentials;
		});
	});

	const isButtonDisabled = computed(
		() => isExecuting.value || hasIssues.value || hasUpstreamIssues.value || !!disabledReason.value,
	);

	const tooltipItems = computed<string[]>(() => {
		if (!hasIssues.value && !hasUpstreamIssues.value) {
			return disabledReason.value ? [disabledReason.value] : [];
		}

		const messages: string[] = [];

		const issues = nodeValue.value?.issues;
		if (issues) {
			messages.push(
				...Object.values(issues.credentials ?? {}).flat(),
				...Object.values(issues.parameters ?? {}).flat(),
			);
		}

		if (hasUpstreamIssues.value) {
			messages.push(i18n.baseText('ndv.execute.upstreamNodeHasIssues'));
		}

		return messages.length > 0 ? messages : [i18n.baseText('ndv.execute.requiredFieldsMissing')];
	});

	return {
		// Button state
		isExecuting,
		isButtonDisabled,
		label,
		buttonIcon,
		tooltipItems,
		execute,

		// Callout state
		isInListeningState,
		listeningHint,
	};
}
