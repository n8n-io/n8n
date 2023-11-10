<script lang="ts" setup>
import { type ContextMenuAction, useContextMenu } from '@/composables';
import { N8nActionDropdown } from 'n8n-design-system';
import type { INode } from 'n8n-workflow';
import { watch, ref } from 'vue';

const { isOpen, actions, position, targetNodes, target, close } = useContextMenu();
const contextMenu = ref<InstanceType<typeof N8nActionDropdown>>();
const emit = defineEmits<{ (event: 'action', action: ContextMenuAction, nodes: INode[]): void }>();

watch(
	isOpen,
	() => {
		if (isOpen) {
			contextMenu.value?.open();
		} else {
			contextMenu.value?.close();
		}
	},
	{ flush: 'post' },
);

function onActionSelect(item: string) {
	emit('action', item as ContextMenuAction, targetNodes.value);
}

function onVisibleChange(open: boolean) {
	if (!open) {
		close();
	}
}
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<div :class="$style.contextMenu" :style="{ top: `${position[1]}px`, left: `${position[0]}px` }">
			<n8n-action-dropdown
				ref="contextMenu"
				:items="actions"
				placement="bottom-start"
				data-test-id="context-menu"
				:hideArrow="target.source !== 'node-button'"
				@select="onActionSelect"
				@visibleChange="onVisibleChange"
			>
				<template #activator>
					<div :class="$style.activator"></div>
				</template>
			</n8n-action-dropdown>
		</div>
	</Teleport>
</template>

<style module lang="scss">
.contextMenu {
	position: fixed;
}

.activator {
	pointer-events: none;
	opacity: 0;
}
</style>
