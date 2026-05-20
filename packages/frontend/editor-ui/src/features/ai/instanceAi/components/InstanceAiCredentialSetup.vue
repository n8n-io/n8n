<script lang="ts" setup>
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	getAppNameFromCredType,
	getNodeAuthOptions,
	getNodeCredentialForSelectedAuthType,
} from '@/app/utils/nodeTypesUtils';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { InstanceAiCredentialFlow, InstanceAiCredentialRequest } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
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
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

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

// Keyed by the request's credentialType. The value's `credentialType` carries the
// *actual* type of the chosen credential — equal to the key in the common case,
// or different when the user swapped auth types in the modal (e.g. a request for
// `notionApi` fulfilled by a `notionOAuth2Api` credential the user just created).
const selections = ref<Record<string, { credentialId: string; credentialType: string } | null>>({});

// ---------------------------------------------------------------------------
// Acceptable credential types per request
// ---------------------------------------------------------------------------

/**
 * Credential types this request will accept. When `nodeType` is provided the
 * set includes every credential supported by the node's `authentication`
 * options (e.g. notionApi + notionOAuth2Api for the Notion node); otherwise
 * only the originally-requested type.
 */
function getAcceptableTypes(req: InstanceAiCredentialRequest): string[] {
	const types = new Set<string>([req.credentialType]);
	if (!req.nodeType) return [...types];

	const nodeType = nodeTypesStore.getNodeType(req.nodeType);
	if (!nodeType) return [...types];

	const authOptions = getNodeAuthOptions(nodeType);
	for (const option of authOptions) {
		const cred = getNodeCredentialForSelectedAuthType(nodeType, option.value);
		if (cred) types.add(cred.name);
	}
	// Single-credential nodes have no `authentication` option but still declare
	// the credential in `credentials[]`.
	if (authOptions.length === 0) {
		for (const cred of nodeType.credentials ?? []) {
			types.add(cred.name);
		}
	}
	return [...types];
}

// ---------------------------------------------------------------------------
// Auto-select from existing credentials
// ---------------------------------------------------------------------------

function initSelections() {
	for (const req of props.credentialRequests) {
		if (selections.value[req.credentialType] !== undefined) continue;

		if (req.existingCredentials?.length === 1) {
			// Auto-select when exactly one credential available
			selections.value[req.credentialType] = {
				credentialId: req.existingCredentials[0].id,
				credentialType: req.credentialType,
			};
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
		for (const [credType, sel] of Object.entries(selections.value)) {
			if (sel?.credentialId === deletedId) {
				selections.value[credType] = null;
			}
		}
	});
});

// Listen for credential creation to auto-select newly created credentials.
// Accepts any credential whose type is valid for the current request's node —
// so the user swapping auth types in the modal still binds the new cred.
const stopCreateListener = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential') return;
	after((newCred) => {
		if (!newCred || typeof newCred !== 'object' || !('id' in newCred)) return;
		const req = currentRequest.value;
		if (!req) return;
		const cred = newCred as { id: string; type: string };
		if (getAcceptableTypes(req).includes(cred.type)) {
			selections.value[req.credentialType] = {
				credentialId: cred.id,
				credentialType: cred.type,
			};
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
	const sel = selections.value[credentialType];
	return sel !== null && sel !== undefined;
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
			(req, idx) => idx > currentStepIndex.value && !isStepComplete(req.credentialType),
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
	// Ensure the credentials and node-types stores are populated. The credential
	// dropdown needs the cred list; the auth-type swap UI in the credential modal
	// needs the node description so it can enumerate the node's auth options.
	try {
		await Promise.all([
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(false),
			nodeTypesStore.loadNodeTypesIfNotLoaded(),
		]);
	} catch (error) {
		console.warn('Failed to preload credentials for Instance AI setup', error);
	}

	const firstIncomplete = props.credentialRequests.findIndex(
		(req) => !isStepComplete(req.credentialType),
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

function openNewCredentialModal() {
	const req = currentRequest.value;
	if (!req) return;

	if (req.nodeType) {
		// Pass a synthetic node as contextNode + showAuthOptions=true so the modal
		// renders the auth-type dropdown (e.g. "API Key / OAuth2" for Notion).
		uiStore.openNewCredential(
			req.credentialType,
			true,
			false,
			props.projectId,
			req.suggestedName,
			req.nodeType,
			syntheticNodeUi(req),
		);
		return;
	}

	uiStore.openNewCredential(req.credentialType, false, false, props.projectId, req.suggestedName);
}

/** Build a minimal synthetic INodeUi so NodeCredentials can render in standalone mode. */
function syntheticNodeUi(req: InstanceAiCredentialRequest): INodeUi {
	const sel = selections.value[req.credentialType];
	const selectedCred = sel
		? (req.existingCredentials?.find((c) => c.id === sel.credentialId) ??
			credentialsStore.getCredentialById(sel.credentialId))
		: undefined;

	const nodeType = req.nodeType ? nodeTypesStore.getNodeType(req.nodeType) : null;
	const typeVersion = nodeType
		? Array.isArray(nodeType.version)
			? nodeType.version[nodeType.version.length - 1]
			: nodeType.version
		: 1;

	const selectedType = sel?.credentialType ?? req.credentialType;

	return {
		id: req.credentialType,
		name: req.credentialType,
		type: req.nodeType ?? 'n8n-nodes-base.noOp',
		typeVersion,
		position: [0, 0],
		parameters: {},
		credentials: selectedCred
			? { [selectedType]: { id: selectedCred.id, name: selectedCred.name } }
			: {},
	} as INodeUi;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onCredentialSelected(updateInfo: INodeUpdatePropertiesInformation) {
	const req = currentRequest.value;
	if (!req) return;
	const credentialData = updateInfo.properties.credentials?.[req.credentialType];
	const credentialId = typeof credentialData === 'string' ? undefined : credentialData?.id;
	if (credentialId) {
		selections.value[req.credentialType] = {
			credentialId,
			credentialType: req.credentialType,
		};
	} else {
		selections.value[req.credentialType] = null;
	}
}

function trackCredentialInput() {
	const tc = thread.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
	const skipped: Array<{ label: string; options: string[] }> = [];
	for (const req of props.credentialRequests) {
		const sel = selections.value[req.credentialType];
		if (sel) {
			provided.push({
				label: req.credentialType,
				options: [],
				option_chosen: sel.credentialId,
			});
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
	for (const sel of Object.values(selections.value)) {
		if (sel) credentials[sel.credentialType] = sel.credentialId;
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
							@credential-selected="onCredentialSelected($event)"
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
</style>
