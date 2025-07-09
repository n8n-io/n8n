import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import { jsonParse, jsonStringify, NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import {
	MAX_EXPECTED_REQUEST_SIZE,
	MAX_PINNED_DATA_SIZE,
	MAX_WORKFLOW_SIZE,
	PIN_DATA_NODE_TYPES_DENYLIST,
} from '@/constants';
import { stringSizeInBytes, toMegaBytes } from '@/utils/typesUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi, IRunDataDisplayMode } from '@/Interface';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useTelemetry } from '@/composables/useTelemetry';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNodeType } from '@/composables/useNodeType';
import { useDataSchema } from './useDataSchema';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export type PinDataSource =
	| 'pin-icon-click'
	| 'save-edit'
	| 'on-ndv-close-modal'
	| 'duplicate-node'
	| 'add-nodes'
	| 'context-menu'
	| 'keyboard-shortcut'
	| 'banner-link';

export type UnpinDataSource =
	| 'unpin-and-execute-modal'
	| 'context-menu'
	| 'keyboard-shortcut'
	| 'unpin-and-send-chat-message-modal';

export function usePinnedData(
	node: MaybeRef<INodeUi | null>,
	options: {
		displayMode?: MaybeRef<IRunDataDisplayMode>;
		runIndex?: MaybeRef<number>;
	} = {},
) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const { getInputDataWithPinned } = useDataSchema();

	const { isSubNodeType, isMultipleOutputsNodeType } = useNodeType({
		node,
	});

	const data = computed<IPinData[string] | undefined>(() => {
		const targetNode = unref(node);
		return targetNode ? workflowsStore.pinDataByNodeName(targetNode.name) : undefined;
	});

	const hasData = computed<boolean>(() => {
		const targetNode = unref(node);
		return !!targetNode && typeof data.value !== 'undefined';
	});

	const isValidNodeType = computed(() => {
		const targetNode = unref(node);
		return (
			!!targetNode &&
			!isSubNodeType.value &&
			!isMultipleOutputsNodeType.value &&
			!PIN_DATA_NODE_TYPES_DENYLIST.includes(targetNode.type)
		);
	});

	function canPinNode(checkDataEmpty = false, outputIndex?: number) {
		const targetNode = unref(node);
		if (targetNode === null || PIN_DATA_NODE_TYPES_DENYLIST.includes(targetNode.type)) return false;

		const nodeType = useNodeTypesStore().getNodeType(targetNode.type, targetNode.typeVersion);
		const dataToPin = getInputDataWithPinned(targetNode);

		if (!nodeType || (checkDataEmpty && dataToPin.length === 0)) return false;

		const workflow = workflowsStore.getCurrentWorkflow();
		const outputs = NodeHelpers.getNodeOutputs(workflow, targetNode, nodeType).map((output) =>
			typeof output === 'string' ? { type: output } : output,
		);

		const mainOutputs = outputs.filter(
			(output) => output.type === NodeConnectionTypes.Main && output.category !== 'error',
		);

		let indexAcceptable = true;

		if (outputIndex !== undefined) {
			const output = outputs[outputIndex];

			if (outputs[outputIndex] === undefined) return false;

			indexAcceptable = output.type === NodeConnectionTypes.Main && output.category !== 'error';
		}

		return mainOutputs.length === 1 && indexAcceptable;
	}

	function isValidJSON(data: string): boolean {
		try {
			JSON.parse(data);

			return true;
		} catch (error) {
			const title = i18n.baseText('runData.editOutputInvalid');

			const toRemove = new RegExp(/JSON\.parse:|of the JSON data/, 'g');
			const message = error.message.replace(toRemove, '').trim();
			const positionMatchRegEx = /at position (\d+)/;
			const positionMatch = error.message.match(positionMatchRegEx);

			error.message = message.charAt(0).toUpperCase() + message.slice(1);
			error.message = error.message.replace(
				"Unexpected token ' in JSON",
				i18n.baseText('runData.editOutputInvalid.singleQuote'),
			);

			if (positionMatch) {
				const position = parseInt(positionMatch[1], 10);
				const lineBreaksUpToPosition = (data.slice(0, position).match(/\n/g) || []).length;

				error.message = error.message.replace(
					positionMatchRegEx,
					i18n.baseText('runData.editOutputInvalid.atPosition', {
						interpolate: {
							position: `${position}`,
						},
					}),
				);

				error.message = `${i18n.baseText('runData.editOutputInvalid.onLine', {
					interpolate: {
						line: `${lineBreaksUpToPosition + 1}`,
					},
				})} ${error.message}`;
			}

			toast.showError(error, title);

			return false;
		}
	}

	function getMaxPinnedDataSize() {
		return window.maxPinnedDataSize ?? MAX_PINNED_DATA_SIZE;
	}

	function isValidSize(data: string | object): boolean {
		const targetNode = unref(node);
		if (!targetNode) {
			return false;
		}

		if (typeof data === 'object') data = JSON.stringify(data);

		const { pinData: currentPinData, ...workflow } = workflowsStore.getCurrentWorkflow();
		const workflowJson = jsonStringify(workflow, { replaceCircularRefs: true });

		const newPinData = { ...currentPinData, [targetNode.name]: data };
		const newPinDataSize = workflowsStore.getPinDataSize(newPinData);

		if (newPinDataSize > getMaxPinnedDataSize()) {
			toast.showError(
				new Error(
					i18n.baseText('ndv.pinData.error.tooLarge.description', {
						interpolate: {
							size: toMegaBytes(newPinDataSize),
							limit: toMegaBytes(getMaxPinnedDataSize()),
						},
					}),
				),
				i18n.baseText('ndv.pinData.error.tooLarge.title'),
			);

			return false;
		}

		const workflowSize = stringSizeInBytes(workflowJson) + newPinDataSize;
		const limit = MAX_WORKFLOW_SIZE - MAX_EXPECTED_REQUEST_SIZE;
		if (workflowSize > limit) {
			toast.showError(
				new Error(
					i18n.baseText('ndv.pinData.error.tooLargeWorkflow.description', {
						interpolate: { size: toMegaBytes(workflowSize), limit: toMegaBytes(limit) },
					}),
				),
				i18n.baseText('ndv.pinData.error.tooLargeWorkflow.title'),
			);

			return false;
		}

		return true;
	}

	function onSetDataSuccess({ source }: { source: PinDataSource }) {
		const targetNode = unref(node);
		const displayMode = unref(options.displayMode);
		const runIndex = unref(options.runIndex);
		const telemetryPayload = {
			pinning_source: source,
			node_type: targetNode?.type,
			push_ref: rootStore.pushRef,
			data_size: stringSizeInBytes(data.value),
			view: displayMode,
			run_index: runIndex,
		};

		void externalHooks.run('runData.onDataPinningSuccess', telemetryPayload);
		telemetry.track('Ndv data pinning success', telemetryPayload);
	}

	function onSetDataError({
		errorType,
		source,
	}: {
		errorType: 'data-too-large' | 'invalid-json';
		source: PinDataSource;
	}) {
		const targetNode = unref(node);
		const displayMode = unref(options.displayMode);
		const runIndex = unref(options.runIndex);

		telemetry.track('Ndv data pinning failure', {
			pinning_source: source,
			node_type: targetNode?.type,
			push_ref: rootStore.pushRef,
			data_size: stringSizeInBytes(data.value),
			view: displayMode,
			run_index: runIndex,
			error_type: errorType,
		});
	}

	function setData(data: string | INodeExecutionData[], source: PinDataSource) {
		const targetNode = unref(node);
		if (!targetNode) {
			return;
		}

		if (typeof data === 'string') {
			if (!isValidJSON(data)) {
				onSetDataError({ errorType: 'invalid-json', source });
				throw new Error('Invalid JSON');
			}

			data = jsonParse(data);
		}

		if (!isValidSize(data)) {
			onSetDataError({ errorType: 'data-too-large', source });
			throw new Error('Data too large');
		}

		workflowsStore.pinData({ node: targetNode, data: data as INodeExecutionData[] });
		onSetDataSuccess({ source });
	}

	function onUnsetData({ source }: { source: PinDataSource | UnpinDataSource }) {
		const targetNode = unref(node);
		const runIndex = unref(options.runIndex);

		telemetry.track('User unpinned ndv data', {
			node_type: targetNode?.type,
			push_ref: rootStore.pushRef,
			run_index: runIndex,
			source,
			data_size: stringSizeInBytes(data.value),
		});
	}

	function unsetData(source: PinDataSource | UnpinDataSource): void {
		const targetNode = unref(node);
		if (!targetNode) {
			return;
		}

		onUnsetData({ source });
		workflowsStore.unpinData({ node: targetNode });
	}

	return {
		data,
		hasData,
		isValidNodeType,
		canPinNode,
		setData,
		onSetDataSuccess,
		onSetDataError,
		unsetData,
		onUnsetData,
		isValidJSON,
		isValidSize,
	};
}
