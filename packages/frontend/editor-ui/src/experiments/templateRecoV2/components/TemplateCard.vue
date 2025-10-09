<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { type ITemplatesWorkflow } from '@n8n/rest-api-client';
import { usePersonalizedTemplatesV2Store } from '../stores/templateRecoV2.store';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/stores/ui.store';
import { EXPERIMENT_TEMPLATE_RECO_V2_KEY } from '@/constants';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	template: ITemplatesWorkflow;
	currentNodeName?: string;
}>();

const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateTileClick } = usePersonalizedTemplatesV2Store();
const router = useRouter();
const uiStore = useUIStore();
const locale = useI18n();

// Display the current node name and one other random node from the template
const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes);

	if (props.currentNodeName && uniqueNodeTypes.has(props.currentNodeName)) {
		const otherNodes = nodeTypesArray.filter((nodeType) => nodeType !== props.currentNodeName);
		const nodesToShow = [props.currentNodeName];

		if (otherNodes.length > 0) {
			nodesToShow.push(otherNodes[0]);
		}

		return nodesToShow.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
	}

	return nodeTypesArray
		.slice(0, 2)
		.map((nodeType) => nodeTypesStore.getNodeType(nodeType))
		.filter(Boolean);
});

const handleUseTemplate = async () => {
	trackTemplateTileClick(props.template.id);
	await router.push(getTemplateRoute(props.template.id));
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V2_KEY);
};
</script>

<template>
	<N8nCard :class="$style.suggestion">
		<div>
			<div v-if="templateNodes.length > 0" :class="[$style.nodes, 'mb-s']">
				<div v-for="nodeType in templateNodes" :key="nodeType!.name" :class="$style.nodeIcon">
					<NodeIcon :size="18" :stroke-width="1.5" :node-type="nodeType" />
				</div>
			</div>
			<N8nText size="medium" :bold="true">
				{{ template.name }}
			</N8nText>
		</div>
		<div :class="[$style.actions, 'mt-m']">
			<N8nButton
				:label="locale.baseText('workflows.templateRecoV2.useTemplate')"
				type="secondary"
				size="mini"
				@click="handleUseTemplate"
			/>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.nodes {
	display: flex;
	flex-direction: row;
}

.nodeIcon {
	padding: var(--spacing-2xs);
	background-color: var(--color-dialog-background);
	border-radius: var(--border-radius-large);
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: end;
	margin-right: var(--spacing-3xs);
}

.suggestion {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 200px;
}

.actions {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.user {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.avatar {
	width: 24px;
	height: 24px;
	border-radius: 100%;
	margin-right: var(--spacing-2xs);
}
</style>
