import type { ComputedRef } from 'vue';
import { ref } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getMainAuthField } from '@/app/utils/nodeTypesUtils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { credGroupKey, type SetupCard } from '../instanceAiWorkflowSetup.utils';

export function useCredentialGroupSelection(
	cards: ComputedRef<SetupCard[]>,
	testCredentialInBackground: (id: string, name: string, type: string) => Promise<void>,
	projectId?: string,
) {
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();

	// Shared credential selection keyed by credGroupKey — single source of truth
	// for all cards in the same credential group (including escalated per-node cards).
	const credGroupSelections = ref<Record<string, string | null>>({});

	// Tracks which credential group key (or section node name) initiated a "create credential" action.
	const activeCredentialTarget = ref<{ groupKey: string; credentialType: string } | null>(null);

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
				if (storeNode?.credentials?.[credentialType]) {
					const { [credentialType]: _removed, ...remaining } = storeNode.credentials;
					storeNode.credentials = remaining as typeof storeNode.credentials;
				}
			}
		}
	}

	function cardHasExistingCredentials(card: SetupCard): boolean {
		if (!card.credentialType) return false;
		const firstReq = card.nodes[0];
		return (
			(firstReq?.existingCredentials?.length ?? 0) > 0 ||
			(credentialsStore.getUsableCredentialByType(card.credentialType)?.length ?? 0) > 0
		);
	}

	function findCardForGroup(credentialType: string, groupKey: string): SetupCard | undefined {
		return cards.value.find(
			(c) =>
				c.credentialType === credentialType && c.nodes[0] && credGroupKey(c.nodes[0]) === groupKey,
		);
	}

	function shouldShowAuthOptions(card: SetupCard | undefined): boolean {
		const setupNode = card?.nodes[0]?.node;
		if (!setupNode) return false;
		const nodeType = nodeTypesStore.getNodeType(setupNode.type, setupNode.typeVersion);
		const mainAuthField = getMainAuthField(nodeType);
		return (
			mainAuthField !== null &&
			Array.isArray(mainAuthField.options) &&
			mainAuthField.options.length > 0
		);
	}

	function openNewCredentialForSection(credentialType: string, groupKey: string) {
		activeCredentialTarget.value = { groupKey, credentialType };
		const card = findCardForGroup(credentialType, groupKey);
		const showAuthOptions = shouldShowAuthOptions(card);
		const nodeName = card?.nodes[0]?.node.name;
		uiStore.openNewCredential(
			credentialType,
			showAuthOptions,
			false,
			projectId,
			undefined,
			nodeName,
		);
	}

	return {
		credGroupSelections,
		activeCredentialTarget,
		initCredGroupSelections,
		getCardCredentialId,
		isFirstCardInCredGroup,
		setCredentialForGroup,
		clearCredentialForGroup,
		cardHasExistingCredentials,
		openNewCredentialForSection,
	};
}
