import type { Ref } from 'vue';
import { computed, ref, watch } from 'vue';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { hasPlaceholderDeep } from '@n8n/utils';
import { NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { getNodeParametersIssues } from '@/features/setupPanel/setupPanel.utils';
import {
	credGroupKey,
	isNestedParam,
	type DisplayCard,
	type SetupCard,
	type SetupCardGroup,
} from '../instanceAiWorkflowSetup.utils';

export function useSetupCards(
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]>,
	getCardCredentialId: (card: SetupCard) => string | null,
	isCredentialTypeTestable: (name: string) => boolean,
) {
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	// ---------------------------------------------------------------------------
	// Tracked parameter names — grows over time as live validation discovers new fields
	// ---------------------------------------------------------------------------

	const trackedParamNames = ref(new Map<string, Set<string>>());

	function initTrackedParamNames() {
		for (const req of setupRequests.value) {
			if (req.parameterIssues && Object.keys(req.parameterIssues).length > 0) {
				trackedParamNames.value.set(req.node.name, new Set(Object.keys(req.parameterIssues)));
			}
		}
	}
	initTrackedParamNames();

	// ---------------------------------------------------------------------------
	// Card grouping
	// ---------------------------------------------------------------------------

	// Credential group keys that need per-node splitting due to live-discovered param work.
	const liveEscalatedCredTypes = computed(() => {
		const escalated = new Set<string>();

		const groupMembers = new Map<string, InstanceAiWorkflowSetupNode[]>();
		for (const req of setupRequests.value) {
			if (!req.credentialType) continue;
			const key = credGroupKey(req);
			const existing = groupMembers.get(key);
			if (existing) existing.push(req);
			else groupMembers.set(key, [req]);
		}

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

	/**
	 * True if at least one tracked parameter on this node resolves to a property
	 * the wizard can render inline. The AI Assistant lives on its own route,
	 * with the workflow canvas shown in an iframe — there is no NDV to fall back
	 * to for nested-type issues. If nothing is renderable inline, the wizard
	 * should skip the card and let the backend's re-analyze loop hand the
	 * unresolved issue back to the LLM via `partial/skippedNodes`.
	 */
	function hasRenderableParamIssue(req: InstanceAiWorkflowSetupNode): boolean {
		const nodeType = nodeTypesStore.getNodeType(req.node.type, req.node.typeVersion);
		if (!nodeType?.properties) return false;

		const node = workflowsStore.getNodeByName(req.node.name);
		if (!node) return false;

		const tracked =
			trackedParamNames.value.get(req.node.name) ?? new Set(Object.keys(req.parameterIssues ?? {}));
		if (tracked.size === 0) return false;

		for (const prop of nodeType.properties) {
			if (!tracked.has(prop.name)) continue;
			if (isNestedParam(prop)) continue;
			if (!NodeHelpers.displayParameter(node.parameters, prop, node, nodeType)) continue;
			return true;
		}
		return false;
	}

	const cards = computed((): SetupCard[] => {
		const escalatedCredTypes = new Set<string>();
		for (const req of setupRequests.value) {
			if (
				req.credentialType &&
				req.parameterIssues &&
				Object.keys(req.parameterIssues).length > 0
			) {
				escalatedCredTypes.add(credGroupKey(req));
			}
		}

		for (const key of liveEscalatedCredTypes.value) {
			escalatedCredTypes.add(key);
		}

		const ordered: SetupCard[] = [];
		const credCardByKey = new Map<string, SetupCard>();

		for (const req of setupRequests.value) {
			const hasParamIssues =
				req.parameterIssues !== undefined && Object.keys(req.parameterIssues).length > 0;

			if (req.credentialType) {
				const key = credGroupKey(req);

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
				// Skip param-only cards whose issues are all non-renderable (e.g. an
				// empty `fixedCollection`). There's nothing the user can edit inline,
				// and this wizard has no path to NDV. The backend will re-analyze on
				// Apply and feed the unresolved issue back to the LLM.
				if (!req.isTrigger && hasParamIssues && !hasRenderableParamIssue(req)) continue;

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
		const directSubnodes = new Map<string, Set<string>>();
		const connectionsByDest = workflowsStore.connectionsByDestinationNode;
		for (const [destName, conns] of Object.entries(connectionsByDest)) {
			for (const connType of Object.keys(conns)) {
				if (connType === NodeConnectionTypes.Main) continue;
				for (const group of conns[connType]) {
					if (!group) continue;
					for (const conn of group) {
						if (!directSubnodes.has(destName)) {
							directSubnodes.set(destName, new Set());
						}
						directSubnodes.get(destName)!.add(conn.node);
					}
				}
			}
		}

		const allSubnodeNames = new Set<string>();
		for (const subs of directSubnodes.values()) {
			for (const s of subs) allSubnodeNames.add(s);
		}

		const rootParents = new Set<string>();
		for (const parentName of directSubnodes.keys()) {
			if (!allSubnodeNames.has(parentName)) {
				rootParents.add(parentName);
			}
		}

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

		const cardsByNodeName = new Map<string, SetupCard>();
		for (const card of cards.value) {
			for (const req of card.nodes) {
				cardsByNodeName.set(req.node.name, card);
			}
		}

		const usedCardIds = new Set<string>();
		const deferredSubnodeCardIds = new Set<string>();
		const result: DisplayCard[] = [];

		for (const card of cards.value) {
			if (usedCardIds.has(card.id)) continue;

			const primaryNodeName = card.nodes[0]?.node.name;
			const subnodeNames = primaryNodeName ? transitiveSubnodes.get(primaryNodeName) : undefined;

			if (subnodeNames && subnodeNames.size > 0) {
				const subnodeCards: SetupCard[] = [];
				for (const subName of subnodeNames) {
					const subCard = cardsByNodeName.get(subName);
					if (subCard && !usedCardIds.has(subCard.id)) {
						subnodeCards.push(subCard);
						usedCardIds.add(subCard.id);
						deferredSubnodeCardIds.delete(subCard.id);
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

			let isSubnodeOfRoot = false;
			for (const [rootName, subs] of transitiveSubnodes) {
				if (primaryNodeName && subs.has(primaryNodeName)) {
					const rootCard = cardsByNodeName.get(rootName);
					if (rootCard && !usedCardIds.has(rootCard.id)) {
						isSubnodeOfRoot = true;
					}
					break;
				}
			}

			if (!isSubnodeOfRoot) {
				usedCardIds.add(card.id);
				result.push({ type: 'single', card });
			} else {
				// Track deferred subnodes so we can recover them if their root never collects them
				deferredSubnodeCardIds.add(card.id);
			}
		}

		// Emit any deferred subnode cards that were never consumed by a group
		for (const card of cards.value) {
			if (deferredSubnodeCardIds.has(card.id) && !usedCardIds.has(card.id)) {
				usedCardIds.add(card.id);
				result.push({ type: 'single', card });
			}
		}

		return result;
	});

	// ---------------------------------------------------------------------------
	// Param work and completion
	// ---------------------------------------------------------------------------

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

	function isCardComplete(card: SetupCard): boolean {
		if (card.credentialType) {
			const selectedId = getCardCredentialId(card);
			if (!selectedId) return false;

			if (isCredentialTypeTestable(card.credentialType)) {
				if (!credentialsStore.isCredentialTestedOk(selectedId)) {
					const originalCredId = card.nodes[0]?.node.credentials?.[card.credentialType]?.id;
					if (!(card.credentialTestResult?.success && selectedId === originalCredId)) {
						return false;
					}
				}
			}
		}

		if (cardHasParamWork(card)) {
			for (const req of card.nodes) {
				const storeNode = workflowsStore.getNodeByName(req.node.name);
				if (storeNode) {
					const liveIssues = getNodeParametersIssues(nodeTypesStore, storeNode);
					if (Object.keys(liveIssues).length > 0) return false;
					// Check for remaining placeholder values only in tracked parameters
					const tracked = trackedParamNames.value.get(req.node.name);
					if (tracked) {
						for (const paramName of tracked) {
							if (hasPlaceholderDeep(storeNode.parameters[paramName])) return false;
						}
					}
				}
			}
		}

		if (card.isTestable && card.isTrigger && card.isFirstTrigger) {
			const triggerTestResults: Record<string, InstanceAiWorkflowSetupNode['triggerTestResult']> =
				{};
			for (const req of setupRequests.value) {
				if (req.triggerTestResult) {
					triggerTestResults[req.node.name] = req.triggerTestResult;
				}
			}
			const triggerNode = card.nodes.find((n) => n.isTrigger);
			const result = triggerNode ? triggerTestResults[triggerNode.node.name] : undefined;
			if (!result || result.status !== 'success') return false;
		}

		return true;
	}

	const anyCardComplete = computed(() => cards.value.some((c) => isCardComplete(c)));

	const allPreResolved = computed(() => setupRequests.value.every((r) => !r.needsAction));

	function isDisplayCardComplete(dc: DisplayCard): boolean {
		if (dc.type === 'single') return isCardComplete(dc.card);
		const { group } = dc;
		if (group.parentCard && !isCardComplete(group.parentCard)) return false;
		return group.subnodeCards.every((card) => isCardComplete(card));
	}

	function getGroupPrimaryTriggerCard(group: SetupCardGroup): SetupCard | null {
		const allCards = group.parentCard
			? [group.parentCard, ...group.subnodeCards]
			: group.subnodeCards;
		return allCards.find((c) => c.isTestable && c.isTrigger && c.isFirstTrigger) ?? null;
	}

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

	return {
		trackedParamNames,
		cards,
		displayCards,
		cardHasParamWork,
		isCardComplete,
		isDisplayCardComplete,
		anyCardComplete,
		allPreResolved,
		getGroupPrimaryTriggerCard,
	};
}
