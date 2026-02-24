<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { TriggerSetupState } from '@/features/setupPanel/setupPanel.types';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	state: TriggerSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const triggerNode = computed(() => props.state.node);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const telemetryPayload = computed(() => ({
	type: 'trigger',
	node_type: props.state.node.type,
}));
</script>

<template>
	<SetupCard
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:title="state.node.name"
		:trigger-node="triggerNode"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="[state.node.id]"
		card-test-id="trigger-setup-card"
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
	</SetupCard>
</template>
