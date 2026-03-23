import { computed, ref, watch, type Ref } from 'vue';

import type { INodeUi } from '@/Interface';
import {
	type ICredentialDataDecryptedObject,
	type INode,
	isResourceLocatorValue,
} from 'n8n-workflow';
import type { SetupCardItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useCredentialsStore,
	listenForCredentialChanges,
} from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

import {
	getNodeCredentialTypes,
	groupCredentialsByType,
	isCredentialCardComplete,
	isNodeSetupComplete,
	isHttpRequestNodeType,
	buildTriggerSetupState,
	getNodeParametersIssues,
	type CompletionContext,
} from '@/features/setupPanel/setupPanel.utils';
import {
	isPlaceholderValue,
	findPlaceholderDetails,
} from '@/features/ai/assistant/composables/useBuilderTodos';
import { PLACEHOLDER_FILLED_AT_EXECUTION_TIME, MANUAL_TRIGGER_NODE_TYPE } from '@/app/constants';

import { sortNodesByExecutionOrder } from '@/app/utils/workflowUtils';
import { useUIStore } from '@/app/stores/ui.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';

/**
 * Composable that manages workflow setup state for credential configuration.
 * Cards are grouped by credential type (one card per unique credential type)
 * with trigger nodes getting their own dedicated cards (test button only).
 * @param nodes Optional sub-set of nodes to check (defaults to full workflow)
 */
