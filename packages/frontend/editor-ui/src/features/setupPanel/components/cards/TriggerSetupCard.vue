<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nIcon, N8nTooltip } from '@n8n/design-system';

import NodeIcon from '@/app/components/NodeIcon.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import WebhookUrlPreview from '@/features/setupPanel/components/WebhookUrlPreview.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';
import { useWebhookUrls } from '@/features/setupPanel/composables/useWebhookUrls';

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
	tooltipItems,
	execute,
	isInListeningState,
	listeningHint,
} = useTriggerExecution(nodeRef);

const { webhookUrls } = useWebhookUrls(nodeRef);

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
		<template #webhook-urls>
			<WebhookUrlPreview v-if="isInListeningState && webhookUrls.length > 0" :urls="webhookUrls" />
		</template>
		<template #footer-actions>
			<TriggerExecuteButton
				:label="label"
				:icon="buttonIcon"
				:disabled="isButtonDisabled"
				:loading="isExecuting"
				:tooltip-items="tooltipItems"
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
