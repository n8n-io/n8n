<script setup lang="ts">
import WindowManager from '@/components/WindowManager/WindowManager.vue';
import { computed, ref } from 'vue';
import { SplitDirection, type PaneNode } from '@/components/WindowManager/types';
import { useRoute } from 'vue-router';
import { NEW_WORKFLOW_ID, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';

const route = useRoute();

const workflowId = computed(() => {
	const workflowIdParam = route.params.name as string;
	return [PLACEHOLDER_EMPTY_WORKFLOW_ID, NEW_WORKFLOW_ID].includes(workflowIdParam)
		? undefined
		: workflowIdParam;
});

const rootPane = ref<PaneNode>({
	nodeType: 'split',
	direction: SplitDirection.Horizontal,
	weights: [0.4, 0.6],

	children: [
		{
			nodeType: 'leaf',
			content: { kind: 'node-view', meta: { workflowId } },
		},

		{
			nodeType: 'split',
			direction: SplitDirection.Vertical,
			weights: [0.4, 0.6],
			children: [
				{
					nodeType: 'leaf',
					content: { kind: 'node-view', meta: { workflowId: 'ywWSkgVtDnvrvJMC' } },
				},
				{
					nodeType: 'leaf',
					content: { kind: 'node-view', meta: { workflowId: 'RjfdcFWFamA26lLk' } },
				},
			],
		},
	],
});
</script>

<template>
	<WindowManager :root-pane="rootPane" />
</template>

<style lang="scss" module></style>
