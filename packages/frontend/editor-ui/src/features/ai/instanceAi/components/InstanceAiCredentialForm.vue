<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { probeCredential } from '@/features/credentials/credentials.api';
import { cleanPlaceholderValue } from '@/features/credentials/templatedAuth.utils';
import { useCredentialForm } from '@/features/credentials/composables/useCredentialForm';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	type InstanceAiCredentialSetupHint,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nButton, N8nInput, N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ICredentialsDecrypted, INodeParameters } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

/**
 * Guided creation form for a Templated Custom Auth credential from an
 * agent-supplied recipe: one input per placeholder, composed into the
 * credential's template fields on save. Everything beyond this guided view —
 * editing, the full field set — lives in the regular credential modal.
 */
const props = withDefaults(
	defineProps<{
		/** Agent-supplied recipe; drives the inputs and seeds the template fields. */
		setupHint: InstanceAiCredentialSetupHint;
		suggestedName?: string;
		projectId?: string;
		/** Show a "Back" button (when the user can return to a credential selector). */
		showBack?: boolean;
	}>(),
	{
		suggestedName: undefined,
		projectId: undefined,
		showBack: false,
	},
);

const emit = defineEmits<{
	saved: [credentialId: string];
	back: [];
}>();

// The form lives outside the workflow editor; credential-form internals inject
// the workflow document store — same reason CredentialEdit.vue provides it.
provideWorkflowDocumentStore();

const i18n = useI18n();
const toast = useToast();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const rootStore = useRootStore();

// Shared credential-form controller — same one that drives the edit modal.
const {
	credentialData,
	credentialName,
	credentialId,
	authError,
	isSaving,
	credentialType,
	initialize,
} = useCredentialForm({
	mode: () => 'new',
	activeId: () => TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	projectId: () => props.projectId,
	suggestedName: () => props.setupHint.suggestedName || props.suggestedName,
});

const isLoading = ref(true);

const placeholderDefs = computed(() => props.setupHint.placeholders);

const placeholderValues = ref<Record<string, string>>({});

const docsHost = computed(() => {
	const url = props.setupHint.docsUrl;
	if (!url || !/^https?:\/\//.test(url)) return undefined;
	try {
		return new URL(url).host;
	} catch {
		return undefined;
	}
});

/**
 * Compose the user-provided placeholder values into the credential's
 * `placeholderValues` field. Pasted values are trimmed, and when the user
 * pasted the template's literal prefix too (e.g. fal.ai's dashboard copies
 * `Key abc…`), it's stripped so the resolved value doesn't double it.
 */
function composeGuidedData() {
	const values: Record<string, string> = {};
	for (const def of placeholderDefs.value) {
		values[def.name] = cleanPlaceholderValue(
			props.setupHint.template,
			def.name,
			placeholderValues.value[def.name] ?? '',
		);
	}
	credentialData.value.placeholderValues = JSON.stringify(values, null, 2);
}

function onPlaceholderInput(name: string, value: string) {
	placeholderValues.value[name] = value;
	authError.value = '';
}

const canSubmit = computed(() =>
	placeholderDefs.value.every((def) => (placeholderValues.value[def.name] ?? '').trim() !== ''),
);

onMounted(async () => {
	try {
		await initialize();
		// Seed the recipe's static fields; the guided inputs only collect values.
		credentialData.value.template = JSON.stringify(props.setupHint.template, null, 2);
		credentialData.value.placeholderDefs = JSON.stringify(props.setupHint.placeholders, null, 2);
		if (props.setupHint.testUrl) credentialData.value.testUrl = props.setupHint.testUrl;
		if (props.setupHint.iconUrl) credentialData.value.iconUrl = props.setupHint.iconUrl;
		if (props.setupHint.acceptedStatusCodes?.length) {
			credentialData.value.acceptedStatusCodes = JSON.stringify(
				props.setupHint.acceptedStatusCodes,
			);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeCredentials.showMessage.title'));
	} finally {
		isLoading.value = false;
	}
});

function buildDetails(id = ''): ICredentialsDecrypted {
	// Save only the non-default property values — same filtering as the edit
	// modal; also drops the non-property keys initialize() seeds (homeProject…).
	const data = credentialType.value
		? NodeHelpers.getNodeParameters(
				credentialType.value.properties,
				credentialData.value as INodeParameters,
				false,
				false,
				null,
				null,
			)
		: credentialData.value;
	return {
		id,
		name: credentialName.value,
		type: TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
		data: (data ?? {}) as ICredentialsDecrypted['data'],
	};
}

async function submit() {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		composeGuidedData();

		// Persist: update the credential we already created, else create one.
		const credential = credentialId.value
			? await credentialsStore.updateCredential({
					id: credentialId.value,
					data: buildDetails(credentialId.value),
				})
			: await credentialsStore.createNewCredential(
					buildDetails(),
					props.projectId ?? projectsStore.currentProject?.id,
				);
		credentialId.value = credential.id;

		if (props.setupHint.testUrl) {
			// Probe the test URL persisted in the credential server-side. Only an
			// explicit 401/403 blocks — an unreachable service or a failing probe
			// request never traps the save.
			try {
				const probe = await probeCredential(rootStore.restApiContext, credential.id);
				if (probe.status === 'Error') {
					authError.value = probe.message ?? '';
					return;
				}
				authError.value = '';
			} catch {
				// Probe endpoint unavailable — inconclusive, proceed with the save.
			}
		}

		emit('saved', credential.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeCredentials.showMessage.title'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<div v-if="!isLoading" :class="$style.form" data-test-id="instance-ai-credential-form">
		<!-- Single secret: the card title already names the service, so a visible
		     label would repeat it — the label rides as placeholder + aria-label. -->
		<template v-for="def in placeholderDefs" :key="def.name">
			<N8nInputLabel
				v-if="placeholderDefs.length > 1 || def.info"
				:label="def.title"
				:tooltip-text="def.info"
				:required="true"
				size="medium"
			>
				<N8nInput
					:type="def.type === 'plain' ? 'text' : 'password'"
					:model-value="placeholderValues[def.name] ?? ''"
					:placeholder="def.title"
					data-test-id="credential-hint-secret-input"
					@update:model-value="onPlaceholderInput(def.name, String($event))"
				/>
			</N8nInputLabel>
			<N8nInput
				v-else
				:type="def.type === 'plain' ? 'text' : 'password'"
				:model-value="placeholderValues[def.name] ?? ''"
				:placeholder="def.title"
				:aria-label="def.title"
				data-test-id="credential-hint-secret-input"
				@update:model-value="onPlaceholderInput(def.name, String($event))"
			/>
		</template>
		<N8nLink
			v-if="setupHint.docsUrl"
			:to="setupHint.docsUrl"
			new-window
			size="small"
			data-test-id="credential-hint-docs-link"
		>
			{{
				i18n.baseText('instanceAi.credential.hint.docsLink', {
					interpolate: { host: docsHost ?? setupHint.docsUrl },
				})
			}}
		</N8nLink>
		<N8nText v-if="authError" color="danger" size="small" data-test-id="credential-test-error">
			{{ authError }}
		</N8nText>
		<div :class="$style.actions">
			<N8nButton
				v-if="showBack"
				variant="outline"
				size="medium"
				:label="i18n.baseText('generic.back')"
				:disabled="isSaving"
				@click="emit('back')"
			/>
			<N8nButton
				size="medium"
				:label="authError ? i18n.baseText('generic.retry') : i18n.baseText('generic.save')"
				:loading="isSaving"
				:disabled="!canSubmit"
				data-test-id="instance-ai-credential-form-submit"
				@click="submit"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
