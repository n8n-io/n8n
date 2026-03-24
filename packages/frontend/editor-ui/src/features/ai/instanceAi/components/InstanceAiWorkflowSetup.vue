<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	InstanceAiWorkflowSetupNode,
	InstanceAiCredentialFlow,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SetupCard {
	id: string;
	credentialType?: string;
	nodes: InstanceAiWorkflowSetupNode[];
	isTrigger: boolean;
	isFirstTrigger: boolean;
	isTestable: boolean;
	credentialTestResult?: { success: boolean; message?: string };
	isAutoApplied: boolean;
	hasParamIssues: boolean;
}

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
const nodeHelpers = useNodeHelpers();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
const HTTP_REQUEST_TOOL_NODE_TYPE = 'n8n-nodes-base.httpRequestTool';

// ---------------------------------------------------------------------------
// Card grouping — preserves backend position order, merges same-credential nodes
// ---------------------------------------------------------------------------

function credGroupKey(req: InstanceAiWorkflowSetupNode): string {
	const credType = req.credentialType!;
	const isHttpRequest =
		req.node.type === HTTP_REQUEST_NODE_TYPE || req.node.type === HTTP_REQUEST_TOOL_NODE_TYPE;
	if (isHttpRequest) {
		const url = String(req.node.parameters.url ?? '');
		// Expression URLs can't be grouped — each node gets its own card
		if (url.startsWith('=')) {
			return `${credType}:http:expr:${req.node.name}`;
		}
		return `${credType}:http:${url}`;
	}
	return credType;
}

const cards = computed((): SetupCard[] => {
	// Pre-scan: if ANY node in a credential group has param issues,
	// the entire group is escalated to per-node mode (matches upstream).
	const escalatedCredTypes = new Set<string>();
	for (const req of props.setupRequests) {
		if (req.credentialType && req.parameterIssues && Object.keys(req.parameterIssues).length > 0) {
			escalatedCredTypes.add(credGroupKey(req));
		}
	}

	const ordered: SetupCard[] = [];
	const credCardByKey = new Map<string, SetupCard>();

	for (const req of props.setupRequests) {
		const hasParamIssues =
			req.parameterIssues !== undefined && Object.keys(req.parameterIssues).length > 0;

		if (req.credentialType) {
			const key = credGroupKey(req);

			// If any node in this credential group has param issues,
			// every node in the group gets its own per-node card
			if (escalatedCredTypes.has(key)) {
				ordered.push({
					id: `node-${req.node.id}`,
					credentialType: req.credentialType,
					nodes: [req],
					isTrigger: req.isTrigger,
					isFirstTrigger: req.isFirstTrigger ?? false,
					isTestable: req.isTestable ?? false,
					credentialTestResult: req.credentialTestResult,
					isAutoApplied: req.isAutoApplied ?? false,
					hasParamIssues,
				});
			} else {
				const existing = credCardByKey.get(key);
				if (existing) {
					existing.nodes.push(req);
					if (req.isTrigger) existing.isTrigger = true;
					if (req.isFirstTrigger) existing.isFirstTrigger = true;
					if (req.isTestable) existing.isTestable = true;
					if (req.isAutoApplied) existing.isAutoApplied = true;
					if (req.credentialTestResult && !existing.credentialTestResult) {
						existing.credentialTestResult = req.credentialTestResult;
					}
				} else {
					const card: SetupCard = {
						id: `cred-${key}`,
						credentialType: req.credentialType,
						nodes: [req],
						isTrigger: req.isTrigger,
						isFirstTrigger: req.isFirstTrigger ?? false,
						isTestable: req.isTestable ?? false,
						credentialTestResult: req.credentialTestResult,
						isAutoApplied: req.isAutoApplied ?? false,
						hasParamIssues: false,
					};
					credCardByKey.set(key, card);
					ordered.push(card);
				}
			}
		} else if (req.isTrigger || hasParamIssues) {
			ordered.push({
				id: hasParamIssues ? `param-${req.node.id}` : `trigger-${req.node.id}`,
				nodes: [req],
				isTrigger: req.isTrigger,
				isFirstTrigger: req.isFirstTrigger ?? false,
				isTestable: req.isTestable ?? false,
				isAutoApplied: false,
				hasParamIssues,
			});
		}
	}

	return ordered;
});

