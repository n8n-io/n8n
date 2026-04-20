<script lang="ts" setup>
import { getWorkflow as fetchWorkflowApi } from '@/app/api/workflows';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, defineComponent, onMounted, onUnmounted, provide, ref, toRef, watch } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import {
	credGroupKey,
	isTriggerOnly as isTriggerOnlyUtil,
	shouldUseCredentialIcon,
	toNodeUi,
	type SetupCard,
} from '../instanceAiWorkflowSetup.utils';
import { useCredentialTesting } from '../composables/useCredentialTesting';
import { useCredentialGroupSelection } from '../composables/useCredentialGroupSelection';
import { useSetupCards } from '../composables/useSetupCards';
import { useSetupCardParameters } from '../composables/useSetupCardParameters';
import { useSetupActions } from '../composables/useSetupActions';
import { getNodeParametersIssues } from '@/features/setupPanel/setupPanel.utils';
import ConfirmationFooter from './ConfirmationFooter.vue';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	workflowId: string;
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const credentialsStore = useCredentialsStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();
const ndvStore = useNDVStore();

// ---------------------------------------------------------------------------
// Composable wiring — order matters for dependencies
// ---------------------------------------------------------------------------

// Step 1: Credential testing — takes getCardCredentialId as a function reference.
// At call time (runtime), getCardCredentialId will be available from step 2.
const {
	isCredentialTypeTestable,
	testCredentialInBackground,
	getEffectiveCredTestResult,
	getCredTestIcon,
} = useCredentialTesting((card: SetupCard) => getCardCredentialId(card));

// Step 2: Credential group selection
const {
	credGroupSelections,
	activeCredentialTarget,
	initCredGroupSelections: _initCredGroupSelections,
	getCardCredentialId,
	isFirstCardInCredGroup,
	setCredentialForGroup,
	clearCredentialForGroup,
	cardHasExistingCredentials,
	openNewCredentialForSection,
} = useCredentialGroupSelection(
	computed(() => cards.value),
	testCredentialInBackground,
	props.projectId,
);

// Step 3: Setup cards — owns card computation, display grouping, completion
const {
	trackedParamNames,
	cards,
	displayCards,
	cardHasParamWork,
	isCardComplete,
	isDisplayCardComplete,
	anyCardComplete,
	allPreResolved,
	getGroupPrimaryTriggerCard,
} = useSetupCards(toRef(props, 'setupRequests'), getCardCredentialId, isCredentialTypeTestable);

// Now that cards are available, init credential group selections
_initCredGroupSelections();

// Step 4: Parameter handling
const {
	paramValues: _paramValues,
	getCardSimpleParameters,
	getCardNestedParameterCount,
	onParameterValueChanged,
	buildNodeParameters,
} = useSetupCardParameters(cards, trackedParamNames, cardHasParamWork);

// Step 5: State + showFullWizard (needed by actions and template)
const isStoreReady = ref(false);
const showFullWizard = ref(false);

// ---------------------------------------------------------------------------
// Wizard navigation
// ---------------------------------------------------------------------------

const totalSteps = computed(() => displayCards.value.length);
const { currentStepIndex, isPrevDisabled, isNextDisabled, goToNext, goToPrev, goToStep } =
	useWizardNavigation({ totalSteps });

const currentDisplayCard = computed(() => displayCards.value[currentStepIndex.value]);
const currentCard = computed(() => {
	const dc = currentDisplayCard.value;
	if (!dc) return undefined;
	if (dc.type === 'single') return dc.card;
	return dc.group.parentCard ?? dc.group.subnodeCards[0];
});
const showArrows = computed(() => totalSteps.value > 1);

// ---------------------------------------------------------------------------
// Build per-node credential mapping from card-scoped selections
// ---------------------------------------------------------------------------

function buildNodeCredentials(): Record<string, Record<string, string>> {
	const result: Record<string, Record<string, string>> = {};
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		const selectedId = getCardCredentialId(card);
		if (!selectedId) continue;

		const testResult = getEffectiveCredTestResult(card);
		if (testResult !== undefined && !testResult.success) continue;

		for (const req of card.nodes) {
			if (!result[req.node.name]) {
				result[req.node.name] = {};
			}
			result[req.node.name][card.credentialType] = selectedId;
		}
	}
	return result;
}

