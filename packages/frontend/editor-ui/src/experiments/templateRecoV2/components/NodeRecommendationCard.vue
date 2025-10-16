<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { EXPERIMENT_TEMPLATE_RECO_V2_KEY } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { computed, onMounted } from 'vue';
import { usePersonalizedTemplatesV2Store } from '../stores/templateRecoV2.store';
import NodeIcon from '@/components/NodeIcon.vue';
import { N8nCard, N8nText } from '@n8n/design-system';

const props = defineProps<{
	nodeName: string;
}>();

const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();
const { trackMinicardClick } = usePersonalizedTemplatesV2Store();

const nodeType = computed(() => nodeTypesStore.getNodeType(props.nodeName));

const openModal = () => {
	trackMinicardClick(nodeType.value?.displayName ?? props.nodeName);
	uiStore.openModalWithData({
		name: EXPERIMENT_TEMPLATE_RECO_V2_KEY,
		data: { nodeName: props.nodeName },
	});
};

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<div>
		<N8nCard :class="$style.nodeCard" hoverable @click="openModal">
			<div :class="$style.emptyStateCardContent">
				<NodeIcon :node-type="nodeType" :class="$style.nodeIcon" :stroke-width="1.5" />
				<N8nText size="xsmall" class="mt-xs pl-2xs pr-2xs" :bold="true">
					{{ nodeType?.displayName }}
				</N8nText>
			</div>
		</N8nCard>
	</div>
</template>

<style lang="scss" module>
.nodeCard {
	width: 100px;
	height: 80px;
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0;
}

.nodeIcon {
	font-size: var(--font-size--2xl);
}

.emptyStateCardContent {
	flex: 1;
	display: inline-flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}
</style>
