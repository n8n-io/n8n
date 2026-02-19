<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nButton } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

import type { NodeParameterSetupState } from '@/features/setupPanel/setupPanel.types';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	state: NodeParameterSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const setupPanelStore = useSetupPanelStore();
const ndvStore = useNDVStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const telemetryPayload = computed(() => ({
	type: 'parameter',
	node_type: props.state.node.type,
	missing_parameters_count: Object.keys(props.state.parameterIssues).length,
}));

const missingParametersList = computed(() => {
	return Object.entries(props.state.parameterIssues).flatMap(([paramName, issues]) =>
		issues.map((issue) => ({ paramName, issue })),
	);
});

const onConfigureClick = () => {
	setupCard.value?.markInteracted();
	ndvStore.setActiveNodeName(props.state.node.name);
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
		card-test-id="parameter-setup-card"
		@mouseenter="onCardMouseEnter"
		@mouseleave="onCardMouseLeave"
	>
		<template #icon>
			<NodeIcon :node-type="nodeType" :size="16" />
		</template>
		<template #card-description>
			<N8nText size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.parameter.description') }}
			</N8nText>
		</template>
		<div :class="$style.content">
			<div :class="$style['parameter-list']">
				<div
					v-for="({ paramName, issue }, index) in missingParametersList"
					:key="`${paramName}-${index}`"
					:class="$style['parameter-item']"
					data-test-id="parameter-issue-item"
				>
					<N8nText size="small" color="text-base" :bold="true">
						{{ paramName }}
					</N8nText>
					<N8nText size="small" color="danger">
						{{ issue }}
					</N8nText>
				</div>
			</div>
		</div>

		<template #footer-actions>
			<N8nButton
				data-test-id="configure-node-button"
				type="primary"
				size="small"
				@click="onConfigureClick"
			>
				{{ i18n.baseText('setupPanel.parameter.configureButton') }}
			</N8nButton>
		</template>
	</SetupCard>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs);
}

.parameter-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.parameter-item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	background-color: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--sm);
}
</style>
