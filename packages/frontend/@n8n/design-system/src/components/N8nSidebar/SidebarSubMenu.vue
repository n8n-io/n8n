<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
</script>

<template>
	<PopoverRoot>
		<PopoverTrigger asChild class="sidebarSubMenuTrigger">
			<slot name="trigger" />
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent side="top" :side-offset="5" style="z-index: 1000" class="sidebarSubMenu">
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
	padding: var(--spacing-2xs);
	box-shadow: var(--box-shadow-light);
	min-width: 200px;
}

.sidebarSubMenuTrigger {
	background: none;
	border: none;
	padding: 0;
}
</style>
