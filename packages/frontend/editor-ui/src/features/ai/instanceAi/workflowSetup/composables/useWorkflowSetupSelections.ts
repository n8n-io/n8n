import { ref, watch, onBeforeUnmount, type ComputedRef, type Ref } from 'vue';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import type { WorkflowSetupCard } from '../workflowSetup.types';

type SelectionsMap = Record<string, Record<string, string>>;

export function useWorkflowSetupSelections(deps: {
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
}): {
	selections: Ref<SelectionsMap>;
	skippedCardIds: Ref<Set<string>>;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCredentialTestFailed: (card: WorkflowSetupCard) => boolean;
	isCardSkipped: (card: WorkflowSetupCard) => boolean;
	markCardSkipped: (card: WorkflowSetupCard) => void;
	clearCardSkipped: (card: WorkflowSetupCard) => void;
	allCardsComplete: () => boolean;
	buildNodeCredentials: () => Record<string, Record<string, string>>;
	buildCompletedNodeCredentials: () => Record<string, Record<string, string>>;
} {
	const credentialsStore = useCredentialsStore();
	const { isCredentialTypeTestable, testCredentialInBackground } = useCredentialTestInBackground();

	const selections = ref<SelectionsMap>({});
	const skippedCardIds = ref<Set<string>>(new Set());

	function findCardByNodeAndType(
		nodeName: string,
		credType: string,
	): WorkflowSetupCard | undefined {
		return deps.cards.value.find(
			(c) => c.targetNodeName === nodeName && c.credentialType === credType,
		);
	}

	function testSelectedCredential(credId: string, credType: string) {
		const credential = credentialsStore.getCredentialById(credId);
		if (!credential) return;

		void testCredentialInBackground(credId, credential.name, credType);
	}

	function setSelection(nodeName: string, credType: string, credId: string | null) {
		const nodeSelections = { ...(selections.value[nodeName] ?? {}) };
		if (credId) {
			nodeSelections[credType] = credId;
			testSelectedCredential(credId, credType);
			const card = findCardByNodeAndType(nodeName, credType);
			if (card) clearCardSkipped(card);
		} else {
			delete nodeSelections[credType];
		}
		selections.value = {
			...selections.value,
			[nodeName]: nodeSelections,
		};
	}

	function isCardSkipped(card: WorkflowSetupCard): boolean {
		return skippedCardIds.value.has(card.id);
	}

	function markCardSkipped(card: WorkflowSetupCard): void {
		if (skippedCardIds.value.has(card.id)) return;
		const next = new Set(skippedCardIds.value);
		next.add(card.id);
		skippedCardIds.value = next;
	}

	function clearCardSkipped(card: WorkflowSetupCard): void {
		if (!skippedCardIds.value.has(card.id)) return;
		const next = new Set(skippedCardIds.value);
		next.delete(card.id);
		skippedCardIds.value = next;
	}

	function isCardComplete(card: WorkflowSetupCard): boolean {
		const selectedCredentialId = selections.value[card.targetNodeName]?.[card.credentialType];
		if (!selectedCredentialId) return false;
		if (!isCredentialTypeTestable(card.credentialType)) return true;
		return credentialsStore.isCredentialTestedOk(selectedCredentialId);
	}

	function isCredentialTestFailed(card: WorkflowSetupCard): boolean {
		const selectedCredentialId = selections.value[card.targetNodeName]?.[card.credentialType];
		if (!selectedCredentialId || !isCredentialTypeTestable(card.credentialType)) return false;
		return credentialsStore.credentialTestResults.get(selectedCredentialId) === 'error';
	}

	function allCardsComplete(): boolean {
		return deps.cards.value.every(isCardComplete);
	}

	function buildNodeCredentials(): Record<string, Record<string, string>> {
		const out: Record<string, Record<string, string>> = {};
		for (const [nodeName, perType] of Object.entries(selections.value)) {
			const filtered: Record<string, string> = {};
			for (const [credType, credId] of Object.entries(perType)) {
				if (credId) filtered[credType] = credId;
			}
			if (Object.keys(filtered).length > 0) {
				out[nodeName] = filtered;
			}
		}
		return out;
	}

	function buildCompletedNodeCredentials(): Record<string, Record<string, string>> {
		const out: Record<string, Record<string, string>> = {};
		for (const card of deps.cards.value) {
			if (!isCardComplete(card)) continue;
			const credId = selections.value[card.targetNodeName]?.[card.credentialType];
			if (!credId) continue;
			const perType = out[card.targetNodeName] ?? {};
			perType[card.credentialType] = credId;
			out[card.targetNodeName] = perType;
		}
		return out;
	}

	watch(
		deps.cards,
		(cards) => {
			let next: SelectionsMap | null = null;
			const credentialsToTest: Array<{ id: string; type: string }> = [];
			for (const card of cards) {
				const current = selections.value[card.targetNodeName]?.[card.credentialType];
				if (current !== undefined) continue;
				if (!card.currentCredentialId) continue;
				next ??= { ...selections.value };
				next[card.targetNodeName] = {
					...(next[card.targetNodeName] ?? {}),
					[card.credentialType]: card.currentCredentialId,
				};
				credentialsToTest.push({ id: card.currentCredentialId, type: card.credentialType });
			}
			if (next) selections.value = next;
			for (const credential of credentialsToTest) {
				testSelectedCredential(credential.id, credential.type);
			}

			// Prune skipped IDs that no longer correspond to any card.
			if (skippedCardIds.value.size > 0) {
				const knownIds = new Set(cards.map((c) => c.id));
				let changed = false;
				const pruned = new Set<string>();
				for (const id of skippedCardIds.value) {
					if (knownIds.has(id)) {
						pruned.add(id);
					} else {
						changed = true;
					}
				}
				if (changed) skippedCardIds.value = pruned;
			}
		},
		{ immediate: true },
	);

	// When a skipped card transitions to complete (e.g. async credential test
	// succeeds), drop the skip flag so the card is treated as handled.
	watch(
		() =>
			deps.cards.value
				.filter((card) => skippedCardIds.value.has(card.id) && isCardComplete(card))
				.map((c) => c.id),
		(completedSkippedIds) => {
			if (completedSkippedIds.length === 0) return;
			const next = new Set(skippedCardIds.value);
			let changed = false;
			for (const id of completedSkippedIds) {
				if (next.delete(id)) changed = true;
			}
			if (changed) skippedCardIds.value = next;
		},
	);

	const stopListening = listenForCredentialChanges({
		store: credentialsStore,
		onCredentialCreated: (cred) => {
			const active = deps.activeCard.value;
			if (!active) return;
			if (cred.type !== active.credentialType) return;
			setSelection(active.targetNodeName, active.credentialType, cred.id);
		},
		onCredentialUpdated: (cred) => {
			for (const perType of Object.values(selections.value)) {
				for (const [credType, credId] of Object.entries(perType)) {
					if (credId === cred.id && credType === cred.type) {
						testSelectedCredential(cred.id, cred.type);
					}
				}
			}
		},
		onCredentialDeleted: (deletedId) => {
			for (const [nodeName, perType] of Object.entries(selections.value)) {
				for (const [credType, credId] of Object.entries(perType)) {
					if (credId === deletedId) {
						setSelection(nodeName, credType, null);
					}
				}
			}
		},
	});

	onBeforeUnmount(() => {
		stopListening();
	});

	return {
		selections,
		skippedCardIds,
		setSelection,
		isCardComplete,
		isCredentialTestFailed,
		isCardSkipped,
		markCardSkipped,
		clearCardSkipped,
		allCardsComplete,
		buildNodeCredentials,
		buildCompletedNodeCredentials,
	};
}