// ---------------------------------------------------------------------------
// Wizard navigation
// ---------------------------------------------------------------------------

const totalSteps = computed(() => cards.value.length);
const { currentStepIndex, isPrevDisabled, isNextDisabled, goToNext, goToPrev, goToStep } =
	useWizardNavigation({ totalSteps });

const currentCard = computed(() => cards.value[currentStepIndex.value]);
const showArrows = computed(() => totalSteps.value > 1);

// ---------------------------------------------------------------------------
// State — selections keyed by CARD ID (not credential type)
// ---------------------------------------------------------------------------

const isSubmitted = ref(false);
const isDeferred = ref(false);
const isPartial = ref(false);
const isApplying = ref(false);
const applyError = ref<string | null>(null);
const selections = ref<Record<string, string | null>>({});
const paramValues = ref<Record<string, Record<string, unknown>>>({});
const credTestOverrides = ref<Record<string, { success: boolean; message?: string } | null>>({});

const triggerTestResults = computed(() => {
	const results: Record<string, InstanceAiWorkflowSetupNode['triggerTestResult']> = {};
	for (const req of props.setupRequests) {
		if (req.triggerTestResult) {
			results[req.node.name] = req.triggerTestResult;
		}
	}
	return results;
});

// ---------------------------------------------------------------------------
// Auto-credential selection — keyed by card ID
// ---------------------------------------------------------------------------

function initSelections() {
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		if (selections.value[card.id] !== undefined) continue;

		const credType = card.credentialType;

		// 1. Pre-fill from any node in the group that already has this credential assigned
		const nodeWithCred = card.nodes.find((req) => req.node.credentials?.[credType]?.id);
		if (nodeWithCred) {
			selections.value[card.id] = nodeWithCred.node.credentials![credType].id;
			continue;
		}

		// 2. Auto-select if exactly one credential available (check first node's list)
		const firstReq = card.nodes[0];
		if (firstReq.existingCredentials?.length === 1) {
			selections.value[card.id] = firstReq.existingCredentials[0].id;
		} else if (card.isAutoApplied && firstReq.existingCredentials?.length) {
			// 3. Auto-selected by backend (most recent)
			selections.value[card.id] = firstReq.existingCredentials[0].id;
		} else {
			selections.value[card.id] = null;
		}
	}
}
initSelections();

/** Seed parameter values from existing node parameters for cards with param issues. */
function initParamValues() {
	for (const card of cards.value) {
		if (!card.hasParamIssues) continue;
		const req = card.nodes[0];
		const nodeName = req.node.name;
		if (paramValues.value[nodeName]) continue;

		const editableParams = req.editableParameters ?? [];
		const nodeParams = req.node.parameters;
		const seeded: Record<string, unknown> = {};
		for (const param of editableParams) {
			const existing = nodeParams[param.name];
			if (existing !== undefined && existing !== null && existing !== '') {
				seeded[param.name] = existing;
			}
		}
		if (Object.keys(seeded).length > 0) {
			paramValues.value[nodeName] = seeded;
		}
	}
}
initParamValues();

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

/** Get all editable parameters for a card (from the first node's editableParameters). */
function getCardEditableParams(
	card: SetupCard,
): NonNullable<InstanceAiWorkflowSetupNode['editableParameters']> {
	if (!card.hasParamIssues) return [];
	const req = card.nodes[0];
	return req.editableParameters ?? [];
}

/** Get parameter issues for a card (from the first node). */
function getCardParamIssues(card: SetupCard): Record<string, string[]> {
	if (!card.hasParamIssues) return {};
	const req = card.nodes[0];
	return req.parameterIssues ?? {};
}

/** Get the current value for a node parameter from paramValues. */
function getParamValue(nodeName: string, paramName: string): unknown {
	return paramValues.value[nodeName]?.[paramName];
}

