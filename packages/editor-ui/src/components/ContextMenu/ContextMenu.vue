<script lang="ts" setup>
import { type ContextMenuAction, useContextMenu } from '@/composables/useContextMenu';
import { N8nActionDropdown } from 'n8n-design-system';
import { watch, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';

const contextMenu = useContextMenu();
const { position, isOpen, actions, target } = contextMenu;
const dropdown = ref<InstanceType<typeof N8nActionDropdown>>();
const emit = defineEmits<{ action: [action: ContextMenuAction, nodeIds: string[]] }>();
const container = ref<HTMLDivElement>();

watch(
	isOpen,
	() => {
		if (isOpen) {
			dropdown.value?.open();
		} else {
			dropdown.value?.close();
		}
	},
	{ flush: 'post' },
);

function onActionSelect(item: string) {
	const action = item as ContextMenuAction;
	contextMenu._dispatchAction(action);
	emit('action', action, contextMenu.targetNodeIds.value);
}

function closeMenu(event: MouseEvent) {
	if (event.cancelable) {
		event.preventDefault();
	}
	event.stopPropagation();
	contextMenu.close();
}

function onVisibleChange(open: boolean) {
	if (!open) {
		contextMenu.close();
	}
}

onClickOutside(container, closeMenu);
</script>

<template>
	<Teleport v-if="isOpen" to="body">
		<div
			ref="container"
			:class="$style.contextMenu"
			:style="{
				left: `${position[0]}px`,
				top: `${position[1]}px`,
			}"
		>
			<N8nActionDropdown
				ref="dropdown"
				:items="actions"
				placement="bottom-start"
				data-test-id="context-menu"
				:hide-arrow="target?.source !== 'node-button'"
				:teleported="false"
				@select="onActionSelect"
				@visible-change="onVisibleChange"
			>
				<template #activator>
					<div :class="$style.activator"></div>
				</template>
			</N8nActionDropdown>
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