// Step 6: Actions — apply, later, test-trigger
const {
	isSubmitted,
	isDeferred,
	isPartial,
	isApplying,
	applyError,
	handleApply,
	handleLater,
	handleTestTrigger,
	onCredentialSelected,
} = useSetupActions({
	requestId: toRef(props, 'requestId'),
	store,
	cards,
	currentDisplayCard,
	displayCards,
	buildNodeCredentials,
	buildNodeParameters,
	isCardComplete,
	anyCardComplete,
	allPreResolved,
	showFullWizard,
	setCredentialForGroup,
	clearCredentialForGroup,
	goToNext,
	isNextDisabled,
	credGroupKey,
	setupRequests: toRef(props, 'setupRequests'),
	onApplySuccess: () => {
		previousWorkflow = null;
	},
});

// ---------------------------------------------------------------------------
// Expression context for ParameterInputList
// ---------------------------------------------------------------------------

const currentCardNode = computed<INodeUi | null>(() => {
	if (!currentCard.value) return null;
	return workflowsStore.getNodeByName(currentCard.value.nodes[0].node.name) ?? null;
});

const expressionResolveCtx = useExpressionResolveCtx(currentCardNode);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

// Per-section expression context provider for grouped cards
const ExpressionContextProvider = defineComponent({
	props: { nodeName: { type: String, required: true } },
	setup(providerProps, { slots }) {
		const node = computed(() => workflowsStore.getNodeByName(providerProps.nodeName) ?? null);
		const ctx = useExpressionResolveCtx(node);
		provide(ExpressionLocalResolveContextSymbol, ctx);
		return () => slots.default?.();
	},
});

// ---------------------------------------------------------------------------
// Workflow store loading — needed so ParameterInputList can resolve nodes
// ---------------------------------------------------------------------------

let previousWorkflow: IWorkflowDb | null = null;
let isMounted = true;

// ---------------------------------------------------------------------------
// Trigger test result + disabled helpers
// ---------------------------------------------------------------------------

const triggerTestResults = computed(() => {
	const results: Record<string, InstanceAiWorkflowSetupNode['triggerTestResult']> = {};
	for (const req of props.setupRequests) {
		if (req.triggerTestResult) {
			results[req.node.name] = req.triggerTestResult;
		}
	}
	return results;
});

function getTriggerResult(
	card: SetupCard,
): InstanceAiWorkflowSetupNode['triggerTestResult'] | undefined {
	const triggerNode = card.nodes.find((n) => n.isTrigger);
	return triggerNode ? triggerTestResults.value[triggerNode.node.name] : undefined;
}

