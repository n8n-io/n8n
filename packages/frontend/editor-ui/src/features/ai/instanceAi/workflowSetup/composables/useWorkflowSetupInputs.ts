import { computed, ref, watch, onBeforeUnmount, type ComputedRef, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import { deepCopy, type INodeParameters } from 'n8n-workflow';
import { setParameterValue as setParameterValueByPath } from '@/app/utils/parameterUtils';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowSetupApplyPayload, WorkflowSetupCard } from '../workflowSetup.types';
import { getWorkflowSetupParameterIssues } from '../workflowSetupParameterIssues';

type CredentialSelectionsMap = Record<string, Record<string, string>>;
type ParameterValuesMap = Record<string, INodeParameters>;

export function useWorkflowSetupInputs(deps: {
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
}): {
	selections: Ref<CredentialSelectionsMap>;
	parameterValues: Ref<ParameterValuesMap>;
	skippedCardIds: Ref<Set<string>>;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	setParameterValue: (card: WorkflowSetupCard, parameterName: string, value: unknown) => void;
	getDisplayNode: (card: WorkflowSetupCard) => INodeUi;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCredentialTestFailed: (card: WorkflowSetupCard) => boolean;
	isCardSkipped: (card: WorkflowSetupCard) => boolean;
	markCardSkipped: (card: WorkflowSetupCard) => void;
	clearCardSkipped: (card: WorkflowSetupCard) => void;
	allCardsComplete: () => boolean;
	buildCompletedSetupPayload: () => WorkflowSetupApplyPayload;
} {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const { isCredentialTypeTestable, testCredentialInBackground } = useCredentialTestInBackground();

	const selections = ref<CredentialSelectionsMap>({});
	const parameterValues = ref<ParameterValuesMap>({});
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

	function setParameterValue(card: WorkflowSetupCard, parameterName: string, value: unknown) {
		const current = parameterValues.value[card.targetNodeName] ?? card.node.parameters;
		const next = deepCopy(current) as INodeParameters;
		setParameterValueByPath(next, parameterName, value);
		parameterValues.value = {
			...parameterValues.value,
			[card.targetNodeName]: next,
		};
		clearCardSkipped(card);
	}

	function isCardSkipped(card: WorkflowSetupCard): boolean {
		return skippedCardIds.value.has(card.id);
	}

	function markCardSkipped(card: WorkflowSetupCard): void {
		skippedCardIds.value.add(card.id);
	}

	function clearCardSkipped(card: WorkflowSetupCard): void {
		skippedCardIds.value.delete(card.id);
	}

	function getDisplayNode(card: WorkflowSetupCard): INodeUi {
		return {
			...card.node,
			parameters: parameterValues.value[card.targetNodeName] ?? card.node.parameters,
		} as INodeUi;
	}

	const parameterIssuesByCardId = computed(() => {
		const result = new Map<string, Record<string, string[]>>();
		for (const card of deps.cards.value) {
			if (card.parameterNames.length === 0) {
				result.set(card.id, {});
				continue;
			}
			const node = getDisplayNode(card);
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			result.set(card.id, getWorkflowSetupParameterIssues(node, nodeType, card.parameterNames));
		}
		return result;
	});

	function getParameterIssues(card: WorkflowSetupCard): Record<string, string[]> {
		return parameterIssuesByCardId.value.get(card.id) ?? {};
	}

	function isCredentialComplete(card: WorkflowSetupCard): boolean {
		if (!card.credentialType) return true;
		const selectedCredentialId = selections.value[card.targetNodeName]?.[card.credentialType];
		if (!selectedCredentialId) return false;
		if (!isCredentialTypeTestable(card.credentialType)) return true;
		return credentialsStore.isCredentialTestedOk(selectedCredentialId);
	}

	function areParametersComplete(card: WorkflowSetupCard): boolean {
		return Object.keys(getParameterIssues(card)).length === 0;
	}

	function isCardComplete(card: WorkflowSetupCard): boolean {
		return isCredentialComplete(card) && areParametersComplete(card);
	}

	function isCredentialTestFailed(card: WorkflowSetupCard): boolean {
		if (!card.credentialType) return false;
		const selectedCredentialId = selections.value[card.targetNodeName]?.[card.credentialType];
		if (!selectedCredentialId || !isCredentialTypeTestable(card.credentialType)) return false;
		return credentialsStore.credentialTestResults.get(selectedCredentialId) === 'error';
	}

	function allCardsComplete(): boolean {
		return deps.cards.value.every(isCardComplete);
	}

	function buildCompletedSetupPayload(): WorkflowSetupApplyPayload {
		return prunePayload({
			nodeCredentials: buildNodeCredentials(isCredentialComplete),
			nodeParameters: buildNodeParameters(areParametersComplete),
		});
	}

	function buildNodeCredentials(
		shouldInclude: (card: WorkflowSetupCard) => boolean,
	): Record<string, Record<string, string>> {
		const out: Record<string, Record<string, string>> = {};
		for (const card of deps.cards.value) {
			if (!card.credentialType || !shouldInclude(card)) continue;
			const credId = selections.value[card.targetNodeName]?.[card.credentialType];
			if (!credId) continue;
			const perType = out[card.targetNodeName] ?? {};
			perType[card.credentialType] = credId;
			out[card.targetNodeName] = perType;
		}
		return out;
	}

	function buildNodeParameters(
		shouldInclude: (card: WorkflowSetupCard) => boolean,
	): Record<string, INodeParameters> {
		const out: Record<string, INodeParameters> = {};
		for (const card of deps.cards.value) {
			if (card.parameterNames.length === 0 || !shouldInclude(card)) continue;
			const values = parameterValues.value[card.targetNodeName] ?? card.node.parameters;
			const params: INodeParameters = {};
			for (const name of card.parameterNames) {
				if (values[name] !== undefined) params[name] = values[name];
			}
			if (Object.keys(params).length > 0) out[card.targetNodeName] = params;
		}
		return out;
	}

	watch(
		deps.cards,
		(cards) => {
			let nextSelections: CredentialSelectionsMap | null = null;
			let nextParameters: ParameterValuesMap | null = null;
			const credentialsToTest: Array<{ id: string; type: string }> = [];
			for (const card of cards) {
				if (!parameterValues.value[card.targetNodeName]) {
					nextParameters ??= { ...parameterValues.value };
					nextParameters[card.targetNodeName] = card.node.parameters as INodeParameters;
				}

				if (!card.credentialType) continue;
				const current = selections.value[card.targetNodeName]?.[card.credentialType];
				if (current !== undefined) continue;
				if (!card.currentCredentialId) continue;
				nextSelections ??= { ...selections.value };
				nextSelections[card.targetNodeName] = {
					...(nextSelections[card.targetNodeName] ?? {}),
					[card.credentialType]: card.currentCredentialId,
				};
				credentialsToTest.push({ id: card.currentCredentialId, type: card.credentialType });
			}
			if (nextSelections) selections.value = nextSelections;
			if (nextParameters) parameterValues.value = nextParameters;
			for (const credential of credentialsToTest) {
				testSelectedCredential(credential.id, credential.type);
			}

			if (skippedCardIds.value.size > 0) {
				const knownIds = new Set(cards.map((c) => c.id));
				for (const id of skippedCardIds.value) {
					if (!knownIds.has(id)) skippedCardIds.value.delete(id);
				}
			}
		},
		{ immediate: true },
	);

	watch(
		() =>
			deps.cards.value
				.filter((card) => skippedCardIds.value.has(card.id) && isCardComplete(card))
				.map((c) => c.id),
		(completedSkippedIds) => {
			for (const id of completedSkippedIds) {
				skippedCardIds.value.delete(id);
			}
		},
	);

	const stopListening = listenForCredentialChanges({
		store: credentialsStore,
		onCredentialCreated: (cred) => {
			const active = deps.activeCard.value;
			if (!active?.credentialType) return;
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
		parameterValues,
		skippedCardIds,
		setSelection,
		setParameterValue,
		getDisplayNode,
		isCardComplete,
		isCredentialTestFailed,
		isCardSkipped,
		markCardSkipped,
		clearCardSkipped,
		allCardsComplete,
		buildCompletedSetupPayload,
	};
}

function prunePayload(payload: WorkflowSetupApplyPayload): WorkflowSetupApplyPayload {
	const result: WorkflowSetupApplyPayload = {};
	if (payload.nodeCredentials && Object.keys(payload.nodeCredentials).length > 0)
		result.nodeCredentials = payload.nodeCredentials;
	if (payload.nodeParameters && Object.keys(payload.nodeParameters).length > 0)
		result.nodeParameters = payload.nodeParameters;
	return result;
}
