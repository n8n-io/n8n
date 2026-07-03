<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { setParameterValue } from '@/app/utils/parameterUtils';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiHandoff } from '../composables/useInstanceAiHandoff';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { N8nButton, N8nInput, N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';
import { extractPlaceholderLabels } from '@n8n/utils/placeholder';
import { useI18n } from '@n8n/i18n';
import type {
	CredentialInformation,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INodeProperties,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

const props = withDefaults(
	defineProps<{
		credentialType: string;
		mode?: 'new' | 'edit';
		credentialId?: string;
		suggestedName?: string;
		projectId?: string;
		/** The service's API URL (e.g. the HTTP node's url), used to give the
		 *  "Help me get this" thread real provider context. */
		providerUrl?: string;
		/** Show a "Back" button (when the user can return to a credential selector). */
		showBack?: boolean;
		/** Agent-supplied recipe: pre-filled field values with placeholder sentinels
		 *  marking the secrets. Renders the guided ("paste your key") mode. */
		setupHint?: InstanceAiCredentialSetupHint;
	}>(),
	{
		mode: 'new',
		showBack: false,
		credentialId: undefined,
		suggestedName: undefined,
		projectId: undefined,
		providerUrl: undefined,
		setupHint: undefined,
	},
);

const emit = defineEmits<{
	saved: [credentialId: string];
	back: [];
}>();

// CredentialInputs renders ParameterInputExpanded, which injects the workflow
// document store. This form lives outside the workflow editor, so provide one —
// same reason CredentialEdit.vue provides it.
provideWorkflowDocumentStore();

const i18n = useI18n();
const toast = useToast();
const credentialsStore = useCredentialsStore();
const handoff = useInstanceAiHandoff();
const projectsStore = useProjectsStore();
const {
	isOAuthCredentialType,
	getManuallyConfigurableProperties,
	getMergedCredentialProperties,
	createAndAuthorize,
	authorize,
} = useCredentialOAuth();

const credentialData = ref<ICredentialDataDecryptedObject>({});
const credentialName = ref('');
const isLoading = ref(props.mode === 'edit');
const isSaving = ref(false);
const authError = ref('');
const testedSuccessfully = ref(false);
// Set once created (or from edit mode) so a retry updates instead of creating duplicates.
const savedCredentialId = ref(props.mode === 'edit' ? (props.credentialId ?? '') : '');

const credentialType = computed(() =>
	credentialsStore.getCredentialTypeByName(props.credentialType),
);

// Full field set (with defaults seeded) — the source for reactive visibility.
const mergedProperties = computed(() => getMergedCredentialProperties(props.credentialType));

// Fields the user must configure — decides whether we render inputs at all.
const configurableProperties = computed(() =>
	credentialType.value ? getManuallyConfigurableProperties(credentialType.value) : [],
);

// Fields to render right now, re-evaluated against the live values so
// displayOptions (e.g. picking "specific domains" reveals a domain list) toggle
// reactively — matching the credential edit modal.
const visibleProperties = computed(() =>
	mergedProperties.value.filter(
		(property) =>
			property.type !== 'hidden' &&
			NodeHelpers.displayParameter(credentialData.value, property, null, null),
	),
);

const hasFields = computed(() => configurableProperties.value.length > 0);
const isOAuth = computed(() => isOAuthCredentialType(props.credentialType));

const documentationUrl = computed(() => {
	const url = credentialType.value?.documentationUrl ?? '';
	return url.startsWith('http://') || url.startsWith('https://') ? url : '';
});

const primaryLabel = computed(() => {
	if (isOAuth.value) return i18n.baseText('generic.connect');
	return authError.value ? i18n.baseText('generic.retry') : i18n.baseText('generic.save');
});

// ── Guided mode (agent-supplied setup hint) ─────────────────────────────────
// The hint pre-fills the credential's fields, with `<__PLACEHOLDER_VALUE__…__>`
// sentinels marking the secrets. Guided mode renders one input per secret
// instead of the full field set; the composed values are written to
// credentialData on submit.
const PLACEHOLDER_SENTINEL_REGEX = /<__PLACEHOLDER.*?__>/g;

// Hint entries restricted to fields the credential type actually has.
const hintEntries = computed<Array<[string, string]>>(() => {
	if (props.mode !== 'new' || !props.setupHint?.prefill) return [];
	const knownFields = new Set(mergedProperties.value.map((property) => property.name));
	return Object.entries(props.setupHint.prefill).filter(([field]) => knownFields.has(field));
});

const guidedSecrets = computed(() => {
	const labels = new Set<string>();
	for (const [, template] of hintEntries.value) {
		for (const label of extractPlaceholderLabels(template)) labels.add(label);
	}
	return [...labels];
});

const staticHintEntries = computed(() =>
	hintEntries.value.filter(([, value]) => extractPlaceholderLabels(value).length === 0),
);

const secretValues = ref<Record<string, string>>({});
const showAllFields = ref(false);
const isGuided = computed(() => !showAllFields.value && guidedSecrets.value.length > 0);

const docsHost = computed(() => getUrlHost(props.setupHint?.docsUrl));

function fieldDisplayName(fieldName: string): string {
	return (
		mergedProperties.value.find((property) => property.name === fieldName)?.displayName ?? fieldName
	);
}

/** Write the hint's templated fields into credentialData, substituting secrets. */
function composeGuidedData() {
	for (const [field, template] of hintEntries.value) {
		credentialData.value[field] = template.replace(
			PLACEHOLDER_SENTINEL_REGEX,
			(sentinel) => secretValues.value[extractPlaceholderLabels(sentinel)[0]] ?? '',
		);
	}
}

function onSecretInput(label: string, value: string) {
	secretValues.value[label] = value;
	authError.value = '';
}

function switchToAllFields() {
	// Carry over what's typed so far so the full form starts from the composed state.
	composeGuidedData();
	showAllFields.value = true;
}

const canSubmit = computed(() => {
	if (isGuided.value) {
		return guidedSecrets.value.every((label) => (secretValues.value[label] ?? '').trim() !== '');
	}
	return visibleProperties.value.every((property) => {
		if (property.required !== true) return true;
		const value = credentialData.value[property.name];
		return value !== undefined && value !== null && value !== '';
	});
});

// Mirrors CredentialEdit.isCredentialTestable — temporary until the shared
// credential-form controller is extracted.
const isCredentialTestable = computed(() => {
	if (isOAuth.value || !canSubmit.value) return false;
	const testerNodes = credentialsStore
		.getNodesWithAccess(props.credentialType)
		.filter((node) => node.credentials?.some((c) => c.name === props.credentialType && c.testedBy));
	return testerNodes.length > 0 || !!credentialType.value?.test;
});

onMounted(async () => {
	if (props.mode === 'edit' && props.credentialId) {
		try {
			const current = await credentialsStore.getCredentialData({ id: props.credentialId });
			credentialName.value = current?.name ?? '';
			credentialData.value = (current?.data ?? {}) as ICredentialDataDecryptedObject;
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeCredentials.showMessage.title'));
		} finally {
			isLoading.value = false;
		}
		return;
	}

	credentialName.value =
		props.setupHint?.suggestedName ||
		props.suggestedName ||
		credentialType.value?.displayName ||
		props.credentialType;
	const defaults: ICredentialDataDecryptedObject = {};
	for (const property of mergedProperties.value) {
		defaults[property.name] = property.default as CredentialInformation;
	}
	// Apply the hint's static values (no secret sentinel) up front, so they hold
	// even when the user switches to the full field set.
	for (const [field, value] of staticHintEntries.value) {
		defaults[field] = value;
	}
	credentialData.value = defaults;
});

function onUpdate(update: IUpdateInformation) {
	setParameterValue(credentialData.value, update.name, update.value);
	authError.value = ''; // clear a stale test error once the user edits a field
}

function getUrlHost(url?: string): string | undefined {
	if (!url || !/^https?:\/\//.test(url)) return undefined;
	try {
		return new URL(url).host;
	} catch {
		return undefined;
	}
}

// Field semantics for n8n's generic HTTP-auth credentials — e.g. Header Auth's
// "Name" is the header key (Authorization), not a display label — so the
// "Help me get this" thread doesn't misread the field.
function genericAuthFieldHint(type: string): string {
	switch (type) {
		case 'httpHeaderAuth':
			return 'Its "Name" field is the HTTP header name (e.g. `Authorization`, `X-API-Key`) and "Value" is that header\'s value (e.g. the API key, or `Bearer <token>`).';
		case 'httpQueryAuth':
			return 'Its "Name" field is the query-string parameter name and "Value" is that parameter\'s value.';
		case 'httpBearerAuth':
			return 'Its token is sent as the `Authorization: Bearer <token>` header.';
		case 'httpBasicAuth':
			return 'It sends HTTP Basic authentication with a username and password.';
		default:
			return '';
	}
}

// "Help me get this": open a separate Instance AI thread (new tab) pre-filled
// with a prompt to help the user obtain this field's value for the provider.
function handleFieldHelp(parameter: INodeProperties) {
	const projectId = props.projectId ?? projectsStore.currentProject?.id;
	if (!projectId) return;

	const typeName = credentialType.value?.displayName ?? props.credentialType;
	const host = getUrlHost(props.providerUrl);
	const target = host
		? ` used to authenticate requests to ${host}${props.providerUrl ? ` (${props.providerUrl})` : ''}`
		: '';
	// Generic HTTP auth types (httpHeaderAuth/Bearer/Query/Basic/…) — name the type
	// and its field semantics so the agent answers for the credential's own fields
	// instead of hunting for a dedicated integration (e.g. reading the header "Name"
	// field as a display label).
	const fieldHint = genericAuthFieldHint(props.credentialType);
	const genericNote = props.credentialType.startsWith('http')
		? ` This is n8n's generic "${typeName}" credential (\`${props.credentialType}\`), not a dedicated integration.` +
			(fieldHint ? ` ${fieldHint}` : '') +
			` Answer for its "${parameter.displayName}" field specifically.`
		: '';
	const prompt =
		`I'm filling in the "${parameter.displayName}" field of an n8n "${typeName}" credential${target}.` +
		`${genericNote} What value should it be, and where do I get it? Please give me the value to paste.`;

	void handoff.startThread(projectId, prompt, undefined, undefined, { newTab: true });
}

function buildDetails(id = ''): ICredentialsDecrypted {
	return {
		id,
		name: credentialName.value,
		type: props.credentialType,
		data: credentialData.value,
	};
}

async function runTest(id: string) {
	const result = await credentialsStore.testCredential(buildDetails(id));
	if (result.status === 'Error') {
		authError.value = result.message;
		testedSuccessfully.value = false;
	} else {
		authError.value = '';
		testedSuccessfully.value = true;
	}
}

async function submit() {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		if (isGuided.value) composeGuidedData();

		// Managed OAuth with nothing to fill in: create + authorize in one step.
		if (props.mode === 'new' && isOAuth.value && !hasFields.value && !savedCredentialId.value) {
			const credential = await createAndAuthorize(props.credentialType);
			if (credential) emit('saved', credential.id);
			return;
		}

		// Persist: update the credential we already created/opened, else create one.
		const credential = savedCredentialId.value
			? await credentialsStore.updateCredential({
					id: savedCredentialId.value,
					data: buildDetails(savedCredentialId.value),
				})
			: await credentialsStore.createNewCredential(
					buildDetails(),
					props.projectId ?? projectsStore.currentProject?.id,
				);
		savedCredentialId.value = credential.id;

		if (isOAuth.value) {
			if (!(await authorize(credential))) return;
			emit('saved', credential.id);
			return;
		}

		// Test the connection when the type supports it; keep the form open on
		// failure so the user can fix a field and retry (the button becomes "Retry").
		if (isCredentialTestable.value) {
			await runTest(credential.id);
			if (!testedSuccessfully.value) return;
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
		<template v-if="isGuided">
			<div v-if="staticHintEntries.length > 0" :class="$style.staticFields">
				<N8nText
					v-for="[field, value] in staticHintEntries"
					:key="field"
					color="text-light"
					size="small"
					data-test-id="credential-hint-static-field"
				>
					{{ fieldDisplayName(field) }}: {{ value }}
				</N8nText>
			</div>
			<N8nInputLabel
				v-for="label in guidedSecrets"
				:key="label"
				:label="label"
				:required="true"
				size="medium"
			>
				<N8nInput
					type="password"
					:model-value="secretValues[label] ?? ''"
					data-test-id="credential-hint-secret-input"
					@update:model-value="onSecretInput(label, String($event))"
				/>
			</N8nInputLabel>
			<div :class="$style.hintLinks">
				<N8nLink
					v-if="setupHint?.docsUrl"
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
				<N8nLink size="small" data-test-id="credential-hint-show-all" @click="switchToAllFields">
					{{ i18n.baseText('instanceAi.credential.hint.showAllFields') }}
				</N8nLink>
			</div>
		</template>
		<CredentialInputs
			v-else-if="hasFields"
			:credential-properties="visibleProperties"
			:credential-data="credentialData"
			:documentation-url="documentationUrl"
			:show-focus-panel="false"
			show-field-help
			@update="onUpdate"
			@field-help="handleFieldHelp"
		/>
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
				:label="primaryLabel"
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

.staticFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.hintLinks {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
</style>
