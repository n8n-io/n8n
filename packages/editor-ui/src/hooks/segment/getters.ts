import { deepCopy } from 'n8n-workflow';
import type {
	ExecutionError,
	GenericValue,
	INodeProperties,
	ITelemetryTrackProperties,
	NodeParameterValue,
	INode,
} from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import type { TelemetryEventData } from '@/hooks/types';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@/stores/n8nRoot.store';

export interface UserSavedCredentialsEventData {
	credential_type: string;
	credential_id: string;
	is_new: boolean;
}

export const getUserSavedCredentialsEventData = (meta: UserSavedCredentialsEventData) => {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	return {
		eventName: 'User saved credentials',
		properties: {
			instance_id: rootStore.instanceId,
			credential_type: meta.credential_type,
			credential_id: meta.credential_id,
			workflow_id: workflowsStore.workflowId,
			node_type: workflowsStore.activeNode?.name,
			is_new: meta.is_new,
			// is_complete: true,
			// is_valid: true,
			// error_message: ''
		},
	};
};

export const getOpenWorkflowSettingsEventData = (): TelemetryEventData => {
	const workflowsStore = useWorkflowsStore();

	return {
		eventName: 'User opened workflow settings',
		properties: {
			workflow_id: workflowsStore.workflowId,
			workflow_name: workflowsStore.workflowName,
			current_settings: deepCopy(workflowsStore.workflowSettings),
		},
	};
};

export interface UpdatedWorkflowSettingsEventData {
	oldSettings: Record<string, unknown>;
}

export const getUpdatedWorkflowSettingsEventData = (
	meta: UpdatedWorkflowSettingsEventData,
): TelemetryEventData => {
	const workflowsStore = useWorkflowsStore();

	return {
		eventName: 'User updated workflow settings',
		properties: {
			workflow_id: workflowsStore.workflowId,
			workflow_name: workflowsStore.workflowName,
			new_settings: deepCopy(workflowsStore.workflowSettings),
			old_settings: meta.oldSettings,
		},
	};
};

export interface NodeTypeChangedEventData {
	nodeSubtitle?: string;
}

export const getNodeTypeChangedEventData = (meta: NodeTypeChangedEventData): TelemetryEventData => {
	const store = useNDVStore();

	return {
		eventName: 'User opened node modal',
		properties: {
			node_name: store.activeNode?.name,
			node_subtitle: meta.nodeSubtitle,
		},
	};
};

export interface InsertedItemFromExpEditorEventData {
	parameter: {
		displayName: string;
	};
	value: string;
	selectedItem: {
		variable: string;
	};
}

export const getInsertedItemFromExpEditorEventData = (
	meta: InsertedItemFromExpEditorEventData,
): TelemetryEventData => {
	const store = useNDVStore();

	return {
		eventName: 'User inserted item from Expression Editor variable selector',
		properties: {
			node_name: store.activeNode?.name,
			node_type: store.activeNode?.type.split('.')[1],
			parameter_name: meta.parameter.displayName,
			variable_expression: meta.selectedItem.variable,
		} as ITelemetryTrackProperties,
	};
};

export interface ExpressionEditorEventsData {
	dialogVisible: boolean;
	value: string;
	resolvedExpressionValue: string;
	parameter: INodeProperties;
}

export const getExpressionEditorEventsData = (
	meta: ExpressionEditorEventsData,
	isValueDefault: boolean,
): TelemetryEventData => {
	const store = useNDVStore();
	const eventData: TelemetryEventData = {
		eventName: '',
		properties: {},
	};

	if (!meta.dialogVisible) {
		eventData.eventName = 'User closed Expression Editor';
		eventData.properties = {
			empty_expression: isValueDefault,
			expression_value: meta.value,
			expression_result: meta.resolvedExpressionValue.slice(1),
		};
	} else {
		eventData.eventName = 'User opened Expression Editor';
		eventData.properties = {
			node_name: store.activeNode?.name,
			node_type: store.activeNode?.type.split('.')[1],
			parameter_name: meta.parameter.displayName,
			parameter_field_type: meta.parameter.type,
			new_expression: isValueDefault,
		};
	}
	return eventData;
};

export interface AuthenticationModalEventData {
	parameterPath: string;
	oldNodeParameters: Record<string, GenericValue>;
	parameters: INodeProperties[];
	newValue: NodeParameterValue;
}
export const getAuthenticationModalEventData = (
	meta: AuthenticationModalEventData,
): TelemetryEventData => {
	const store = useNDVStore();

	return {
		eventName: 'User changed Authentication type from node modal',
		properties: {
			node_name: store.activeNode?.name,
			node_type: store.activeNode?.type.split('.')[1],
			old_mode:
				meta.oldNodeParameters.authentication ||
				(
					meta.parameters.find((param) => param.name === 'authentication') || {
						default: 'default',
					}
				).default,
			new_mode: meta.newValue,
		},
	};
};

export interface OutputModeChangedEventData {
	oldValue: string;
	newValue: string;
}

