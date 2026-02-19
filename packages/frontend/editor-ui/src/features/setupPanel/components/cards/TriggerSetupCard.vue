<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nIcon, N8nTooltip, N8nButton } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';

import type { TriggerSetupState } from '@/features/setupPanel/setupPanel.types';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	state: TriggerSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const setupPanelStore = useSetupPanelStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeRef = computed(() => props.state.node);

const {
	isExecuting,
	isButtonDisabled,
	label,
	buttonIcon,
	tooltipText,
	execute,
	isInListeningState,
	listeningHint,
} = useTriggerExecution(nodeRef);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const telemetryPayload = computed(() => ({
	type: 'trigger',
	node_type: props.state.node.type,
}));

const onExecuteClick = async () => {
	await execute();
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

const didSkip = ref(false);
const skipButtonLabel = computed(() =>
	didSkip.value
		? i18n.baseText('setupPanel.demoData.skip')
		: i18n.baseText('setupPanel.demoData.clear'),
);
const skipButtonTooltip = computed(() =>
	didSkip.value
		? i18n.baseText('setupPanel.demoData.skipTooltip')
		: i18n.baseText('setupPanel.demoData.clearTooltip'),
);

function onSkipClick() {
	if (didSkip.value) {
	} else {
	}

	didSkip.value = !didSkip.value;
}
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:title="state.node.name"
		:show-callout="isInListeningState"
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
		<template #callout>
			<N8nCallout
				data-test-id="trigger-listening-callout"
				theme="secondary"
				:class="$style.callout"
			>
				{{ listeningHint }}
			</N8nCallout>
		</template>
		<template #footer-actions>
			<N8nTooltip v-if="state.demoData" placement="top">
				<template #content>{{ skipButtonTooltip }}</template>
				<N8nButton
					data-test-id="node-setup-card-skip-button"
					type="secondary"
					:label="skipButtonLabel"
					:icon="buttonIcon"
					size="small"
					@click="onSkipClick"
				/>
			</N8nTooltip>
			<TriggerExecuteButton
				:label="label"
				:icon="buttonIcon"
				:disabled="isButtonDisabled"
				:loading="isExecuting"
				:tooltip-text="tooltipText"
				@click="onExecuteClick"
			/>
		</template>
	</SetupCard>
</template>

<style module lang="scss">
.callout {
	margin: 0 var(--spacing--xs);
}
</style>