/** Resolve a select option's string value back to its original typed value. */
function resolveOptionValue(
	options: Array<{ name: string; value: string | number | boolean }>,
	stringValue: string,
): string | number | boolean {
	const match = options.find((o) => String(o.value) === stringValue);
	return match ? match.value : stringValue;
}

/** Parse a number input value — empty string produces undefined, not 0. */
function parseNumberInput(raw: string): number | undefined {
	if (raw === '') return undefined;
	const num = Number(raw);
	return Number.isNaN(num) ? undefined : num;
}

/** Set a parameter value. */
function setParamValue(nodeName: string, paramName: string, value: unknown): void {
	if (!paramValues.value[nodeName]) {
		paramValues.value[nodeName] = {};
	}
	paramValues.value[nodeName][paramName] = value;
}

// ---------------------------------------------------------------------------
// Credential test result helpers
// ---------------------------------------------------------------------------

function getEffectiveCredTestResult(
	card: SetupCard,
): { success: boolean; message?: string } | undefined | null {
	if (card.id in credTestOverrides.value) {
		return credTestOverrides.value[card.id];
	}
	return card.credentialTestResult;
}

// ---------------------------------------------------------------------------
// Parameter validation helpers
// ---------------------------------------------------------------------------

function isParamValueValid(
	param: NonNullable<InstanceAiWorkflowSetupNode['editableParameters']>[number],
	value: unknown,
): boolean {
	if (value === undefined || value === null || value === '') return false;
	if (param.options && param.options.length > 0) {
		return param.options.some((opt) => String(opt.value) === String(value));
	}
	if (param.type === 'number') {
		return typeof value === 'number' && !Number.isNaN(value);
	}
	return true;
}

// ---------------------------------------------------------------------------
// Trigger test result helper
// ---------------------------------------------------------------------------

function getTriggerResult(
	card: SetupCard,
): InstanceAiWorkflowSetupNode['triggerTestResult'] | undefined {
	const triggerNode = card.nodes.find((n) => n.isTrigger);
	return triggerNode ? triggerTestResults.value[triggerNode.node.name] : undefined;
}

// ---------------------------------------------------------------------------
// Trigger test button disabled logic
// ---------------------------------------------------------------------------

