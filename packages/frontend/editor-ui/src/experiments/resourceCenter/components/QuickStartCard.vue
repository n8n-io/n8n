<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nCard, N8nText } from '@n8n/design-system';
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
	return props.workflow.nodeTypes
		.slice(0, 2)
		.map((nodeType) => nodeTypesStore.getNodeType(nodeType))
		.filter(Boolean);
});

const handleClick = () => {
	emit('click');
};
</script>

<template>
	<N8nCard :class="$style.card" @click="handleClick">
		<div>
			<div v-if="templateNodes.length > 0" :class="[$style.nodes, 'mb-s']">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="18" :stroke-width="1.5" :node-type="nodeType" />
				</div>
			</div>
			<N8nText size="medium" :bold="true">
				{{ workflow.name }}
			</N8nText>
		</div>
		<div :class="[$style.actions, 'mt-m']">
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('experiments.resourceCenter.templateCard.useNow')"
				size="xsmall"
				@click.stop="handleClick"
			/>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 200px;
	background-color: var(--color--background--light-2);
	cursor: pointer;
}

.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	padding: var(--spacing--2xs);
	background-color: var(--dialog--color--background);
	border-radius: var(--radius--lg);
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: end;
	margin-right: var(--spacing--3xs);
}

.actions {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}
</style>
