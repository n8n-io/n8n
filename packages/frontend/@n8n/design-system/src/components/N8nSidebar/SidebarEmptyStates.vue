<script lang="ts" setup>
import { N8nButton, N8nTooltip } from '..';
import N8nText from '../N8nText';

defineProps<{
	label: string;
	id: string;
	level?: number;
}>();

defineEmits<{
	createProject: void;
}>();
</script>

<template>
	<div v-if="id === 'no-team-projects-cant-create'" class="sidebarProjectsEmpty">
		<N8nTooltip placement="top" content="Your current role does not allow you to create projects">
			<N8nText size="small" color="text-light" class="sidebarEmptyState">
				{{ label }}
			</N8nText>
		</N8nTooltip>
	</div>
	<div v-else-if="id === 'no-team-projects'" class="sidebarProjectsEmpty">
		<N8nButton
			icon-size="large"
			size="mini"
			icon="plus"
			type="tertiary"
			text
			square
			@click="$emit('createProject')"
		>
			Create project
		</N8nButton>
	</div>
	<div v-else>
		<span class="itemIdent" v-for="level in new Array(level || 0 - 1)" :key="level" />
		<N8nText size="small" color="text-light" class="sidebarEmptyState">
			{{ label }}
		</N8nText>
	</div>
</template>

<style scoped lang="scss">
.sidebarProjectsEmpty {
	padding: var(--spacing-l) var(--spacing-2xs);
	margin-top: var(--spacing-2xs);
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

.sidebarEmptyState {
	padding: var(--spacing-3xs) var(--spacing-3xs);
}
</style>
