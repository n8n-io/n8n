<script setup lang="ts">
/** The node icons of an automation proposal, with the node names as accessible labels. */
import { computed, onMounted } from 'vue';
import type { AutomationProposalCard } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { loadStepNodeTypes } from './loadStepNodeTypes';

const props = defineProps<{
	steps: AutomationProposalCard['steps'];
	/** The number of running nodes that have no icon. */
	hiddenCount: number;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

// getNodeType is reactive, so the icons and labels update when the node types arrive.
onMounted(() => {
	void loadStepNodeTypes(nodeTypesStore);
});

// NodeIcon has no accessible name, so each icon gets the node name as its label.
const icons = computed(() =>
	props.steps.map((step, index) => {
		const nodeType = nodeTypesStore.getNodeType(step.type);
		const label = step.name || (nodeType?.displayName ?? step.type);
		return { key: `${index}:${step.type}`, nodeType, name: step.name, label };
	}),
);

const moreText = computed(() =>
	i18n.baseText('instanceAi.automation.steps.more', {
		interpolate: { count: String(props.hiddenCount) },
	}),
);
</script>

<template>
	<ul
		:class="$style.steps"
		:aria-label="i18n.baseText('instanceAi.automation.steps.label')"
		data-test-id="automation-proposal-steps"
	>
		<li v-for="icon in icons" :key="icon.key" :class="$style.step">
			<!-- A div, because the root of NodeIcon is a div. -->
			<div role="img" :aria-label="icon.label" :title="icon.label" :class="$style.step">
				<NodeIcon :node-type="icon.nodeType" :node-name="icon.name" :size="16" />
			</div>
		</li>
		<li v-if="hiddenCount > 0" :class="$style.step">
			<N8nText size="small" color="text-base">{{ moreText }}</N8nText>
		</li>
	</ul>
</template>

<style lang="scss" module>
.steps {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.step {
	display: inline-flex;
	align-items: center;
}
</style>
