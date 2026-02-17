<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import TriggerExecuteButton from '../TriggerExecuteButton.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';

import type { TriggerSetupState } from '../../setupPanel.types';
import SetupCard from './SetupCard.vue';

const props = defineProps<{
	state: TriggerSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const setupPanelStore = useSetupPanelStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const telemetryPayload = computed(() => ({
	type: 'trigger',
	node_type: props.state.node.type,
}));

const onExecuted = () => {
	setupCard.value?.markInteracted();
};

const onCardMouseEnter = () => {
	setupPanelStore.setHighlightedNodes([props.state.node.id]);
};

const onCardMouseLeave = () => {
	setupPanelStore.clearHighlightedNodes();
};

onBeforeUnmount(() => {
	setupPanelStore.clearHighlightedNodes();
});
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:title="state.node.name"
		:telemetry-payload="telemetryPayload"
		card-test-id="trigger-setup-card"
		@mouseenter="onCardMouseEnter"
		@mouseleave="onCardMouseLeave"
	>
		<template #icon>
			<NodeIcon :node-type="nodeType" :size="16" />
		</template>
		<template #header-extra>
			<N8nTooltip>
				<template #content>
					{{ i18n.baseText('nodeCreator.nodeItem.triggerIconTitle') }}
				</template>
				<N8nIcon icon="zap" size="small" color="text-light" />
			</N8nTooltip>
		</template>
		<template #footer-actions>
			<TriggerExecuteButton :node="state.node" @executed="onExecuted" />
		</template>
	</SetupCard>
</template>
