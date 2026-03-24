<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialRequest, InstanceAiCredentialFlow } from '@n8n/api-types';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';

const props = defineProps<{
	requestId: string;
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const credentialsStore = useCredentialsStore();

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const totalSteps = computed(() => props.credentialRequests.length);
const { currentStepIndex, isPrevDisabled, isNextDisabled, goToNext, goToPrev, goToStep } =
	useWizardNavigation({ totalSteps });

const currentRequest = computed(() => props.credentialRequests[currentStepIndex.value]);
const showArrows = computed(() => totalSteps.value > 1);

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const isSubmitted = ref(false);
const isDeferred = ref(false);

const selections = ref<Record<string, string | null>>({});

// ---------------------------------------------------------------------------
// Auto-select from existing credentials
// ---------------------------------------------------------------------------

function initSelections() {
	for (const req of props.credentialRequests) {
		if (selections.value[req.credentialType] !== undefined) continue;

		if (req.existingCredentials?.length === 1) {
			// Auto-select when exactly one credential available
			selections.value[req.credentialType] = req.existingCredentials[0].id;
		} else {
			selections.value[req.credentialType] = null;
		}
	}
}
initSelections();

// Clear selection when a credential is deleted from the store
const stopDeleteListener = credentialsStore.$onAction(({ name, after, args }) => {
	if (name !== 'deleteCredential') return;
	after(() => {
		const deletedId = (args[0] as { id: string }).id;
		for (const [credType, selectedId] of Object.entries(selections.value)) {
			if (selectedId === deletedId) {
				selections.value[credType] = null;
			}
		}
	});
});

onBeforeUnmount(() => {
	stopDeleteListener();
});

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

function isStepComplete(credentialType: string): boolean {
	return selections.value[credentialType] !== null;
}

const allSelected = computed(() =>
	props.credentialRequests.every((r) => isStepComplete(r.credentialType)),
);

const anySelected = computed(() =>
	props.credentialRequests.some((r) => isStepComplete(r.credentialType)),
);

// ---------------------------------------------------------------------------
// Auto-advance
// ---------------------------------------------------------------------------

const userNavigated = ref(false);

function wrappedGoToNext() {
	userNavigated.value = true;
	goToNext();
}

function wrappedGoToPrev() {
	userNavigated.value = true;
	goToPrev();
}

watch(
	() => currentRequest.value && isStepComplete(currentRequest.value.credentialType),
	(complete, prevComplete) => {
		if (!complete || prevComplete || userNavigated.value) {
			userNavigated.value = false;
			return;
		}
		const nextIncomplete = props.credentialRequests.findIndex(
			(r, idx) => idx > currentStepIndex.value && !isStepComplete(r.credentialType),
		);
		if (nextIncomplete >= 0) {
			goToStep(nextIncomplete);
		}
	},
);

onMounted(() => {
	const firstIncomplete = props.credentialRequests.findIndex(
		(r) => !isStepComplete(r.credentialType),
	);
	if (firstIncomplete > 0) {
		goToStep(firstIncomplete);
	}
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayName(credentialType: string): string {
	return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
}

/** Build a minimal synthetic INodeUi so NodeCredentials can render in standalone mode. */
function syntheticNodeUi(req: InstanceAiCredentialRequest): INodeUi {
	const selectedId = selections.value[req.credentialType];
	const selectedCred = selectedId
		? (req.existingCredentials?.find((c) => c.id === selectedId) ??
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

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onCredentialSelected(
	credentialType: string,
	updateInfo: INodeUpdatePropertiesInformation,
) {
	const credentialData = updateInfo.properties.credentials?.[credentialType];
	const credentialId = typeof credentialData === 'string' ? undefined : credentialData?.id;
	if (credentialId) {
		selections.value[credentialType] = credentialId;
	} else {
		selections.value[credentialType] = null;
	}
}

async function handleContinue() {
	const credentials: Record<string, string> = {};
	for (const [type, id] of Object.entries(selections.value)) {
		if (id) credentials[type] = id;
	}
	isSubmitted.value = true;

	const success = await store.confirmAction(props.requestId, true, undefined, credentials);
	if (success) {
		store.resolveConfirmation(props.requestId, 'approved');
	} else {
		isSubmitted.value = false;
	}
}

function handleLater() {
	isSubmitted.value = true;
	isDeferred.value = true;
	store.resolveConfirmation(props.requestId, 'deferred');
	void store.confirmAction(props.requestId, false);
}
</script>

<template>
	<div :class="$style.root">
		<template v-if="!isSubmitted">
			<div
				v-if="currentRequest"
				data-test-id="instance-ai-credential-card"
				:class="[$style.card, { [$style.completed]: allSelected }]"
			>
				<!-- Header -->
				<header :class="$style.header">
					<CredentialIcon :credential-type-name="currentRequest.credentialType" :size="16" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ getDisplayName(currentRequest.credentialType) }}
					</N8nText>

					<N8nText
						v-if="isStepComplete(currentRequest.credentialType)"
						data-test-id="instance-ai-credential-step-check"
						:class="$style.completeLabel"
						size="medium"
						color="success"
					>
						<N8nIcon icon="check" size="large" />
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</header>

				<!-- Content -->
				<div :class="$style.content">
					<N8nText v-if="currentRequest.reason" size="small" color="text-light">
						{{ currentRequest.reason }}
					</N8nText>

					<div :class="$style.credentialContainer">
						<NodeCredentials
							:node="syntheticNodeUi(currentRequest)"
							:override-cred-type="currentRequest.credentialType"
							:project-id="projectId"
							standalone
							hide-issues
							@credential-selected="onCredentialSelected(currentRequest.credentialType, $event)"
						/>
					</div>
				</div>

				<!-- Footer -->
				<footer :class="$style.footer">
					<div :class="$style.footerNav">
						<N8nButton
							v-if="showArrows"
							variant="ghost"
							size="xsmall"
							icon-only
							:disabled="isPrevDisabled"
							data-test-id="instance-ai-credential-prev"
							aria-label="Previous step"
							@click="wrappedGoToPrev"
						>
							<N8nIcon icon="chevron-left" size="xsmall" />
						</N8nButton>
						<N8nText size="small" color="text-light">
							{{ currentStepIndex + 1 }} of {{ totalSteps }}
						</N8nText>
						<N8nButton
							v-if="showArrows"
							variant="ghost"
							size="xsmall"
							icon-only
							:disabled="isNextDisabled"
							data-test-id="instance-ai-credential-next"
							aria-label="Next step"
							@click="wrappedGoToNext"
						>
							<N8nIcon icon="chevron-right" size="xsmall" />
						</N8nButton>
					</div>

					<div :class="$style.footerActions">
						<N8nButton
							variant="ghost"
							size="small"
							:class="$style.actionButton"
							:label="
								i18n.baseText(
									isFinalize
										? 'instanceAi.credential.finalize.later'
										: 'instanceAi.credential.deny',
								)
							"
							@click="handleLater"
						/>

						<N8nButton
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							:disabled="!anySelected"
							data-test-id="instance-ai-credential-continue-button"
							@click="handleContinue"
						/>
					</div>
				</footer>
			</div>
		</template>

		<div v-else :class="$style.submitted">
			<template v-if="isDeferred">
				<N8nIcon icon="arrow-right" size="small" :class="$style.skippedIcon" />
				<span>{{ i18n.baseText('instanceAi.credential.finalize.deferred') }}</span>
			</template>
			<template v-else>
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{
					i18n.baseText(
						isFinalize
							? 'instanceAi.credential.finalize.applied'
							: 'instanceAi.credential.allSelected',
					)
				}}</span>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border-top: var(--border);
	background: var(--color--background--shade-1);
	padding: var(--spacing--xs);
}

.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);

	&.completed {
		border-color: var(--color--success);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--sm);
}

.credentialContainer {
	display: flex;
	flex-direction: column;

	:global(.node-credentials) {
		margin-top: 0;
	}
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.footerNav {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
}

.footerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actionButton {
	--button--font-size: var(--font-size--2xs);
}

.submitted {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.successIcon {
	color: var(--color--success);
}

.skippedIcon {
	color: var(--color--text--tint-2);
}
</style>
