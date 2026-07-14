<script lang="ts" setup>
import { INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY } from '@/app/constants/modals';
import { useUIStore } from '@/app/stores/ui.store';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { useInstanceAiBrowserCredentialSetupExperiment } from '@/experiments/instanceAiBrowserCredentialSetup';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import { useCredentialOAuth } from '@/features/credentials/composables/useCredentialOAuth';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useQuickConnect } from '@/features/credentials/quickConnect/composables/useQuickConnect';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { InstanceAiCredentialFlow, InstanceAiCredentialRequest } from '@n8n/api-types';
import { N8nActionDropdown, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';

type CredentialSetupChoice = 'ai' | 'manual';

const props = defineProps<{
	requestId: string;
	credentialRequests: InstanceAiCredentialRequest[];
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const thread = useThread();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const settingsStore = useInstanceAiSettingsStore();

const { isFeatureEnabled: isBrowserCredentialSetupEnabled } =
	useInstanceAiBrowserCredentialSetupExperiment();
const { getQuickConnectOptionByCredentialTypes } = useQuickConnect();
const { canOAuthCredentialQuickConnect } = useCredentialOAuth();

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

// Listen for credential creation to auto-select newly created credentials
// when using the button path (no NodeCredentials rendered)
const stopCreateListener = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential') return;
	after((newCred) => {
		if (!newCred || typeof newCred !== 'object' || !('id' in newCred)) return;
		const req = currentRequest.value;
		if (!req) return;
		const cred = newCred as { id: string; type: string };
		if (cred.type === req.credentialType) {
			selections.value[req.credentialType] = cred.id;
		}
	});
});

