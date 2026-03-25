<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { GenericValue } from 'n8n-workflow';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialSetupRecipeStore } from '../stores/credentialSetupRecipe.store';

const props = defineProps<{
	credentialTypeName: string;
	credentialDisplayName: string;
	bootstrapField: string;
	bootstrapFieldLabel: string;
}>();

const emit = defineEmits<{
	success: [credential: ICredentialsResponse];
	failure: [];
	'manual-fallback': [step: string];
	'update:credential-data': [data: Record<string, unknown>];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const recipeStore = useCredentialSetupRecipeStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const { authorize } = useCredentialOAuth();

type Status = 'idle' | 'connecting' | 'success' | 'error';

const status = ref<Status>('idle');
const bootstrapValue = ref('');
const pendingCredentialId = ref<string | null>(null);
const oauthAbortController = ref<AbortController | null>(null);
const connectStartTime = ref<number | null>(null);

watch(bootstrapValue, (value) => {
	emit('update:credential-data', { [props.bootstrapField]: value });
});

async function onConnectClick(): Promise<void> {
	recipeStore.trackRecipeEvent('credential_setup_recipe_cta_clicked', props.credentialTypeName);

	connectStartTime.value = Date.now();
	status.value = 'connecting';

	// Step 3: Create credential with bootstrap field data
	let credential: ICredentialsResponse;
	try {
		credential = await credentialsStore.createNewCredential(
			{
				id: '',
				name: props.credentialDisplayName,
				type: props.credentialTypeName,
				data: {
					[props.bootstrapField]: bootstrapValue.value,
					allowedHttpRequestDomains: 'none',
				},
			},
			projectsStore.currentProject?.id,
			undefined,
			{ skipStoreUpdate: true },
		);

		// Step 4: Track credential creation telemetry
		telemetry.track('User created credentials', {
			credential_type: credential.type,
			credential_id: credential.id,
			workflow_id: workflowsStore.workflowId,
		});
	} catch {
		recipeStore.trackRecipeEvent('credential_setup_recipe_failed', props.credentialTypeName, {
			error_type: 'create_failed',
		});
		status.value = 'error';
		emit('failure');
		return;
	}

	// Step 5: Store pending credential and create abort controller
	const controller = new AbortController();
	oauthAbortController.value = controller;
	pendingCredentialId.value = credential.id;

	// Step 6: Run OAuth authorization
	const success = await authorize(credential, controller.signal);

	// Step 7: IMMEDIATELY clear pending state (before checking outcome)
	pendingCredentialId.value = null;
	oauthAbortController.value = null;

	// Step 8: If aborted (unmount happened), return early — unmount handler already cleaned up
	if (controller.signal.aborted) {
		return;
	}

	// Track 'User saved credentials' for both success and failure
	const trackProperties: Record<string, GenericValue> = {
		credential_type: props.credentialTypeName,
		credential_id: credential.id,
		workflow_id: workflowsStore.workflowId ?? null,
		is_valid: success,
		is_complete: true,
		is_new: true,
		uses_external_secrets: false,
	};
	telemetry.track('User saved credentials', trackProperties);

	if (success) {
		// Step 9: Success — upsert credential into store
		credentialsStore.upsertCredential(credential);

		const timeToSuccessMs =
			connectStartTime.value !== null ? Date.now() - connectStartTime.value : 0;
		recipeStore.trackRecipeEvent('credential_setup_recipe_completed', props.credentialTypeName, {
			time_to_success_ms: timeToSuccessMs,
			used_manual_fallback: false,
		});

		status.value = 'success';
		emit('success', credential);
	} else {
		// Step 10: Failure — delete the pending credential
		void credentialsStore.deleteCredential({ id: credential.id });

		recipeStore.trackRecipeEvent('credential_setup_recipe_failed', props.credentialTypeName, {
			error_type: 'oauth_failed',
		});

		status.value = 'error';
		emit('failure');
	}
}

function onManualFallbackClick(): void {
	emit('manual-fallback', status.value);
}

// Step 11: On unmount — abort and clean up pending credential
onUnmounted(() => {
	if (pendingCredentialId.value !== null) {
		oauthAbortController.value?.abort();
		void credentialsStore.deleteCredential({ id: pendingCredentialId.value });
	}
});
</script>

<template>
	<div :class="$style.container">
		<!-- idle state -->
		<template v-if="status === 'idle'">
			<N8nInputLabel :label="bootstrapFieldLabel" :class="$style.fieldWrapper">
				<N8nInput
					v-model="bootstrapValue"
					size="large"
					data-test-id="tenant-oauth-bootstrap-field"
				/>
			</N8nInputLabel>
			<N8nButton
				type="primary"
				size="large"
				:label="i18n.baseText('credentialSetupRecipe.tenantOAuth.connectAccount')"
				:disabled="bootstrapValue.trim().length === 0"
				data-test-id="tenant-oauth-connect-button"
				@click="onConnectClick"
			/>
			<N8nText
				tag="a"
				size="small"
				:class="$style.manualFallbackLink"
				data-test-id="tenant-oauth-manual-fallback-link"
				@click="onManualFallbackClick"
			>
				{{ i18n.baseText('credentialSetupRecipe.setupManually') }}
			</N8nText>
		</template>

		<!-- connecting state -->
		<template v-else-if="status === 'connecting'">
			<N8nInputLabel :label="bootstrapFieldLabel" :class="$style.fieldWrapper">
				<N8nInput
					:model-value="bootstrapValue"
					size="large"
					disabled
					data-test-id="tenant-oauth-bootstrap-field-disabled"
				/>
			</N8nInputLabel>
			<N8nButton
				type="primary"
				size="large"
				:label="i18n.baseText('credentialSetupRecipe.tenantOAuth.connecting')"
				:loading="true"
				disabled
				data-test-id="tenant-oauth-connecting-button"
			/>
		</template>

		<!-- success state -->
		<template v-else-if="status === 'success'">
			<N8nText size="medium" color="success" data-test-id="tenant-oauth-success-message">
				{{ i18n.baseText('credentialSetupRecipe.tenantOAuth.success') }}
			</N8nText>
		</template>

		<!-- error state -->
		<template v-else-if="status === 'error'">
			<N8nText
				size="small"
				color="danger"
				:class="$style.errorMessage"
				data-test-id="tenant-oauth-error-message"
			>
				{{ i18n.baseText('credentialSetupRecipe.tenantOAuth.error') }}
			</N8nText>
			<N8nInputLabel :label="bootstrapFieldLabel" :class="$style.fieldWrapper">
				<N8nInput
					v-model="bootstrapValue"
					size="large"
					data-test-id="tenant-oauth-bootstrap-field-retry"
				/>
			</N8nInputLabel>
			<N8nButton
				type="primary"
				size="large"
				:label="i18n.baseText('credentialSetupRecipe.tenantOAuth.tryAgain')"
				:disabled="bootstrapValue.trim().length === 0"
				data-test-id="tenant-oauth-try-again-button"
				@click="onConnectClick"
			/>
			<N8nText
				tag="a"
				size="small"
				:class="$style.manualFallbackLink"
				data-test-id="tenant-oauth-manual-fallback-link-error"
				@click="onManualFallbackClick"
			>
				{{ i18n.baseText('credentialSetupRecipe.setupManually') }}
			</N8nText>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.fieldWrapper {
	width: 100%;
}

.manualFallbackLink {
	cursor: pointer;
	color: var(--color--text--tint-1);
	text-decoration: underline;

	&:hover {
		color: var(--color--text);
	}
}

.errorMessage {
	margin-bottom: var(--spacing--4xs);
}
</style>
