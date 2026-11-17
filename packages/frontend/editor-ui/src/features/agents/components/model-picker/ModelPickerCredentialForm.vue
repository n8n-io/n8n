<script setup lang="ts">
/**
 * Creates a credential for one model provider inside the model picker, with no
 * second dialog. Follows the inline setup of Instance AI: save, then test, and
 * remove the credential again when the test fails.
 */
import { N8nCallout, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { deepCopy, type ICredentialDataDecryptedObject } from 'n8n-workflow';
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue';

import type { IUpdateInformation } from '@/Interface';
import { BUILTIN_CREDENTIALS_DOCS_URL } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { useCredentialForm } from '@/features/credentials/composables/useCredentialForm';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

import { getProviderCredentialTypes, type AgentModelProvider } from '../../model-providers';

const props = withDefaults(
	defineProps<{
		provider: AgentModelProvider;
		/** Test the key with the provider before keeping the credential. */
		checkKey?: boolean;
	}>(),
	{ checkKey: true },
);

const emit = defineEmits<{
	created: [credential: ICredentialsResponse];
}>();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const { check: envFeatureFlag } = useEnvFeatureFlag();
const nameId = useId();

const credentialType = getProviderCredentialTypes(props.provider)[0];

const form = useCredentialForm({ mode: 'new', activeId: credentialType });

const ready = ref(false);
const errorCallout = useTemplateRef('errorCallout');

// The form scrolls, so a failed test would show below the fold.
watch(
	() => form.authError.value,
	async (error) => {
		if (!error) return;
		await nextTick();
		errorCallout.value?.$el?.scrollIntoView?.({ block: 'nearest' });
	},
);

const properties = computed(() =>
	form.credentialProperties.value.filter(
		(property) => !property.envFeatureFlag || envFeatureFlag.value(property.envFeatureFlag),
	),
);

const documentationUrl = computed(() => {
	const url = form.credentialType.value?.documentationUrl;
	if (!url) return '';
	return /^https?:\/\//.test(url) ? url : `${BUILTIN_CREDENTIALS_DOCS_URL}${url}/`;
});

function onDataChange(update: IUpdateInformation) {
	form.onDataChange(update);
}

function formData(): ICredentialDataDecryptedObject {
	const data = { ...form.credentialData.value };
	delete data.homeProject;
	delete data.sharedWithProjects;
	return data;
}

/** Saves and tests the credential. Emits `created` when it works. */
async function save() {
	if (form.isSaving.value) return;
	form.showValidationWarning.value = true;
	if (!form.requiredPropertiesFilled.value) return;

	form.isSaving.value = true;
	form.authError.value = '';
	try {
		const details = {
			id: '',
			name: form.credentialName.value,
			type: credentialType,
			data: deepCopy(formData()),
		};
		const credential = await credentialsStore.createNewCredential(
			details,
			form.homeProject.value?.id,
			undefined,
			{ skipStoreUpdate: true },
		);
		telemetry.track('User created credentials', {
			credential_type: credential.type,
			credential_id: credential.id,
		});
		if (props.checkKey && form.isCredentialTestable.value) {
			await form.testCredential({ ...details, id: credential.id });
			if (!form.testedSuccessfully.value) {
				// The test result shows in the form. Nothing that fails its test is kept.
				await credentialsStore.deleteCredential({ id: credential.id });
				return;
			}
		}
		credentialsStore.upsertCredential(credential);
		emit('created', credential);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
		);
	} finally {
		form.isSaving.value = false;
	}
}

onMounted(async () => {
	uiStore.activeCredentialType = credentialType;
	try {
		await form.initialize();
	} finally {
		ready.value = true;
	}
});

defineExpose({ save, isSaving: form.isSaving });
</script>

<template>
	<form
		:class="$style.form"
		data-testid="agent-model-picker-credential-form"
		@submit.prevent="save"
	>
		<N8nInputLabel :label="i18n.baseText('generic.name')" :for="nameId">
			<N8nInput
				:id="nameId"
				v-model="form.credentialName.value"
				:disabled="!ready"
				data-testid="agent-model-picker-credential-name"
			/>
		</N8nInputLabel>
		<CredentialInputs
			:credential-type="credentialType"
			:credential-properties="properties"
			:credential-data="form.credentialData.value"
			:documentation-url="documentationUrl"
			:show-validation-warnings="form.showValidationWarning.value"
			@update="onDataChange"
		/>
		<N8nCallout v-if="form.authError.value" ref="errorCallout" theme="danger">
			{{ form.authError.value }}
		</N8nCallout>
		<!-- Enter in a field saves, like the Save button in the footer. -->
		<button type="submit" hidden />
	</form>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
