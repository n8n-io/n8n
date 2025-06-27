<script setup lang="ts">
import type { OpenTemplateItemProps } from '@/Interface';

export interface Props {
	openTemplate: OpenTemplateItemProps;
}

defineProps<Props>();
</script>

<template>
	<n8n-node-creator-node
		:class="$style.creatorOpenTemplate"
		:title="openTemplate.title"
		:is-trigger="false"
		:description="openTemplate.description"
		:tag="openTemplate.tag"
		:show-action-arrow="true"
	>
		<template #icon>
			<n8n-node-icon
				type="icon"
				:name="openTemplate.icon"
				:circle="false"
				:show-tooltip="false"
				:use-updated-icons="true"
			/>
		</template>
	</n8n-node-creator-node>
</template>

<style lang="scss" module>
.creatorOpenTemplate {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
}
</style>
