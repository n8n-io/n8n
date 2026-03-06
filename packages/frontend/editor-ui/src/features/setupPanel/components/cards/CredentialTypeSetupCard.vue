<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nText, N8nTooltip } from '@n8n/design-system';

import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import WebhookUrlPreview from '@/features/setupPanel/components/WebhookUrlPreview.vue';

import type { CredentialTypeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';
import { useWebhookUrls } from '@/features/setupPanel/composables/useWebhookUrls';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	state: CredentialTypeSetupState;
	firstTriggerName?: string | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string }];
	credentialDeselected: [credentialType: string];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();
const setupPanelStore = useSetupPanelStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeNames = computed(() => props.state.nodes.map((node) => node.name));

const firstNode = computed(() => props.state.nodes[0]);

// Only the workflow's first trigger (by execution order) can be executed from setup cards.
const triggerNode = computed(() => {
	if (!props.firstTriggerName) return null;
	return (
		props.state.nodes.find(
			(node) => nodeTypesStore.isTriggerNode(node.type) && node.name === props.firstTriggerName,
		) ?? null
	);
});

const {
	isExecuting,
	isButtonDisabled,
	label,
	buttonIcon,
	tooltipItems,
	execute,
	isInListeningState,
	listeningHint,
} = useTriggerExecution(triggerNode);

const { webhookUrls } = useWebhookUrls(triggerNode);

const cardTitle = computed(() => nodeNames.value[0] ?? '');

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const isTestingCredential = computed(() => {
	const id = props.state.selectedCredentialId;
	return !!id && credentialsStore.isCredentialTestPending(id);
});

const showFooter = computed(() => triggerNode.value !== null || props.state.isComplete);

const telemetryPayload = computed(() => ({
	type: 'credential',
	credential_type: props.state.credentialType,
	related_nodes_count: nodeNames.value.length,
}));

const onCredentialSelected = (credentialId: string) => {
	setupCard.value?.markInteracted();
	emit('credentialSelected', {
		credentialType: props.state.credentialType,
		credentialId,
	});
};

const onCredentialDeselected = () => {
	setupCard.value?.markInteracted();
	emit('credentialDeselected', props.state.credentialType);
};

const onExecuteClick = async () => {
	await execute();
	setupCard.value?.markInteracted();
};

const onCardMouseEnter = () => {
	if (firstNode.value) {
		setupPanelStore.setHighlightedNodes([firstNode.value.id]);
	}
};

const onCardMouseLeave = () => {
	setupPanelStore.clearHighlightedNodes();
};

const onSharedNodesHintEnter = () => {
	const ids = props.state.nodes.map((node) => node.id);
	setupPanelStore.setHighlightedNodes(ids);
};

const onSharedNodesHintLeave = () => {
	if (firstNode.value) {
		setupPanelStore.setHighlightedNodes([firstNode.value.id]);
	}
};

onMounted(() => {
	if (props.state.selectedCredentialId) return;

	const available = credentialsStore.getCredentialsByType(props.state.credentialType);
	if (available.length === 0) return;

	const mostRecent = available.reduce(
		(best, current) => (best.updatedAt > current.updatedAt ? best : current),
		available[0],
	);

	emit('credentialSelected', {
		credentialType: props.state.credentialType,
		credentialId: mostRecent.id,
	});
});

onBeforeUnmount(() => {
	setupPanelStore.clearHighlightedNodes();
});
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:loading="isTestingCredential"
		:title="cardTitle"
		:show-footer="showFooter"
		:show-callout="!!triggerNode && isInListeningState"
		:telemetry-payload="telemetryPayload"
		card-test-id="credential-type-setup-card"
		@mouseenter="onCardMouseEnter"
		@mouseleave="onCardMouseLeave"
	>
		<template #icon>
			<CredentialIcon :credential-type-name="state.credentialType" :size="16" />
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
			<WebhookUrlPreview
				v-if="triggerNode && isInListeningState && webhookUrls.length > 0"
				:urls="webhookUrls"
			/>
		</template>

		<template #card-description>
			<N8nText v-if="triggerNode" size="medium" color="text-base" class="pl-xs pr-xs">
				{{ i18n.baseText('setupPanel.trigger.credential.note') }}
			</N8nText>
		</template>
		<div :class="$style.content">
			<div :class="$style['credential-container']">
				<div :class="$style['credential-label-row']">
					<label
						data-test-id="credential-type-setup-card-label"
						:for="`credential-picker-${state.credentialType}`"
						:class="$style['credential-label']"
					>
						{{ i18n.baseText('setupPanel.credentialLabel') }}
					</label>
					<N8nTooltip v-if="nodeNames.length > 1" placement="top">
						<template #content>
							{{ nodeNamesTooltip }}
						</template>
						<span
							data-test-id="credential-type-setup-card-nodes-hint"
							:class="$style['nodes-hint']"
							@mouseenter="onSharedNodesHintEnter"
							@mouseleave="onSharedNodesHintLeave"
						>
							{{
								i18n.baseText('setupPanel.usedInNodes', {
									interpolate: { count: String(nodeNames.length) },
								})
							}}
						</span>
					</N8nTooltip>
				</div>
				<CredentialPicker
					create-button-variant="subtle"
					:class="$style['credential-picker']"
					:app-name="state.credentialDisplayName"
					:credential-type="state.credentialType"
					:selected-credential-id="state.selectedCredentialId ?? null"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
			</div>
		</div>

		<template #footer-actions>
			<TriggerExecuteButton
				v-if="triggerNode"
				:label="label"
				:icon="buttonIcon"
				:disabled="isButtonDisabled || isTestingCredential"
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

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs);
}

.credential-container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.credential-label-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credential-label {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.nodes-hint {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: default;
	display: none;

	.credential-container:hover & {
		display: flex;
	}
}

.credential-picker {
	flex: 1;
}
</style>
