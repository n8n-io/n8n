<script lang="ts" setup>
import { getWorkflow as fetchWorkflowApi } from '@/app/api/workflows';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useTelemetry } from '@/app/composables/useTelemetry';
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
import {
	type ICredentialDataDecryptedObject,
	NodeConnectionTypes,
	NodeHelpers,
	isResourceLocatorValue,
	type INodeProperties,
} from 'n8n-workflow';
import { computed, defineComponent, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { getNodeParametersIssues } from '@/features/setupPanel/setupPanel.utils';
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

interface SetupCardGroup {
	parentNode: InstanceAiWorkflowSetupNode['node'];
	parentCard?: SetupCard;
	subnodeCards: SetupCard[];
}

type DisplayCard = { type: 'single'; card: SetupCard } | { type: 'group'; group: SetupCardGroup };

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
const telemetry = useTelemetry();
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
// Tracked parameter names — grows over time as live validation discovers new fields
// ---------------------------------------------------------------------------

const trackedParamNames = ref(new Map<string, Set<string>>());

function initTrackedParamNames() {
	for (const req of props.setupRequests) {
		if (req.parameterIssues && Object.keys(req.parameterIssues).length > 0) {
			trackedParamNames.value.set(req.node.name, new Set(Object.keys(req.parameterIssues)));
		}
	}
}
initTrackedParamNames();

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

// Credential group keys that need per-node splitting due to live-discovered param work.
// Derived from raw setupRequests + trackedParamNames to avoid a reactive cycle with cards.
const liveEscalatedCredTypes = computed(() => {
	const escalated = new Set<string>();

	// Group raw setup requests by credGroupKey (same logic as the cards computed)
	const groupMembers = new Map<string, InstanceAiWorkflowSetupNode[]>();
	for (const req of props.setupRequests) {
		if (!req.credentialType) continue;
		const key = credGroupKey(req);
		const existing = groupMembers.get(key);
		if (existing) existing.push(req);
		else groupMembers.set(key, [req]);
	}

	// A group needs escalation if ANY member node has tracked param work
	for (const [key, members] of groupMembers) {
		if (members.length <= 1) continue;
		for (const req of members) {
			if (trackedParamNames.value.has(req.node.name)) {
				escalated.add(key);
				break;
			}
		}
	}

	return escalated;
});

const cards = computed((): SetupCard[] => {
	// Pre-scan: if ANY node in a credential group has param issues,
	// the entire group is escalated to per-node mode (matches upstream).
	const escalatedCredTypes = new Set<string>();
	for (const req of props.setupRequests) {
		if (req.credentialType && req.parameterIssues && Object.keys(req.parameterIssues).length > 0) {
			escalatedCredTypes.add(credGroupKey(req));
		}
	}

	// Merge in live-discovered escalations
	for (const key of liveEscalatedCredTypes.value) {
		escalatedCredTypes.add(key);
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
// Display cards — groups AI parent nodes with their sub-nodes for rendering
// ---------------------------------------------------------------------------

const displayCards = computed((): DisplayCard[] => {
	// Build directSubnodes: Map<parentName, Set<subnodeName>> from connections
	const directSubnodes = new Map<string, Set<string>>();
	const connectionsByDest = workflowsStore.connectionsByDestinationNode;
	for (const [destName, conns] of Object.entries(connectionsByDest)) {
		if (!conns || typeof conns !== 'object') continue;
		for (const connType of Object.keys(conns)) {
			if (connType === NodeConnectionTypes.Main) continue;
			const groups = (conns as Record<string, Array<Array<{ node: string }>>>)[connType];
			if (!Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const conn of group) {
					if (conn.node) {
						if (!directSubnodes.has(destName)) {
							directSubnodes.set(destName, new Set());
						}
						directSubnodes.get(destName)!.add(conn.node);
					}
				}
			}
		}
	}

	// Find all node names that are subnodes of something
	const allSubnodeNames = new Set<string>();
	for (const subs of directSubnodes.values()) {
		for (const s of subs) allSubnodeNames.add(s);
	}

	// Find root parents (have subnodes but are NOT themselves subnodes)
	const rootParents = new Set<string>();
	for (const parentName of directSubnodes.keys()) {
		if (!allSubnodeNames.has(parentName)) {
			rootParents.add(parentName);
		}
	}

	// Collect transitive subnodes per root parent
	const transitiveSubnodes = new Map<string, Set<string>>();
	for (const root of rootParents) {
		const collected = new Set<string>();
		const queue = [...(directSubnodes.get(root) ?? [])];
		while (queue.length > 0) {
			const name = queue.pop()!;
			if (collected.has(name)) continue;
			collected.add(name);
			const children = directSubnodes.get(name);
			if (children) queue.push(...children);
		}
		if (collected.size > 0) {
			transitiveSubnodes.set(root, collected);
		}
	}

	// Map flat cards into display cards
	const cardsByNodeName = new Map<string, SetupCard>();
	for (const card of cards.value) {
		for (const req of card.nodes) {
			cardsByNodeName.set(req.node.name, card);
		}
	}

	const usedCardIds = new Set<string>();
	const result: DisplayCard[] = [];

	for (const card of cards.value) {
		if (usedCardIds.has(card.id)) continue;

		// Check if this card's primary node is a root parent
		const primaryNodeName = card.nodes[0]?.node.name;
		const subnodeNames = primaryNodeName ? transitiveSubnodes.get(primaryNodeName) : undefined;

		if (subnodeNames && subnodeNames.size > 0) {
			// Collect subnode cards
			const subnodeCards: SetupCard[] = [];
			for (const subName of subnodeNames) {
				const subCard = cardsByNodeName.get(subName);
				if (subCard && !usedCardIds.has(subCard.id)) {
					subnodeCards.push(subCard);
					usedCardIds.add(subCard.id);
				}
			}

			if (subnodeCards.length > 0) {
				usedCardIds.add(card.id);
				result.push({
					type: 'group',
					group: {
						parentNode: card.nodes[0].node,
						parentCard: card,
						subnodeCards,
					},
				});
				continue;
			}
		}

		// Check if this card's node is a subnode of a root parent
		let isSubnodeOfRoot = false;
		for (const [rootName, subs] of transitiveSubnodes) {
			if (primaryNodeName && subs.has(primaryNodeName)) {
				// This card will be included as part of a group, check if root parent has a card
				const rootCard = cardsByNodeName.get(rootName);
				if (rootCard && !usedCardIds.has(rootCard.id)) {
					// Root parent hasn't been processed yet — it will collect this card later
					isSubnodeOfRoot = true;
				}
				break;
			}
		}

		if (!isSubnodeOfRoot) {
			usedCardIds.add(card.id);
			result.push({ type: 'single', card });
		}
	}

	return result;
});

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

// ---------------------------------------------------------------------------
// Parameter computation from node type definitions
// ---------------------------------------------------------------------------

const isNestedParam = (p: INodeProperties) =>
	NESTED_PARAM_TYPES.has(p.type) || p.typeOptions?.multipleValues === true;

// Returns true if this card has any tracked or live parameter issues.
// Checks ALL nodes in the card (not just nodes[0]), so multi-node credential cards
// detect param work on any node.
function cardHasParamWork(card: SetupCard): boolean {
	for (const req of card.nodes) {
		const nodeName = req.node.name;
		if (trackedParamNames.value.has(nodeName)) return true;
		const storeNode = workflowsStore.getNodeByName(nodeName);
		if (storeNode) {
			const liveIssues = getNodeParametersIssues(nodeTypesStore, storeNode);
			if (Object.keys(liveIssues).length > 0) return true;
		}
	}
	return false;
}

function getCardParameters(card: SetupCard): INodeProperties[] {
	if (!cardHasParamWork(card)) return [];
	const req = card.nodes[0];
	const nodeType = nodeTypesStore.getNodeType(req.node.type, req.node.typeVersion);
	if (!nodeType?.properties) return [];

	const nodeName = req.node.name;
	const tracked =
		trackedParamNames.value.get(nodeName) ?? new Set(Object.keys(req.parameterIssues ?? {}));
	const node = workflowsStore.getNodeByName(nodeName);
	if (!node) return [];

	return nodeType.properties.filter(
		(prop) =>
			tracked.has(prop.name) && NodeHelpers.displayParameter(node.parameters, prop, node, nodeType),
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
// State
// ---------------------------------------------------------------------------

const isSubmitted = ref(false);
const isDeferred = ref(false);
const isPartial = ref(false);
const isApplying = ref(false);
const isStoreReady = ref(false);
const applyError = ref<string | null>(null);
const showFullWizard = ref(false);
const paramValues = ref<Record<string, Record<string, unknown>>>({});

// Tracks which credential group key (or section node name) initiated a "create credential" action.
const activeCredentialTarget = ref<{ groupKey: string; credentialType: string } | null>(null);

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
// Group-level credential selection — single source of truth
// ---------------------------------------------------------------------------

// Shared credential selection keyed by credGroupKey — single source of truth
// for all cards in the same credential group (including escalated per-node cards).
const credGroupSelections = ref<Record<string, string | null>>({});

function initCredGroupSelections() {
	// Build a group map first so we scan ALL cards per group, not bail early.
	const groupMap = new Map<string, SetupCard[]>();
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		const key = card.nodes[0] ? credGroupKey(card.nodes[0]) : card.credentialType;
		const existing = groupMap.get(key);
		if (existing) existing.push(card);
		else groupMap.set(key, [card]);
	}

	for (const [key, groupCards] of groupMap) {
		// Search ALL cards in the group for an assigned credential
		let selectedId: string | null = null;

		for (const card of groupCards) {
			for (const req of card.nodes) {
				const credId = req.node.credentials?.[card.credentialType!]?.id;
				if (credId) {
					selectedId = credId;
					break;
				}
			}
			if (selectedId) break;
		}

		if (!selectedId) {
			// Auto-select: check first card's existing credentials
			const firstCard = groupCards[0];
			const firstReq = firstCard.nodes[0];
			if (firstReq.existingCredentials?.length === 1) {
				selectedId = firstReq.existingCredentials[0].id;
			} else if (firstCard.isAutoApplied && firstReq.existingCredentials?.length) {
				selectedId = firstReq.existingCredentials[0].id;
			}
		}

		credGroupSelections.value[key] = selectedId;
	}
}
initCredGroupSelections();

function getCardCredentialId(card: SetupCard): string | null {
	if (!card.credentialType) return null;
	const key = card.nodes[0] ? credGroupKey(card.nodes[0]) : card.credentialType;
	return credGroupSelections.value[key] ?? null;
}

function isFirstCardInCredGroup(card: SetupCard): boolean {
	if (!card.credentialType || !card.nodes[0]) return true;
	const key = credGroupKey(card.nodes[0]);
	return (
		cards.value.find((c) => c.credentialType && c.nodes[0] && credGroupKey(c.nodes[0]) === key)
			?.id === card.id
	);
}

// ---------------------------------------------------------------------------
// Credential testing helpers
// ---------------------------------------------------------------------------

function isCredentialTypeTestable(credentialTypeName: string): boolean {
	const credType = credentialsStore.getCredentialTypeByName(credentialTypeName);
	if (credType?.test) return true;
	const nodesWithAccess = credentialsStore.getNodesWithAccess(credentialTypeName);
	return nodesWithAccess.some((node) =>
		node.credentials?.some((cred) => cred.name === credentialTypeName && cred.testedBy),
	);
}

async function testCredentialInBackground(
	credentialId: string,
	credentialName: string,
	credentialType: string,
) {
	if (!isCredentialTypeTestable(credentialType)) return;
	if (
		credentialsStore.isCredentialTestedOk(credentialId) ||
		credentialsStore.isCredentialTestPending(credentialId)
	) {
		return;
	}

	try {
		const credentialResponse = await credentialsStore.getCredentialData({ id: credentialId });
		if (!credentialResponse?.data || typeof credentialResponse.data === 'string') return;

		// Re-check after the async fetch
		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		const { ownedBy, sharedWithProjects, oauthTokenData, ...data } =
			credentialResponse.data as Record<string, unknown>;

		// OAuth credentials: token presence = success
		if (oauthTokenData) {
			credentialsStore.credentialTestResults.set(credentialId, 'success');
			return;
		}

		await credentialsStore.testCredential({
			id: credentialId,
			name: credentialName,
			type: credentialType,
			data: data as ICredentialDataDecryptedObject,
		});
	} catch {
		// Test failure is tracked in the store as a side effect
	}
}

// ---------------------------------------------------------------------------
// Shared credential group operations
// ---------------------------------------------------------------------------

function setCredentialForGroup(groupKey: string, credentialType: string, credentialId: string) {
	// 1. Update shared group state
	credGroupSelections.value[groupKey] = credentialId;

	// 2. Sync credential to workflow store nodes for ALL nodes in the group
	for (const c of cards.value) {
		if (!c.credentialType || !c.nodes[0]) continue;
		if (credGroupKey(c.nodes[0]) !== groupKey) continue;
		for (const req of c.nodes) {
			const storeNode = workflowsStore.getNodeByName(req.node.name);
			if (storeNode) {
				const cred =
					req.existingCredentials?.find((cr) => cr.id === credentialId) ??
					credentialsStore.getCredentialById(credentialId);
				if (cred) {
					storeNode.credentials = {
						...storeNode.credentials,
						[credentialType]: { id: cred.id, name: cred.name },
					};
				}
			}
		}
	}

	// 3. Trigger background test
	const cred = credentialsStore.getCredentialById(credentialId);
	if (cred) {
		void testCredentialInBackground(credentialId, cred.name, credentialType);
	}
}

function clearCredentialForGroup(groupKey: string, credentialType: string) {
	// 1. Clear shared group state
	credGroupSelections.value[groupKey] = null;

	// 2. Remove credential from workflow store nodes for ALL nodes in the group
	for (const c of cards.value) {
		if (!c.credentialType || !c.nodes[0]) continue;
		if (credGroupKey(c.nodes[0]) !== groupKey) continue;
		for (const req of c.nodes) {
			const storeNode = workflowsStore.getNodeByName(req.node.name);
			if (storeNode && storeNode.credentials?.[credentialType]) {
				const { [credentialType]: _, ...remaining } = storeNode.credentials;
				storeNode.credentials = remaining as typeof storeNode.credentials;
			}
		}
	}
}

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
		if (!cardHasParamWork(card)) continue;
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

/**
 * Returns the credential test result for a card.
 * - Store result (keyed by credential ID): authoritative for any credential the client has tested
 * - Backend result (card.credentialTestResult): only valid when the selected credential
 *   matches the original backend-assigned credential (unchanged selection)
 * - Returns undefined when no result is available yet (triggers spinner for testable types)
 */
function getEffectiveCredTestResult(
	card: SetupCard,
): { success: boolean; message?: string } | undefined {
	const selectedId = getCardCredentialId(card);
	if (!selectedId) return undefined;

	// 1. Store has a definitive result for this credential — always trust it
	if (credentialsStore.isCredentialTestedOk(selectedId)) {
		return { success: true };
	}
	if (credentialsStore.isCredentialTestPending(selectedId)) {
		return undefined; // in-progress
	}
	const storeResult = credentialsStore.credentialTestResults.get(selectedId);
	if (storeResult === 'error') {
		return { success: false };
	}

	// 2. Backend-provided result — only valid if the selection hasn't changed.
	const originalCredId = card.nodes[0]?.node.credentials?.[card.credentialType!]?.id;
	if (card.credentialTestResult && selectedId === originalCredId) {
		return card.credentialTestResult;
	}

	// 3. No result available
	return undefined;
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
	if (card.credentialType && !getCardCredentialId(card)) return true;
	// Disabled if credential test failed
	const testResult = getEffectiveCredTestResult(card);
	if (testResult !== undefined && !testResult.success) return true;
	// Disabled if parameter issues not resolved (live validation)
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
// Completion — first-trigger-only logic
// ---------------------------------------------------------------------------

function isCardComplete(card: SetupCard): boolean {
	if (card.credentialType) {
		const selectedId = getCardCredentialId(card);
		if (!selectedId) return false;

		if (isCredentialTypeTestable(card.credentialType)) {
			// Testable credentials must have a positive test result to be complete.
			if (!credentialsStore.isCredentialTestedOk(selectedId)) {
				// Exception: trust backend result if selection is unchanged
				const originalCredId = card.nodes[0]?.node.credentials?.[card.credentialType]?.id;
				if (!(card.credentialTestResult?.success && selectedId === originalCredId)) {
					return false;
				}
			}
		}
		// Non-testable credentials are complete when simply selected
	}

	// Parameter issues check — live validation
	if (cardHasParamWork(card)) {
		for (const req of card.nodes) {
			const storeNode = workflowsStore.getNodeByName(req.node.name);
			if (storeNode) {
				const liveIssues = getNodeParametersIssues(nodeTypesStore, storeNode);
				if (Object.keys(liveIssues).length > 0) return false;
			}
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

// Used for navigation auto-advance and initial step selection only
function isDisplayCardComplete(dc: DisplayCard): boolean {
	if (dc.type === 'single') return isCardComplete(dc.card);
	const { group } = dc;
	if (group.parentCard && !isCardComplete(group.parentCard)) return false;
	return group.subnodeCards.every((card) => isCardComplete(card));
}

// For a grouped display card, find the leaf card that owns the trigger test action.
function getGroupPrimaryTriggerCard(group: SetupCardGroup): SetupCard | null {
	const allCards = group.parentCard
		? [group.parentCard, ...group.subnodeCards]
		: group.subnodeCards;
	return allCards.find((c) => c.isTestable && c.isTrigger && c.isFirstTrigger) ?? null;
}

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
	() => currentDisplayCard.value && isDisplayCardComplete(currentDisplayCard.value),
	(complete, prevComplete) => {
		// Auto-advance only when not manually navigating
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

// Live parameter issue watcher — discovers new conditional required fields
watch(
	() => {
		const result = new Map<string, string[]>();
		for (const card of cards.value) {
			for (const req of card.nodes) {
				const nodeName = req.node.name;
				const storeNode = workflowsStore.getNodeByName(nodeName);
				if (!storeNode) continue;
				const liveIssues = getNodeParametersIssues(nodeTypesStore, storeNode);
				if (Object.keys(liveIssues).length > 0) {
					result.set(nodeName, Object.keys(liveIssues));
				}
			}
		}
		return result;
	},
	(liveIssuesByNode) => {
		for (const [nodeName, issueNames] of liveIssuesByNode) {
			const existing = trackedParamNames.value.get(nodeName);
			if (existing) {
				for (const name of issueNames) existing.add(name);
			} else {
				trackedParamNames.value.set(nodeName, new Set(issueNames));
			}
		}
	},
	{ immediate: true },
);

// Clear selection when a credential is deleted from the store
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

// Listen for credential creation to auto-select newly created credentials
const stopCreateListener = credentialsStore.$onAction(({ name, after }) => {
	if (name !== 'createNewCredential') return;
	after((newCred) => {
		if (!newCred || typeof newCred !== 'object' || !('id' in newCred)) return;
		const cred = newCred as { id: string; type: string };

		// If we have an explicit target from a grouped card section, use it
		if (activeCredentialTarget.value && cred.type === activeCredentialTarget.value.credentialType) {
			setCredentialForGroup(
				activeCredentialTarget.value.groupKey,
				activeCredentialTarget.value.credentialType,
				cred.id,
			);
			activeCredentialTarget.value = null;
			return;
		}

		// Fallback for single cards: match against current display card
		const dc = currentDisplayCard.value;
		if (dc?.type === 'single' && dc.card.credentialType === cred.type) {
			const key = dc.card.nodes[0] ? credGroupKey(dc.card.nodes[0]) : dc.card.credentialType;
			setCredentialForGroup(key, cred.type, cred.id);
		}

		activeCredentialTarget.value = null;
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

function openNewCredentialForSection(credentialType: string, groupKey: string) {
	activeCredentialTarget.value = { groupKey, credentialType };
	uiStore.openNewCredential(credentialType, false, false, props.projectId);
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

	// Run initial credential tests, deduped by credential ID
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

/** True when this card only has a trigger (no credentials and no param issues) */
function isTriggerOnly(card: SetupCard): boolean {
	return card.isTrigger && !card.credentialType && !cardHasParamWork(card);
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
	const selectedId = getCardCredentialId(card);
	if (!selectedId) return null;

	const testResult = getEffectiveCredTestResult(card);
	if (testResult === undefined) {
		// No result yet — show spinner if credential is testable
		return isCredentialTypeTestable(card.credentialType) ? 'spinner' : null;
	}
	if (testResult.success) return 'check';
	return 'triangle-alert';
}

// ---------------------------------------------------------------------------
// Build per-node credential mapping from card-scoped selections
// ---------------------------------------------------------------------------

function buildNodeCredentials(): Record<string, Record<string, string>> {
	const result: Record<string, Record<string, string>> = {};
	for (const card of cards.value) {
		if (!card.credentialType) continue;
		const selectedId = getCardCredentialId(card);
		if (!selectedId) continue;

		// Skip cards where the credential test explicitly failed
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

/** Build nodeParameters from paramValues + store node (for NDV-edited params). */
function buildNodeParameters(): Record<string, Record<string, unknown>> | undefined {
	const result: Record<string, Record<string, unknown>> = {};
	let hasValues = false;

	for (const card of cards.value) {
		if (!cardHasParamWork(card)) continue;
		for (const req of card.nodes) {
			const nodeName = req.node.name;
			const paramNames =
				trackedParamNames.value.get(nodeName) ?? new Set(Object.keys(req.parameterIssues ?? {}));
			if (paramNames.size === 0) continue;
			const merged: Record<string, unknown> = {};
			for (const paramName of paramNames) {
				let val = paramValues.value[nodeName]?.[paramName];
				if (!isParamValueSet(val)) {
					val = workflowsStore.getNodeByName(nodeName)?.parameters[paramName];
				}
				if (isParamValueSet(val)) {
					merged[paramName] = val;
					hasValues = true;
				}
			}
			if (Object.keys(merged).length > 0) {
				result[nodeName] = merged;
			}
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
	const key = card.nodes[0] ? credGroupKey(card.nodes[0]) : card.credentialType;

	if (credentialId) {
		setCredentialForGroup(key, card.credentialType, credentialId);
	} else {
		clearCredentialForGroup(key, card.credentialType);
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

function trackSetupInput() {
	const tc = store.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
	const skipped: Array<{ label: string; options: string[] }> = [];
	for (const card of cards.value) {
		const name = card.nodes[0]?.node.name ?? card.id;
		if (isCardComplete(card)) {
			provided.push({ label: name, options: [], option_chosen: 'configured' });
		} else {
			skipped.push({ label: name, options: [] });
		}
	}
	telemetry.track('User finished providing input', {
		thread_id: store.currentThreadId,
		input_thread_id: inputThreadId,
		instance_id: useRootStore().instanceId,
		type: 'setup',
		provided_inputs: provided,
		skipped_inputs: skipped,
		num_tasks: cards.value.length,
	});
}

async function handleApply() {
	const nodeCredentials = buildNodeCredentials();
	const nodeParameters = buildNodeParameters();

	trackSetupInput();

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
	// In wizard mode: skip current card and advance to the next one.
	// The skipped card will have no selection, so buildNodeCredentials()
	// naturally excludes it from the apply payload.
	if (!allPreResolved.value || showFullWizard.value) {
		const dc = currentDisplayCard.value;

		if (dc?.type === 'single' && dc.card.credentialType && dc.card.nodes[0]) {
			const key = credGroupKey(dc.card.nodes[0]);
			clearCredentialForGroup(key, dc.card.credentialType);
		}

		if (dc?.type === 'group') {
			// Don't clear any leaf state — just advance navigation.
			if (!isNextDisabled.value) {
				goToNext();
				return;
			}
			if (anyCardComplete.value) {
				void handleApply();
				return;
			}
		}

		if (!isNextDisabled.value) {
			goToNext();
			return;
		}

		// Last step: if any card has been completed, auto-apply the partial set
		if (anyCardComplete.value) {
			void handleApply();
			return;
		}
	}

	// No cards completed at all (or confirm mode) — defer the whole setup
	trackSetupInput();
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
	<div>
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
			<!-- Single display card -->
			<div
				v-else-if="currentDisplayCard?.type === 'single' && currentCard"
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

				<!-- Error banner -->
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
				</footer>
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
