<script setup lang="ts">
import type { OpenTemplateItemProps } from '@/Interface';

export interface Props {
	openTemplate: OpenTemplateItemProps;
}

defineProps<Props>();
</script>

<template>
	<N8nNodeCreatorNode
		:class="{ [$style.creatorOpenTemplate]: true, [$style.compact]: openTemplate.compact }"
		:title="openTemplate.title"
		:description="openTemplate.description"
		:tag="openTemplate.tag"
		:show-action-arrow="true"
		:is-trigger="false"
	>
		<template v-if="openTemplate.icon" #icon>
			<n8n-node-icon
				type="icon"
				:name="openTemplate.icon"
				:circle="false"
				:show-tooltip="false"
				:use-updated-icons="true"
			/>
		</template>

		<template v-if="openTemplate.nodes" #extraDetails>
			<NodeIcon
				v-for="node in openTemplate.nodes"
				:key="node.name"
				:node-type="node"
				:size="16"
				:show-tooltip="true"
			/>
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.creatorOpenTemplate {
	--action-arrow-color: var(--color-text-light);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-xs);
	padding-bottom: var(--spacing-xs);
	margin-bottom: var(--spacing-xs);
}
.compact {
	margin-left: 0;
	padding-right: 0;
}
</style>
