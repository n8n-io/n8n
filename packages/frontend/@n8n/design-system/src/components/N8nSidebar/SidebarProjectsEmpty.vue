<script lang="ts" setup>
import { N8nButton, N8nTooltip } from '..';
import N8nText from '../N8nText';

defineProps<{
	canCreate?: boolean;
}>();

defineEmits<{
	createProject: void;
}>();
</script>

<template>
	<div v-if="!canCreate" class="sidebarProjectsEmpty">
		<N8nTooltip placement="top" content="Your current role does not allow you to create projects">
			<N8nText size="small" color="text-light" class="sidebarEmptyState">No projects</N8nText>
		</N8nTooltip>
	</div>
	<div v-else class="sidebarProjectsEmpty">
		<N8nButton
			icon-size="large"
			size="mini"
			icon="plus"
			type="tertiary"
			text
			@click="$emit('createProject')"
		>
			Create project
		</N8nButton>
	</div>
</template>

<style scoped lang="scss">
.sidebarProjectsEmpty {
	padding: var(--spacing-l) var(--spacing-2xs);
	margin: var(--spacing-2xs) 0;
	text-align: center;
	border: dashed 1px var(--color-foreground-base);
	border-radius: var(--border-radius-small);
	display: flex;
	width: 100%;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-2xs);
	position: relative;
	width: 100%;
}

.itemIdent {
	display: block;
	position: relative;
	width: 0.5rem;
	min-width: 0.5rem;
	align-self: stretch;
	margin-left: 0.75rem;
	border-left: 1px solid var(--color-foreground-light);
}

.itemIdent::before {
	content: '';
	position: absolute;
	bottom: -1px;
	left: -1px;
	width: 1px;
	height: 1px;
	background-color: var(--color-foreground-light);
}
</style>
