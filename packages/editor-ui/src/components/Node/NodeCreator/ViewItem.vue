<template>
	<n8n-node-creator-node
		:class="{
			[$style.view]: true,
			[$style.withTopBorder]: view.withTopBorder,
		}"
		:title="view.title"
		:isTrigger="false"
		:description="view.description"
		:showActionArrow="true"
	>
		<template #icon>
			<n8n-node-icon
				type="icon"
				:name="view.icon"
				:circle="false"
				:showTooltip="false"
			></n8n-node-icon>
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
	margin-left: 15px;
	margin-right: 12px;
	padding: 11px 4px 11px 0;
}
.withTopBorder {
	border-top: 1px solid var(--color-foreground-base);
	margin-top: var(--spacing-xs);
	padding-top: var(--spacing-l);
}
</style>
