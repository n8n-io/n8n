<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nIconButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';

import AgentCredentialSelect, { type AgentCredentialOption } from './AgentCredentialSelect.vue';

const props = withDefaults(
	defineProps<{
		integrationType: string;
		integrationLabel: string;
		modelValue?: string;
		credentials: AgentCredentialOption[];
		credentialPermissions: PermissionsRecord['credential'];
		credentialsLoading?: boolean;
		disabled?: boolean;
		connected?: boolean;
		loading?: boolean;
		publishing?: boolean;
		showConnectButton?: boolean;
		showDisconnectButton?: boolean;
		showEditButton?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		connectedDescription?: string;
	}>(),
	{
		modelValue: undefined,
		credentialsLoading: false,
		disabled: false,
		connected: false,
		loading: false,
		publishing: false,
		showConnectButton: false,
		showDisconnectButton: false,
		showEditButton: true,
		errorMessage: '',
		errorIsConflict: false,
		connectedDescription: '',
	},
);

const emit = defineEmits<{
	'update:modelValue': [credentialId: string];
	create: [];
	edit: [];
	connect: [];
	disconnect: [];
}>();

const i18n = useI18n();

const canEdit = computed(() => props.showEditButton && !props.connected && !!props.modelValue);
const connectDisabled = computed(
	() => !props.modelValue || props.loading || props.publishing || props.disabled,
);
</script>

<template>
	<div :class="$style.connectForm">
		<label :class="$style.label">
			<N8nText size="small" bold>
				{{ integrationLabel }}
				{{ i18n.baseText('agents.builder.addTrigger.credential') }}
			</N8nText>
		</label>
		<N8nText
			v-if="connectedDescription"
			:class="$style.connectedDescription"
			size="small"
			:data-testid="`${integrationType}-connected-description`"
		>
			{{ connectedDescription }}
		</N8nText>
		<div :class="$style.selectRow">
			<AgentCredentialSelect
				:model-value="modelValue"
				:class="$style.select"
				size="large"
				:placeholder="i18n.baseText('agents.builder.addTrigger.selectCredential')"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:loading="credentialsLoading"
				:disabled="disabled"
				:data-test-id="`${integrationType}-credential-select`"
				@update:model-value="emit('update:modelValue', $event)"
				@create="emit('create')"
			/>
			<N8nTooltip v-if="canEdit" :content="i18n.baseText('generic.edit')" placement="top">
				<N8nIconButton
					variant="ghost"
					size="large"
					icon-size="medium"
					icon="pen"
					:aria-label="i18n.baseText('agents.builder.addTrigger.editCredential')"
					:data-testid="`${integrationType}-edit-credential`"
					@click="emit('edit')"
				/>
			</N8nTooltip>
			<N8nButton
				v-if="showDisconnectButton"
				variant="destructive"
				:loading="loading"
				size="small"
				:data-testid="`${integrationType}-disconnect-button`"
				@click="emit('disconnect')"
			>
				<template #prefix><N8nIcon icon="unlink" size="xsmall" /></template>
				{{ i18n.baseText('agents.builder.addTrigger.disconnect') }}
			</N8nButton>
			<N8nButton
				v-if="showConnectButton"
				variant="solid"
				:disabled="connectDisabled"
				:loading="loading || publishing"
				size="small"
				:data-testid="`${integrationType}-connect-button`"
				@click="emit('connect')"
			>
				<template #prefix><N8nIcon icon="plug" size="xsmall" /></template>
				{{ i18n.baseText('agents.builder.addTrigger.connect') }}
			</N8nButton>
		</div>
		<N8nText v-if="errorMessage" :class="$style.errorText" size="small">
			{{ errorMessage }}
			<a
				v-if="modelValue && !errorIsConflict"
				:class="$style.link"
				href="#"
				@click.prevent="emit('edit')"
				>{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}</a
			>
		</N8nText>
	</div>
</template>

<style module lang="scss">
.connectForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.label {
	display: block;
}

.selectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.select {
	flex: 1;
	min-width: 0;
}

.connectedDescription {
	color: var(--color--text--tint-1);
}

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}
</style>
