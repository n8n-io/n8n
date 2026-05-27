<script lang="ts" setup>
import { useUIStore } from '@/app/stores/ui.store';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { InstanceAiCredentialFlow, InstanceAiCredentialRequest } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiSetupListExperiment } from '@/experiments/instanceAiSetupList';
import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';

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
const { isFeatureEnabled: isSetupListEnabled } = useInstanceAiSetupListExperiment();

interface CredentialSetupItem {
	id: string;
	credentialType: string;
	request: InstanceAiCredentialRequest;
	requests: InstanceAiCredentialRequest[];
}

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

const credentialItems = computed<CredentialSetupItem[]>(() => {
	const byType = new Map<string, InstanceAiCredentialRequest[]>();

	for (const request of props.credentialRequests) {
		const requests = byType.get(request.credentialType) ?? [];
		byType.set(request.credentialType, [...requests, request]);
	}

	return [...byType.entries()].map(([credentialType, requests]) => ({
		id: `credential-setup-${credentialType}`.replace(/[^A-Za-z0-9_-]/g, '-'),
		credentialType,
		request: mergeCredentialRequests(credentialType, requests),
		requests,
	}));
});

const openCredentialType = ref<string | null>(null);

watch(
	credentialItems,
	(items) => {
		const openItemExists = items.some((item) => item.credentialType === openCredentialType.value);
		if (openItemExists) return;

		openCredentialType.value = getFirstIncompleteCredentialItem(items)?.credentialType ?? null;
	},
	{ immediate: true },
);

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
		const req = activeCredentialRequest.value;
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
});

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

function isStepComplete(credentialType: string): boolean {
	return !!selections.value[credentialType];
}

const allSelected = computed(() =>
	props.credentialRequests.every((r) => isStepComplete(r.credentialType)),
);

const allCredentialItemsSelected = computed(
	() =>
		credentialItems.value.length > 0 &&
		credentialItems.value.every((item) => isStepComplete(item.credentialType)),
);

const anySelected = computed(() =>
	props.credentialRequests.some((r) => isStepComplete(r.credentialType)),
);

const applyTooltip = computed(() =>
	allCredentialItemsSelected.value
		? ''
		: i18n.baseText('instanceAi.workflowSetup.incompleteTooltip' as BaseTextKey),
);

const isApplyDisabled = computed(() => isSubmitted.value || !allCredentialItemsSelected.value);

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
	if (isSetupListEnabled.value) return;
	if (nowComplete && !wasComplete) {
		await nextTick();
		await handleContinue();
	}
});