export const useWorkflowSetupState = (
	nodes?: Ref<INodeUi[]>,
	options?: {
		/** Additional parameter names per node that should be shown in setup cards
		 * (e.g., parameters with placeholder values from the AI builder). */
		additionalParametersByNode?: Ref<Map<string, string[]>>;
	},
) => {
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const environmentsStore = useEnvironmentsStore();
	const templatesStore = useTemplatesStore();
	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);

	const sourceNodes = computed(() => nodes?.value ?? workflowDocumentStore.value?.allNodes ?? []);

	/**
	 * Synchronous: detects resource locator parameters from the current workflow
	 * nodes using node type definitions and current parameter values.
	 * Only active for template-based workflows (templateId is set).
	 */
	const resourceLocatorsByNode = computed(() => {
		if (!workflowDocumentStore?.value?.meta?.templateId) return new Map<string, string[]>();

		const paramMap = new Map<string, string[]>();
		for (const node of sourceNodes.value) {
			const paramNames = new Set<string>();

			// From node type definition
			const nodeTypeInfo = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (nodeTypeInfo) {
				for (const prop of nodeTypeInfo.properties) {
					if (prop.type === 'resourceLocator') {
						paramNames.add(prop.name);
					}
				}
			}

			// From current parameter values (catches dynamic/nested parameters not in the type definition)
			const findResourceLocators = (obj: Record<string, unknown>) => {
				for (const [key, value] of Object.entries(obj)) {
					if (isResourceLocatorValue(value)) {
						paramNames.add(key);
					} else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
						findResourceLocators(value as Record<string, unknown>);
					}
				}
			};
			findResourceLocators(node.parameters);

			if (paramNames.size > 0) {
				paramMap.set(node.name, Array.from(paramNames));
			}
		}
		return paramMap;
	});

	/**
	 * Async supplement: additional parameter names from the upstream template
	 * (required parameters that were missing in the template).
	 */
	const templateMissingParams = ref(new Map<string, string[]>());

	/**
	 * Combined map of node name → parameter names that should always be shown.
	 * Merges synchronous resource locator detection, async template results,
	 * and any additional parameters (e.g., placeholder params from the builder).
	 */
	const templateParametersByNode = computed(() => {
		const merged = new Map<string, string[]>();

		const mergeInto = (source: Map<string, string[]>) => {
			for (const [nodeName, params] of source) {
				const existing = merged.get(nodeName);
				if (existing) {
					const combined = new Set([...existing, ...params]);
					merged.set(nodeName, Array.from(combined));
				} else {
					merged.set(nodeName, [...params]);
				}
			}
		};

		for (const [nodeName, params] of resourceLocatorsByNode.value) {
			merged.set(nodeName, [...params]);
		}

		mergeInto(templateMissingParams.value);

		if (options?.additionalParametersByNode?.value) {
			mergeInto(options.additionalParametersByNode.value);
		}

		// Merge sticky issue param names so parameters persist after issues are resolved
		for (const [nodeName, paramNames] of stickyIssueParamNames.value) {
			const existing = merged.get(nodeName);
			if (existing) {
				const combined = new Set([...existing, ...paramNames]);
				merged.set(nodeName, Array.from(combined));
			} else {
				merged.set(nodeName, Array.from(paramNames));
			}
		}

		return merged;
	});

	const nodeHasTemplateParams = (nodeName: string) =>
		(templateParametersByNode.value.get(nodeName)?.length ?? 0) > 0;

	/**
	 * Checks if a node has any unfilled resource locator template parameters.
	 * Recursively searches the node's parameters for resource locators matching
	 * the template parameter names and returns true if any have empty values.
	 */
	const hasUnfilledTemplateParams = (node: INodeUi): boolean => {
		const templateParams = templateParametersByNode.value.get(node.name);
		if (!templateParams || templateParams.length === 0) return false;

		const paramNamesToCheck = new Set(templateParams);
		const findUnfilled = (obj: Record<string, unknown>): boolean => {
			for (const [key, value] of Object.entries(obj)) {
				if (paramNamesToCheck.has(key)) {
					if (isResourceLocatorValue(value)) {
						if (!value.value || isPlaceholderValue(value.value)) return true;
					} else if (
						value === '' ||
						value === null ||
						value === undefined ||
						isPlaceholderValue(value)
					) {
						return true;
					} else if (typeof value === 'object' && value !== null) {
						if (findPlaceholderDetails(value).length > 0) return true;
					}
				}
				if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
					if (findUnfilled(value as Record<string, unknown>)) return true;
				}
			}
			return false;
		};
		return findUnfilled(node.parameters);
	};

	async function loadTemplateMissingParameters() {
		const templateId = workflowDocumentStore?.value?.meta?.templateId;
		if (!templateId) return;

		try {
			const template =
				templatesStore.getFullTemplateById(templateId) ??
				(await templatesStore.fetchTemplateById(templateId));

			if (!template?.workflow?.nodes) return;

			const paramMap = new Map<string, string[]>();
			for (const templateNode of template.workflow.nodes) {
				// Required parameters that are missing in the template
				const issues = getNodeParametersIssues(nodeTypesStore, templateNode as unknown as INode);
				const paramNames = Object.keys(issues);
				if (paramNames.length > 0) {
					paramMap.set(templateNode.name, paramNames);
				}
			}
			templateMissingParams.value = paramMap;
		} catch {
			// Template fetch failed — resource locators still detected synchronously
		}
	}

	void loadTemplateMissingParameters();

	const getCredentialDisplayName = (credentialType: string): string => {
		const credentialTypeInfo = credentialsStore.getCredentialTypeByName(credentialType);
		return credentialTypeInfo?.displayName ?? credentialType;
	};

	/**
	 * Checks whether a credential type has a test mechanism defined.
	 * Returns true if either the credential type itself defines a `test` block
	 * or any node with access declares `testedBy` for it.
	 * Non-testable types (e.g. Header Auth) are considered complete when just set.
	 */
	const isCredentialTypeTestable = (credentialTypeName: string): boolean => {
		const credType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (credType?.test) return true;

		const nodesWithAccess = credentialsStore.getNodesWithAccess(credentialTypeName);
		return nodesWithAccess.some((node) =>
			node.credentials?.some((cred) => cred.name === credentialTypeName && cred.testedBy),
		);
	};

	const isTriggerNode = (node: INodeUi): boolean => {
		return nodeTypesStore.isTriggerNode(node.type);
	};

	const hasTriggerExecutedSuccessfully = (nodeName: string): boolean => {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(nodeName);
		return runData !== null && runData.length > 0;
	};

	/**
	 * Credential IDs that were auto-applied on initial load (not manually selected by the user).
	 * Auto-applied credentials require node execution before being marked complete.
	 */
	const autoAppliedCredentialIds = ref(new Set<string>());

	/**
	 * Attempts to resolve an expression URL synchronously.
	 * Succeeds for static expressions (e.g. `={{ "https://example.com" }}`) and
	 * expressions using only environment variables (e.g. `={{ $vars.BASE_URL + '/api' }}`).
	 * Returns null when the expression requires run data that isn't available.
	 */
	const resolveExpressionUrl = (expressionUrl: string, nodeName: string): string | null => {
		try {
			const result = workflowsStore.workflowObject.expression.getParameterValue(
				expressionUrl,
				null,
				0,
				0,
				nodeName,
				[],
				'manual',
				{
					$execution: {
						id: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
						mode: 'test',
						resumeUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
						resumeFormUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
					},
					$vars: environmentsStore.variablesAsObject,
				},
			);
			return typeof result === 'string' ? result : null;
		} catch {
			return null;
		}
	};

	// --- Sticky tracking sets (reactive) ---
	// These ensure cards don't disappear once shown, even when issues resolve temporarily.
	// Updated via watchers instead of inside computed getters to avoid side effects.
	const stickyNodeIds = ref(new Set<string>());
	const stickyParamNodeIds = ref(new Set<string>());
	const stickyNodeCredentials = ref(new Set<string>());
	const stickyCredTypesWithParams = ref(new Set<string>());

	/**
	 * Tracks parameter names that have appeared in parameterIssues per node (keyed by node name).
	 * Once a parameter name is recorded, it persists even after the user fills it in
	 * (which resolves the issue). Merged into `templateParametersByNode` so the existing
	 * infrastructure (nodeHasTemplateParams, hasUnfilledTemplateParams, additionalParameterNames)
	 * all work consistently.
	 */
	const stickyIssueParamNames = ref(new Map<string, Set<string>>());

	/**
	 * Get nodes that require setup:
	 * - Nodes with credential requirements
	 * - Trigger nodes (regardless of credentials)
	 * - Nodes previously shown (sticky)
	 * Sorted by execution order (grouped by trigger, DFS through connections).
	 */
	const nodesRequiringSetup = computed(() => {
		const nodesForSetup = sourceNodes.value
			.filter((node) => !node.disabled)
			.map((node) => ({
				node,
				credentialTypes: getNodeCredentialTypes(nodeTypesStore, node),
				parameterIssues: getNodeParametersIssues(nodeTypesStore, node),
				isTrigger: isTriggerNode(node),
			}))
			.filter(
				({ credentialTypes, isTrigger, parameterIssues, node }) =>
					stickyNodeIds.value.has(node.id) ||
					credentialTypes.length > 0 ||
					isTrigger ||
					Object.keys(parameterIssues).length > 0 ||
					nodeHasTemplateParams(node.name),
			);

		const allNodeTypes: Record<string, string> = {};
		for (const node of sourceNodes.value) {
			allNodeTypes[node.name] = node.type;
		}

		return sortNodesByExecutionOrder(
			nodesForSetup,
			workflowsStore.connectionsBySourceNode,
			workflowsStore.connectionsByDestinationNode,
			allNodeTypes,
		);
	});

	// Persist node IDs and parameter issue names once shown so cards don't disappear
	watch(
		nodesRequiringSetup,
		(entries) => {
			for (const { node, parameterIssues } of entries) {
				stickyNodeIds.value.add(node.id);

				const issueNames = Object.keys(parameterIssues);
				if (issueNames.length > 0) {
					const existing = stickyIssueParamNames.value.get(node.name);
					if (existing) {
						for (const name of issueNames) existing.add(name);
					} else {
						stickyIssueParamNames.value.set(node.name, new Set(issueNames));
					}
				}
			}
		},
		{ immediate: true },
	);

	/**
	 * The name of the first (leftmost) trigger in the workflow.
	 * Only this trigger can be executed from setup cards; others are treated as regular nodes.
	 */
	const firstTriggerName = computed(() => {
		const first = nodesRequiringSetup.value.find(({ isTrigger }) => isTrigger);
		return first?.node.name ?? null;
	});

	/**
	 * All nodes that have credential requirements (includes both triggers and regular nodes).
	 */
	const nodesWithCredentials = computed(() =>
		nodesRequiringSetup.value.filter(({ credentialTypes }) => credentialTypes.length > 0),
	);

	const nodesWithMissingParameters = computed(() =>
		nodesRequiringSetup.value.filter(
			({ parameterIssues, node }) =>
				stickyParamNodeIds.value.has(node.id) ||
				Object.keys(parameterIssues).length > 0 ||
				nodeHasTemplateParams(node.name),
		),
	);

	// Persist parameter node IDs once shown
	watch(
		nodesWithMissingParameters,
		(entries) => {
			for (const { node } of entries) {
				stickyParamNodeIds.value.add(node.id);
			}
		},
		{ immediate: true },
	);

	/**
	 * Shared classification: which credential types require per-node cards?
	 * A credential type is per-node when ANY of its nodes have parameter issues or template params.
	 * Also includes historically-seen types to prevent cards from re-grouping.
	 */
	const perNodeCredTypes = computed(() => {
		const result = new Set(stickyCredTypesWithParams.value);
		for (const { credentialTypes, parameterIssues, node } of nodesRequiringSetup.value) {
			if (Object.keys(parameterIssues).length > 0 || nodeHasTemplateParams(node.name)) {
				for (const credType of credentialTypes) {
					result.add(credType);
				}
			}
		}
		return result;
	});

	// Persist per-node credential types once seen
	watch(
		perNodeCredTypes,
		(types) => {
			for (const credType of types) {
				stickyCredTypesWithParams.value.add(credType);
			}
		},
		{ immediate: true },
	);

	/**
	 * Builds a CompletionContext. When credentialType is provided and testable,
	 * includes the credential test check; otherwise omits it.
	 */
	const buildCompletionContext = (credentialType?: string): CompletionContext => ({
		firstTriggerName: firstTriggerName.value,
		hasTriggerExecuted: hasTriggerExecutedSuccessfully,
		isTriggerNode: (nodeType: string) => nodeTypesStore.isTriggerNode(nodeType),
		isCredentialTestedOk:
			credentialType && isCredentialTypeTestable(credentialType)
				? credentialsStore.isCredentialTestedOk
				: undefined,
		hasUnfilledTemplateParams,
	});

	/**
	 * Credential type states — one entry per unique credential type.
	 * Only includes credential types where NONE of the nodes have parameter issues.
	 * When nodes have both credentials and parameters, they're handled by nodeStates instead.
	 * Uses shared `perNodeCredTypes` for the grouping decision.
	 */
	const credentialTypeStates = computed(() => {
		const nodesWithoutParameters = nodesWithCredentials.value.filter(
			({ credentialTypes }) =>
				!credentialTypes.some((credType) => perNodeCredTypes.value.has(credType)),
		);

		const grouped = groupCredentialsByType(
			nodesWithoutParameters.map(({ node, credentialTypes }) => ({
				node,
				credentialTypes,
			})),
			getCredentialDisplayName,
			resolveExpressionUrl,
		);

		return grouped.map((state) => {
			const isAutoApplied =
				!!state.selectedCredentialId &&
				autoAppliedCredentialIds.value.has(state.selectedCredentialId);

			return {
				...state,
				isComplete: isCredentialCardComplete(state, buildCompletionContext(state.credentialType)),

				isAutoApplied,
			};
		});
	});

	/**
	 * Trigger states — one entry per trigger node that is NOT already covered
	 * by a credential card or a node card.
	 * Uses `perNodeCredTypes` to check node-card coverage without depending on `nodeStates`.
	 */
	const triggerStates = computed(() => {
		if (!firstTriggerName.value) return [];

		const triggerEntry = nodesRequiringSetup.value.find(
			({ isTrigger, node }) => isTrigger && node.name === firstTriggerName.value,
		);
		if (!triggerEntry) return [];

		// Check if covered by a grouped credential card
		const isInCredentialCards = credentialTypeStates.value.some((credState) =>
			credState.nodes.some((node) => isTriggerNode(node) && node.name === firstTriggerName.value),
		);
		if (isInCredentialCards) return [];

		// Check if covered by a per-node card (has creds in a per-node cred type, or has params)
		const { credentialTypes, parameterIssues, node } = triggerEntry;
		const hasParams = Object.keys(parameterIssues).length > 0 || nodeHasTemplateParams(node.name);
		const hasPerNodeCreds =
			credentialTypes.length > 0 && credentialTypes.some((ct) => perNodeCredTypes.value.has(ct));
		if (hasPerNodeCreds || hasParams) return [];

		// Skip triggers that don't wait for external input (e.g. Manual, Schedule).
		// Only show a standalone trigger card when the trigger listens for webhooks,
		// polls an external source, or has a triggerPanel (event-listening triggers).
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType?.webhooks?.length && !nodeType?.polling && !nodeType?.triggerPanel) return [];

		return [
			buildTriggerSetupState(
				node,
				credentialTypes,
				credentialTypeStates.value,
				hasTriggerExecutedSuccessfully(node.name),
			),
		];
	});

	/**
	 * Per-node setup states — handles both parameter-only nodes and credential+parameter nodes.
	 *
	 * Parameter-only entries: nodes with parameter issues but NO credentials.
	 * Credential entries: nodes with credentials whose type is in `perNodeCredTypes`.
	 * Only the first node per credential type shows the credential picker.

	 */
	const nodeStates = computed<NodeSetupState[]>(() => {
		const result: NodeSetupState[] = [];

		// --- Parameter-only nodes (no credentials) ---
		for (const entry of nodesWithMissingParameters.value) {
			if (entry.credentialTypes.length > 0) continue;
			const { node, parameterIssues, isTrigger } = entry;

			const state: NodeSetupState = {
				node,
				parameterIssues,
				additionalParameterNames: templateParametersByNode.value.get(node.name),
				isTrigger,
				isComplete: false,
			};
			state.isComplete = isNodeSetupComplete(state, buildCompletionContext());
			result.push(state);
		}

		// --- Credential+parameter nodes ---
		// Build maps: all nodes per cred type + nodes with params per cred type
		const credTypeToAllNodes = new Map<string, INodeUi[]>();
		const credTypeToEntries = new Map<
			string,
			Array<{
				node: INodeUi;
				credentialTypes: string[];
				parameterIssues: Record<string, string[]>;
				isTrigger: boolean;
			}>
		>();

		for (const entry of nodesRequiringSetup.value) {
			const { node, credentialTypes, parameterIssues } = entry;
			if (credentialTypes.length === 0) continue;

			for (const credType of credentialTypes) {
				if (!perNodeCredTypes.value.has(credType)) continue;

				if (!credTypeToAllNodes.has(credType)) credTypeToAllNodes.set(credType, []);

				if (!credTypeToAllNodes.get(credType)!.some((n) => n.id === node.id)) {
					credTypeToAllNodes.get(credType)!.push(node);
				}

				const combinationKey = `${credType}:${node.id}`;
				const hasParameters = Object.keys(parameterIssues).length > 0;
				const hasTemplateParams = nodeHasTemplateParams(node.name);
				const alreadySeen = stickyNodeCredentials.value.has(combinationKey);

				if (hasParameters || hasTemplateParams || alreadySeen) {
					if (!credTypeToEntries.has(credType)) credTypeToEntries.set(credType, []);
					credTypeToEntries.get(credType)!.push(entry);
				}
			}
		}

		const seenCombinations = new Set<string>();

		for (const [credType, entries] of credTypeToEntries) {
			let isFirstNode = true;
			const allNodesUsingCredential = credTypeToAllNodes.get(credType) ?? [];

			for (const entry of entries) {
				const { node, parameterIssues, isTrigger } = entry;
				const combinationKey = `${credType}:${node.id}`;

				if (seenCombinations.has(combinationKey)) continue;
				seenCombinations.add(combinationKey);

				const credValue = node.credentials?.[credType];
				const selectedCredentialId =
					typeof credValue === 'string' ? undefined : (credValue?.id ?? undefined);

				const credentialIssues = node.issues?.credentials ?? {};
				const issues = credentialIssues[credType];
				const issueMessages = [issues ?? []].flat();

				const isAutoApplied =
					!!selectedCredentialId && autoAppliedCredentialIds.value.has(selectedCredentialId);

				const state: NodeSetupState = {
					node,
					credentialType: credType,
					credentialDisplayName: getCredentialDisplayName(credType),
					selectedCredentialId,
					issues: issueMessages,
					parameterIssues,
					additionalParameterNames: templateParametersByNode.value.get(node.name),
					isTrigger,
					showCredentialPicker: isFirstNode,
					isComplete: false,
					allNodesUsingCredential,
					isAutoApplied,
				};

				state.isComplete = isNodeSetupComplete(state, buildCompletionContext(credType));

				result.push(state);

				isFirstNode = false;
			}
		}

		return result;
	});

	// Persist node-credential combinations once shown
	watch(
		nodeStates,
		(states) => {
			for (const state of states) {
				if (state.credentialType) {
					stickyNodeCredentials.value.add(`${state.credentialType}:${state.node.id}`);
				}
			}
		},
		{ immediate: true },
	);

	/**
	 * Ordered list of all setup cards, sorted by the position of each card's
	 * primary node in the execution order.
	 * All card types are normalized to NodeSetupState.
	 */
	const setupCards = computed<SetupCardItem[]>(() => {
		// Convert credential-type states to NodeSetupState (one card per credential type,
		// primary node = first node in the group)
		const credentialCards: NodeSetupState[] = credentialTypeStates.value.map((credState) => ({
			node: credState.nodes[0],
			credentialType: credState.credentialType,
			credentialDisplayName: credState.credentialDisplayName,
			selectedCredentialId: credState.selectedCredentialId,
			issues: credState.issues,
			parameterIssues: {},
			isTrigger: isTriggerNode(credState.nodes[0]),
			showCredentialPicker: true,
			isComplete: credState.isComplete,
			isAutoApplied: credState.isAutoApplied,
			allNodesUsingCredential: credState.nodes,
		}));

		// Convert trigger states to NodeSetupState (trigger-only cards)
		const triggerCards: NodeSetupState[] = triggerStates.value.map((trigState) => ({
			node: trigState.node,
			parameterIssues: {},
			isTrigger: true,
			isComplete: trigState.isComplete,
		}));

		const all: SetupCardItem[] = [...credentialCards, ...triggerCards, ...nodeStates.value]
			.filter((state) => state.node.type !== MANUAL_TRIGGER_NODE_TYPE)
			.map((state) => ({ state }));

		const executionOrder = nodesRequiringSetup.value.map(({ node }) => node.name);

		return all.sort(
			(a, b) =>
				executionOrder.indexOf(a.state.node.name) - executionOrder.indexOf(b.state.node.name),
		);
	});

	const totalCredentialsMissing = computed(() => {
		return credentialTypeStates.value.filter((s) => !s.isComplete).length;
	});

	const totalCardsRequiringSetup = computed(() => {
		return setupCards.value.length;
	});

	const isAllComplete = computed(() => {
		return setupCards.value.length > 0 && setupCards.value.every((card) => card.state.isComplete);
	});

	/**
	 * Tests a saved credential in the background.
	 * Fetches the credential's redacted data first so the backend can unredact and test.
	 * Skips if the credential is already tested OK or has a test in flight.
	 * The result is tracked automatically in the credentials store as a side effect of testCredential.
	 */
	async function testCredentialInBackground(
		credentialId: string,
		credentialName: string,
		credentialType: string,
	) {
		if (!isCredentialTypeTestable(credentialType)) {
			return;
		}

		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		try {
			const credentialResponse = await credentialsStore.getCredentialData({ id: credentialId });
			if (!credentialResponse?.data || typeof credentialResponse.data === 'string') {
				return;
			}

			// Re-check after the async fetch — another caller (e.g. CredentialEdit) may have
			// started or completed a test while we were fetching credential data.
			if (
				credentialsStore.isCredentialTestedOk(credentialId) ||
				credentialsStore.isCredentialTestPending(credentialId)
			) {
				return;
			}

			const { ownedBy, sharedWithProjects, oauthTokenData, ...data } = credentialResponse.data;

			// OAuth credentials can't be tested via the API — the presence of token data
			// means the OAuth flow completed successfully, which is the equivalent of a passing test.
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

	/**
	 * Resolves the node names affected by a credential operation.
	 * Checks credentialTypeStates first (grouped cards), then falls back to
	 * nodeStates (per-node cards with parameter issues).
	 * Snapshots credentialTypeStates to avoid reactivity issues during mutations.
	 */
	const getAffectedNodeNames = (credentialType: string, sourceNodeName?: string): string[] => {
		const allCredStates = credentialTypeStates.value;
		const credState = sourceNodeName
			? allCredStates.find(
					(s) =>
						s.credentialType === credentialType && s.nodes.some((n) => n.name === sourceNodeName),
				)
			: allCredStates.find((s) => s.credentialType === credentialType);

		if (credState) return credState.nodes.map((n) => n.name);

		if (!sourceNodeName) return [];

		const allNStates = nodeStates.value;
		const sourceEntry = allNStates.find(
			(s) => s.credentialType === credentialType && s.node.name === sourceNodeName,
		);
		if (sourceEntry?.allNodesUsingCredential) {
			return sourceEntry.allNodesUsingCredential.map((n) => n.name);
		}
		return [sourceNodeName];
	};

	/**
	 * Sets a credential for nodes.
	 * When sourceNodeName is provided, it first tries to find the matching credential card
	 * (needed when multiple HTTP Request nodes produce separate cards with the same credential type).
	 * If the node isn't in credentialTypeStates (e.g. it's in nodeStates due to parameter issues),
	 * falls back to updating that specific node directly.
	 */
	const setCredential = (
		credentialType: string,
		credentialId: string,
		sourceNodeName?: string,
		skipHttpRequestType = false,
	): void => {
		const credential = credentialsStore.getCredentialById(credentialId);
		if (!credential) return;

		const credentialDetails = { id: credentialId, name: credential.name };

		void testCredentialInBackground(credentialId, credential.name, credentialType);

		for (const nodeName of getAffectedNodeNames(credentialType, sourceNodeName)) {
			const node = workflowDocumentStore?.value?.getNodeByName(nodeName);
			if (!node) continue;
			if (skipHttpRequestType && isHttpRequestNodeType(node.type)) continue;

			// Clear auto-applied status for the previous credential on this node.
			// During auto-apply the nodes are still unset so this is a no-op;
			// during manual selection it removes the auto-applied flag.
			const prevCred = node.credentials?.[credentialType];
			const prevId = typeof prevCred === 'string' ? undefined : prevCred?.id;
			if (prevId) autoAppliedCredentialIds.value.delete(prevId);
			workflowDocumentStore?.value?.updateNodeProperties({
				name: nodeName,
				properties: {
					credentials: {
						...node.credentials,
						[credentialType]: credentialDetails,
					},
				},
			});
		}

		nodeHelpers.updateNodesCredentialsIssues();
		useUIStore().markStateDirty();
	};

	/**
	 * Unsets a credential from nodes.
	 * When sourceNodeName is provided, it first tries to find the matching credential card.
	 * If the node isn't in credentialTypeStates (e.g. it's in nodeStates due to parameter issues),
	 * falls back to updating that specific node directly.
	 */
	const unsetCredential = (credentialType: string, sourceNodeName?: string): void => {
		for (const nodeName of getAffectedNodeNames(credentialType, sourceNodeName)) {
			const node = workflowDocumentStore?.value?.getNodeByName(nodeName);
			if (!node) continue;

			const updatedCredentials = { ...node.credentials };
			delete updatedCredentials[credentialType];

			workflowDocumentStore?.value?.updateNodeProperties({
				name: nodeName,
				properties: {
					credentials: updatedCredentials,
				},
			});
		}

		nodeHelpers.updateNodesCredentialsIssues();
		useUIStore().markStateDirty();
	};

	/**
	 * Auto-select the most recently updated credential for each credential type
	 * that doesn't already have one assigned.
	 * Runs once on initial load to pre-fill credential pickers.
	 */
	const tryAutoApplyCredential = (credentialType: string, sourceNodeName?: string): void => {
		const available = credentialsStore.getCredentialsByType(credentialType);
		if (available.length === 0) return;
		const mostRecent = available.reduce(
			(best, current) => (best.updatedAt > current.updatedAt ? best : current),
			available[0],
		);
		autoAppliedCredentialIds.value.add(mostRecent.id);
		setCredential(credentialType, mostRecent.id, sourceNodeName, true);
	};

	const autoSelectCredentials = (): void => {
		// Snapshot both arrays before iterating — setCredential mutates the store,
		// which recomputes these computed values mid-loop.
		const credStates = [...credentialTypeStates.value];
		const nStates = [...nodeStates.value];

		for (const credState of credStates) {
			if (credState.selectedCredentialId) continue;
			tryAutoApplyCredential(credState.credentialType);
		}

		for (const nodeState of nStates) {
			if (!nodeState.credentialType || nodeState.selectedCredentialId) continue;
			tryAutoApplyCredential(nodeState.credentialType, nodeState.node.name);
		}
	};

	/**
	 * On initial load: auto-select credentials then auto-test them.
	 * Runs once when nodes become available so checkmarks reflect actual validity.
	 * Deduplicates by credential ID so shared credentials are only tested once.
	 */
	const isInitialCredentialTestingDone = ref(false);

	let initialSetupDone = false;
	watch(
		nodesRequiringSetup,
		(entries) => {
			if (initialSetupDone || entries.length === 0) return;
			initialSetupDone = true;

			// First, auto-select credentials for cards that don't have one yet
			autoSelectCredentials();

			// Then, auto-test all selected credentials (including auto-selected ones)
			const credentialsToTest = new Map<string, { name: string; type: string }>();
			for (const { node, credentialTypes } of entries) {
				for (const credType of credentialTypes) {
					const credValue = node.credentials?.[credType];
					const selectedId = typeof credValue === 'string' ? undefined : credValue?.id;
					if (!selectedId || credentialsToTest.has(selectedId)) continue;

					const cred = credentialsStore.getCredentialById(selectedId);
					if (!cred) continue;

					credentialsToTest.set(selectedId, { name: cred.name, type: credType });
				}
			}

			const testPromises: Array<Promise<void>> = [];
			for (const [id, { name, type }] of credentialsToTest) {
				testPromises.push(testCredentialInBackground(id, name, type));
			}

			if (testPromises.length === 0) {
				isInitialCredentialTestingDone.value = true;
			} else {
				void Promise.allSettled(testPromises).then(() => {
					isInitialCredentialTestingDone.value = true;
				});
			}
		},
		{ immediate: true },
	);

	/**
	 * When a credential is deleted, unset it from ALL nodes that reference it.
	 * This is the symmetric counterpart to setCredential's auto-assignment.
	 */
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialDeleted: (deletedCredentialId) => {
			for (const { node, credentialTypes } of nodesRequiringSetup.value) {
				for (const credType of credentialTypes) {
					const credValue = node.credentials?.[credType];
					const selectedId = typeof credValue === 'string' ? undefined : credValue?.id;
					if (selectedId === deletedCredentialId) {
						unsetCredential(credType);
					}
				}
			}
		},
	});

	return {
		setupCards,
		credentialTypeStates,
		triggerStates,
		nodeStates,
		firstTriggerName,
		totalCredentialsMissing,
		totalCardsRequiringSetup,
		isAllComplete,
		isInitialCredentialTestingDone,

		nodesWithMissingParameters,
		autoAppliedCredentialIds,
		setCredential,
		unsetCredential,
	};
};
