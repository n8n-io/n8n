<script setup lang="ts">
import type { ViewItemProps } from '@/Interface';

import { N8nNodeCreatorNode, N8nNodeIcon } from '@n8n/design-system';
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
			<N8nNodeIcon type="icon" :name="view.icon" :circle="false" :show-tooltip="false" />
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.view {
	--action-arrow-color: var(--color--text--tint-1);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--xs);
}
</style>
