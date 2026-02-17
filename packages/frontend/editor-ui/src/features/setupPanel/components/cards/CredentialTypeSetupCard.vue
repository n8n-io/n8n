<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import TriggerExecuteButton from '../TriggerExecuteButton.vue';

import type { CredentialTypeSetupState } from '../../setupPanel.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import SetupCard from './SetupCard.vue';

const props = defineProps<{
	state: CredentialTypeSetupState;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });

const emit = defineEmits<{
	credentialSelected: [payload: { credentialType: string; credentialId: string }];
	credentialDeselected: [credentialType: string];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const setupCard = ref<InstanceType<typeof SetupCard> | null>(null);

const nodeNames = computed(() => props.state.nodes.map((node) => node.name));

// Only the first trigger node is embedded in this card; extras get standalone cards.
const triggerNodes = computed(() => {
	const first = props.state.nodes.find((node) => nodeTypesStore.isTriggerNode(node.type));
	return first ? [first] : [];
});

const cardTitle = computed(() => nodeNames.value[0] ?? '');

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

const showFooter = computed(() => triggerNodes.value.length > 0 || props.state.isComplete);

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
</script>

<template>
	<SetupCard
		ref="setupCard"
		v-model:expanded="expanded"
		:is-complete="state.isComplete"
		:title="cardTitle"
		:show-footer="showFooter"
		:telemetry-payload="telemetryPayload"
		card-test-id="credential-type-setup-card"
	>
		<template #icon>
			<CredentialIcon :credential-type-name="state.credentialType" :size="16" />
		</template>

		<div :class="$style.content" class="pb-s">
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
					create-button-type="secondary"
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
			<div v-if="triggerNodes.length > 0" :class="$style['footer-trigger-buttons']">
				<TriggerExecuteButton
					v-for="triggerNode in triggerNodes"
					:key="triggerNode.id"
					:node="triggerNode"
					@executed="setupCard?.markInteracted()"
				/>
			</div>
		</template>
	</SetupCard>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
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

.footer-trigger-buttons {
	display: flex;
	gap: var(--spacing--2xs);
	margin-left: auto;
}
</style>
