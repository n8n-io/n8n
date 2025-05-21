<script setup lang="ts">
import WindowManager from '@/components/WindowManager/WindowManager.vue';
import { computed, ref } from 'vue';
import { SplitDirection, type PaneNode } from '@/components/WindowManager/types';
import { useRoute } from 'vue-router';
import { NEW_WORKFLOW_ID, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { v4 as uuid } from 'uuid';

const route = useRoute();

const workflowId = computed(() => {
	const workflowIdParam = route.params.name as string;
	return [PLACEHOLDER_EMPTY_WORKFLOW_ID, NEW_WORKFLOW_ID].includes(workflowIdParam)
		? undefined
		: workflowIdParam;
});

const rootPane = ref<PaneNode>({
	id: uuid(),
	nodeType: 'split',
	direction: SplitDirection.Horizontal,
	weights: [0.4, 0.6],

	children: [
		{
			id: uuid(),
			nodeType: 'leaf',
			content: { kind: 'node-view', meta: { workflowId } },
		},

		{
			id: uuid(),
			nodeType: 'split',
			direction: SplitDirection.Vertical,
			weights: [0.4, 0.6],
			children: [
				{
					id: uuid(),
					nodeType: 'leaf',
					content: { kind: 'node-view', meta: { workflowId: 'ywWSkgVtDnvrvJMC' } },
				},
				{
					id: uuid(),
					nodeType: 'leaf',
					content: { kind: 'node-view', meta: { workflowId: 'RjfdcFWFamA26lLk' } },
				},
			],
		},
	],
});

function closePane(root: PaneNode, id: string): PaneNode | null {
	function recursiveClose(node: PaneNode): PaneNode | null {
		if (node.nodeType === 'leaf') {
			return node.id === id ? null : node;
		}

		const children: PaneNode[] = [];
		const weights: number[] = [];

		node.children.forEach((child, idx) => {
			const kept = recursiveClose(child);
			if (kept) {
				children.push(kept);
				weights.push(node.weights[idx]);
			}
		});

		if (children.length === 0) return null;

		if (children.length === 1) return children[0];

		const sum = weights.reduce((a, b) => a + b, 0);
		node.children = children;
		node.weights = weights.map((w) => w / sum);
		return node;
	}

	return recursiveClose(root);
}

function handleClose(targetId: string) {
	const newRoot = closePane(rootPane.value, targetId);
	if (newRoot) {
		rootPane.value = newRoot;
	}
}

function splitPane(root: PaneNode, id: string, direction: SplitDirection): PaneNode | null {
	function recursiveSplit(node: PaneNode): PaneNode | null {
		if (node.nodeType === 'leaf') {
			if (node.id !== id) {
				return node;
			}
			return {
				id: node.id,
				nodeType: 'split',
				direction,
				weights: [0.5, 0.5],
				children: [
					{ ...node, id: uuid() },
					{ ...node, id: uuid() },
				],
			};
		}

		const children: PaneNode[] = [];
		const weights: number[] = [];

		node.children.forEach((child, idx) => {
			const split = recursiveSplit(child);
			if (split) {
				children.push(split);
				weights.push(node.weights[idx]);
			}
		});

		node.children = children;
		node.weights = weights.map((w) => w / weights.reduce((a, b) => a + b, 0));
		return node;
	}

	return recursiveSplit(root);
}

function handleSplit(targetId: string, direction: SplitDirection) {
	const newRoot = splitPane(rootPane.value, targetId, direction);
	if (newRoot) {
		rootPane.value = newRoot;
	}
}
</script>

<template>
	<WindowManager :root-pane="rootPane" @close="handleClose" @split="handleSplit" />
</template>

<style lang="scss" module></style>
