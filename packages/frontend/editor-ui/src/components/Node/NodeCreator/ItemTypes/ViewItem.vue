<script setup lang="ts">
import type { ViewItemProps } from '@/Interface';

export interface Props {
	view: ViewItemProps;
}

defineProps<Props>();
</script>

<template>
	<N8nNodeCreatorNode
		:class="$style.view"
		:title="view.title"
		:tag="view.tag"
		:is-trigger="false"
		:description="view.description"
		:show-action-arrow="true"
	>
		<template #icon>
			<N8nNodeIcon
				type="icon"
				:name="view.icon"
				:circle="false"
				:show-tooltip="false"
				:use-updated-icons="true"
			/>
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.view {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
}
</style>
