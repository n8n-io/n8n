<script lang="ts" setup>
import { getWorkflow as fetchWorkflowApi } from '@/app/api/workflows';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import { useWizardNavigation } from '@/features/ai/shared/composables/useWizardNavigation';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useExpressionResolveCtx } from '@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx';
import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	IWorkflowDb,
} from '@/Interface';
import type {
	InstanceAiCredentialFlow,
	InstanceAiToolCallState,
	InstanceAiWorkflowSetupNode,
} from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nLink, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { NodeHelpers, isResourceLocatorValue, type INodeProperties } from 'n8n-workflow';
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';

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
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();
const rootStore = useRootStore();
const ndvStore = useNDVStore();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
const HTTP_REQUEST_TOOL_NODE_TYPE = 'n8n-nodes-base.httpRequestTool';

const NESTED_PARAM_TYPES = new Set([
	'collection',
	'fixedCollection',
	'resourceMapper',
	'filter',
	'assignmentCollection',
]);

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
// Expression context for ParameterInputList
// ---------------------------------------------------------------------------

const currentCardNode = computed<INodeUi | null>(() => {
	if (!currentCard.value) return null;
	return workflowsStore.getNodeByName(currentCard.value.nodes[0].node.name) ?? null;
});

const expressionResolveCtx = useExpressionResolveCtx(currentCardNode);
provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);

// ---------------------------------------------------------------------------
// Workflow store loading — needed so ParameterInputList can resolve nodes
// ---------------------------------------------------------------------------

let previousWorkflow: IWorkflowDb | null = null;

// ---------------------------------------------------------------------------
// Parameter computation from node type definitions
// ---------------------------------------------------------------------------

const isNestedParam = (p: INodeProperties) =>
	NESTED_PARAM_TYPES.has(p.type) || p.typeOptions?.multipleValues === true;

function getCardParameters(card: SetupCard): INodeProperties[] {
	if (!card.hasParamIssues) return [];
	const req = card.nodes[0];
	const nodeType = nodeTypesStore.getNodeType(req.node.type, req.node.typeVersion);
	if (!nodeType?.properties) return [];

	const issueParamNames = Object.keys(req.parameterIssues ?? {});
	const node = workflowsStore.getNodeByName(req.node.name);
	if (!node) return [];

	return nodeType.properties.filter(
		(prop) =>
			issueParamNames.includes(prop.name) &&
			NodeHelpers.displayParameter(node.parameters, prop, node, nodeType),
	);
}

function getCardSimpleParameters(card: SetupCard): INodeProperties[] {
	return getCardParameters(card).filter((p) => !isNestedParam(p));
}

function getCardNestedParameterCount(card: SetupCard): number {
	return getCardParameters(card).filter(isNestedParam).length;
}

function openNdv(card: SetupCard): void {
	ndvStore.setActiveNodeName(card.nodes[0].node.name, 'other');
}

// ---------------------------------------------------------------------------
// State — selections keyed by CARD ID (not credential type)
// ---------------------------------------------------------------------------

const isSubmitted = ref(false);
const isDeferred = ref(false);
const isPartial = ref(false);
const isApplying = ref(false);
const isStoreReady = ref(false);
const applyError = ref<string | null>(null);
const showFullWizard = ref(false);
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

/** Check if a parameter value is meaningfully set (not empty, null, or an empty resource locator). */
function isParamValueSet(val: unknown): boolean {
	if (val === undefined || val === null || val === '') return false;
	if (isResourceLocatorValue(val)) {
		return val.value !== '' && val.value !== null && val.value !== undefined;
	}
	return true;
}

