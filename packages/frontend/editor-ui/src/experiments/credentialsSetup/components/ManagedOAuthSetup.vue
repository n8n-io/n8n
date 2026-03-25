<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialSetupRecipeStore } from '../stores/credentialSetupRecipe.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

const props = defineProps<{
	credentialTypeName: string;
	credentialDisplayName: string;
}>();

const emit = defineEmits<{
	success: [credential: ICredentialsResponse];
	failure: [];
	'manual-fallback': [step: string];
}>();

const i18n = useI18n();
const recipeStore = useCredentialSetupRecipeStore();
const { createAndAuthorize, cancelAuthorize } = useCredentialOAuth();

type Status = 'idle' | 'connecting' | 'success' | 'error';

const status = ref<Status>('idle');
const connectStartTime = ref<number | null>(null);

async function onConnectClick(): Promise<void> {
	recipeStore.trackRecipeEvent('credential_setup_recipe_cta_clicked', props.credentialTypeName);

	connectStartTime.value = Date.now();
	status.value = 'connecting';

	const credential = await createAndAuthorize(props.credentialTypeName);

	if (credential !== null) {
		const timeToSuccessMs =
			connectStartTime.value !== null ? Date.now() - connectStartTime.value : 0;
		recipeStore.trackRecipeEvent('credential_setup_recipe_completed', props.credentialTypeName, {
			time_to_success_ms: timeToSuccessMs,
			used_manual_fallback: false,
		});
		status.value = 'success';
		emit('success', credential);
	} else {
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

onUnmounted(() => {
	if (status.value === 'connecting') {
		cancelAuthorize();
	}
});
</script>

<template>
	<div :class="$style.container">
		<!-- idle state -->
		<template v-if="status === 'idle'">
			<N8nButton
				type="primary"
				size="large"
				:label="
					i18n.baseText('credentialSetupRecipe.managedOAuth.connectAccount', {
						interpolate: { displayName: credentialDisplayName },
					})
				"
				data-test-id="managed-oauth-connect-button"
				@click="onConnectClick"
			/>
			<N8nText
				tag="a"
				size="small"
				:class="$style.manualFallbackLink"
				data-test-id="managed-oauth-manual-fallback-link"
				@click="onManualFallbackClick"
			>
				{{ i18n.baseText('credentialSetupRecipe.setupManually') }}
			</N8nText>
		</template>

		<!-- connecting state -->
		<template v-else-if="status === 'connecting'">
			<N8nButton
				type="primary"
				size="large"
				:label="i18n.baseText('credentialSetupRecipe.managedOAuth.connecting')"
				:loading="true"
				disabled
				data-test-id="managed-oauth-connecting-button"
			/>
		</template>

		<!-- success state -->
		<template v-else-if="status === 'success'">
			<N8nText size="medium" color="success" data-test-id="managed-oauth-success-message">
				{{ i18n.baseText('credentialSetupRecipe.managedOAuth.success') }}
			</N8nText>
		</template>

		<!-- error state -->
		<template v-else-if="status === 'error'">
			<N8nText
				size="small"
				color="danger"
				:class="$style.errorMessage"
				data-test-id="managed-oauth-error-message"
			>
				{{ i18n.baseText('credentialSetupRecipe.managedOAuth.error') }}
			</N8nText>
			<N8nButton
				type="primary"
				size="large"
				:label="i18n.baseText('credentialSetupRecipe.managedOAuth.tryAgain')"
				data-test-id="managed-oauth-try-again-button"
				@click="onConnectClick"
			/>
			<N8nText
				tag="a"
				size="small"
				:class="$style.manualFallbackLink"
				data-test-id="managed-oauth-manual-fallback-link-error"
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
