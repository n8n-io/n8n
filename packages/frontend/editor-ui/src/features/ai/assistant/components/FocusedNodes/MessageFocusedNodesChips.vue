<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CHIP_BUNDLE_THRESHOLD } from '../../composables/useFocusedNodesChipUI';

interface Props {
	focusedNodeNames?: string[];
}

const props = defineProps<Props>();
const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();

const nodeCount = computed(() => props.focusedNodeNames?.length ?? 0);
const shouldBundle = computed(() => nodeCount.value >= CHIP_BUNDLE_THRESHOLD);
const allNodesSelected = computed(
	() =>
		nodeCount.value > 0 &&
		workflowsStore.allNodes.length > 0 &&
		nodeCount.value >= workflowsStore.allNodes.length,
);

const resolvedNodes = computed(() => {
	if (!props.focusedNodeNames?.length) return [];
	return props.focusedNodeNames.map((name) => {
		const workflowNode = workflowsStore.allNodes.find((n) => n.name === name);
		const nodeType = workflowNode ? nodeTypesStore.getNodeType(workflowNode.type) : null;
		return { name, nodeType };
	});
});

const truncatedName = (name: string) => {
	const maxLength = 20;
	if (name.length <= maxLength) return name;
	return `${name.substring(0, maxLength - 1)}...`;
};
</script>

<template>
	<div v-if="focusedNodeNames?.length" :class="$style.container">
		<span v-if="allNodesSelected" :class="$style.chip">
			<N8nIcon icon="layers" size="small" :class="$style.chipIcon" />
			<span :class="$style.chipLabel">{{ i18n.baseText('focusedNodes.allNodes') }}</span>
		</span>
		<span v-else-if="shouldBundle" :class="$style.chip">
			<N8nIcon icon="layers" size="small" :class="$style.chipIcon" />
			<span :class="$style.chipLabel">
				{{ i18n.baseText('focusedNodes.nodesCount', { interpolate: { count: nodeCount } }) }}
			</span>
		</span>
		<template v-else>
			<span v-for="node in resolvedNodes" :key="node.name" :class="$style.chip">
				<span :class="$style.chipIconWrapper">
					<NodeIcon v-if="node.nodeType" :node-type="node.nodeType" :size="12" />
					<N8nIcon v-else icon="crosshair" size="xsmall" :class="$style.chipIcon" />
				</span>
				<span :class="$style.chipLabel">{{ truncatedName(node.name) }}</span>
			</span>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: light-dark(var(--color--neutral-200), var(--color--neutral-850));
	border: 1px solid light-dark(var(--color--neutral-200), var(--color--neutral-850));
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: light-dark(var(--color--neutral-800), var(--color--neutral-white));
	white-space: nowrap;
}

.chipIconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 12px;
	height: 12px;
	color: light-dark(var(--color--neutral-800), var(--color--neutral-white));

	:global(svg) {
		color: light-dark(var(--color--neutral-800), var(--color--neutral-white));
	}

	:global(img) {
		mix-blend-mode: luminosity;
	}
}

.chipIcon {
	color: light-dark(var(--color--neutral-800), var(--color--neutral-white));
}

.chipLabel {
	line-height: 1;
	max-width: 160px;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
