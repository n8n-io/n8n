<script setup lang="ts">
import type { LinkItemProps } from '@/Interface';

import { N8nNodeCreatorNode, N8nNodeIcon } from '@n8n/design-system';
export interface Props {
	link: LinkItemProps;
}

defineProps<Props>();
</script>

<template>
	<N8nNodeCreatorNode
		:class="$style.creatorLink"
		:title="link.title"
		:is-trigger="false"
		:description="link.description"
		:tag="link.tag"
		:show-action-arrow="true"
	>
		<template #icon>
			<N8nNodeIcon type="icon" :name="link.icon" :circle="false" :show-tooltip="false" />
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.creatorLink {
	--action-arrow-color: var(--color--text--tint-1);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--xs);
}
</style>
