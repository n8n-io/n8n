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
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCredentialTestFailed: (card: WorkflowSetupCard) => boolean;
	allCardsComplete: () => boolean;
	buildNodeCredentials: () => Record<string, Record<string, string>>;
} {
	const credentialsStore = useCredentialsStore();
	const { isCredentialTypeTestable, testCredentialInBackground } = useCredentialTestInBackground();

	const selections = ref<SelectionsMap>({});

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
		} else {
			delete nodeSelections[credType];
		}
		selections.value = {
			...selections.value,
			[nodeName]: nodeSelections,
		};
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
		},
		{ immediate: true },
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
		setSelection,
		isCardComplete,
		isCredentialTestFailed,
		allCardsComplete,
		buildNodeCredentials,
	};
}
