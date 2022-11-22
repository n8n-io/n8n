<template>
	<n8n-node-creator-node
		draggable
		:class="$style.action"
		:title="action.title"
		:isTrigger="isTriggerAction(action)"
		v-on="$listeners"

	>
		<template slot="icon">
			<node-icon :nodeType="nodeType" />
		</template>
	</n8n-node-creator-node>
</template>

<script lang="ts" setup>
import { INodeTypeDescription, INodeAction } from 'n8n-workflow';
import NodeIcon from '@/components/NodeIcon.vue';

export interface Props {
	nodeType: INodeTypeDescription,
	action: INodeAction
}

defineProps<Props>();

const isTriggerAction = (action: INodeAction) => action.nodeName?.toLowerCase().includes('trigger');
</script>


<style lang="scss" module>
.action {
	&:not(:last-child) {
		// margin-bottom: var(--spacing-m);
	}
}
</style>
