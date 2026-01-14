<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nCard, N8nText } from '@n8n/design-system';
import type { QuickStartWorkflow } from '../data/quickStartWorkflows';

const props = defineProps<{
	workflow: QuickStartWorkflow;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const templateNodes = computed(() => {
	const nodesToShow = [];

	for (const nodeType of props.workflow.nodeTypes.slice(0, 2)) {
		const nodeTypeData = nodeTypesStore.getNodeType(nodeType);
		if (nodeTypeData) {
			nodesToShow.push(nodeTypeData);
		}
	}

	return nodesToShow;
});

const handleClick = () => {
	emit('click');
};
</script>

<template>
	<N8nCard :class="$style.card" @click="handleClick">
		<div :class="$style.content">
			<N8nText size="medium" :bold="true" :class="$style.title">
				{{ workflow.name }}
			</N8nText>
			<N8nText v-if="workflow.description" size="small" :class="[$style.description, 'mt-2xs']">
				{{ workflow.description }}
			</N8nText>
		</div>
		<div :class="$style.footer">
			<div v-if="templateNodes.length > 0" :class="$style.nodes">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="18" :stroke-width="1.5" :node-type="nodeType" />
				</div>
			</div>
			<span :class="$style.label">
				{{ i18n.baseText('experiments.resourceCenter.badge.noSetup') }}
			</span>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex: 1 1 0;
	min-width: 200px;
	background-color: var(--color--background--light-2);
	cursor: pointer !important;
	transition: all 0.2s ease;

	&:hover {
		background-color: var(--color--foreground--tint-2);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
}

.content {
	flex: 1;
}

.title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
}

.footer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--md);
}

.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin-right: var(--spacing--3xs);
}

.label {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: var(--color--success);
}
</style>
