<script setup lang="ts">
import WindowManager from '@/components/WindowManager/WindowManager.vue';
import { ref } from 'vue';
import { SplitDirection, type PaneNode } from '@/components/WindowManager/types';

const rootPane = ref<PaneNode>({
	nodeType: 'split',
	rect: { x: 0, y: 0, width: 1, height: 1 },
	direction: SplitDirection.Horizontal,

	children: [
		{
			nodeType: 'leaf',
			rect: { x: 0, y: 0, width: 0.5, height: 1 },
			content: { kind: 'node-view', meta: { pane: 'left' } },
		},

		{
			nodeType: 'split',
			rect: { x: 0.5, y: 0, width: 0.5, height: 1 },
			direction: SplitDirection.Vertical,

			children: [
				{
					nodeType: 'split',
					rect: { x: 0.5, y: 0, width: 0.5, height: 1 },
					direction: SplitDirection.Vertical,
					children: [
						{
							nodeType: 'leaf',
							rect: { x: 0.5, y: 0, width: 0.5, height: 0.5 },
							content: { kind: 'node-view', meta: { pane: 'right-top' } },
						},
						{
							nodeType: 'leaf',
							rect: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
							content: { kind: 'node-view', meta: { pane: 'right-bottom' } },
						},
					],
				},
				{
					nodeType: 'leaf',
					rect: { x: 0.5, y: 0, width: 0.5, height: 0.5 },
					content: { kind: 'node-view', meta: { pane: 'right-top' } },
				},
				{
					nodeType: 'leaf',
					rect: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
					content: { kind: 'node-view', meta: { pane: 'right-bottom' } },
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
