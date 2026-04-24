import { ref, watch, onBeforeUnmount, type ComputedRef, type Ref } from 'vue';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import type { WorkflowSetupCard } from '../workflowSetup.types';

type SelectionsMap = Record<string, Record<string, string>>;

export function useWorkflowSetupSelections(deps: {
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
}): {
	selections: Ref<SelectionsMap>;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	buildNodeCredentials: () => Record<string, Record<string, string>>;
} {
	const credentialsStore = useCredentialsStore();

	const selections = ref<SelectionsMap>({});

	function setSelection(nodeName: string, credType: string, credId: string | null) {
		const nodeSelections = { ...(selections.value[nodeName] ?? {}) };
		if (credId) {
			nodeSelections[credType] = credId;
		} else {
			delete nodeSelections[credType];
		}
		selections.value = {
			...selections.value,
			[nodeName]: nodeSelections,
		};
	}

	function isCardComplete(card: WorkflowSetupCard): boolean {
		return selections.value[card.targetNodeName]?.[card.credentialType] !== undefined;
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
			for (const card of cards) {
				const current = selections.value[card.targetNodeName]?.[card.credentialType];
				if (current !== undefined) continue;
				if (!card.currentCredentialId) continue;
				next ??= { ...selections.value };
				next[card.targetNodeName] = {
					...(next[card.targetNodeName] ?? {}),
					[card.credentialType]: card.currentCredentialId,
				};
			}
			if (next) selections.value = next;
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

	return { selections, setSelection, isCardComplete, buildNodeCredentials };
}
