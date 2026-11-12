<script setup lang="ts">
import {
	AGENT_WEBHOOK_AUTHENTICATIONS,
	type AgentWebhookAuthentication,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';

import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';

const authentication = defineModel<AgentWebhookAuthentication>('authentication', {
	required: true,
});
const credentialId = defineModel<string>({ default: '' });

defineProps<{
	integration: ChatIntegrationDescriptor;
	/** Only the credentials of the selected authentication. */
	credentials: AgentCredentialOption[];
	credentialPermissions: PermissionsRecord['credential'];
	credentialsLoading: boolean;
	loading: boolean;
	errorMessage: string;
	errorIsConflict: boolean;
	forceNewCredential: boolean;
}>();

const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const i18n = useI18n();

const AUTHENTICATION_LABELS: Record<AgentWebhookAuthentication, BaseTextKey> = {
	none: 'agents.channels.webhook.authentication.none',
	headerAuth: 'agents.channels.webhook.authentication.headerAuth',
	jwtAuth: 'agents.channels.webhook.authentication.jwtAuth',
};
</script>

<template>
	<div :class="$style.auth">
		<div :class="$style.field">
			<label for="webhook-authentication">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.webhook.authentication.label') }}
				</N8nText>
			</label>
			<N8nSelect
				id="webhook-authentication"
				v-model="authentication"
				size="medium"
				:disabled="loading"
				:teleported="false"
				data-testid="webhook-authentication"
			>
				<N8nOption
					v-for="option in AGENT_WEBHOOK_AUTHENTICATIONS"
					:key="option"
					:value="option"
					:label="i18n.baseText(AUTHENTICATION_LABELS[option])"
				/>
			</N8nSelect>
			<N8nText
				v-if="authentication === 'none'"
				size="small"
				:class="$style.hint"
				data-testid="webhook-public-notice"
			>
				{{ i18n.baseText('agents.channels.webhook.authentication.noneNotice') }}
			</N8nText>
		</div>
		<AgentIntegrationCredentialConnection
			v-if="authentication !== 'none'"
			v-model="credentialId"
			:integration-type="integration.type"
			:integration-label="integration.label"
			:credentials="credentials"
			:credential-permissions="credentialPermissions"
			:credentials-loading="credentialsLoading"
			:disabled="loading"
			:loading="loading"
			:error-message="errorMessage"
			:error-is-conflict="errorIsConflict"
			:force-new-credential="forceNewCredential"
			compact-label
			@create="emit('create')"
			@edit="emit('edit')"
		/>
	</div>
</template>

<style module lang="scss">
.auth {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hint {
	color: var(--text-color--subtler);
}
</style>