export const getOutputModeChangedEventData = (
	meta: OutputModeChangedEventData,
): TelemetryEventData => {
	const store = useNDVStore();

	return {
		eventName: 'User changed node output view mode',
		properties: {
			old_mode: meta.oldValue,
			new_mode: meta.newValue,
			node_name: store.activeNode?.name,
			node_type: store.activeNode?.type.split('.')[1],
		},
	};
};

export interface ExecutionFinishedEventData {
	runDataExecutedStartData:
		| { destinationNode?: string | undefined; runNodeFilter?: string[] | undefined }
		| undefined;
	nodeName?: string;
	errorMessage: string;
	resultDataError: ExecutionError | undefined;
	itemsCount: number;
}

export const getExecutionFinishedEventData = (
	meta: ExecutionFinishedEventData,
): TelemetryEventData => {
	const store = useWorkflowsStore();

	const eventData: TelemetryEventData = {
		eventName: '',
		properties: {
			execution_id: store.activeExecutionId,
		},
	};

	if (meta.runDataExecutedStartData?.destinationNode) {
		eventData.eventName = 'Node execution finished';
		eventData.properties!.node_type = store.getNodeByName(meta.nodeName || '')?.type.split('.')[1];
		eventData.properties!.node_name = meta.nodeName;
	} else {
		eventData.eventName = 'Manual workflow execution finished';
		eventData.properties!.workflow_id = store.workflowId;
		eventData.properties!.workflow_name = store.workflowName;
	}

	if (meta.errorMessage || meta.resultDataError) {
		eventData.properties!.status = 'failed';
		eventData.properties!.error_message = meta.resultDataError?.message || '';
		eventData.properties!.error_stack = meta.resultDataError?.stack || '';
		eventData.properties!.error_ui_message = meta.errorMessage || '';
		eventData.properties!.error_timestamp = new Date();

		if (meta.resultDataError && (meta.resultDataError as unknown as { node: INodeUi })?.node) {
			eventData.properties!.error_node =
				typeof (meta.resultDataError as unknown as { node: string })?.node === 'string'
					? (meta.resultDataError as unknown as { node: string })?.node
					: (meta.resultDataError as unknown as { node: INodeUi })?.node?.name;
		} else {
			eventData.properties!.error_node = meta.nodeName;
		}
	} else {
		eventData.properties!.status = 'success';
		if (meta.runDataExecutedStartData?.destinationNode) {
			// Node execution finished
			eventData.properties!.items_count = meta.itemsCount || 0;
		}
	}
	return eventData;
};

export interface NodeRemovedEventData {
	node: INodeUi;
}

export const getNodeRemovedEventData = (meta: NodeRemovedEventData): TelemetryEventData => {
	const workflowsStore = useWorkflowsStore();

	return {
		eventName: 'User removed node from workflow canvas',
		properties: {
			node_name: meta.node.name,
			node_type: meta.node.type,
			node_disabled: meta.node.disabled,
			workflow_id: workflowsStore.workflowId,
		},
	};
};

export const getNodeEditingFinishedEventData = (
	activeNode: INode | null,
): TelemetryEventData | undefined => {
	switch (activeNode?.type) {
		case 'n8n-nodes-base.httpRequest':
			const domain = (activeNode.parameters.url as string).split('/')[2];
			return {
				eventName: 'User finished httpRequest node editing',
				properties: {
					method: activeNode.parameters.method,
					domain,
				},
			};
		case 'n8n-nodes-base.function':
			return {
				eventName: 'User finished function node editing',
				properties: {
					node_name: activeNode.name,
					code: activeNode.parameters.functionCode,
				},
			};
		case 'n8n-nodes-base.functionItem':
			return {
				eventName: 'User finished functionItem node editing',
				properties: {
					node_name: activeNode.name,
					code: activeNode.parameters.functionCode,
				},
			};
		default:
			return;
	}
};

export interface ExecutionStartedEventData {
	nodeName?: string;
	source?: string;
}

export const getExecutionStartedEventData = (
	meta: ExecutionStartedEventData,
): TelemetryEventData => {
	const store = useWorkflowsStore();

	const eventData: TelemetryEventData = {
		eventName: '',
		properties: {
			execution_id: store.activeExecutionId,
		},
	};

	// node execution
	if (meta.nodeName) {
		eventData.eventName = 'User started node execution';
		eventData.properties!.source = 'unknown';
		eventData.properties!.node_type = store.getNodeByName(meta.nodeName)?.type.split('.')[1];
		eventData.properties!.node_name = meta.nodeName;

		if (meta.source === 'RunData.ExecuteNodeButton') {
			eventData.properties!.source = 'node_modal';
		} else if (meta.source === 'Node.executeNode') {
			eventData.properties!.source = 'workflow_canvas';
		}
	} else {
		// workflow execution
		eventData.eventName = 'User started manual workflow execution';
		eventData.properties!.workflow_id = store.workflowId;
		eventData.properties!.workflow_name = store.workflowName;
	}

	return eventData;
};
