import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';

/**
 * Composable for activation error helpers.
 * Resolves a node ID to a formatted activation error message reactively.
 */
export function useActivationError(nodeId: MaybeRefOrGetter<string | undefined>) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const i18n = useI18n();

	const errorMessage = computed(() => {
		const id = toValue(nodeId);
		if (!id) return undefined;

		const node = workflowDocumentStore.value?.getNodeById(id);
		if (!node) return undefined;

		return i18n.baseText('workflowActivator.showError.nodeError', {
			interpolate: { nodeName: node.name },
		});
	});

	return { errorMessage };
}
