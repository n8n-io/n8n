<script setup lang="ts">
import type { ViewItemProps } from '@/Interface';

export interface Props {
	view: ViewItemProps;
}

defineProps<Props>();
</script>

<template>
	<n8n-node-creator-node
		:class="$style.view"
		:title="view.title"
		:tag="view.tag"
		:is-trigger="false"
		:description="view.description"
		:show-action-arrow="true"
	>
		<template #icon>
			<n8n-node-icon
				type="icon"
				:name="view.icon"
				:circle="false"
				:show-tooltip="false"
				:use-updated-icons="true"
			/>
		</template>
	</n8n-node-creator-node>
</template>

<style lang="scss" module>
.view {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
}
</style>
