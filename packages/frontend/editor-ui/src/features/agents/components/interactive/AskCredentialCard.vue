<script setup lang="ts">
/**
 * Card for the `ask_credential` / `ask_embedding_credential` builder tools.
 * Reuses the same building blocks as `InstanceAiCredentialSetup.vue`
 * (`CredentialIcon`, `NodeCredentials`, `useWizardNavigation`) since both
 * surfaces suspend with the identical `credentialSuspendPayloadSchema`
 * shape — only the resume transport differs: this card posts to
 * `POST /build/resume` (via the `submit` emit) instead of instance AI's own
 * confirm endpoint, and skips the browser-auto-setup extras that are
 * specific to instance AI.
 */
import { computed, provide, ref, watch } from 'vue';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { CredentialResumeData, InstanceAiCredentialRequest } from '@n8n/api-types';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { ChatHubToolContextKey } from '@/app/constants';
import type { CredentialResolvedValue } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	disabled?: boolean;
	resolvedValue?: CredentialResolvedValue;
}>();

const emit = defineEmits<{
	submit: [resumeData: CredentialResumeData];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();

provide(ChatHubToolContextKey, true);

const totalSteps = computed(() => props.credentialRequests.length);
const { currentStepIndex, isPrevDisabled, isNextDisabled, goToNext, goToPrev, goToStep } =
	useWizardNavigation({ totalSteps });

const currentRequest = computed(() => props.credentialRequests[currentStepIndex.value]);
const showArrows = computed(() => props.credentialRequests.length > 1);

const submitted = ref(false);
const selections = ref<Record<string, string | null>>({});

for (const req of props.credentialRequests) {
	selections.value[req.credentialType] =
		req.existingCredentials.length === 1 ? req.existingCredentials[0].id : null;
}

function isStepComplete(credentialType: string): boolean {
	return selections.value[credentialType] !== null;
}

const allSelected = computed(() =>
	props.credentialRequests.every((r) => isStepComplete(r.credentialType)),
);

function getDisplayName(credentialType: string): string {
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
	return getAppNameFromCredType(raw);
}

function syntheticNodeUi(req: InstanceAiCredentialRequest): INodeUi {
	const selectedId = selections.value[req.credentialType];
	const selectedCred = selectedId
		? (req.existingCredentials.find((c) => c.id === selectedId) ??
			credentialsStore.getCredentialById(selectedId))
		: undefined;
	return {
		id: req.credentialType,
		name: req.credentialType,
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: selectedCred
			? { [req.credentialType]: { id: selectedCred.id, name: selectedCred.name } }
			: {},
	} as INodeUi;
}

function onCredentialSelected(credentialType: string, info: INodeUpdatePropertiesInformation) {
	if (props.disabled) return;
	const data = info.properties.credentials?.[credentialType];
	selections.value[credentialType] = data && typeof data === 'object' && data.id ? data.id : null;
}

function submitCredentials() {
	if (submitted.value || props.disabled) return;
	submitted.value = true;
	const credentials: Record<string, string> = {};
	for (const [type, id] of Object.entries(selections.value)) {
		if (id) credentials[type] = id;
	}
	emit('submit', { credentials });
}

function onSkip() {
	if (submitted.value || props.disabled) return;
	submitted.value = true;
	emit('submit', { skipped: true });
}

// Auto-advance to the next incomplete step, then auto-submit once every
// credential is selected — mirrors the assistant's own wizard so a single
// pick (the common case: `credentialRequests` almost always has exactly one
// entry) submits immediately without an extra "Continue" click.
watch(
	() => currentRequest.value && isStepComplete(currentRequest.value.credentialType),
	(complete, prevComplete) => {
		if (!complete || prevComplete) return;
		const nextIncomplete = props.credentialRequests.findIndex(
			(r, idx) => idx > currentStepIndex.value && !isStepComplete(r.credentialType),
		);
		if (nextIncomplete >= 0) goToStep(nextIncomplete);
	},
);

watch(allSelected, (nowComplete, wasComplete) => {
	if (nowComplete && !wasComplete) submitCredentials();
});

// ---------------------------------------------------------------------------
// Resolved (disabled) state
// ---------------------------------------------------------------------------

const isSkipped = computed(() => {
	const value = props.resolvedValue;
	if (!value) return false;
	if ('skipped' in value) return value.skipped === true;
	if ('approved' in value) return value.approved === false;
	return false;
});

const resolvedLabel = computed(() => {
	const value = props.resolvedValue;
	if (!value || isSkipped.value) return undefined;
	if ('credentialName' in value) return value.credentialName;
	if ('credentials' in value) {
		const id = value.credentials[currentRequest.value?.credentialType ?? ''];
		return id ? credentialsStore.getCredentialById(id)?.name : undefined;
	}
	return undefined;
});
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="ask-credential-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.purpose">{{ message }}</N8nText>

			<template v-if="!disabled && currentRequest">
				<header :class="$style.header">
					<CredentialIcon :credential-type-name="currentRequest.credentialType" :size="16" />
					<N8nText size="small" bold>{{ getDisplayName(currentRequest.credentialType) }}</N8nText>
				</header>

				<div :class="$style.credentialContainer">
					<NodeCredentials
						:node="syntheticNodeUi(currentRequest)"
						:override-cred-type="currentRequest.credentialType"
						:project-id="projectId"
						:readonly="disabled"
						standalone
						hide-issues
						skip-auto-select
						@credential-selected="
							(info) => onCredentialSelected(currentRequest.credentialType, info)
						"
					/>
				</div>
			</template>

			<div v-if="!disabled" :class="$style.actions">
				<div v-if="showArrows" :class="$style.nav">
					<N8nButton
						variant="ghost"
						size="small"
						icon-only
						:disabled="isPrevDisabled"
						data-testid="ask-credential-prev"
						aria-label="Previous credential"
						@click="goToPrev"
					>
						<N8nIcon icon="chevron-left" size="xsmall" />
					</N8nButton>
					<N8nText size="small" color="text-light">
						{{ currentStepIndex + 1 }} / {{ credentialRequests.length }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="small"
						icon-only
						:disabled="isNextDisabled"
						data-testid="ask-credential-next"
						aria-label="Next credential"
						@click="goToNext"
					>
						<N8nIcon icon="chevron-right" size="xsmall" />
					</N8nButton>
				</div>
				<N8nButton
					size="medium"
					variant="outline"
					data-testid="ask-credential-skip"
					@click="onSkip"
				>
					{{ i18n.baseText('agents.chat.askCredential.skip') }}
				</N8nButton>
			</div>
			<div v-else :class="$style.resolvedRow">
				<template v-if="isSkipped">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.chat.askCredential.skipped') }}
					</N8nText>
				</template>
				<template v-else>
					<N8nIcon icon="circle-check" size="small" color="success" />
					<N8nText size="small">{{ resolvedLabel ?? '—' }}</N8nText>
				</template>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	gap: var(--spacing--xs);
	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.purpose {
	margin: 0;
	font-size: var(--font-size--sm);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credentialContainer {
	display: flex;
	flex-direction: column;

	// NodeCredentials adds its own top margin which double-stacks inside our card chrome.
	:global(.node-credentials) {
		margin-top: 0;
	}
}

.actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}

.nav {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.resolvedRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}
</style>
