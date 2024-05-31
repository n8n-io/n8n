<template>
	<n8n-node-creator-node
		:class="$style.creatorLink"
		:title="link.title"
		:is-trigger="false"
		:description="link.description"
		:tag="link.tag"
		:show-action-arrow="true"
	>
		<template #icon>
			<n8n-node-icon type="icon" :name="link.icon" :circle="false" :show-tooltip="false" />
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import type { LinkItemProps } from '@/Interface';

export interface Props {
	link: LinkItemProps;
}

defineProps<Props>();
</script>

<style lang="scss" module>
.creatorLink {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
}
</style>
