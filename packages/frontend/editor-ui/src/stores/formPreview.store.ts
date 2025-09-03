import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '@/constants';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useWorkflowsStore } from './workflows.store';
import { useVueFlow } from '@vue-flow/core';
import type { INode } from 'n8n-workflow';

function isFormNode(type: string) {
	return [FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(type);
}

export const useFormPreviewStore = defineStore(STORES.FORM_PREVIEW, () => {
	const formPreviewOpen = ref(false);

	const workflowsStore = useWorkflowsStore();
	const vueFlow = useVueFlow(workflowsStore.workflowId);

	const selectedNode = computed(() => {
		const selected = vueFlow.getSelectedNodes.value[0]?.id;
		return workflowsStore.allNodes.find((n) => n.id === selected);
	});

	const availableFormNodes = computed(() => {
		if (!selectedNode.value) return [];
		const workflow = workflowsStore.workflowObject;
		const selectedNodeName = selectedNode.value.name;
		const parents = workflow.getParentNodes(selectedNodeName);
		const children = workflow.getChildNodes(selectedNodeName);

		return [...parents, selectedNodeName, ...children.reverse()]
			.map((nodeName) => workflowsStore.getNodeByName(nodeName))
			.filter((node): node is INode => !!node && isFormNode(node.type));
	});

	const isFormPreviewAvailable = computed(
		() => !!selectedNode.value && isFormNode(selectedNode.value.type),
	);

	const selectedFormNode = computed(() => {
		if (!isFormPreviewAvailable.value) return undefined;

		return selectedNode.value;
	});

	const formPreviewActive = computed(() => formPreviewOpen.value && !!selectedFormNode.value);

	function openFormPreview() {
		formPreviewOpen.value = true;
	}

	function closeFormPreview() {
		formPreviewOpen.value = false;
	}

	return {
		isFormPreviewAvailable,
		formPreviewActive,
		selectedFormNode,
		availableFormNodes,
		openFormPreview,
		closeFormPreview,
	};
});
