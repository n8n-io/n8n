<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText, N8nTooltip } from '@n8n/design-system';

import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import type { CredentialTypeSetupState } from '@/features/setupPanel/setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCardNodeHighlight } from '@/features/setupPanel/composables/useCardNodeHighlight';
import SetupCard from '@/features/setupPanel/components/cards/SetupCard.vue';

const props = defineProps<{
	state: CredentialTypeSetupState;
	firstTriggerName?: string | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string }];
	credentialDeselected: [payload: { credentialType: string }];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const credentialsStore = useCredentialsStore();

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

const cardTitle = computed(() => nodeNames.value[0] ?? '');

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const isTestingCredential = computed(() => {
	const id = props.state.selectedCredentialId;
	return !!id && credentialsStore.isCredentialTestPending(id);
});

const showFooter = computed(() => !!triggerNode.value || props.state.isComplete);

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
	emit('credentialDeselected', { credentialType: props.state.credentialType });
};

const { onSharedNodesHintEnter, onSharedNodesHintLeave } = useCardNodeHighlight(
	computed(() => firstNode.value?.id ?? ''),
	computed(() => props.state.nodes.map((node) => node.id)),
);
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:loading="isTestingCredential"
		:title="cardTitle"
		:show-footer="showFooter"
		:trigger-node="triggerNode"
		:is-testing-credential="isTestingCredential"
		:telemetry-payload="telemetryPayload"
		:highlight-node-ids="firstNode ? [firstNode.id] : []"
		card-test-id="credential-type-setup-card"
	>
		<template #icon>
			<CredentialIcon :credential-type-name="state.credentialType" :size="16" />
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
	</SetupCard>
</template>

<style module lang="scss">
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
	font-size: var(--font-size--2xs);
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