/** Seed parameter values from existing node parameters for cards with param issues. */
function initParamValues() {
	for (const card of cards.value) {
		if (!card.hasParamIssues) continue;
		const req = card.nodes[0];
		const nodeName = req.node.name;
		if (paramValues.value[nodeName]) continue;

		const issueParamNames = Object.keys(req.parameterIssues ?? {});
		const nodeParams = req.node.parameters;
		const seeded: Record<string, unknown> = {};
		for (const paramName of issueParamNames) {
			const existing = nodeParams[paramName];
			if (isParamValueSet(existing)) {
				seeded[paramName] = existing;
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

/** Set a parameter value. */
function setParamValue(nodeName: string, paramName: string, value: unknown): void {
	if (!paramValues.value[nodeName]) {
		paramValues.value[nodeName] = {};
	}
	paramValues.value[nodeName][paramName] = value;
}

/** Bridge ParameterInputList events to both local paramValues AND the workflow store node. */
function onParameterValueChanged(card: SetupCard, parameterData: IUpdateInformation): void {
	const nodeName = card.nodes[0].node.name;
	const paramName = parameterData.name.replace(/^parameters\./, '');

	// 1. Update local paramValues (used by buildNodeParameters on Apply)
	setParamValue(nodeName, paramName, parameterData.value);

	// 2. Update workflow store node (needed for ParameterInputList reactivity,
	//    dependent param resolution, and loadOptions calls)
	const canvasNode = workflowsStore.getNodeByName(nodeName);
	if (canvasNode) {
		canvasNode.parameters = { ...canvasNode.parameters, [paramName]: parameterData.value };
	}
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
		const params = getCardParameters(card);
		const nodeName = card.nodes[0].node.name;
		for (const param of params) {
			const val = paramValues.value[nodeName]?.[param.name];
			if (!isParamValueSet(val)) return true;
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

	// Parameter issues check
	if (card.hasParamIssues) {
		const params = getCardParameters(card);
		const nodeName = card.nodes[0].node.name;
		for (const param of params) {
			const val = paramValues.value[nodeName]?.[param.name];
			if (!isParamValueSet(val)) return false;
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

const anyCardComplete = computed(() => cards.value.some((c) => isCardComplete(c)));

const allPreResolved = computed(() => props.setupRequests.every((r) => !r.needsAction));

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

// Listen for credential creation to auto-select newly created credentials
// when using the setup button path (no NodeCredentials dropdown rendered)
const stopCreateListener = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential') return;
	after((newCred) => {
		if (!newCred || typeof newCred !== 'object' || !('id' in newCred)) return;
		const card = currentCard.value;
		if (!card?.credentialType) return;
		const cred = newCred as { id: string; type: string };
		if (cred.type === card.credentialType) {
			selections.value[card.id] = cred.id;
		}
	});
});

function cardHasExistingCredentials(card: SetupCard): boolean {
	if (!card.credentialType) return false;
	const firstReq = card.nodes[0];
	return (
		(firstReq?.existingCredentials?.length ?? 0) > 0 ||
		(credentialsStore.getUsableCredentialByType(card.credentialType)?.length ?? 0) > 0
	);
}

function openNewCredentialForCard(card: SetupCard) {
	if (!card.credentialType) return;
	uiStore.openNewCredential(card.credentialType, false, false, props.projectId);
}

onUnmounted(() => {
	stopDeleteListener();
	stopCreateListener();
	if (previousWorkflow) {
		workflowsStore.setWorkflow(previousWorkflow);
	}
});

onMounted(async () => {
	// Deduplicate node type infos for fetching
	const nodeInfos = props.setupRequests
		.map((req) => ({ name: req.node.type, version: req.node.typeVersion }))
		.filter(
			(info, i, arr) =>
				arr.findIndex((x) => x.name === info.name && x.version === info.version) === i,
		);

	// Ensure stores are populated: credentials, credential types, node types,
	// and the workflow itself (so ParameterInputList can access nodes).
	try {
		await Promise.all([
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(false),
			nodeTypesStore.getNodesInformation(nodeInfos),
		]);
	} catch (error) {
		console.warn('Failed to preload credentials/node types for Instance AI workflow setup', error);
	}

	// Load the AI-created workflow into workflowsStore so ParameterInputList
	// can access nodes, connections, and the workflow ID for resource locator
	// API calls. Save and restore previous state on unmount.
	try {
		const workflowData = await fetchWorkflowApi(rootStore.restApiContext, props.workflowId);
		previousWorkflow = { ...workflowsStore.workflow };
		workflowsStore.setWorkflow(workflowData);
	} catch (error) {
		console.warn('Failed to fetch workflow for Instance AI setup', error);
	}

	isStoreReady.value = true;

	const firstIncomplete = cards.value.findIndex((c) => !isCardComplete(c));
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
	const node = toNodeUi(card.nodes[0]);
	const selectedId = card.credentialType ? selections.value[card.id] : undefined;
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

/** Build nodeParameters from paramValues + store node (for NDV-edited params). */
function buildNodeParameters(): Record<string, Record<string, unknown>> | undefined {
	const result: Record<string, Record<string, unknown>> = {};
	let hasValues = false;

	for (const card of cards.value) {
		if (!card.hasParamIssues) continue;
		const nodeName = card.nodes[0].node.name;
		const issueParamNames = Object.keys(card.nodes[0].parameterIssues ?? {});

		const merged: Record<string, unknown> = {};
		for (const paramName of issueParamNames) {
			// Only include values that were pre-filled by AI (seeded via initParamValues)
			// or explicitly edited by the user (set via onParameterValueChanged)
			const val = paramValues.value[nodeName]?.[paramName];
			if (isParamValueSet(val)) {
				merged[paramName] = val;
				hasValues = true;
			}
		}
		if (Object.keys(merged).length > 0) {
			result[nodeName] = merged;
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

	// Sync credential to workflow store node — needed so ResourceLocator
	// component sends the correct credential in loadOptions API calls
	if (credentialId && card.credentialType) {
		for (const req of card.nodes) {
			const storeNode = workflowsStore.getNodeByName(req.node.name);
			if (storeNode) {
				const cred =
					req.existingCredentials?.find((c) => c.id === credentialId) ??
					credentialsStore.getCredentialById(credentialId);
				if (cred) {
					storeNode.credentials = {
						...storeNode.credentials,
						[card.credentialType]: { id: cred.id, name: cred.name },
					};
				}
			}
		}
	}
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

async function handleLater() {
	isSubmitted.value = true;
	isDeferred.value = true;

	const success = await store.confirmAction(props.requestId, false);
	if (success) {
		store.resolveConfirmation(props.requestId, 'deferred');
	} else {
		isSubmitted.value = false;
		isDeferred.value = false;
	}
}
</script>

<template>
	<div :class="$style.root">
		<template v-if="!isSubmitted && !isApplying">
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
				<footer :class="$style.footer">
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
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.workflowSetup.later')"
							data-test-id="instance-ai-workflow-setup-later"
							@click="handleLater"
						/>
						<N8nButton
							size="small"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							data-test-id="instance-ai-workflow-setup-apply-button"
							@click="handleApply"
						/>
					</div>
				</footer>
			</div>
			<div
				v-else-if="currentCard"
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
					<div
						v-if="currentCard.credentialType && isStoreReady"
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
							@click="openNewCredentialForCard(currentCard)"
						/>
					</div>

					<!-- Parameter editing via ParameterInputList -->
					<ParameterInputList
						v-if="currentCard.hasParamIssues && getCardSimpleParameters(currentCard).length > 0"
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
						v-if="currentCard.hasParamIssues && getCardNestedParameterCount(currentCard) > 0"
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
							variant="outline"
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
							:label="i18n.baseText('instanceAi.credential.continueButton')"
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
	// border-top: var(--border);
	// background: var(--color--background--shade-1);
	// padding: var(--spacing--xs);
}

.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	// background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);

	&.completed {
		border-color: var(--color--success);
	}
}

.confirmCard {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-color: var(--color--success);
	border-radius: var(--radius);
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
