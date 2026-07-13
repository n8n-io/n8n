<script lang="ts" setup>
import { useToast } from '@/app/composables/useToast';
import { provideWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';
import { useCredentialForm } from '@/features/credentials/composables/useCredentialForm';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiHandoff } from '../composables/useInstanceAiHandoff';
import { pingCredential } from '../instanceAi.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nButton, N8nInput, N8nInputLabel, N8nLink, N8nText } from '@n8n/design-system';
import { extractPlaceholderLabels } from '@n8n/utils/placeholder';
import { useI18n } from '@n8n/i18n';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	INodeParameters,
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
		/** With nodeName: enables the auth probe for types without a declarative
		 *  test — the server pings the persisted node's own URL after save. */
		workflowId?: string;
		nodeName?: string;
	}>(),
	{
		mode: 'new',
		showBack: false,
		credentialId: undefined,
		suggestedName: undefined,
		projectId: undefined,
		providerUrl: undefined,
		setupHint: undefined,
		workflowId: undefined,
		nodeName: undefined,
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
const rootStore = useRootStore();
// OAuth authorization stays with the host (popup lifecycle) — see useCredentialForm.
const { createAndAuthorize, authorize } = useCredentialOAuth();

// Shared credential-form controller — same one that drives the edit modal.
const {
	credentialData,
	credentialName,
	credentialId,
	authError,
	testedSuccessfully,
	isSaving,
	credentialType,
	mergedProperties,
	credentialProperties,
	requiredPropertiesFilled,
	isOAuthType,
	isCredentialTestable,
	initialize,
	onDataChange,
	testCredential,
} = useCredentialForm({
	mode: () => props.mode,
	activeId: () => (props.mode === 'edit' ? props.credentialId : props.credentialType),
	projectId: () => props.projectId,
	suggestedName: () => props.setupHint?.suggestedName || props.suggestedName,
});

const isLoading = ref(true);

const hasFields = computed(() => credentialProperties.value.length > 0);

const documentationUrl = computed(() => {
	const url = credentialType.value?.documentationUrl ?? '';
	return url.startsWith('http://') || url.startsWith('https://') ? url : '';
});

const primaryLabel = computed(() => {
	if (isOAuthType.value) return i18n.baseText('generic.connect');
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

// Full-view ghost text for templated fields: show the expected format
// (`Key <fal.ai API key>`) instead of a pre-filled value that would render as
// unreadable password dots.
const fullViewProperties = computed(() => {
	const templated = new Map(
		hintEntries.value
			.filter(([, value]) => extractPlaceholderLabels(value).length > 0)
			.map(([field, value]) => [
				field,
				value.replace(
					PLACEHOLDER_SENTINEL_REGEX,
					(sentinel) => `<${extractPlaceholderLabels(sentinel)[0] ?? '…'}>`,
				),
			]),
	);
	if (templated.size === 0) return credentialProperties.value;
	return credentialProperties.value.map((property) =>
		templated.has(property.name)
			? { ...property, placeholder: templated.get(property.name) }
			: property,
	);
});

/**
 * Write the hint's templated fields into credentialData, substituting secrets.
 * Pasted secrets are trimmed, and when the user pasted the template's literal
 * prefix too (e.g. fal.ai's dashboard copies `Key abc…`), it's stripped so the
 * composed value doesn't double it.
 */
function composeGuidedData() {
	for (const [field, template] of hintEntries.value) {
		credentialData.value[field] = template.replace(
			PLACEHOLDER_SENTINEL_REGEX,
			(sentinel, offset: number) => {
				const label = extractPlaceholderLabels(sentinel)[0];
				let secret = (secretValues.value[label] ?? '').trim();
				const prefix = template.slice(0, offset);
				if (prefix && secret.startsWith(prefix)) secret = secret.slice(prefix.length).trim();
				return secret;
			},
		);
	}
}

function onSecretInput(label: string, value: string) {
	secretValues.value[label] = value;
	authError.value = '';
}

function switchToAllFields() {
	// Carry composed values over only when complete — a half-composed template
	// ("Key " + empty secret) reads as unexplainable password dots in the full
	// view; the ghost placeholder communicates the format instead.
	if (canSubmit.value) composeGuidedData();
	showAllFields.value = true;
}

const canSubmit = computed(() => {
	if (isGuided.value) {
		return guidedSecrets.value.every((label) => (secretValues.value[label] ?? '').trim() !== '');
	}
	return requiredPropertiesFilled.value;
});

onMounted(async () => {
	try {
		await initialize();
		// Apply the hint's static values (no secret sentinel) up front, so they hold
		// even when the user switches to the full field set.
		for (const [field, value] of staticHintEntries.value) {
			credentialData.value[field] = value;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeCredentials.showMessage.title'));
	} finally {
		isLoading.value = false;
	}
});

function onUpdate(update: IUpdateInformation) {
	onDataChange(update);
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
		type: props.credentialType,
		data: (data ?? {}) as unknown as ICredentialDataDecryptedObject,
	};
}

async function submit() {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		if (isGuided.value) composeGuidedData();

		// Managed OAuth with nothing to fill in: create + authorize in one step.
		if (props.mode === 'new' && isOAuthType.value && !hasFields.value && !credentialId.value) {
			const credential = await createAndAuthorize(props.credentialType);
			if (credential) emit('saved', credential.id);
			return;
		}

		// Persist: update the credential we already created/opened, else create one.
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

		if (isOAuthType.value) {
			if (!(await authorize(credential))) return;
			emit('saved', credential.id);
			return;
		}

		// Test the connection when the type supports it; keep the form open on
		// failure so the user can fix a field and retry (the button becomes "Retry").
		if (isCredentialTestable.value) {
			await testCredential(buildDetails(credential.id));
			if (!testedSuccessfully.value) return;
		} else if (props.workflowId && props.nodeName) {
			// Types without a declarative test (generic auth): probe the persisted
			// node's own URL server-side. Only an explicit 401/403 blocks — an
			// unreachable service or a failing probe request never traps the save.
			try {
				const probe = await pingCredential(rootStore.restApiContext, {
					credentialId: credential.id,
					workflowId: props.workflowId,
					nodeName: props.nodeName,
					acceptedStatusCodes: props.setupHint?.acceptedStatusCodes,
				});
				if (probe.status === 'Error') {
					authError.value = probe.message;
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
		<template v-if="isGuided">
			<!-- Single secret: the card title already names the service, so a visible
			     label would repeat it — the label rides as placeholder + aria-label. -->
			<template v-for="label in guidedSecrets" :key="label">
				<N8nInputLabel
					v-if="guidedSecrets.length > 1"
					:label="label"
					:required="true"
					size="medium"
				>
					<N8nInput
						type="password"
						:model-value="secretValues[label] ?? ''"
						:placeholder="label"
						data-test-id="credential-hint-secret-input"
						@update:model-value="onSecretInput(label, String($event))"
					/>
				</N8nInputLabel>
				<N8nInput
					v-else
					type="password"
					:model-value="secretValues[label] ?? ''"
					:placeholder="label"
					:aria-label="label"
					data-test-id="credential-hint-secret-input"
					@update:model-value="onSecretInput(label, String($event))"
				/>
			</template>
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
			:credential-properties="fullViewProperties"
			:credential-data="credentialData"
			:documentation-url="documentationUrl"
			:show-focus-panel="false"
			show-field-help
			@update="onUpdate"
			@field-help="handleFieldHelp"
		/>
		<N8nLink
			v-if="showAllFields && guidedSecrets.length > 0"
			size="small"
			data-test-id="credential-hint-show-guided"
			@click="showAllFields = false"
		>
			{{ i18n.baseText('instanceAi.credential.hint.simpleView') }}
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

.hintLinks {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
</style>