function isTriggerTestDisabled(card: SetupCard): boolean {
	// Disabled if credential not selected
	if (card.credentialType && selections.value[card.id] === null) return true;
	// Disabled if credential test failed
	const testResult = getEffectiveCredTestResult(card);
	if (testResult !== undefined && testResult !== null && !testResult.success) return true;
	// Disabled if parameter issues not resolved
	if (card.hasParamIssues) {
		const editableParams = getCardEditableParams(card);
		const nodeName = card.nodes[0].node.name;
		for (const param of editableParams) {
			if (!isParamValueValid(param, getParamValue(nodeName, param.name))) return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Completion — first-trigger-only logic
// ---------------------------------------------------------------------------

function isCardComplete(card: SetupCard): boolean {
	if (card.credentialType) {
		const selectedId = selections.value[card.id];
		if (!selectedId) return false;
		const testResult = getEffectiveCredTestResult(card);
		// null = user changed credential, test cleared — not blocking
		// { success: false } = test failed — blocking
		if (testResult !== undefined && testResult !== null && !testResult.success) return false;
	}

	// Parameter issues check — type-aware validation
	if (card.hasParamIssues) {
		const editableParams = getCardEditableParams(card);
		const nodeName = card.nodes[0].node.name;
		for (const param of editableParams) {
			const val = getParamValue(nodeName, param.name);
			if (!isParamValueValid(param, val)) return false;
		}
	}

	// Trigger check — only the first trigger requires successful execution
	if (card.isTestable && card.isTrigger && card.isFirstTrigger) {
		const triggerNode = card.nodes.find((n) => n.isTrigger);
		const result = triggerNode ? triggerTestResults.value[triggerNode.node.name] : undefined;
		if (!result || result.status !== 'success') return false;
	}

	return true;
}

const allCardsComplete = computed(() => cards.value.every((c) => isCardComplete(c)));
const anyCardComplete = computed(() => cards.value.some((c) => isCardComplete(c)));
const isPartialApply = computed(() => anyCardComplete.value && !allCardsComplete.value);

// ---------------------------------------------------------------------------
// Auto-advance: only when a card transitions from incomplete -> complete
// (not when navigating to an already-complete card)
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
	() => currentCard.value && isCardComplete(currentCard.value),
	(complete, prevComplete) => {
		// Only auto-advance on a false->true transition (credential was just selected)
		// Skip if user just navigated to a card that was already complete
		if (!complete || prevComplete || userNavigated.value) {
			userNavigated.value = false;
			return;
		}
		const nextIncomplete = cards.value.findIndex(
			(c, idx) => idx > currentStepIndex.value && !isCardComplete(c),
		);
		if (nextIncomplete >= 0) {
			goToStep(nextIncomplete);
		}
	},
);

// Clear selection when a credential is deleted from the store
const stopDeleteListener = credentialsStore.$onAction(({ name, after, args }) => {
	if (name !== 'deleteCredential') return;
	after(() => {
		const deletedId = (args[0] as { id: string }).id;
		for (const [cardId, selectedId] of Object.entries(selections.value)) {
			if (selectedId === deletedId) {
				selections.value[cardId] = null;
			}
		}
	});
});

onUnmounted(() => {
	stopDeleteListener();
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
	} catch {
		// Credentials will be unavailable in the dropdown but the user can
		// still create new ones via the "Set up credential" button.
	}

	const firstIncomplete = cards.value.findIndex((c) => !isCardComplete(c));
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

function getCardTitle(card: SetupCard): string {
	if (card.nodes.length === 1) return card.nodes[0].node.name;
	if (card.credentialType) return getDisplayName(card.credentialType);
	return 'Setup';
}

function toNodeUi(setupNode: InstanceAiWorkflowSetupNode): INodeUi {
	return {
		id: setupNode.node.id,
		name: setupNode.node.name,
		type: setupNode.node.type,
		typeVersion: setupNode.node.typeVersion,
		position: setupNode.node.position,
		parameters: setupNode.node.parameters as INodeUi['parameters'],
		credentials: setupNode.node.credentials as INodeUi['credentials'],
	} as INodeUi;
}

function cardNodeUi(card: SetupCard): INodeUi {
	return toNodeUi(card.nodes[0]);
}

/** True when this card only has a trigger (no credentials and no param issues) */
function isTriggerOnly(card: SetupCard): boolean {
	return card.isTrigger && !card.credentialType && !card.hasParamIssues;
}

/** Use credential icon when it's a credential card */
function useCredentialIcon(card: SetupCard): boolean {
	return !!card.credentialType && !isTriggerOnly(card);
}

const nodeNames = computed(() => {
	const card = currentCard.value;
	if (!card) return [];
	return card.nodes.map((n) => n.node.name);
});

const nodeNamesTooltip = computed(() => nodeNames.value.join(', '));

function getCredTestIcon(card: SetupCard): 'spinner' | 'check' | 'triangle-alert' | null {
	if (!card.credentialType) return null;
	const selectedId = selections.value[card.id];
	if (!selectedId) return null;

	const testResult = getEffectiveCredTestResult(card);
	if (testResult === null) return null; // User changed credential, no test result
	if (card.isAutoApplied && testResult === undefined) return 'spinner';
	if (testResult?.success) return 'check';
	if (testResult !== undefined && !testResult.success) return 'triangle-alert';
	return null;
}

// ---------------------------------------------------------------------------
// Build per-node credential mapping from card-scoped selections
// ---------------------------------------------------------------------------

function buildNodeCredentials(): Record<string, Record<string, string>> {
	const result: Record<string, Record<string, string>> = {};
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		const selectedId = selections.value[card.id];
		if (!selectedId) continue;

		// Skip cards where the credential test explicitly failed
		const testResult = getEffectiveCredTestResult(card);
		if (testResult !== undefined && testResult !== null && !testResult.success) continue;

		for (const req of card.nodes) {
			if (!result[req.node.name]) {
				result[req.node.name] = {};
			}
			result[req.node.name][card.credentialType] = selectedId;
		}
	}
	return result;
}

/** Build nodeParameters from paramValues (only include entries with values). */
function buildNodeParameters(): Record<string, Record<string, unknown>> | undefined {
	const result: Record<string, Record<string, unknown>> = {};
	let hasValues = false;
	for (const [nodeName, params] of Object.entries(paramValues.value)) {
		const filtered: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(params)) {
			if (val !== undefined && val !== null && val !== '') {
				filtered[key] = val;
				hasValues = true;
			}
		}
		if (Object.keys(filtered).length > 0) {
			result[nodeName] = filtered;
		}
	}
	return hasValues ? result : undefined;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onCredentialSelected(card: SetupCard, updateInfo: INodeUpdatePropertiesInformation) {
	if (!card.credentialType) return;
	const credentialData = updateInfo.properties.credentials?.[card.credentialType];
	const credentialId = typeof credentialData === 'string' ? undefined : credentialData?.id;

	if (credentialId) {
		selections.value[card.id] = credentialId;
	} else {
		selections.value[card.id] = null;
	}
	// Clear stale backend test result — this credential hasn't been tested
	credTestOverrides.value[card.id] = null;
}

async function handleTestTrigger(nodeName: string) {
	const nodeCredentials = buildNodeCredentials();
	const nodeParameters = buildNodeParameters();

	applyError.value = null;

	const postSuccess = await store.confirmAction(
		props.requestId,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{
			action: 'test-trigger',
			testTriggerNode: nodeName,
			nodeCredentials,
			nodeParameters,
		},
	);

	if (!postSuccess) {
		applyError.value = 'Failed to send trigger test request. Try again.';
		return;
	}

	// Do NOT resolve the confirmation here. Two things can happen next:
	// 1. Happy path: the backend re-suspends with a NEW confirmation-request
	//    (new requestId). The new request appears in pendingConfirmations and
	//    replaces this card naturally. The OLD request gets resolved when the
	//    SSE confirmation-request event is processed (tool-call gets a new
	//    confirmation, clearing the old one).
	// 2. Failure path: the tool returns an error (e.g. credential apply failed
	//    before execution). The tool-result arrives via SSE. We watch for it
	//    and show the error inline so the user can fix and retry.
	const { promise, cancel } = waitForToolResult(props.requestId);
	cancelApplyWait = cancel;
	const toolResult = await promise;
	cancelApplyWait = null;

	// If we got a tool result, it means the tool finished WITHOUT re-suspending
	// (i.e. the failure path). Show the error.
	if (toolResult) {
		const error = toolResult.error as string | undefined;
		applyError.value = error ?? 'Trigger test failed';
	}
	// If toolResult is null (timeout), the re-suspension likely already happened
	// and a new confirmation-request replaced this component. Nothing to do.
}

/**
 * Apply the server's authoritative updatedNodes to the canvas.
 * Uses the backend result rather than local data to ensure the canvas
 * reflects the actual persisted state.
 */
function applyServerResultToCanvas(toolResult: Record<string, unknown>) {
	const updatedNodes = toolResult.updatedNodes as
		| Array<{
				id: string;
				name?: string;
				type: string;
				typeVersion: number;
				position: [number, number];
				parameters?: Record<string, unknown>;
				credentials?: Record<string, { id?: string; name: string }>;
		  }>
		| undefined;

	if (!updatedNodes) return;

	for (const serverNode of updatedNodes) {
		const canvasNode = workflowsStore.getNodeByName(serverNode.name ?? '');
		if (!canvasNode) continue;

		if (serverNode.credentials) {
			canvasNode.credentials = serverNode.credentials as INodeUi['credentials'];
		}
		if (serverNode.parameters) {
			canvasNode.parameters = serverNode.parameters as INodeUi['parameters'];
		}

		if (serverNode.name) {
			nodeHelpers.updateNodeParameterIssuesByName(serverNode.name);
			nodeHelpers.updateNodeCredentialIssuesByName(serverNode.name);
		}
	}
}

/** Watch for the tool-result SSE event and resolve when it arrives. */
function waitForToolResult(
	requestId: string,
	timeoutMs = 60_000,
): { promise: Promise<Record<string, unknown> | null>; cancel: () => void } {
	let stopWatch: (() => void) | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	const promise = new Promise<Record<string, unknown> | null>((resolve) => {
		// Check if already available
		const existing = store.findToolCallByRequestId(requestId);
		if (existing?.result !== undefined) {
			resolve(existing.result as Record<string, unknown>);
			return;
		}

		// Watch for the tool call result to appear
		stopWatch = watch(
			() => {
				const tc: InstanceAiToolCallState | undefined = store.findToolCallByRequestId(requestId);
				return tc?.result;
			},
			(result) => {
				if (result !== undefined) {
					cleanup();
					resolve(result as Record<string, unknown>);
				}
			},
		);

		timeoutId = setTimeout(() => {
			cleanup();
			resolve(null);
		}, timeoutMs);
	});

	function cleanup() {
		if (stopWatch) {
			stopWatch();
			stopWatch = null;
		}
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	return { promise, cancel: cleanup };
}

let cancelApplyWait: (() => void) | null = null;

onUnmounted(() => {
	cancelApplyWait?.();
});

async function handleApply() {
	const nodeCredentials = buildNodeCredentials();
	const nodeParameters = buildNodeParameters();

	isApplying.value = true;
	applyError.value = null;

	const postSuccess = await store.confirmAction(
		props.requestId,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{
			action: 'apply',
			nodeCredentials,
			nodeParameters,
		},
	);

	if (!postSuccess) {
		isApplying.value = false;
		applyError.value = 'Failed to send confirmation. Try again.';
		return;
	}

	// Wait for the actual tool result via SSE before updating the canvas.
	// IMPORTANT: resolveConfirmation() must happen AFTER we consume the result,
	// because resolving removes the item from pendingConfirmations, which unmounts
	// this component and cancels the watcher.
	const { promise, cancel } = waitForToolResult(props.requestId);
	cancelApplyWait = cancel;
	const toolResult = await promise;
	cancelApplyWait = null;

	isApplying.value = false;

	if (toolResult && (toolResult.success as boolean)) {
		applyServerResultToCanvas(toolResult);
		isSubmitted.value = true;
		isPartial.value = (toolResult.partial as boolean) ?? false;
		// Resolve only on success — this unmounts the component
		store.resolveConfirmation(props.requestId, 'approved');
	} else if (toolResult) {
		// Backend returned an error — keep the UI mounted so the user can retry
		applyError.value = (toolResult.error as string) ?? 'Apply failed';
	} else {
		// Timeout — keep the UI mounted so the user can retry.
		// We do NOT fall back to local mutation or mark as submitted,
		// because the backend state is unknown.
		applyError.value = 'Apply timed out — please try again.';
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
		<template v-if="!isSubmitted && !isApplying">
			<div
				v-if="currentCard"
				data-test-id="instance-ai-workflow-setup-card"
				:class="[$style.card, { [$style.completed]: isCardComplete(currentCard) }]"
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
					<div v-if="currentCard.credentialType" :class="$style.credentialContainer">
						<NodeCredentials
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
												interpolate: { count: String(nodeNames.length) },
											})
										}}
									</N8nText>
								</N8nTooltip>
							</template>
						</NodeCredentials>
					</div>

					<!-- Inline parameter editing -->
					<div
						v-if="currentCard.hasParamIssues && getCardEditableParams(currentCard).length > 0"
						:class="$style.paramSection"
					>
						<N8nText size="small" color="text-light" :class="$style.paramLabel">
							{{ i18n.baseText('instanceAi.workflowSetup.parameterIssues') }}
						</N8nText>
						<div
							v-for="param in getCardEditableParams(currentCard)"
							:key="param.name"
							:class="$style.paramField"
						>
							<label :class="$style.paramFieldLabel">
								<N8nText size="small" color="text-dark">
									{{ param.displayName }}
								</N8nText>
							</label>

							<!-- Options type: select (preserves original value type) -->
							<select
								v-if="param.options && param.options.length > 0"
								:class="$style.paramSelect"
								:value="String(getParamValue(currentCard.nodes[0].node.name, param.name) ?? '')"
								data-test-id="instance-ai-workflow-setup-param-select"
								@change="
									setParamValue(
										currentCard.nodes[0].node.name,
										param.name,
										resolveOptionValue(param.options!, ($event.target as HTMLSelectElement).value),
									)
								"
							>
								<option value="" disabled>
									{{ i18n.baseText('instanceAi.workflowSetup.selectOption') }}
								</option>
								<option v-for="opt in param.options" :key="String(opt.value)" :value="opt.value">
									{{ opt.name }}
								</option>
							</select>

							<!-- Boolean type: checkbox -->
							<input
								v-else-if="param.type === 'boolean'"
								type="checkbox"
								:class="$style.paramCheckbox"
								:checked="Boolean(getParamValue(currentCard.nodes[0].node.name, param.name))"
								data-test-id="instance-ai-workflow-setup-param-checkbox"
								@change="
									setParamValue(
										currentCard.nodes[0].node.name,
										param.name,
										($event.target as HTMLInputElement).checked,
									)
								"
							/>

							<!-- Number type: number input -->
							<input
								v-else-if="param.type === 'number'"
								type="number"
								:class="$style.paramInput"
								:value="getParamValue(currentCard.nodes[0].node.name, param.name) ?? ''"
								:placeholder="param.default !== undefined ? String(param.default) : ''"
								data-test-id="instance-ai-workflow-setup-param-number"
								@input="
									setParamValue(
										currentCard.nodes[0].node.name,
										param.name,
										parseNumberInput(($event.target as HTMLInputElement).value),
									)
								"
							/>

							<!-- String type: text input -->
							<input
								v-else-if="param.type === 'string'"
								type="text"
								:class="$style.paramInput"
								:value="getParamValue(currentCard.nodes[0].node.name, param.name) ?? ''"
								:placeholder="param.default !== undefined ? String(param.default) : ''"
								data-test-id="instance-ai-workflow-setup-param-text"
								@input="
									setParamValue(
										currentCard.nodes[0].node.name,
										param.name,
										($event.target as HTMLInputElement).value,
									)
								"
							/>

							<!-- Other types: show issue text read-only -->
							<N8nText v-else size="small" color="text-light">
								{{ (getCardParamIssues(currentCard)[param.name] ?? []).join(', ') }}
							</N8nText>
						</div>
					</div>
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
					<N8nIcon icon="spinner" size="small" :class="$style.loading" />
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
				<footer :class="$style.footer">
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
							variant="ghost"
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.later')"
							data-test-id="instance-ai-workflow-setup-later"
							@click="handleLater"
						/>

						<N8nButton
							v-if="currentCard.isTestable && currentCard.isTrigger && currentCard.isFirstTrigger"
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.testTrigger')"
							:disabled="isTriggerTestDisabled(currentCard)"
							data-test-id="instance-ai-workflow-setup-test-trigger"
							@click="handleTestTrigger(currentCard.nodes.find((n) => n.isTrigger)!.node.name)"
						/>

						<N8nButton
							size="small"
							:class="$style.actionButton"
							:disabled="!anyCardComplete"
							:label="
								isPartialApply
									? i18n.baseText('instanceAi.workflowSetup.applyCompleted')
									: i18n.baseText('instanceAi.workflowSetup.apply')
							"
							data-test-id="instance-ai-workflow-setup-apply-button"
							@click="handleApply"
						/>
					</div>
				</footer>
			</div>
		</template>

		<div v-else-if="isApplying" :class="$style.submitted">
			<N8nIcon icon="spinner" size="small" :class="$style.loading" />
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

.paramSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.paramLabel {
	margin-bottom: var(--spacing--4xs);
}

.paramField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.paramFieldLabel {
	display: block;
}

.paramInput,
.paramSelect {
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	background-color: var(--color--background);
	color: var(--color--text);

	&:focus {
		outline: none;
		border-color: var(--color--primary);
	}
}

.paramCheckbox {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	cursor: pointer;
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
