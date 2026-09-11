<script setup lang="ts">
import type { AgentWebIntegrationSettings } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import CopyInput from '@/app/components/CopyInput.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import type { AgentChannelViewProps } from '../types';
import { BASIC_AUTH_CREDENTIAL_TYPE, isWebIntegrationSettings } from './constants';

const props = defineProps<AgentChannelViewProps>();

const emit = defineEmits<{
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const saved = computed<AgentWebIntegrationSettings | undefined>(() =>
	isWebIntegrationSettings(props.savedSettings) ? props.savedSettings : undefined,
);

const defaultTitle = i18n.baseText('agents.chat.emptyState.title');
const accessMode = ref<AgentWebIntegrationSettings['accessMode']>(saved.value?.accessMode ?? 'public');
const title = ref(saved.value?.title ?? defaultTitle);
const basicAuthCredentialId = ref(saved.value?.basicAuthCredentialId ?? '');

watch(saved, (settings) => {
	if (!settings) return;
	accessMode.value = settings.accessMode;
	title.value = settings.title ?? defaultTitle;
	basicAuthCredentialId.value = settings.basicAuthCredentialId ?? '';
});

const currentSettings = computed<AgentWebIntegrationSettings>(() => ({
	accessMode: accessMode.value,
	title: title.value.trim() || defaultTitle,
	// The schema rejects a credential on any other mode, so it is dropped rather
	// than kept around for a mode the user has since moved away from.
	...(accessMode.value === 'basicAuth' && basicAuthCredentialId.value
		? { basicAuthCredentialId: basicAuthCredentialId.value }
		: {}),
}));

const validationError = computed<string | null>(() =>
	accessMode.value === 'basicAuth' && !basicAuthCredentialId.value
		? i18n.baseText('agents.channels.web.basicAuth.required')
		: null,
);

/** Only exists once the server has minted the channel's id on first save. */
const hostedUrl = computed(() =>
	props.savedIntegrationId
		? `${rootStore.urlBaseEditor.replace(/\/$/, '')}/web-agent/${props.savedIntegrationId}`
		: '',
);

const authenticationDescription = computed(() => {
	if (accessMode.value === 'basicAuth') {
		return i18n.baseText('agents.channels.web.authentication.basicAuth.description');
	}
	if (accessMode.value === 'n8nUserAuth') {
		return i18n.baseText('agents.channels.web.authentication.n8nUserAuth.description');
	}
	return i18n.baseText('agents.channels.web.authentication.none.description');
});

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.view">
		<div :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.channels.web.authentication.label') }}
			</N8nText>
			<N8nSelect
				v-model="accessMode"
				size="medium"
				:disabled="loading"
				data-testid="web-access-mode"
			>
				<N8nOption
					value="basicAuth"
					:label="i18n.baseText('agents.channels.web.authentication.basicAuth')"
				/>
				<N8nOption
					value="n8nUserAuth"
					:label="i18n.baseText('agents.channels.web.authentication.n8nUserAuth')"
				/>
				<N8nOption
					value="public"
					:label="i18n.baseText('agents.channels.web.authentication.none')"
				/>
			</N8nSelect>
			<N8nText size="small" color="text-light">{{ authenticationDescription }}</N8nText>
		</div>

		<N8nCallout v-if="accessMode === 'public'" theme="warning" slim data-testid="web-public-warning">
			{{ i18n.baseText('agents.channels.web.public.warning') }}
		</N8nCallout>

		<div v-if="accessMode === 'basicAuth'" :class="$style.field">
			<N8nText size="small" bold>
				{{ i18n.baseText('agents.channels.web.basicAuth.label') }}
			</N8nText>
			<CredentialPicker
				:app-name="integration.label"
				:credential-type="BASIC_AUTH_CREDENTIAL_TYPE"
				:selected-credential-id="basicAuthCredentialId || null"
				:project-id="projectId"
				hide-create-new
				:teleported="false"
				credential-modal-append-to-body
				@credential-selected="basicAuthCredentialId = $event"
				@credential-deselected="basicAuthCredentialId = ''"
			/>
			<N8nText v-if="validationError" :class="$style.error" size="small">
				{{ validationError }}
			</N8nText>
		</div>

		<div :class="$style.field">
			<N8nText size="small" bold>{{ i18n.baseText('agents.channels.web.title.label') }}</N8nText>
			<N8nInput
				v-model="title"
				size="medium"
				:disabled="loading"
				:placeholder="defaultTitle"
				data-testid="web-title"
			/>
		</div>

		<div v-if="hostedUrl" :class="$style.field">
			<CopyInput
				:label="i18n.baseText('agents.channels.web.hostedUrl.label')"
				:value="hostedUrl"
				:copy-button-text="i18n.baseText('agents.builder.addTrigger.copy')"
				:toast-title="i18n.baseText('agents.channels.web.hostedUrl.copied')"
				redact-value
				data-testid="web-hosted-url"
			/>
		</div>

		<N8nText v-else size="small" color="text-light" data-testid="web-url-pending">
			{{ i18n.baseText('agents.channels.web.hostedUrl.pending') }}
		</N8nText>

		<div v-if="mode === 'setup'" :class="$style.connectRow">
			<N8nButton
				variant="subtle"
				size="medium"
				:loading="loading"
				:disabled="loading || !!validationError"
				data-testid="web-connect-button"
				@click="emit('connect')"
			>
				{{ i18n.baseText('agents.builder.addTrigger.connect') }}
			</N8nButton>
			<N8nText v-if="errorMessage" :class="$style.error" size="small">{{ errorMessage }}</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.view,
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.view {
	gap: var(--spacing--sm);
}

.connectRow {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.error {
	color: var(--color--danger);
}
</style>
