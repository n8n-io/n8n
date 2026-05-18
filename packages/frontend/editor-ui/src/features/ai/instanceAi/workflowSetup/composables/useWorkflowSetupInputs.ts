import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { INodeUi } from '@/Interface';
import { deepCopy, type INodeParameters } from 'n8n-workflow';
import { setParameterValue as setParameterValueByPath } from '@/app/utils/parameterUtils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { WorkflowSetupApplyPayload, WorkflowSetupSection } from '../workflowSetup.types';
import { getWorkflowSetupParameterIssues } from '../workflowSetupParameterIssues';

export type CredentialSelectionsMap = Record<string, Record<string, string>>;
type ParameterValuesMap = Record<string, INodeParameters>;

export function useWorkflowSetupInputs(deps: {
	sections: ComputedRef<WorkflowSetupSection[]>;
}): {
	credentialSelections: Ref<CredentialSelectionsMap>;
	skippedSectionIds: Ref<Set<string>>;
	setCredential: (section: WorkflowSetupSection, credId: string | null) => void;
	setParameterValue: (section: WorkflowSetupSection, parameterName: string, value: unknown) => void;
	getDisplayNode: (section: WorkflowSetupSection) => INodeUi;
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isCredentialTestFailed: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
	markSectionSkipped: (section: WorkflowSetupSection) => void;
	buildCompletedSetupPayload: () => WorkflowSetupApplyPayload;
} {
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const { isCredentialTypeTestable, testCredentialInBackground } = useCredentialTestInBackground();

	const credentialSelections = ref<CredentialSelectionsMap>({});
	const parameterValues = ref<ParameterValuesMap>({});
	const skippedSectionIds = ref<Set<string>>(new Set());

	function testCredential(credId: string, credType: string) {
		const credential = credentialsStore.getCredentialById(credId);
		if (!credential) return;

		void testCredentialInBackground(credId, credential.name, credType);
	}

	function setCredential(section: WorkflowSetupSection, credId: string | null) {
		if (!section.credentialType) return;

		const targetNames = section.credentialTargetNodes.map((target) => target.name);
		const nextCredentialSelections = setCredentialSelectionForTargetNames(
			credentialSelections.value,
			targetNames,
			section.credentialType,
			credId,
		);

		if (credId) {
			testCredential(credId, section.credentialType);
			clearSectionSkipped(section);
		}

		credentialSelections.value = nextCredentialSelections;
	}

	function setParameterValue(section: WorkflowSetupSection, parameterName: string, value: unknown) {
		const next = deepCopy(getParameterValues(section));
		setParameterValueByPath(next, parameterName, value);
		parameterValues.value = {
			...parameterValues.value,
			[section.targetNodeName]: next,
		};
		clearSectionSkipped(section);
	}

	function isSectionSkipped(section: WorkflowSetupSection): boolean {
		return skippedSectionIds.value.has(section.id);
	}

	function markSectionSkipped(section: WorkflowSetupSection): void {
		skippedSectionIds.value.add(section.id);
	}

	function clearSectionSkipped(section: WorkflowSetupSection): void {
		skippedSectionIds.value.delete(section.id);
	}

	function getDisplayNode(section: WorkflowSetupSection): INodeUi {
		return {
			...section.node,
			parameters: getParameterValues(section),
		} as INodeUi;
	}

	function getParameterValues(section: WorkflowSetupSection): INodeParameters {
		return (
			parameterValues.value[section.targetNodeName] ?? (section.node.parameters as INodeParameters)
		);
	}

	function getSelectedCredentialId(section: WorkflowSetupSection): string | undefined {
		if (!section.credentialType) return undefined;
		return credentialSelections.value[section.targetNodeName]?.[section.credentialType];
	}

	const parameterIssuesBySectionId = computed(() => {
		const result = new Map<string, Record<string, string[]>>();
		for (const section of deps.sections.value) {
			if (section.parameterNames.length === 0) {
				result.set(section.id, {});
				continue;
			}
			const node = getDisplayNode(section);
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			result.set(
				section.id,
				getWorkflowSetupParameterIssues(node, nodeType, section.parameterNames),
			);
		}
		return result;
	});

	function getParameterIssues(section: WorkflowSetupSection): Record<string, string[]> {
		return parameterIssuesBySectionId.value.get(section.id) ?? {};
	}

	function isCredentialComplete(section: WorkflowSetupSection): boolean {
		if (!section.credentialType) return true;
		const selectedCredentialId = getSelectedCredentialId(section);
		if (!selectedCredentialId) return false;
		if (!isCredentialTypeTestable(section.credentialType)) return true;
		return credentialsStore.isCredentialTestedOk(selectedCredentialId);
	}

	function areParametersComplete(section: WorkflowSetupSection): boolean {
		return Object.keys(getParameterIssues(section)).length === 0;
	}

	function isSectionComplete(section: WorkflowSetupSection): boolean {
		return isCredentialComplete(section) && areParametersComplete(section);
	}

	function isCredentialTestFailed(section: WorkflowSetupSection): boolean {
		if (!section.credentialType) return false;
		const selectedCredentialId = getSelectedCredentialId(section);
		if (!selectedCredentialId || !isCredentialTypeTestable(section.credentialType)) return false;
		return credentialsStore.credentialTestResults.get(selectedCredentialId) === 'error';
	}

	function buildCompletedSetupPayload(): WorkflowSetupApplyPayload {
		const includeCredential = (section: WorkflowSetupSection) =>
			!isSectionSkipped(section) && isCredentialComplete(section);
		const includeParams = (section: WorkflowSetupSection) =>
			!isSectionSkipped(section) && areParametersComplete(section);

		const nodeCredentials = buildNodeCredentials(includeCredential);
		const nodeParameters = buildNodeParameters(includeParams);

		return {
			...(Object.keys(nodeCredentials).length > 0 ? { nodeCredentials } : {}),
			...(Object.keys(nodeParameters).length > 0 ? { nodeParameters } : {}),
		};
	}

	function buildNodeCredentials(
		shouldInclude: (section: WorkflowSetupSection) => boolean,
	): Record<string, Record<string, string>> {
		const out: Record<string, Record<string, string>> = {};
		for (const section of deps.sections.value) {
			if (!section.credentialType || !shouldInclude(section)) continue;
			for (const target of section.credentialTargetNodes) {
				const credId = credentialSelections.value[target.name]?.[section.credentialType];
				if (!credId) continue;
				const perType = out[target.name] ?? {};
				perType[section.credentialType] = credId;
				out[target.name] = perType;
			}
		}
		return out;
	}

	function buildNodeParameters(
		shouldInclude: (section: WorkflowSetupSection) => boolean,
	): Record<string, INodeParameters> {
		const out: Record<string, INodeParameters> = {};
		for (const section of deps.sections.value) {
			if (section.parameterNames.length === 0 || !shouldInclude(section)) continue;
			const values = getParameterValues(section);
			const params: INodeParameters = {};
			for (const name of section.parameterNames) {
				if (values[name] !== undefined) params[name] = values[name];
			}
			if (Object.keys(params).length > 0) out[section.targetNodeName] = params;
		}
		return out;
	}

	function seedCredentialSelectionsForNewSections(
		newSections: WorkflowSetupSection[],
	): Array<{ id: string; type: string }> {
		let nextCredentialSelections: CredentialSelectionsMap | null = null;
		const credentialsToTest: Array<{ id: string; type: string }> = [];

		for (const section of newSections) {
			if (!section.credentialType) continue;
			if (!section.currentCredentialId) continue;

			nextCredentialSelections = setCredentialSelectionForTargetNames(
				nextCredentialSelections ?? credentialSelections.value,
				section.credentialTargetNodes.map((target) => target.name),
				section.credentialType,
				section.currentCredentialId,
			);
			credentialsToTest.push({ id: section.currentCredentialId, type: section.credentialType });
		}

		if (nextCredentialSelections) credentialSelections.value = nextCredentialSelections;
		return credentialsToTest;
	}

	function pruneSkippedSectionsMissingFrom(sections: WorkflowSetupSection[]) {
		if (skippedSectionIds.value.size === 0) return;
		const knownIds = new Set(sections.map((s) => s.id));
		for (const id of skippedSectionIds.value) {
			if (!knownIds.has(id)) skippedSectionIds.value.delete(id);
		}
	}

	watch(
		deps.sections,
		(sections, oldSections) => {
			const previousSectionIds = new Set(oldSections?.map((section) => section.id) ?? []);
			const newSections = sections.filter((section) => !previousSectionIds.has(section.id));

			const credentialsToTest = seedCredentialSelectionsForNewSections(newSections);
			for (const credential of credentialsToTest) {
				testCredential(credential.id, credential.type);
			}
			pruneSkippedSectionsMissingFrom(sections);
		},
		{ immediate: true },
	);

	watch(
		() =>
			deps.sections.value
				.filter((section) => skippedSectionIds.value.has(section.id) && isSectionComplete(section))
				.map((s) => s.id),
		(completedSkippedIds) => {
			for (const id of completedSkippedIds) {
				skippedSectionIds.value.delete(id);
			}
		},
	);

	return {
		credentialSelections,
		skippedSectionIds,
		setCredential,
		setParameterValue,
		getDisplayNode,
		isSectionComplete,
		isCredentialTestFailed,
		isSectionSkipped,
		markSectionSkipped,
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