function isTriggerTestDisabled(card: SetupCard): boolean {
	if (card.credentialType && !getCardCredentialId(card)) return true;
	const testResult = getEffectiveCredTestResult(card);
	if (testResult !== undefined && !testResult.success) return true;
	if (cardHasParamWork(card)) {
		for (const req of card.nodes) {
			const storeNode = workflowsStore.getNodeByName(req.node.name);
			if (storeNode) {
				const liveIssues = getNodeParametersIssues(nodeTypesStore, storeNode);
				if (Object.keys(liveIssues).length > 0) return true;
			}
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Auto-advance: only when a card transitions from incomplete -> complete
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
	() => currentDisplayCard.value && isDisplayCardComplete(currentDisplayCard.value),
	(complete, prevComplete) => {
		if (!complete || prevComplete || userNavigated.value) {
			userNavigated.value = false;
			return;
		}
		const nextIncomplete = displayCards.value.findIndex(
			(dc, idx) => idx > currentStepIndex.value && !isDisplayCardComplete(dc),
		);
		if (nextIncomplete >= 0) {
			goToStep(nextIncomplete);
		}
	},
);

// ---------------------------------------------------------------------------
// Credential store listeners
// ---------------------------------------------------------------------------

const stopDeleteListener = credentialsStore.$onAction(({ name, after, args }) => {
	if (name !== 'deleteCredential') return;
	after(() => {
		const deletedId = (args[0] as { id: string }).id;
		for (const [key, selectedId] of Object.entries(credGroupSelections.value)) {
			if (selectedId !== deletedId) continue;
			const groupCard = cards.value.find(
				(c) => c.credentialType && c.nodes[0] && credGroupKey(c.nodes[0]) === key,
			);
			if (groupCard?.credentialType) {
				clearCredentialForGroup(key, groupCard.credentialType);
			} else {
				credGroupSelections.value[key] = null;
			}
		}
	});
});

const stopCreateListener = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential') return;
	after((newCred) => {
		if (!newCred || typeof newCred !== 'object' || !('id' in newCred)) return;
		const cred = newCred as { id: string; type: string };

		if (activeCredentialTarget.value && cred.type === activeCredentialTarget.value.credentialType) {
			setCredentialForGroup(
				activeCredentialTarget.value.groupKey,
				activeCredentialTarget.value.credentialType,
				cred.id,
			);
			activeCredentialTarget.value = null;
			return;
		}

		const dc = currentDisplayCard.value;
		if (dc?.type === 'single' && dc.card.credentialType === cred.type) {
			const key = dc.card.nodes[0] ? credGroupKey(dc.card.nodes[0]) : dc.card.credentialType;
			setCredentialForGroup(key, cred.type, cred.id);
		}

		activeCredentialTarget.value = null;
	});
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onUnmounted(() => {
	isMounted = false;
	stopDeleteListener();
	stopCreateListener();
	if (previousWorkflow) {
		workflowsStore.setWorkflow(previousWorkflow);
	}
});

onMounted(async () => {
	const nodeInfos = props.setupRequests
		.map((req) => ({ name: req.node.type, version: req.node.typeVersion }))
		.filter(
			(info, i, arr) =>
				arr.findIndex((x) => x.name === info.name && x.version === info.version) === i,
		);

	try {
		await Promise.all([
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(false),
			nodeTypesStore.getNodesInformation(nodeInfos),
		]);
	} catch (error) {
		console.warn('Failed to preload credentials/node types for Instance AI workflow setup', error);
	}

	if (!isMounted) return;

	try {
		const workflowData = await fetchWorkflowApi(rootStore.restApiContext, props.workflowId);
		if (!isMounted) return;
		previousWorkflow = { ...workflowsStore.workflow };
		workflowsStore.setWorkflow(workflowData);
	} catch (error) {
		console.warn('Failed to fetch workflow for Instance AI setup', error);
	}

	if (!isMounted) return;

	isStoreReady.value = true;

	const testedIds = new Set<string>();
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		const selectedId = getCardCredentialId(card);
		if (!selectedId || testedIds.has(selectedId)) continue;
		testedIds.add(selectedId);
		const cred =
			card.nodes[0].existingCredentials?.find((c) => c.id === selectedId) ??
			credentialsStore.getCredentialById(selectedId);
		if (cred) {
			void testCredentialInBackground(selectedId, cred.name, card.credentialType);
		}
	}

	const firstIncomplete = displayCards.value.findIndex((dc) => !isDisplayCardComplete(dc));
	if (firstIncomplete > 0) {
		goToStep(firstIncomplete);
	}
});

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

function getDisplayName(credentialType: string): string {
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
	const appName = getAppNameFromCredType(raw);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
}

function getCardTitle(card: SetupCard): string {
	if (card.nodes.length === 1) return card.nodes[0].node.name;
	if (card.credentialType) return getDisplayName(card.credentialType);
	return 'Setup';
}

function cardNodeUi(card: SetupCard): INodeUi {
	const node = toNodeUi(card.nodes[0]);
	const selectedId = card.credentialType ? getCardCredentialId(card) : undefined;
	if (selectedId && card.credentialType) {
		const cred =
			card.nodes[0].existingCredentials?.find((c) => c.id === selectedId) ??
			credentialsStore.getCredentialById(selectedId);
		if (cred) {
			node.credentials = {
				...node.credentials,
				[card.credentialType]: { id: cred.id, name: cred.name },
			};
		}
	}
	return node;
}

function isTriggerOnly(card: SetupCard): boolean {
	return isTriggerOnlyUtil(card, cardHasParamWork);
}

function useCredentialIcon(card: SetupCard): boolean {
	return shouldUseCredentialIcon(card, cardHasParamWork);
}

function openNdv(card: SetupCard): void {
	ndvStore.setActiveNodeName(card.nodes[0].node.name, 'other');
}

const nodeNames = computed(() => {
	const card = currentCard.value;
	if (!card) return [];
	return card.nodes.map((n) => n.node.name);
});

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));
</script>

