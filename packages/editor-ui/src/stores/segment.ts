import {
	CODE_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	SET_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { ITelemetryTrackProperties } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { INodeTypeDescription, IRun } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';

const EVENTS = {
	SHOW_CHECKLIST: 'Show checklist',
	ADDED_MANUAL_TRIGGER: 'User added manual trigger',
	ADDED_SCHEDULE_TRIGGER: 'User added schedule trigger',
	ADDED_DATA_TRIGGER: 'User added data trigger',
	RECEIEVED_MULTIPLE_DATA_ITEMS: 'User received multiple data items',
	EXECUTED_MANUAL_TRIGGER: 'User executed manual trigger successfully',
	EXECUTED_SCHEDULE_TRIGGER: 'User executed schedule trigger successfully',
	EXECUTED_DATA_NODE_TRIGGER: 'User executed data node successfully',
	MAPPED_DATA: 'User mapped data',
};

export const useSegment = defineStore('segment', () => {
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();

	const track = (eventName: string, properties?: ITelemetryTrackProperties) => {
		if (settingsStore.telemetry.enabled) {
			window.analytics?.track(eventName, properties);
		}
	};

	const showAppCuesChecklist = () => {
		const isInIframe = window.location !== window.parent.location;
		if (isInIframe) {
			return;
		}

		track(EVENTS.SHOW_CHECKLIST);
	};

	const trackAddedTrigger = (nodeTypeName: string) => {
		if (!nodeTypesStore.isTriggerNode(nodeTypeName)) {
			return;
		}

		if (nodeTypeName === MANUAL_TRIGGER_NODE_TYPE) {
			track(EVENTS.ADDED_MANUAL_TRIGGER);
		} else if (nodeTypeName === SCHEDULE_TRIGGER_NODE_TYPE) {
			track(EVENTS.ADDED_SCHEDULE_TRIGGER);
		} else {
			track(EVENTS.ADDED_DATA_TRIGGER);
		}
	};

	const trackSuccessfulWorkflowExecution = (runData: IRun) => {
		const dataNodeTypes: Set<string> = new Set<string>();
		const multipleOutputNodes: Set<string> = new Set<string>();
		let hasManualTrigger = false;
		let hasScheduleTrigger = false;
		for (const nodeName of Object.keys(runData.data.resultData.runData)) {
			const nodeRunData = runData.data.resultData.runData[nodeName];
			const node = workflowsStore.getNodeByName(nodeName);
			const nodeTypeName = node ? node.type : 'unknown';
			if (nodeRunData[0].data && nodeRunData[0].data.main.some((out) => out && out?.length > 1)) {
				multipleOutputNodes.add(nodeTypeName);
			}
			if (node && !node.disabled) {
				const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (isDataNodeType(nodeType)) {
					dataNodeTypes.add(nodeTypeName);
				}
				if (isManualTriggerNode(nodeType)) {
					hasManualTrigger = true;
				}
				if (isScheduleTriggerNode(nodeType)) {
					hasScheduleTrigger = true;
				}
			}
		}
		if (multipleOutputNodes.size > 0) {
			track(EVENTS.RECEIEVED_MULTIPLE_DATA_ITEMS, {
				nodeTypes: Array.from(multipleOutputNodes),
			});
		}
		if (dataNodeTypes.size > 0) {
			track(EVENTS.EXECUTED_DATA_NODE_TRIGGER, {
				nodeTypes: Array.from(dataNodeTypes),
			});
		}
		if (hasManualTrigger) {
			track(EVENTS.EXECUTED_MANUAL_TRIGGER);
		}
		if (hasScheduleTrigger) {
			track(EVENTS.EXECUTED_SCHEDULE_TRIGGER);
		}
	};

	const isManualTriggerNode = (nodeType: INodeTypeDescription | null): boolean => {
		return !!nodeType && nodeType.name === MANUAL_TRIGGER_NODE_TYPE;
	};

	const isScheduleTriggerNode = (nodeType: INodeTypeDescription | null): boolean => {
		return !!nodeType && nodeType.name === SCHEDULE_TRIGGER_NODE_TYPE;
	};

	const isDataNodeType = (nodeType: INodeTypeDescription | null): boolean => {
		if (!nodeType) {
			return false;
		}
		const includeCoreNodes = [
			HTTP_REQUEST_NODE_TYPE,
			CODE_NODE_TYPE,
			SET_NODE_TYPE,
			WEBHOOK_NODE_TYPE,
		];
		return !nodeTypesStore.isCoreNodeType(nodeType) || includeCoreNodes.includes(nodeType.name);
	};

	return {
		showAppCuesChecklist,
		track,
		trackAddedTrigger,
		trackSuccessfulWorkflowExecution,
		EVENTS,
	};
});
