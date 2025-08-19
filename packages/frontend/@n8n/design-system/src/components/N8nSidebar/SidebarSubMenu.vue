<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';

defineProps<{ subMenuOpen: boolean }>();
defineEmits<{
	(e: 'update:open', state: boolean): void;
}>();
</script>

<template>
	<PopoverRoot :open="subMenuOpen" @update:open="$emit('update:open', $event)">
		<PopoverTrigger asChild class="sidebarSubMenuTrigger">
			<slot name="trigger" />
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent side="top" style="z-index: 1000" class="sidebarSubMenu">
				<slot name="content" />
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>

<style lang="scss">
.sidebarSubMenu {
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	padding: var(--spacing-xs);
	box-shadow: var(--box-shadow-light);
	min-width: 300px;
}

.sidebarSubMenuTrigger {
	background: none;
	border: none;
	padding: 0;
}
</style>