<template>
	<div>
		<div v-if="!isStoreReady" :class="$style.submitted">
			<N8nIcon icon="spinner" color="primary" spin size="small" :class="$style.loading" />
			<span>{{ i18n.baseText('instanceAi.workflowSetup.loading' as BaseTextKey) }}</span>
		</div>
		<template v-else-if="!isSubmitted && !isApplying">
			<!-- Streamlined confirm mode: all items pre-resolved by AI -->
			<div
				v-if="allPreResolved && !showFullWizard"
				data-test-id="instance-ai-workflow-setup-confirm"
				:class="$style.confirmCard"
			>
				<header :class="$style.header">
					<N8nIcon icon="check" size="small" :class="$style.success" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ i18n.baseText('instanceAi.workflowSetup.confirmTitle' as BaseTextKey) }}
					</N8nText>
				</header>
				<div :class="$style.confirmSummary">
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('instanceAi.workflowSetup.confirmDescription' as BaseTextKey, {
								interpolate: { count: String(cards.length) },
							})
						}}
					</N8nText>
					<ul :class="$style.confirmList">
						<li v-for="card in cards" :key="card.id" :class="$style.confirmItem">
							<CredentialIcon
								v-if="useCredentialIcon(card)"
								:credential-type-name="card.credentialType!"
								:size="14"
							/>
							<N8nIcon v-else icon="check" size="xsmall" :class="$style.success" />
							<N8nText size="small">{{ getCardTitle(card) }}</N8nText>
						</li>
					</ul>
				</div>
				<ConfirmationFooter layout="row-between">
					<div :class="$style.footerNav">
						<N8nLink
							data-test-id="instance-ai-workflow-setup-review-details"
							:underline="true"
							theme="text"
							size="small"
							@click="showFullWizard = true"
						>
							{{ i18n.baseText('instanceAi.workflowSetup.reviewDetails' as BaseTextKey) }}
						</N8nLink>
					</div>
					<div :class="$style.footerActions">
						<N8nButton
							variant="outline"
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.later')"
							data-test-id="instance-ai-workflow-setup-later"
							@click="handleLater"
						/>
						<N8nButton
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							data-test-id="instance-ai-workflow-setup-apply-button"
							@click="handleApply"
						/>
					</div>
				</ConfirmationFooter>
			</div>
			<!-- Single display card -->
			<div
				v-else-if="currentDisplayCard?.type === 'single' && currentCard"
				data-test-id="instance-ai-workflow-setup-card"
				:class="$style.card"
			>
				<!-- Header -->
				<header :class="$style.header">
					<CredentialIcon
						v-if="useCredentialIcon(currentCard)"
						:credential-type-name="currentCard.credentialType!"
						:size="16"
					/>
					<N8nIcon v-else icon="play" size="small" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ getCardTitle(currentCard) }}
					</N8nText>

					<N8nIcon
						v-if="getCredTestIcon(currentCard) === 'spinner'"
						icon="spinner"
						color="primary"
						size="small"
						:class="$style.loading"
					/>
					<N8nIcon
						v-else-if="getCredTestIcon(currentCard) === 'check'"
						icon="check"
						size="small"
						:class="$style.success"
					/>
					<N8nIcon
						v-else-if="getCredTestIcon(currentCard) === 'triangle-alert'"
						icon="triangle-alert"
						size="small"
						:class="$style.error"
					/>

					<N8nText
						v-if="isCardComplete(currentCard)"
						data-test-id="instance-ai-workflow-setup-step-check"
						:class="$style.completeLabel"
						size="medium"
						color="success"
					>
						<N8nIcon icon="check" size="large" />
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</header>

				<!-- Content -->
				<div v-if="!isTriggerOnly(currentCard)" :class="$style.content">
					<div
						v-if="currentCard.credentialType && isStoreReady && isFirstCardInCredGroup(currentCard)"
						:class="$style.credentialContainer"
					>
						<NodeCredentials
							v-if="cardHasExistingCredentials(currentCard)"
							:node="cardNodeUi(currentCard)"
							:override-cred-type="currentCard.credentialType"
							:project-id="projectId"
							standalone
							hide-issues
							@credential-selected="onCredentialSelected(currentCard, $event)"
						>
							<template v-if="nodeNames.length > 1" #label-postfix>
								<N8nTooltip placement="top">
									<template #content>
										{{ nodeNamesTooltip }}
									</template>
									<N8nText
										data-test-id="instance-ai-workflow-setup-nodes-hint"
										size="small"
										color="text-light"
									>
										{{
											i18n.baseText('instanceAi.workflowSetup.usedByNodes', {
												adjustToNumber: nodeNames.length,
												interpolate: { count: String(nodeNames.length) },
											})
										}}
									</N8nText>
								</N8nTooltip>
							</template>
						</NodeCredentials>
						<N8nButton
							v-else
							:label="i18n.baseText('instanceAi.credential.setupButton')"
							data-test-id="instance-ai-workflow-setup-credential-button"
							@click="
								openNewCredentialForSection(
									currentCard.credentialType!,
									currentCard.nodes[0]
										? credGroupKey(currentCard.nodes[0])
										: currentCard.credentialType!,
								)
							"
						/>
					</div>

					<!-- Parameter editing via ParameterInputList -->
					<ParameterInputList
						v-if="cardHasParamWork(currentCard) && getCardSimpleParameters(currentCard).length > 0"
						:parameters="getCardSimpleParameters(currentCard)"
						:node-values="{ parameters: currentCardNode?.parameters ?? {} }"
						:node="currentCardNode ?? undefined"
						:hide-delete="true"
						:remove-first-parameter-margin="true"
						path="parameters"
						:options-overrides="{ hideExpressionSelector: true, hideFocusPanelButton: true }"
						@value-changed="onParameterValueChanged(currentCard, $event)"
					/>

					<!-- Link to configure complex parameters in NDV -->
					<N8nLink
						v-if="cardHasParamWork(currentCard) && getCardNestedParameterCount(currentCard) > 0"
						data-test-id="instance-ai-workflow-setup-configure-link"
						:underline="true"
						theme="text"
						size="medium"
						@click="openNdv(currentCard)"
					>
						{{
							i18n.baseText('instanceAi.workflowSetup.configureParameters' as BaseTextKey, {
								adjustToNumber: getCardNestedParameterCount(currentCard),
								interpolate: { count: String(getCardNestedParameterCount(currentCard)) },
							})
						}}
					</N8nLink>
				</div>

				<!-- Listening callout for webhook triggers -->
				<div
					v-if="
						currentCard.isTrigger &&
						currentCard.isFirstTrigger &&
						getTriggerResult(currentCard)?.status === 'listening'
					"
					:class="$style.listeningCallout"
				>
					<N8nIcon icon="spinner" color="primary" spin size="small" :class="$style.loading" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.workflowSetup.triggerListening') }}
					</N8nText>
				</div>

				<!-- Error banner (shown when apply fails, user can retry) -->
				<div v-if="applyError" :class="$style.errorBanner">
					<N8nIcon icon="triangle-alert" size="small" :class="$style.error" />
					<N8nText size="small" color="text-dark">{{ applyError }}</N8nText>
				</div>

				<!-- Footer -->
				<ConfirmationFooter layout="row-between">
					<div :class="$style.footerNav">
						<N8nButton
							v-if="showArrows"
							variant="ghost"
							size="xsmall"
							icon-only
							:disabled="isPrevDisabled"
							data-test-id="instance-ai-workflow-setup-prev"
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
							data-test-id="instance-ai-workflow-setup-next"
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
							:label="i18n.baseText('instanceAi.workflowSetup.later')"
							data-test-id="instance-ai-workflow-setup-later"
							@click="handleLater"
						/>

						<N8nButton
							v-if="currentCard.isTestable && currentCard.isTrigger && currentCard.isFirstTrigger"
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.testTrigger')"
							:disabled="isTriggerTestDisabled(currentCard)"
							data-test-id="instance-ai-workflow-setup-test-trigger"
							@click="handleTestTrigger(currentCard.nodes.find((n) => n.isTrigger)!.node.name)"
						/>

						<N8nButton
							size="medium"
							:class="$style.actionButton"
							:disabled="!anyCardComplete"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							data-test-id="instance-ai-workflow-setup-apply-button"
							@click="handleApply"
						/>
					</div>
				</ConfirmationFooter>
			</div>

			<!-- Grouped display card -->
			<div
				v-else-if="currentDisplayCard?.type === 'group'"
				data-test-id="instance-ai-workflow-setup-card"
				:class="[$style.card, { [$style.completed]: isDisplayCardComplete(currentDisplayCard) }]"
			>
				<!-- Group header: parent node name + completion -->
				<header :class="$style.header">
					<N8nIcon icon="robot" size="small" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ currentDisplayCard.group.parentNode.name }}
					</N8nText>

					<N8nText
						v-if="isDisplayCardComplete(currentDisplayCard)"
						data-test-id="instance-ai-workflow-setup-step-check"
						:class="$style.completeLabel"
						size="medium"
						color="success"
					>
						<N8nIcon icon="check" size="large" />
						{{ i18n.baseText('generic.complete') }}
					</N8nText>
				</header>

				<!-- Parent section (if parent has credentials/params) -->
				<template v-if="currentDisplayCard.group.parentCard">
					<ExpressionContextProvider :node-name="currentDisplayCard.group.parentNode.name">
						<div :class="$style.content">
							<div
								v-if="
									currentDisplayCard.group.parentCard.credentialType &&
									isStoreReady &&
									isFirstCardInCredGroup(currentDisplayCard.group.parentCard)
								"
								:class="$style.credentialContainer"
							>
								<NodeCredentials
									v-if="cardHasExistingCredentials(currentDisplayCard.group.parentCard)"
									:node="cardNodeUi(currentDisplayCard.group.parentCard)"
									:override-cred-type="currentDisplayCard.group.parentCard.credentialType"
									:project-id="projectId"
									standalone
									hide-issues
									@credential-selected="
										onCredentialSelected(currentDisplayCard.group.parentCard, $event)
									"
								/>
								<N8nButton
									v-else
									:label="i18n.baseText('instanceAi.credential.setupButton')"
									@click="
										openNewCredentialForSection(
											currentDisplayCard.group.parentCard.credentialType!,
											currentDisplayCard.group.parentCard.nodes[0]
												? credGroupKey(currentDisplayCard.group.parentCard.nodes[0])
												: currentDisplayCard.group.parentCard.credentialType!,
										)
									"
								/>
							</div>

							<ParameterInputList
								v-if="
									cardHasParamWork(currentDisplayCard.group.parentCard) &&
									getCardSimpleParameters(currentDisplayCard.group.parentCard).length > 0
								"
								:parameters="getCardSimpleParameters(currentDisplayCard.group.parentCard)"
								:node-values="{
									parameters:
										workflowsStore.getNodeByName(currentDisplayCard.group.parentNode.name)
											?.parameters ?? {},
								}"
								:node="
									workflowsStore.getNodeByName(currentDisplayCard.group.parentNode.name) ??
									undefined
								"
								:hide-delete="true"
								:remove-first-parameter-margin="true"
								path="parameters"
								:options-overrides="{
									hideExpressionSelector: true,
									hideFocusPanelButton: true,
								}"
								@value-changed="
									onParameterValueChanged(currentDisplayCard.group.parentCard, $event)
								"
							/>
						</div>
					</ExpressionContextProvider>
				</template>

				<!-- Subnode sections -->
				<div v-for="subnodeCard in currentDisplayCard.group.subnodeCards" :key="subnodeCard.id">
					<ExpressionContextProvider :node-name="subnodeCard.nodes[0].node.name">
						<div :class="$style.content">
							<N8nText size="small" color="text-light" bold>
								{{ subnodeCard.nodes[0].node.name }}
							</N8nText>

							<div
								v-if="
									subnodeCard.credentialType && isStoreReady && isFirstCardInCredGroup(subnodeCard)
								"
								:class="$style.credentialContainer"
							>
								<NodeCredentials
									v-if="cardHasExistingCredentials(subnodeCard)"
									:node="cardNodeUi(subnodeCard)"
									:override-cred-type="subnodeCard.credentialType"
									:project-id="projectId"
									standalone
									hide-issues
									@credential-selected="onCredentialSelected(subnodeCard, $event)"
								/>
								<N8nButton
									v-else
									:label="i18n.baseText('instanceAi.credential.setupButton')"
									@click="
										openNewCredentialForSection(
											subnodeCard.credentialType!,
											subnodeCard.nodes[0]
												? credGroupKey(subnodeCard.nodes[0])
												: subnodeCard.credentialType!,
										)
									"
								/>
							</div>

							<ParameterInputList
								v-if="
									cardHasParamWork(subnodeCard) && getCardSimpleParameters(subnodeCard).length > 0
								"
								:parameters="getCardSimpleParameters(subnodeCard)"
								:node-values="{
									parameters:
										workflowsStore.getNodeByName(subnodeCard.nodes[0].node.name)?.parameters ?? {},
								}"
								:node="workflowsStore.getNodeByName(subnodeCard.nodes[0].node.name) ?? undefined"
								:hide-delete="true"
								:remove-first-parameter-margin="true"
								path="parameters"
								:options-overrides="{
									hideExpressionSelector: true,
									hideFocusPanelButton: true,
								}"
								@value-changed="onParameterValueChanged(subnodeCard, $event)"
							/>
						</div>
					</ExpressionContextProvider>
				</div>

				<!-- Listening callout for webhook triggers in grouped cards -->
				<div
					v-if="
						getGroupPrimaryTriggerCard(currentDisplayCard.group)?.isTrigger &&
						getGroupPrimaryTriggerCard(currentDisplayCard.group)?.isFirstTrigger &&
						getTriggerResult(getGroupPrimaryTriggerCard(currentDisplayCard.group)!)?.status ===
							'listening'
					"
					:class="$style.listeningCallout"
				>
					<N8nIcon icon="spinner" color="primary" spin size="small" :class="$style.loading" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.workflowSetup.triggerListening') }}
					</N8nText>
				</div>

				<!-- Error banner -->
				<div v-if="applyError" :class="$style.errorBanner">
					<N8nIcon icon="triangle-alert" size="small" :class="$style.error" />
					<N8nText size="small" color="text-dark">{{ applyError }}</N8nText>
				</div>

				<!-- Footer -->
				<ConfirmationFooter layout="row-between">
					<div :class="$style.footerNav">
						<N8nButton
							v-if="showArrows"
							variant="ghost"
							size="xsmall"
							icon-only
							:disabled="isPrevDisabled"
							data-test-id="instance-ai-workflow-setup-prev"
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
							data-test-id="instance-ai-workflow-setup-next"
							aria-label="Next step"
							@click="wrappedGoToNext"
						>
							<N8nIcon icon="chevron-right" size="xsmall" />
						</N8nButton>
					</div>

					<div :class="$style.footerActions">
						<N8nButton
							variant="outline"
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.later')"
							data-test-id="instance-ai-workflow-setup-later"
							@click="handleLater"
						/>

						<N8nButton
							v-if="
								getGroupPrimaryTriggerCard(currentDisplayCard.group)?.isTestable &&
								getGroupPrimaryTriggerCard(currentDisplayCard.group)?.isTrigger
							"
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.testTrigger')"
							:disabled="
								isTriggerTestDisabled(getGroupPrimaryTriggerCard(currentDisplayCard.group)!)
							"
							data-test-id="instance-ai-workflow-setup-test-trigger"
							@click="
								handleTestTrigger(
									getGroupPrimaryTriggerCard(currentDisplayCard.group)!.nodes.find(
										(n) => n.isTrigger,
									)!.node.name,
								)
							"
						/>

						<N8nButton
							size="small"
							:class="$style.actionButton"
							:disabled="!anyCardComplete"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							data-test-id="instance-ai-workflow-setup-apply-button"
							@click="handleApply"
						/>
					</div>
				</ConfirmationFooter>
			</div>
		</template>

		<div v-else-if="isApplying" :class="$style.submitted">
			<N8nIcon icon="spinner" color="primary" spin size="small" :class="$style.loading" />
			<span>{{ i18n.baseText('instanceAi.workflowSetup.applying') }}</span>
		</div>

		<div v-else :class="$style.submitted">
			<template v-if="isDeferred">
				<N8nIcon icon="arrow-right" size="small" :class="$style.skippedIcon" />
				<span>{{ i18n.baseText('instanceAi.workflowSetup.deferred') }}</span>
			</template>
			<template v-else-if="isPartial">
				<N8nIcon icon="check" size="small" :class="$style.partialIcon" />
				<span>{{ i18n.baseText('instanceAi.workflowSetup.partiallyApplied') }}</span>
			</template>
			<template v-else>
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{ i18n.baseText('instanceAi.workflowSetup.applied') }}</span>
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

.confirmCard {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.confirmSummary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.confirmList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.confirmItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
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

.listeningCallout {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm) var(--spacing--2xs);
}

.errorBanner {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--color--danger--tint-4);
	border-radius: var(--radius);
	margin: 0 var(--spacing--sm);
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

.success {
	color: var(--color--success);
}

.error {
	color: var(--color--danger);
}

.loading {
	color: var(--color--text--tint-1);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
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

.partialIcon {
	color: var(--color--warning);
}

.skippedIcon {
	color: var(--color--text--tint-2);
}
</style>
