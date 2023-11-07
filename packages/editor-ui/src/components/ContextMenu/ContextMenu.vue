<script lang="ts" setup>
import { type ContextMenuAction, useContextMenu } from '@/composables';
import { N8nActionDropdown } from 'n8n-design-system';
import type { INode } from 'n8n-workflow';
import { watch, ref } from 'vue';
import { useUIStore } from '@/stores';

const { isOpen, actions, position, target, close } = useContextMenu();
const contextMenu = ref<InstanceType<typeof N8nActionDropdown>>();
const uiStore = useUIStore();
const selectedNodes = uiStore.selectedNodes;
const emit = defineEmits<{ (event: 'action', action: ContextMenuAction, nodes: INode[]): void }>();

watch(
	isOpen,
	() => {
		console.log('open dropdown!');
		if (isOpen) {
			contextMenu.value?.open();
		} else {
			contextMenu.value?.close();
		}
	},
	{ flush: 'post' },
);

function onActionSelect(item: string) {
	console.log(item);
	const nodes = target.value.source === 'node' ? [target.value.target] : selectedNodes;
	emit('action', item as ContextMenuAction, nodes);
}

function onVisibleChange(open: boolean) {
	if (!open) {
		close();
	}
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<n8n-action-dropdown
			ref="contextMenu"
			:items="actions"
			placement="bottom-start"
			data-test-id="context-menu"
			:showArrow="false"
			@select="onActionSelect"
			@visibleChange="onVisibleChange"
		>
			<template #activator>
				<div
					:style="{ top: `${position[1]}px`, left: `${position[0]}px` }"
					:class="$style.yolo"
				></div>
			</template>
		</n8n-action-dropdown>
	</Teleport>
</template>

<style module lang="scss">
.yolo {
	position: fixed;
}
</style>
