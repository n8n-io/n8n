import { computed } from 'vue';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { serializeNode } from '@/app/utils/nodes/nodeTransforms';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

import type { WorkflowJsonCompletionDeps } from '../workflowJsonCompletions';
import type { WorkflowJsonValidationDeps } from '../workflowJsonValidation';

/** Store-backed dependencies of the JSON panel helpers, which stay free of stores. Call it in setup(). */
export function useWorkflowJsonEditorDeps() {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	// Cached until the canvas changes, because the linter validates on every edit
	const currentNodesById = computed(
		() =>
			new Map(
				workflowDocumentStore.value.allNodes.map((node) => [
					node.id,
					serializeNode(nodeTypesStore, node),
				]),
			),
	);
	const validationDeps: WorkflowJsonValidationDeps = {
		getNodeType: (type, version) => nodeTypesStore.getNodeType(type, version),
		getNodeVersions: (type) => nodeTypesStore.getNodeVersions(type),
		credentialExists: (id, credentialType) =>
			credentialsStore.getCredentialByIdAndType(id, credentialType) !== undefined,
		getCurrentNode: (id) => currentNodesById.value.get(id),
	};

	const installedNodeTypes = computed(() =>
		nodeTypesStore.visibleNodeTypes.filter((nodeType) =>
			nodeTypesStore.getIsNodeInstalled(nodeType.name),
		),
	);
	const completionDeps: WorkflowJsonCompletionDeps = {
		getNodeType: (type, version) => nodeTypesStore.getNodeType(type, version),
		getNodeVersions: (type) => nodeTypesStore.getNodeVersions(type),
		getNodeTypes: () => installedNodeTypes.value,
		getCredentialsByType: (credentialType) =>
			credentialsStore.getUsableCredentialByType(credentialType),
	};

	return { validationDeps, completionDeps };
}