onBeforeUnmount(() => {
	stopDeleteListener();
	stopCreateListener();
	stopWatchingBrowserConnect();
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
		// Auto-advance only when not manually navigating
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

// Auto-continue when all credentials have been selected
watch(allSelected, async (nowComplete, wasComplete) => {
	if (nowComplete && !wasComplete) {
		await nextTick();
		await handleContinue();
	}
});

onMounted(async () => {
	if (isBrowserCredentialSetupEnabled.value) {
		void settingsStore.fetchBrowserStatus();
	}

	// Ensure the credentials store is populated so NodeCredentials can show
	// existing credentials in the dropdown. The Instance AI page may not have
	// fetched them yet.
	try {
		await Promise.all([
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(false),
		]);
	} catch (error) {
		console.warn('Failed to preload credentials for Instance AI setup', error);
	}

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
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
	const appName = getAppNameFromCredType(raw);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
}

const hasExistingCredentials = computed(() => {
	if (!currentRequest.value) return false;
	const credType = currentRequest.value.credentialType;
	return (
		(currentRequest.value.existingCredentials?.length ?? 0) > 0 ||
		(credentialsStore.getUsableCredentialByType(credType)?.length ?? 0) > 0
	);
});

function hasEasySetup(credentialType: string): boolean {
	return (
		!!getQuickConnectOptionByCredentialTypes([credentialType]) ||
		canOAuthCredentialQuickConnect(credentialType)
	);
}

const showSetupChoice = computed(() => {
	if (!currentRequest.value) return false;
	if (!isBrowserCredentialSetupEnabled.value) return false;
	if (hasExistingCredentials.value) return false;
	return !hasEasySetup(currentRequest.value.credentialType);
});

const setupChoiceOptions = computed<Array<ActionDropdownItem<CredentialSetupChoice>>>(() => [
	{
		id: 'ai',
		label: i18n.baseText('instanceAi.credential.autoSetup'),
		description: i18n.baseText('instanceAi.credential.autoSetup.description'),
		icon: 'bot',
	},
	{
		id: 'manual',
		label: i18n.baseText('instanceAi.credential.manualSetup'),
		description: i18n.baseText('instanceAi.credential.manualSetup.description'),
		icon: 'square-pen',
	},
]);

function openNewCredentialModal() {
	const req = currentRequest.value;
	if (!req) return;
	uiStore.openNewCredential(
		req.credentialType,
		false,
		false,
		props.projectId,
		req.suggestedName,
		undefined,
		undefined,
		{
			closeOnSave: true,
		},
	);
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

function trackCredentialInput() {
	const tc = thread.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
	const skipped: Array<{ label: string; options: string[] }> = [];
	for (const req of props.credentialRequests) {
		const selected = selections.value[req.credentialType];
		if (selected) {
			provided.push({ label: req.credentialType, options: [], option_chosen: selected });
		} else {
			skipped.push({ label: req.credentialType, options: [] });
		}
	}
	telemetry.track('User finished providing input', {
		thread_id: thread.id,
		input_thread_id: inputThreadId,
		instance_id: rootStore.instanceId,
		type: 'credential-setup',
		provided_inputs: provided,
		skipped_inputs: skipped,
		num_tasks: props.credentialRequests.length,
	});
}

async function handleContinue() {
	const credentials: Record<string, string> = {};
	for (const [type, id] of Object.entries(selections.value)) {
		if (id) credentials[type] = id;
	}

	trackCredentialInput();

	isSubmitted.value = true;

	const success = await thread.confirmAction(props.requestId, {
		kind: 'credentialSelection',
		credentials,
	});
	if (success) {
		thread.resolveConfirmation(props.requestId, 'approved');
	} else {
		isSubmitted.value = false;
	}
}

async function handleLater() {
	trackCredentialInput();
	if (showSetupChoice.value) {
		trackSetupChoiceClicked('skip');
	}

	isSubmitted.value = true;
	isDeferred.value = true;

	const success = await thread.confirmAction(props.requestId, {
		kind: 'approval',
		approved: false,
	});
	if (success) {
		thread.resolveConfirmation(props.requestId, 'deferred');
	} else {
		isSubmitted.value = false;
		isDeferred.value = false;
	}
}

function trackSetupChoiceClicked(choice: CredentialSetupChoice | 'skip') {
	telemetry.track('Instance AI Browser Use User clicked credential setup option', {
		credential_type: currentRequest.value?.credentialType,
		choice,
	});
}

const shownChoiceTypes = new Set<string>();
watch(
	() => (showSetupChoice.value ? currentRequest.value?.credentialType : undefined),
	(credentialType) => {
		if (!credentialType || shownChoiceTypes.has(credentialType)) return;
		shownChoiceTypes.add(credentialType);
		telemetry.track('Instance AI Browser Use credential setup choice shown', {
			credential_type: credentialType,
		});
	},
	{ immediate: true },
);

let stopBrowserConnectWatch: (() => void) | undefined;

function stopWatchingBrowserConnect() {
	stopBrowserConnectWatch?.();
	stopBrowserConnectWatch = undefined;
}

watch(
	() => uiStore.modalsById[INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY]?.open,
	(isOpen, wasOpen) => {
		if (wasOpen && !isOpen && !settingsStore.browserConnected) {
			stopWatchingBrowserConnect();
		}
	},
);

function onSetupChoiceSelected(choice: CredentialSetupChoice) {
	if (choice === 'ai') {
		void handleSetupAutomatically();
	} else {
		handleSetupManually();
	}
}

function handleSetupManually() {
	trackSetupChoiceClicked('manual');
	openNewCredentialModal();
}

async function submitAutoSetup(credentialType: string) {
	isSubmitted.value = true;
	const success = await thread.confirmAction(props.requestId, {
		kind: 'credentialAutoSetup',
		credentialType,
	});
	if (success) {
		thread.resolveConfirmation(props.requestId, 'approved');
	} else {
		isSubmitted.value = false;
	}
}

async function handleSetupAutomatically() {
	const credentialType = currentRequest.value?.credentialType;
	if (!credentialType) return;

	trackSetupChoiceClicked('ai');

	if (settingsStore.browserConnected) {
		await submitAutoSetup(credentialType);
		return;
	}

	uiStore.openModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
	stopWatchingBrowserConnect();
	stopBrowserConnectWatch = watch(
		() => settingsStore.browserConnected,
		async (connected) => {
			if (!connected) return;
			stopWatchingBrowserConnect();
			uiStore.closeModal(INSTANCE_AI_BROWSER_USE_SETUP_MODAL_KEY);
			await submitAutoSetup(credentialType);
		},
	);
}
</script>

<template>
	<div>
		<template v-if="!isSubmitted">
			<div v-if="currentRequest" data-test-id="instance-ai-credential-card" :class="$style.card">
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
							v-if="hasExistingCredentials"
							:node="syntheticNodeUi(currentRequest)"
							:override-cred-type="currentRequest.credentialType"
							:project-id="projectId"
							:suggested-credential-name="currentRequest.suggestedName"
							standalone
							hide-issues
							hide-ask-assistant
							@credential-selected="onCredentialSelected(currentRequest.credentialType, $event)"
						/>
						<N8nActionDropdown
							v-else-if="showSetupChoice"
							:items="setupChoiceOptions"
							placement="bottom-start"
							data-test-id="instance-ai-credential-setup-choice"
							@select="onSetupChoiceSelected"
						>
							<template #activator>
								<N8nButton data-test-id="instance-ai-credential-setup-button">
									{{ i18n.baseText('instanceAi.credential.setupCredentialButton') }}
									<N8nIcon icon="chevron-down" size="xsmall" />
								</N8nButton>
							</template>
							<template #menuItem="item">
								<div :class="$style.setupChoiceItem">
									<N8nText size="small" color="text-dark" bold>{{ item.label }}</N8nText>
									<N8nText size="xsmall" color="text-light">{{ item.description }}</N8nText>
								</div>
							</template>
						</N8nActionDropdown>
						<N8nButton
							v-else
							:label="i18n.baseText('instanceAi.credential.setupButton')"
							data-test-id="instance-ai-credential-setup-button"
							@click="openNewCredentialModal"
						/>
					</div>
				</div>

				<!-- Footer -->
				<ConfirmationFooter layout="row-between">
					<div :class="$style.footerNav">
						<N8nButton
							v-if="showArrows"
							variant="ghost"
							size="medium"
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
							size="medium"
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
							variant="outline"
							size="medium"
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
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							:disabled="!anySelected"
							data-test-id="instance-ai-credential-continue-button"
							@click="handleContinue"
						/>
					</div>
				</ConfirmationFooter>
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
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	border: 2px solid var(--color--primary);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
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

.setupChoiceItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
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