onMounted(async () => {
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
	const appName = getCredentialAppName(credentialType);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
}

function getCredentialAppName(credentialType: string): string {
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
	return getAppNameFromCredType(raw);
}

const hasExistingCredentials = computed(() => {
	if (!currentRequest.value) return false;
	const credType = currentRequest.value.credentialType;
	return (
		(currentRequest.value.existingCredentials?.length ?? 0) > 0 ||
		(credentialsStore.getUsableCredentialByType(credType)?.length ?? 0) > 0
	);
});

const activeCredentialRequest = computed(() => {
	if (isSetupListEnabled.value) {
		return (
			credentialItems.value.find((item) => item.credentialType === openCredentialType.value)
				?.request ?? credentialItems.value[0]?.request
		);
	}

	return currentRequest.value;
});

function openNewCredentialModal() {
	const req = activeCredentialRequest.value;
	if (!req) return;
	uiStore.openNewCredential(req.credentialType, false, false, props.projectId, req.suggestedName);
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

function mergeCredentialRequests(
	credentialType: string,
	requests: InstanceAiCredentialRequest[],
): InstanceAiCredentialRequest {
	const [firstRequest] = requests;
	const existingCredentials = new Map<string, { id: string; name: string }>();

	for (const request of requests) {
		for (const credential of request.existingCredentials ?? []) {
			existingCredentials.set(credential.id, credential);
		}
	}

	return {
		credentialType,
		reason: firstRequest?.reason ?? '',
		existingCredentials: [...existingCredentials.values()],
		suggestedName: firstRequest?.suggestedName,
	};
}

function getFirstIncompleteCredentialItem(
	items: CredentialSetupItem[],
): CredentialSetupItem | undefined {
	return items.find((item) => !isStepComplete(item.credentialType)) ?? items[0];
}

function isCredentialItemOpen(item: CredentialSetupItem): boolean {
	return openCredentialType.value === item.credentialType;
}

function openCredentialItem(item: CredentialSetupItem) {
	openCredentialType.value = item.credentialType;
}

function getCredentialStatusLabel(item: CredentialSetupItem): string {
	return isStepComplete(item.credentialType)
		? i18n.baseText('instanceAi.workflowSetup.statusDone' as BaseTextKey)
		: i18n.baseText('instanceAi.workflowSetup.statusTodo' as BaseTextKey);
}

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
</script>

<template>
	<div>
		<template v-if="!isSubmitted">
			<section
				v-if="isSetupListEnabled && credentialItems.length"
				:class="$style.accordion"
				data-test-id="instance-ai-credential-setup-list"
			>
				<div :class="$style.items">
					<article
						v-for="item in credentialItems"
						:key="item.id"
						:class="$style.item"
						data-test-id="instance-ai-credential-setup-list-item"
					>
						<button
							type="button"
							:class="$style.itemHeader"
							:aria-expanded="isCredentialItemOpen(item)"
							:aria-controls="`credential-setup-section-${item.id}`"
							data-test-id="instance-ai-credential-setup-list-header"
							@click="openCredentialItem(item)"
						>
							<span :class="$style.itemIcon">
								<N8nIcon
									v-if="isStepComplete(item.credentialType)"
									icon="check"
									size="medium"
									color="success"
								/>
								<CredentialIcon v-else :credential-type-name="item.credentialType" :size="16" />
							</span>

							<span :class="$style.itemText">
								<N8nText :class="$style.itemTitle" size="medium" color="text-dark" bold>
									{{ getCredentialAppName(item.credentialType) }}
								</N8nText>
							</span>

							<span
								:class="[
									$style.statusPill,
									{ [$style.statusPillDone]: isStepComplete(item.credentialType) },
								]"
								data-test-id="instance-ai-credential-setup-status-pill"
							>
								{{ getCredentialStatusLabel(item) }}
							</span>
						</button>

						<div
							v-if="isCredentialItemOpen(item)"
							:id="`credential-setup-section-${item.id}`"
							:class="$style.itemBody"
							data-test-id="instance-ai-credential-setup-list-body"
						>
							<div :class="$style.credentialBody">
								<NodeCredentials
									:node="syntheticNodeUi(item.request)"
									:override-cred-type="item.credentialType"
									:project-id="projectId"
									:suggested-credential-name="item.request.suggestedName"
									standalone
									hide-issues
									hide-ask-assistant
									:hide-credential-service-name-in-label="true"
									:hide-empty-credential-select="true"
									@credential-selected="onCredentialSelected(item.credentialType, $event)"
								/>
							</div>
						</div>
					</article>
				</div>

				<ConfirmationFooter bordered>
					<N8nTooltip :disabled="!applyTooltip" :content="applyTooltip">
						<N8nButton
							size="medium"
							:label="i18n.baseText('instanceAi.workflowSetup.applySetup' as BaseTextKey)"
							:disabled="isApplyDisabled"
							data-test-id="instance-ai-credential-setup-apply"
							@click="handleContinue"
						/>
					</N8nTooltip>
				</ConfirmationFooter>
			</section>

			<div
				v-else-if="currentRequest"
				data-test-id="instance-ai-credential-card"
				:class="$style.card"
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
.accordion {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.items {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--sm);
}

.item {
	display: flex;
	flex-direction: column;
	background-color: transparent;

	&:not(:last-child) {
		padding-bottom: var(--spacing--xs);
	}

	& + & {
		border-top: var(--border);
		padding-top: var(--spacing--xs);
	}
}

.itemHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--xs) 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
	user-select: none;
}

.itemIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--sm);
	flex-shrink: 0;
}

.itemText {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.itemTitle {
	overflow: hidden;
	font-size: var(--font-size--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusPill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--tag--color--background);
	color: var(--tag--color--text);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xs);
	white-space: nowrap;
}

.statusPillDone {
	border-color: var(--border-color--success);
	background-color: var(--background--success);
	color: var(--text-color--success);
}

.itemBody {
	padding: 0 0 var(--spacing--xs);
}

.credentialBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	:global(.node-credentials) {
		margin-top: 0;
	}

	:global(label.n8n-input-label > div:first-child .n8n-text) {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	:global([data-test-id='credentials-label']) {
		display: grid;
		grid-template-columns: minmax(10rem, 32%) minmax(0, 1fr);
		column-gap: var(--spacing--sm);
		align-items: start;
	}

	:global([data-test-id='credentials-label'] > div:first-child) {
		grid-column: 1;
		min-width: 0;
		padding-top: var(--spacing--3xs);
	}

	:global([data-test-id='credentials-label'] > *:not(:first-child)) {
		grid-column: 2;
		min-width: 0;
		margin-top: 0;
	}

	:global([data-test-id='credentials-label'] button) {
		font-size: var(--font-size--sm);
	}
}

.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
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

@media (max-width: 40rem) {
	.credentialBody {
		:global([data-test-id='credentials-label']) {
			grid-template-columns: 1fr;
			row-gap: var(--spacing--3xs);
		}

		:global([data-test-id='credentials-label'] > div:first-child),
		:global([data-test-id='credentials-label'] > *:not(:first-child)) {
			grid-column: 1;
			padding-top: 0;
		}
	}
}
</style>
