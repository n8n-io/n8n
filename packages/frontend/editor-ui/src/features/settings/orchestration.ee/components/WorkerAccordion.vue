<script setup lang="ts">
import { ref } from 'vue';
import type { IconColor } from '@n8n/design-system';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { N8nIcon, N8nText } from '@n8n/design-system';
const props = withDefaults(
	defineProps<{
		icon?: IconName;
		iconColor?: IconColor;
		initialExpanded?: boolean;
	}>(),
	{
		icon: 'list-checks',
		iconColor: 'text-dark',
		initialExpanded: true,
	},
);

const expanded = ref<boolean>(props.initialExpanded);

function toggle() {
	expanded.value = !expanded.value;
}
</script>

<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<N8nIcon :icon="icon" :color="iconColor" size="small" class="mr-2xs" />
			<N8nText :class="$style.headerText" color="text-base" size="small" align="left" bold>
				<slot name="title"></slot>
			</N8nText>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div v-if="expanded" :class="{ [$style.description]: true, [$style.collapsed]: !expanded }">
			<slot name="content"></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
}

.header {
	cursor: pointer;
	display: flex;
	padding-top: var(--spacing--sm);
	align-items: center;

	.headerText {
		flex-grow: 1;
	}
}

.expanded {
	padding: var(--spacing--sm) 0 0 0;
}

.description {
	display: flex;
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);

	b {
		font-weight: var(--font-weight--bold);
	}
}
</style>
