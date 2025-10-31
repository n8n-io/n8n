<script setup lang="ts">
import { computed } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { type ITemplatesWorkflow } from '@n8n/rest-api-client';
import { useTemplatesDataQualityStore } from '../stores/templatesDataQuality.store';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/app/stores/ui.store';
import { EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY } from '@/app/constants';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCard, N8nText } from '@n8n/design-system';

const props = defineProps<{
	template: ITemplatesWorkflow;
}>();

const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateTileClick } = useTemplatesDataQualityStore();
const router = useRouter();
const uiStore = useUIStore();
const locale = useI18n();

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = new Set(props.template.nodes.map((node) => node.name));
	const nodeTypesArray = Array.from(uniqueNodeTypes).slice(0, 2);

	return nodeTypesArray.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
});

const handleUseTemplate = async () => {
	trackTemplateTileClick(props.template.id);
	await router.push(getTemplateRoute(props.template.id));
	uiStore.closeModal(EXPERIMENT_TEMPLATES_DATA_QUALITY_KEY);
};
</script>

<template>
	<N8nCard :class="$style.suggestion" @click="handleUseTemplate">
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
				@click.stop="handleUseTemplate"
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
	padding: var(--spacing--2xs);
	background-color: var(--dialog--color--background);
	border-radius: var(--radius--lg);
	z-index: 1;
	display: flex;
	flex-direction: column;
	align-items: end;
	margin-right: var(--spacing--3xs);
}

.suggestion {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 200px;
	cursor: pointer;
}

.actions {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}
</style>
