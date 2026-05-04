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

export type CredentialSelectionsMap = Record<string, Record<string, string>>;
type ParameterValuesMap = Record<string, INodeParameters>;

export function useWorkflowSetupInputs(deps: {
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
}): {
	credentialSelections: Ref<CredentialSelectionsMap>;
	parameterValues: Ref<ParameterValuesMap>;
	skippedCardIds: Ref<Set<string>>;
	setCredential: (card: WorkflowSetupCard, credId: string | null) => void;
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

	const credentialSelections = ref<CredentialSelectionsMap>({});
	const parameterValues = ref<ParameterValuesMap>({});
	const skippedCardIds = ref<Set<string>>(new Set());

	function testCredential(credId: string, credType: string) {
		const credential = credentialsStore.getCredentialById(credId);
		if (!credential) return;

		void testCredentialInBackground(credId, credential.name, credType);
	}

	function setCredential(card: WorkflowSetupCard, credId: string | null) {
		if (!card.credentialType) return;

		const targetNames = card.credentialTargetNodes.map((target) => target.name);
		const nextCredentialSelections = setCredentialSelectionForTargetNames(
			credentialSelections.value,
			targetNames,
			card.credentialType,
			credId,
		);

		if (credId) {
			testCredential(credId, card.credentialType);
			clearCardSkipped(card);
		}

		credentialSelections.value = nextCredentialSelections;
	}

	function setParameterValue(card: WorkflowSetupCard, parameterName: string, value: unknown) {
		const next = deepCopy(getParameterValues(card));
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
			parameters: getParameterValues(card),
		} as INodeUi;
	}

	function getParameterValues(card: WorkflowSetupCard): INodeParameters {
		return parameterValues.value[card.targetNodeName] ?? (card.node.parameters as INodeParameters);
	}

	function getSelectedCredentialId(card: WorkflowSetupCard): string | undefined {
		if (!card.credentialType) return undefined;
		return credentialSelections.value[card.targetNodeName]?.[card.credentialType];
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
		const selectedCredentialId = getSelectedCredentialId(card);
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
		const selectedCredentialId = getSelectedCredentialId(card);
		if (!selectedCredentialId || !isCredentialTypeTestable(card.credentialType)) return false;
		return credentialsStore.credentialTestResults.get(selectedCredentialId) === 'error';
	}

	function allCardsComplete(): boolean {
		return deps.cards.value.every(isCardComplete);
	}

	function buildCompletedSetupPayload(): WorkflowSetupApplyPayload {
		const includeCredential = (card: WorkflowSetupCard) =>
			!isCardSkipped(card) && isCredentialComplete(card);
		const includeParams = (card: WorkflowSetupCard) =>
			!isCardSkipped(card) && areParametersComplete(card);

		return prunePayload({
			nodeCredentials: buildNodeCredentials(includeCredential),
			nodeParameters: buildNodeParameters(includeParams),
		});
	}

	function buildNodeCredentials(
		shouldInclude: (card: WorkflowSetupCard) => boolean,
	): Record<string, Record<string, string>> {
		const out: Record<string, Record<string, string>> = {};
		for (const card of deps.cards.value) {
			if (!card.credentialType || !shouldInclude(card)) continue;
			for (const target of card.credentialTargetNodes) {
				const credId = credentialSelections.value[target.name]?.[card.credentialType];
				if (!credId) continue;
				const perType = out[target.name] ?? {};
				perType[card.credentialType] = credId;
				out[target.name] = perType;
			}
		}
		return out;
	}

	function buildNodeParameters(
		shouldInclude: (card: WorkflowSetupCard) => boolean,
	): Record<string, INodeParameters> {
		const out: Record<string, INodeParameters> = {};
		for (const card of deps.cards.value) {
			if (card.parameterNames.length === 0 || !shouldInclude(card)) continue;
			const values = getParameterValues(card);
			const params: INodeParameters = {};
			for (const name of card.parameterNames) {
				if (values[name] !== undefined) params[name] = values[name];
			}
			if (Object.keys(params).length > 0) out[card.targetNodeName] = params;
		}
		return out;
	}

	function seedParameterValuesForNewCards(cards: WorkflowSetupCard[]) {
		let nextParameters: ParameterValuesMap | null = null;
		for (const card of cards) {
			if (parameterValues.value[card.targetNodeName]) continue;
			nextParameters ??= { ...parameterValues.value };
			nextParameters[card.targetNodeName] = card.node.parameters as INodeParameters;
		}
		if (nextParameters) parameterValues.value = nextParameters;
	}

	function seedCredentialSelectionsFromCards(
		cards: WorkflowSetupCard[],
	): Array<{ id: string; type: string }> {
		let nextCredentialSelections: CredentialSelectionsMap | null = null;
		const credentialsToTest: Array<{ id: string; type: string }> = [];

		for (const card of cards) {
			if (!card.credentialType) continue;
			if (getSelectedCredentialId(card) !== undefined) continue;
			if (!card.currentCredentialId) continue;

			nextCredentialSelections = setCredentialSelectionForTargetNames(
				nextCredentialSelections ?? credentialSelections.value,
				card.credentialTargetNodes.map((target) => target.name),
				card.credentialType,
				card.currentCredentialId,
			);
			credentialsToTest.push({ id: card.currentCredentialId, type: card.credentialType });
		}

		if (nextCredentialSelections) credentialSelections.value = nextCredentialSelections;
		return credentialsToTest;
	}

	function pruneSkippedCardsMissingFrom(cards: WorkflowSetupCard[]) {
		if (skippedCardIds.value.size === 0) return;
		const knownIds = new Set(cards.map((c) => c.id));
		for (const id of skippedCardIds.value) {
			if (!knownIds.has(id)) skippedCardIds.value.delete(id);
		}
	}

	watch(
		deps.cards,
		(cards) => {
			seedParameterValuesForNewCards(cards);
			const credentialsToTest = seedCredentialSelectionsFromCards(cards);
			for (const credential of credentialsToTest) {
				testCredential(credential.id, credential.type);
			}
			pruneSkippedCardsMissingFrom(cards);
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
			setCredential(active, cred.id);
		},
		onCredentialUpdated: (cred) => {
			for (const perType of Object.values(credentialSelections.value)) {
				for (const [credType, credId] of Object.entries(perType)) {
					if (credId === cred.id && credType === cred.type) {
						testCredential(cred.id, cred.type);
					}
				}
			}
		},
		onCredentialDeleted: (deletedId) => {
			for (const card of deps.cards.value) {
				if (getSelectedCredentialId(card) === deletedId) setCredential(card, null);
			}
		},
	});

	onBeforeUnmount(() => {
		stopListening();
	});

	return {
		credentialSelections,
		parameterValues,
		skippedCardIds,
		setCredential,
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

function setCredentialSelectionForTargetNames(
	currentCredentialSelections: CredentialSelectionsMap,
	targetNames: string[],
	credentialType: string,
	credentialId: string | null,
): CredentialSelectionsMap {
	const nextCredentialSelections = { ...currentCredentialSelections };

	for (const targetName of targetNames) {
		const nodeCredentialSelections = { ...(nextCredentialSelections[targetName] ?? {}) };
		if (credentialId) nodeCredentialSelections[credentialType] = credentialId;
		else delete nodeCredentialSelections[credentialType];
		nextCredentialSelections[targetName] = nodeCredentialSelections;
	}

	return nextCredentialSelections;
}

function prunePayload(payload: WorkflowSetupApplyPayload): WorkflowSetupApplyPayload {
	const result: WorkflowSetupApplyPayload = {};
	if (payload.nodeCredentials && Object.keys(payload.nodeCredentials).length > 0)
		result.nodeCredentials = payload.nodeCredentials;
	if (payload.nodeParameters && Object.keys(payload.nodeParameters).length > 0)
		result.nodeParameters = payload.nodeParameters;
	return result;
}
