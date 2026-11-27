<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { AgentHeldAction } from './heldActions';

/** The icon of the app an action goes to, or a generic icon when the app is not known. */
const props = withDefaults(
	defineProps<{
		action: Pick<AgentHeldAction, 'icon' | 'nodeType'>;
		size?: number;
	}>(),
	{ size: 16 },
);

const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() =>
	props.action.nodeType ? nodeTypesStore.getNodeType(props.action.nodeType) : null,
);
</script>

<template>
	<span
		:class="$style.icon"
		:style="{ '--held-action-icon--size': `${size}px` }"
		aria-hidden="true"
	>
		<NodeIcon v-if="nodeType" :node-type="nodeType" :size="size" />
		<N8nIcon v-else :icon="action.icon" :size="size" />
	</span>
</template>

<style module lang="scss">
.icon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--held-action-icon--size);
	height: var(--held-action-icon--size);
	color: var(--text-color--subtle);
}
</style>
