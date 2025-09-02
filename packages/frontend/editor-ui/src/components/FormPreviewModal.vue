<script setup lang="ts">
import { useKeybindings } from '@/composables/useKeybindings';
import { formPreviewEventBus } from '@/event-bus';
import { useFormPreviewStore } from '@/stores/formPreview.store';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import FormPreviewHeader from './FormPreviewHeader.vue';
import { useVueFlow } from '@vue-flow/core';
import { useWorkflowsStore } from '@/stores/workflows.store';

const workflowsStore = useWorkflowsStore();
const formPreviewStore = useFormPreviewStore();
const dialogRef = useTemplateRef('dialogRef');
const previewFrameRef = useTemplateRef('previewFrameRef');
const vueFlow = useVueFlow(workflowsStore.workflowId);

const { formPreviewActive, selectedFormNode, availableFormNodes } = storeToRefs(formPreviewStore);

function close() {
	formPreviewStore.closeFormPreview();
}

useKeybindings({ Escape: close });

function onFormUpdate() {
	console.log('FormPreview.vue: form updated');
	previewFrameRef.value?.contentWindow?.location.reload();
}

function onUpdateSelectedNode(nodeId: string) {
	const node = vueFlow.findNode(nodeId);

	if (node) vueFlow.addSelectedNodes([node]);
}

onMounted(() => {
	formPreviewEventBus.on('parameter-updated', onFormUpdate);
});

onBeforeUnmount(() => {
	formPreviewEventBus.off('parameter-updated', onFormUpdate);
});

watch(selectedFormNode, (node) => {
	if (node) dialogRef.value?.show();
});
</script>

<template>
	<div v-if="formPreviewActive && selectedFormNode">
		<div :class="$style.backdrop" @click="close"></div>
		<dialog ref="dialogRef" open aria-modal="true" data-test-id="ndv" :class="$style.dialog">
			<div ref="containerRef" :class="$style.container">
				<FormPreviewHeader
					:nodes="availableFormNodes"
					:selected-node-id="selectedFormNode.id"
					@close="close"
					@selected-node-update="onUpdateSelectedNode"
				/>
				<iframe ref="previewFrameRef" width="100%" height="100%" src="https://n8n.io"></iframe>
			</div>
		</dialog>
	</div>
</template>

<style lang="scss" module>
.backdrop {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--color-dialog-overlay-background-dark);
}

.dialog {
	position: absolute;
	width: calc(100% - var(--spacing-xl));
	height: calc(100% - var(--spacing-xl));
	top: var(--spacing-s);
	left: var(--spacing-s);
	border: none;
	background: none;
	padding: 0;
	margin: 0;
	display: flex;
}

.container {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	background: var(--border-color-base);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	overflow: hidden;
	color: var(--color-text-base);
	min-width: 0;
}
</style>
