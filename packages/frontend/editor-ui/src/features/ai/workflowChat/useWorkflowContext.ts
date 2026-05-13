import type { InstanceAiWorkflowContext } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

/**
 * Snapshot the workflow the user currently has open in the editor for the
 * workflow-chat backend. Read at every `sendMessage`, never persisted —
 * always reflects the live editor state at the moment the message is sent.
 */
export function useWorkflowContext() {
	function snapshot(): InstanceAiWorkflowContext | undefined {
		const workflowsStore = useWorkflowsStore();
		const ndvStore = useNDVStore();
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;

		const doc = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		const activeNodeName = ndvStore.activeNodeName ?? undefined;

		return {
			workflowId,
			name: doc.name || undefined,
			nodes: doc.allNodes.map((node) => ({
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion,
				parameters: node.parameters as Record<string, unknown> | undefined,
				credentials: node.credentials as Record<string, unknown> | undefined,
				disabled: node.disabled,
				position: node.position,
				webhookId: node.webhookId,
			})),
			connections: doc.connectionsBySourceNode as Record<string, unknown>,
			activeNodeName,
		};
	}
	return { snapshot };
}
