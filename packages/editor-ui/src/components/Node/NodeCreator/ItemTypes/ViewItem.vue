<template>
	<n8n-node-creator-node
		:class="$style.view"
		:title="view.title"
		:isTrigger="false"
		:description="view.description"
		:showActionArrow="true"
	>
		<template #icon>
			<n8n-node-icon type="icon" :name="view.icon" :circle="false" :showTooltip="false" />
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import type { ViewItemProps } from '@/Interface';

export interface Props {
	view: ViewItemProps;
}

defineProps<Props>();
</script>

<style lang="scss" module>
.view {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
}
</style>
