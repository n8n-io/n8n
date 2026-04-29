import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';
import { hasPlaceholderDeep } from '@n8n/utils';
import { NodeHelpers, type INodeProperties } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IUpdateInformation } from '@/Interface';
import { isNestedParam, isParamValueSet, type SetupCard } from '../instanceAiWorkflowSetup.utils';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/** Check if the original node parameter value was a placeholder sentinel. */
function isOriginalValuePlaceholder(req: SetupCard['nodes'][0], paramName: string): boolean {
	return hasPlaceholderDeep(req.node.parameters[paramName]);
}

export function useSetupCardParameters(
	cards: ComputedRef<SetupCard[]>,
	trackedParamNames: Ref<Map<string, Set<string>>>,
	cardHasParamWork: (card: SetupCard) => boolean,
) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);
	const nodeTypesStore = useNodeTypesStore();

	const paramValues = ref<Record<string, Record<string, unknown>>>({});

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

	function getCardParameters(card: SetupCard): INodeProperties[] {
		if (!cardHasParamWork(card)) return [];
		const req = card.nodes[0];
		const nodeType = nodeTypesStore.getNodeType(req.node.type, req.node.typeVersion);
		if (!nodeType?.properties) return [];

		const nodeName = req.node.name;
		const tracked =
			trackedParamNames.value.get(nodeName) ?? new Set(Object.keys(req.parameterIssues ?? {}));
		const node = workflowDocumentStore.value.getNodeByName(nodeName);
		if (!node) return [];

		return nodeType.properties.filter(
			(prop) =>
				tracked.has(prop.name) &&
				NodeHelpers.displayParameter(node.parameters, prop, node, nodeType),
		);
	}

	function getCardSimpleParameters(card: SetupCard): INodeProperties[] {
		return getCardParameters(card).filter((p) => !isNestedParam(p));
	}

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
		workflowDocumentStore.value.setNodeParameters(
			{ name: nodeName, value: { [paramName]: parameterData.value } },
			true,
		);
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
						val = workflowDocumentStore.value.getNodeByName(nodeName)?.parameters[paramName];
					}
					if (isParamValueSet(val)) {
						merged[paramName] = val;
						hasValues = true;
					} else if (isOriginalValuePlaceholder(req, paramName)) {
						// Explicitly send empty string to clear the placeholder sentinel on the backend
						merged[paramName] = '';
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

	return {
		paramValues,
		getCardParameters,
		getCardSimpleParameters,
		setParamValue,
		onParameterValueChanged,
		buildNodeParameters,
	};
}
