<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
	INodeTypeDescription,
	INodeParameters,
	INodeProperties,
	NodeConnectionType,
	NodeParameterValue,
	INodeCredentialDescription,
} from 'n8n-workflow';
import { NodeHelpers, NodeConnectionTypes, deepCopy } from 'n8n-workflow';
import type {
	CurlToJSONResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
} from '@/Interface';

import { COMMUNITY_NODES_INSTALLATION_DOCS_URL, CUSTOM_NODES_DOCS_URL } from '@/constants';

import NodeTitle from '@/components/NodeTitle.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import NodeWebhooks from '@/components/NodeWebhooks.vue';
import NDVSubConnections from '@/components/NDVSubConnections.vue';
import get from 'lodash/get';

import NodeExecuteButton from './NodeExecuteButton.vue';
import { isCommunityPackageName } from '@/utils/nodeTypesUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useHistoryStore } from '@/stores/history.store';
import { RenameNodeCommand } from '@/models/history';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { EventBus } from '@n8n/utils/event-bus';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { importCurlEventBus, ndvEventBus } from '@/event-bus';
import { ProjectTypes } from '@/types/projects.types';
import FreeAiCreditsCallout from '@/components/FreeAiCreditsCallout.vue';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { N8nIconButton } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		eventBus: EventBus;
		dragging: boolean;
		pushRef: string;
		nodeType: INodeTypeDescription | null;
		readOnly: boolean;
		foreignCredentials: string[];
		blockUI: boolean;
		executable: boolean;
		inputSize: number;
		activeNode?: INodeUi;
		canExpand?: boolean;
		hideConnections?: boolean;
	}>(),
	{
		foreignCredentials: () => [],
		readOnly: false,
		executable: true,
		inputSize: 0,
		blockUI: false,
		activeNode: undefined,
		canExpand: false,
		hideConnections: false,
	},
);

const emit = defineEmits<{
	stopExecution: [];
	redrawRequired: [];
	valueChanged: [value: IUpdateInformation];
	switchSelectedNode: [nodeName: string];
	openConnectionNodeCreator: [
		nodeName: string,
		connectionType: NodeConnectionType,
		connectionIndex?: number,
	];
	activate: [];
	execute: [];
	expand: [];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const historyStore = useHistoryStore();

const telemetry = useTelemetry();
const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const i18n = useI18n();
const nodeSettingsParameters = useNodeSettingsParameters();
const nodeValues = nodeSettingsParameters.nodeValues;

const nodeValid = ref(true);
const openPanel = ref<'params' | 'settings'>('params');

// Used to prevent nodeValues from being overwritten by defaults on reopening ndv
const nodeValuesInitialized = ref(false);

const hiddenIssuesInputs = ref<string[]>([]);
const nodeSettings = ref<INodeProperties[]>([]);
const subConnections = ref<InstanceType<typeof NDVSubConnections> | null>(null);

const currentWorkflowInstance = computed(() => workflowsStore.getCurrentWorkflow());
const currentWorkflow = computed(() =>
	workflowsStore.getWorkflowById(currentWorkflowInstance.value.id),
);
const hasForeignCredential = computed(() => props.foreignCredentials.length > 0);
const isHomeProjectTeam = computed(
	() => currentWorkflow.value?.homeProject?.type === ProjectTypes.Team,
);
const isReadOnly = computed(
	() => props.readOnly || (hasForeignCredential.value && !isHomeProjectTeam.value),
);
const node = computed(() => props.activeNode ?? ndvStore.activeNode);

const isTriggerNode = computed(() => !!node.value && nodeTypesStore.isTriggerNode(node.value.type));

const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const isExecutable = computed(() => {
	if (props.nodeType && node.value) {
		const workflowNode = currentWorkflowInstance.value.getNode(node.value.name);
		const inputs = NodeHelpers.getNodeInputs(
			currentWorkflowInstance.value,
			workflowNode!,
			props.nodeType,
		);
		const inputNames = NodeHelpers.getConnectionTypes(inputs);

		if (
			!inputNames.includes(NodeConnectionTypes.Main) &&
			!isToolNode.value &&
			!isTriggerNode.value
		) {
			return false;
		}
	}

	return props.executable || props.foreignCredentials.length > 0;
});

const nodeTypeVersions = computed(() => {
	if (!node.value) return [];
	return nodeTypesStore.getNodeVersions(node.value.type);
});

const latestVersion = computed(() => Math.max(...nodeTypeVersions.value));

const isLatestNodeVersion = computed(
	() => !node.value?.typeVersion || latestVersion.value === node.value.typeVersion,
);

const executeButtonTooltip = computed(() => {
	if (
		node.value &&
		isLatestNodeVersion.value &&
		props.inputSize > 1 &&
		!nodeHelpers.isSingleExecution(node.value.type, node.value.parameters)
	) {
		return i18n.baseText('nodeSettings.executeButtonTooltip.times', {
			interpolate: { inputSize: props.inputSize },
		});
	}
	return '';
});

const nodeVersionTag = computed(() => {
	if (!props.nodeType || props.nodeType.hidden) {
		return i18n.baseText('nodeSettings.deprecated');
	}

	if (isLatestNodeVersion.value) {
		return i18n.baseText('nodeSettings.latest');
	}

	return i18n.baseText('nodeSettings.latestVersion', {
		interpolate: { version: latestVersion.value.toString() },
	});
});

const parameters = computed(() => {
	if (props.nodeType === null) {
		return [];
	}

	return props.nodeType?.properties ?? [];
});

const parametersSetting = computed(() => parameters.value.filter((item) => item.isNodeSetting));

const parametersNoneSetting = computed(() =>
	// The connection hint notice is visually hidden via CSS in NodeDetails.vue when the node has output connections
	parameters.value.filter((item) => !item.isNodeSetting),
);

const isDisplayingCredentials = computed(
	() =>
		credentialsStore
			.getCredentialTypesNodeDescriptions('', props.nodeType)
			.filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription)).length >
		0,
);

const showNoParametersNotice = computed(
	() =>
		!isDisplayingCredentials.value &&
		parametersNoneSetting.value.filter((item) => item.type !== 'notice').length === 0,
);

const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

const isCommunityNode = computed(() => !!node.value && isCommunityPackageName(node.value.type));

const usedCredentials = computed(() =>
	Object.values(workflowsStore.usedCredentials).filter((credential) =>
		Object.values(node.value?.credentials || []).find(
			(nodeCredential) => nodeCredential.id === credential.id,
		),
	),
);

const credentialOwnerName = computed(() => {
	const credential = usedCredentials.value
		? Object.values(usedCredentials.value).find(
				(credential) => credential.id === props.foreignCredentials[0],
			)
		: undefined;

	return credentialsStore.getCredentialOwnerName(credential);
});

const valueChanged = (parameterData: IUpdateInformation) => {
	let newValue: NodeParameterValue;

	if (parameterData.hasOwnProperty('value')) {
		// New value is given
		newValue = parameterData.value as string | number;
	} else {
		// Get new value from nodeData where it is set already
		newValue = get(nodeValues.value, parameterData.name) as NodeParameterValue;
	}
	// Save the node name before we commit the change because
	// we need the old name to rename the node properly
	const nodeNameBefore = parameterData.node || node.value?.name;

	if (!nodeNameBefore) {
		return;
	}

	const _node = workflowsStore.getNodeByName(nodeNameBefore);

	if (_node === null) {
		return;
	}

	if (parameterData.name === 'onError') {
		// If that parameter changes, we need to redraw the connections, as the error output may need to be added or removed
		emit('redrawRequired');
	}

	if (parameterData.name === 'name') {
		// Name of node changed so we have to set also the new node name as active

		// Update happens in NodeView so emit event
		const sendData = {
			value: newValue,
			oldValue: nodeNameBefore,
			name: parameterData.name,
		};
		emit('valueChanged', sendData);
	} else if (parameterData.name === 'parameters') {
		const nodeType = nodeTypesStore.getNodeType(_node.type, _node.typeVersion);
		if (!nodeType) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			_node.parameters,
			false,
			false,
			_node,
			nodeType,
		);

		const oldNodeParameters = Object.assign({}, nodeParameters);

		// Copy the data because it is the data of vuex so make sure that
		// we do not edit it directly
		nodeParameters = deepCopy(nodeParameters);

		if (parameterData.value && typeof parameterData.value === 'object') {
			for (const [parameterName, parameterValue] of Object.entries(parameterData.value)) {
				newValue = parameterValue;

				const parameterPath = nodeSettingsParameters.updateParameterByPath(
					parameterName,
					newValue,
					nodeParameters,
					nodeType,
					_node.typeVersion,
				);

				void externalHooks.run('nodeSettings.valueChanged', {
					parameterPath,
					newValue,
					parameters: parameters.value,
					oldNodeParameters,
				});
			}
		}

		// Get the parameters with the now new defaults according to the
		// from the user actually defined parameters
		nodeParameters = NodeHelpers.getNodeParameters(
			nodeType.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			_node,
			nodeType,
		);

		for (const key of Object.keys(nodeParameters as object)) {
			if (nodeParameters?.[key] !== null && nodeParameters?.[key] !== undefined) {
				nodeSettingsParameters.setValue(`parameters.${key}`, nodeParameters[key] as string);
			}
		}

		if (nodeParameters) {
			const updateInformation: IUpdateInformation = {
				name: _node.name,
				value: nodeParameters,
			};

			workflowsStore.setNodeParameters(updateInformation);

			nodeHelpers.updateNodeParameterIssuesByName(_node.name);
			nodeHelpers.updateNodeCredentialIssuesByName(_node.name);
		}
	} else if (nodeSettingsParameters.nameIsParameter(parameterData)) {
		// A node parameter changed
		nodeSettingsParameters.updateNodeParameter(parameterData, newValue, _node, isToolNode.value);
	} else {
		// A property on the node itself changed

		// Update data in settings
		nodeValues.value = {
			...nodeValues.value,
			[parameterData.name]: newValue,
		};

		// Update data in vuex
		const updateInformation = {
			name: _node.name,
			key: parameterData.name,
			value: newValue,
		};

		workflowsStore.setNodeValue(updateInformation);
	}
};

const setHttpNodeParameters = (parameters: CurlToJSONResponse) => {
	try {
		valueChanged({
			node: node.value?.name,
			name: 'parameters',
			value: parameters as unknown as INodeParameters,
		});
	} catch {}
};

const onSwitchSelectedNode = (node: string) => {
	emit('switchSelectedNode', node);
};

const onOpenConnectionNodeCreator = (
	nodeName: string,
	connectionType: NodeConnectionType,
	connectionIndex: number = 0,
) => {
	emit('openConnectionNodeCreator', nodeName, connectionType, connectionIndex);
};

const populateHiddenIssuesSet = () => {
	if (!node.value || !workflowsStore.isNodePristine(node.value.name)) return;
	hiddenIssuesInputs.value.push('credentials');
	parametersNoneSetting.value.forEach((parameter) => {
		hiddenIssuesInputs.value.push(parameter.name);
	});
	workflowsStore.setNodePristine(node.value.name, false);
};

const populateSettings = () => {
	if (isExecutable.value && !isTriggerNode.value) {
		nodeSettings.value.push(
			...([
				{
					displayName: i18n.baseText('nodeSettings.alwaysOutputData.displayName'),
					name: 'alwaysOutputData',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.alwaysOutputData.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.executeOnce.displayName'),
					name: 'executeOnce',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.executeOnce.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.retryOnFail.displayName'),
					name: 'retryOnFail',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.retryOnFail.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.maxTries.displayName'),
					name: 'maxTries',
					type: 'number',
					typeOptions: {
						minValue: 2,
						maxValue: 5,
					},
					default: 3,
					displayOptions: {
						show: {
							retryOnFail: [true],
						},
					},
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.maxTries.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.waitBetweenTries.displayName'),
					name: 'waitBetweenTries',
					type: 'number',
					typeOptions: {
						minValue: 0,
						maxValue: 5000,
					},
					default: 1000,
					displayOptions: {
						show: {
							retryOnFail: [true],
						},
					},
					noDataExpression: true,
					description: i18n.baseText('nodeSettings.waitBetweenTries.description'),
				},
				{
					displayName: i18n.baseText('nodeSettings.onError.displayName'),
					name: 'onError',
					type: 'options',
					options: [
						{
							name: i18n.baseText('nodeSettings.onError.options.stopWorkflow.displayName'),
							value: 'stopWorkflow',
							description: i18n.baseText('nodeSettings.onError.options.stopWorkflow.description'),
						},
						{
							name: i18n.baseText('nodeSettings.onError.options.continueRegularOutput.displayName'),
							value: 'continueRegularOutput',
							description: i18n.baseText(
								'nodeSettings.onError.options.continueRegularOutput.description',
							),
						},
						{
							name: i18n.baseText('nodeSettings.onError.options.continueErrorOutput.displayName'),
							value: 'continueErrorOutput',
							description: i18n.baseText(
								'nodeSettings.onError.options.continueErrorOutput.description',
							),
						},
					],
					default: 'stopWorkflow',
					description: i18n.baseText('nodeSettings.onError.description'),
					noDataExpression: true,
				},
			] as INodeProperties[]),
		);
	}
	nodeSettings.value.push(
		...([
			{
				displayName: i18n.baseText('nodeSettings.notes.displayName'),
				name: 'notes',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				noDataExpression: true,
				description: i18n.baseText('nodeSettings.notes.description'),
			},
			{
				displayName: i18n.baseText('nodeSettings.notesInFlow.displayName'),
				name: 'notesInFlow',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: i18n.baseText('nodeSettings.notesInFlow.description'),
			},
		] as INodeProperties[]),
	);
};

const onParameterBlur = (parameterName: string) => {
	hiddenIssuesInputs.value = hiddenIssuesInputs.value.filter((name) => name !== parameterName);
};

const onWorkflowActivate = () => {
	hiddenIssuesInputs.value = [];
	emit('activate');
};

const onNodeExecute = () => {
	hiddenIssuesInputs.value = [];
	subConnections.value?.showNodeInputsIssues();
	emit('execute');
};

const credentialSelected = (updateInformation: INodeUpdatePropertiesInformation) => {
	// Update the values on the node
	workflowsStore.updateNodeProperties(updateInformation);

	const node = workflowsStore.getNodeByName(updateInformation.name);

	if (node) {
		// Update the issues
		nodeHelpers.updateNodeCredentialIssues(node);
	}

	void externalHooks.run('nodeSettings.credentialSelected', { updateInformation });
};

const nameChanged = (name: string) => {
	if (node.value) {
		historyStore.pushCommandToUndo(new RenameNodeCommand(node.value.name, name, Date.now()));
	}
	valueChanged({
		value: name,
		name: 'name',
	});
};

const setNodeValues = () => {
	// No node selected
	if (!node.value) {
		nodeValuesInitialized.value = true;
		return;
	}

	if (props.nodeType !== null) {
		nodeValid.value = true;

		const foundNodeSettings = [];
		if (node.value.color) {
			foundNodeSettings.push('color');
			nodeValues.value = {
				...nodeValues.value,
				color: node.value.color,
			};
		}

		if (node.value.notes) {
			foundNodeSettings.push('notes');
			nodeValues.value = {
				...nodeValues.value,
				notes: node.value.notes,
			};
		}

		if (node.value.alwaysOutputData) {
			foundNodeSettings.push('alwaysOutputData');
			nodeValues.value = {
				...nodeValues.value,
				alwaysOutputData: node.value.alwaysOutputData,
			};
		}

		if (node.value.executeOnce) {
			foundNodeSettings.push('executeOnce');
			nodeValues.value = {
				...nodeValues.value,
				executeOnce: node.value.executeOnce,
			};
		}

		if (node.value.continueOnFail) {
			foundNodeSettings.push('onError');
			nodeValues.value = {
				...nodeValues.value,
				onError: 'continueRegularOutput',
			};
		}

		if (node.value.onError) {
			foundNodeSettings.push('onError');
			nodeValues.value = {
				...nodeValues.value,
				onError: node.value.onError,
			};
		}

		if (node.value.notesInFlow) {
			foundNodeSettings.push('notesInFlow');
			nodeValues.value = {
				...nodeValues.value,
				notesInFlow: node.value.notesInFlow,
			};
		}

		if (node.value.retryOnFail) {
			foundNodeSettings.push('retryOnFail');
			nodeValues.value = {
				...nodeValues.value,
				retryOnFail: node.value.retryOnFail,
			};
		}

		if (node.value.maxTries) {
			foundNodeSettings.push('maxTries');
			nodeValues.value = {
				...nodeValues.value,
				maxTries: node.value.maxTries,
			};
		}

		if (node.value.waitBetweenTries) {
			foundNodeSettings.push('waitBetweenTries');
			nodeValues.value = {
				...nodeValues.value,
				waitBetweenTries: node.value.waitBetweenTries,
			};
		}

		// Set default node settings
		for (const nodeSetting of nodeSettings.value) {
			if (!foundNodeSettings.includes(nodeSetting.name)) {
				// Set default value
				nodeValues.value = {
					...nodeValues.value,
					[nodeSetting.name]: nodeSetting.default,
				};
			}
		}

		nodeValues.value = {
			...nodeValues.value,
			parameters: deepCopy(node.value.parameters),
		};
	} else {
		nodeValid.value = false;
	}

	nodeValuesInitialized.value = true;
};

const onMissingNodeTextClick = (event: MouseEvent) => {
	if ((event.target as Element).localName === 'a') {
		telemetry.track('user clicked cnr browse button', {
			source: 'cnr missing node modal',
		});
	}
};

const onMissingNodeLearnMoreLinkClick = () => {
	telemetry.track('user clicked cnr docs link', {
		source: 'missing node modal source',
		package_name: node.value?.type.split('.')[0],
		node_type: node.value?.type,
	});
};

const onStopExecution = () => {
	emit('stopExecution');
};

const openSettings = () => {
	openPanel.value = 'settings';
};

const onTabSelect = (tab: 'params' | 'settings') => {
	openPanel.value = tab;
};

watch(node, () => {
	setNodeValues();
});

onMounted(() => {
	populateHiddenIssuesSet();
	populateSettings();
	setNodeValues();
	props.eventBus?.on('openSettings', openSettings);
	if (node.value !== null) {
		nodeHelpers.updateNodeParameterIssues(node.value, props.nodeType);
	}
	importCurlEventBus.on('setHttpNodeParameters', setHttpNodeParameters);
	ndvEventBus.on('updateParameterValue', valueChanged);
});

onBeforeUnmount(() => {
	props.eventBus?.off('openSettings', openSettings);
	importCurlEventBus.off('setHttpNodeParameters', setHttpNodeParameters);
	ndvEventBus.off('updateParameterValue', valueChanged);
});

function displayCredentials(credentialTypeDescription: INodeCredentialDescription): boolean {
	if (credentialTypeDescription.displayOptions === undefined) {
		// If it is not defined no need to do a proper check
		return true;
	}

	return (
		!!node.value &&
		nodeHelpers.displayParameter(node.value.parameters, credentialTypeDescription, '', node.value)
	);
}
</script>

<template>
	<div
		:class="{
			'node-settings': true,
			dragging: dragging,
		}"
		@keydown.stop
	>
		<div :class="$style.header">
			<div class="header-side-menu">
				<NodeTitle
					v-if="node"
					class="node-name"
					:model-value="node.name"
					:node-type="nodeType"
					:read-only="isReadOnly"
					@update:model-value="nameChanged"
				></NodeTitle>
				<div v-if="isExecutable || props.canExpand" :class="$style.headerActions">
					<NodeExecuteButton
						v-if="isExecutable && !blockUI && node && nodeValid"
						data-test-id="node-execute-button"
						:node-name="node.name"
						:disabled="outputPanelEditMode.enabled && !isTriggerNode"
						:tooltip="executeButtonTooltip"
						size="small"
						telemetry-source="parameters"
						@execute="onNodeExecute"
						@stop-execution="onStopExecution"
						@value-changed="valueChanged"
					/>
					<N8nIconButton
						v-if="props.canExpand"
						icon="expand"
						type="secondary"
						text
						size="mini"
						icon-size="large"
						aria-label="Expand"
						@click="emit('expand')"
					/>
				</div>
			</div>
			<NodeSettingsTabs
				v-if="node && nodeValid"
				:model-value="openPanel"
				:node-type="nodeType"
				:push-ref="pushRef"
				@update:model-value="onTabSelect"
			/>
		</div>
		<div v-if="node && !nodeValid" class="node-is-not-valid">
			<p :class="$style.warningIcon">
				<font-awesome-icon icon="exclamation-triangle" />
			</p>
			<div class="missingNodeTitleContainer mt-s mb-xs">
				<n8n-text size="large" color="text-dark" bold>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.title') }}
				</n8n-text>
			</div>
			<div v-if="isCommunityNode" :class="$style.descriptionContainer">
				<div class="mb-l">
					<i18n-t
						keypath="nodeSettings.communityNodeUnknown.description"
						tag="span"
						@click="onMissingNodeTextClick"
					>
						<template #action>
							<a
								:href="`https://www.npmjs.com/package/${node.type.split('.')[0]}`"
								target="_blank"
								>{{ node.type.split('.')[0] }}</a
							>
						</template>
					</i18n-t>
				</div>
				<n8n-link
					:to="COMMUNITY_NODES_INSTALLATION_DOCS_URL"
					@click="onMissingNodeLearnMoreLinkClick"
				>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.installLink.text') }}
				</n8n-link>
			</div>
			<i18n-t v-else keypath="nodeSettings.nodeTypeUnknown.description" tag="span">
				<template #action>
					<a
						:href="CUSTOM_NODES_DOCS_URL"
						target="_blank"
						v-text="i18n.baseText('nodeSettings.nodeTypeUnknown.description.customNode')"
					/>
				</template>
			</i18n-t>
		</div>
		<div v-if="node && nodeValid" class="node-parameters-wrapper" data-test-id="node-parameters">
			<n8n-notice
				v-if="hasForeignCredential && !isHomeProjectTeam"
				:content="
					i18n.baseText('nodeSettings.hasForeignCredential', {
						interpolate: { owner: credentialOwnerName },
					})
				"
			/>
			<FreeAiCreditsCallout />
			<div v-show="openPanel === 'params'">
				<NodeWebhooks :node="node" :node-type-description="nodeType" />

				<ParameterInputList
					v-if="nodeValuesInitialized"
					:parameters="parametersNoneSetting"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					@value-changed="valueChanged"
					@activate="onWorkflowActivate"
					@parameter-blur="onParameterBlur"
				>
					<NodeCredentials
						:node="node"
						:readonly="isReadOnly"
						:show-all="true"
						:hide-issues="hiddenIssuesInputs.includes('credentials')"
						@credential-selected="credentialSelected"
						@value-changed="valueChanged"
						@blur="onParameterBlur"
					/>
				</ParameterInputList>
				<div v-if="showNoParametersNotice" class="no-parameters">
					<n8n-text>
						{{ i18n.baseText('nodeSettings.thisNodeDoesNotHaveAnyParameters') }}
					</n8n-text>
				</div>

				<div
					v-if="nodeHelpers.isCustomApiCallSelected(nodeValues)"
					class="parameter-item parameter-notice"
					data-test-id="node-parameters-http-notice"
				>
					<n8n-notice
						:content="
							i18n.baseText('nodeSettings.useTheHttpRequestNode', {
								interpolate: { nodeTypeDisplayName: nodeType?.displayName ?? '' },
							})
						"
					/>
				</div>
			</div>
			<div v-show="openPanel === 'settings'">
				<ParameterInputList
					:parameters="parametersSetting"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hide-delete="true"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<ParameterInputList
					:parameters="nodeSettings"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path=""
					@value-changed="valueChanged"
					@parameter-blur="onParameterBlur"
				/>
				<div class="node-version" data-test-id="node-version">
					{{
						i18n.baseText('nodeSettings.nodeVersion', {
							interpolate: {
								node: nodeType?.displayName as string,
								version: (node.typeVersion ?? latestVersion).toString(),
							},
						})
					}}
					<span>({{ nodeVersionTag }})</span>
				</div>
			</div>
		</div>
		<NDVSubConnections
			v-if="node && !props.hideConnections"
			ref="subConnections"
			:root-node="node"
			@switch-selected-node="onSwitchSelectedNode"
			@open-connection-node-creator="onOpenConnectionNodeCreator"
		/>
		<n8n-block-ui :show="blockUI" />
	</div>
</template>

<style lang="scss" module>
.header {
	background-color: var(--color-background-base);
}

.headerActions {
	display: flex;
	gap: var(--spacing-4xs);
	align-items: center;
}

.warningIcon {
	color: var(--color-text-lighter);
	font-size: var(--font-size-2xl);
}

.descriptionContainer {
	display: flex;
	flex-direction: column;
}
</style>

<style lang="scss" scoped>
.node-settings {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color-background-xlight);
	height: 100%;
	width: 100%;

	.no-parameters {
		margin-top: var(--spacing-xs);
	}

	.header-side-menu {
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) var(--spacing-s);
		font-size: var(--font-size-l);
		display: flex;
		justify-content: space-between;

		.node-name {
			padding-top: var(--spacing-5xs);
		}
	}

	.node-is-not-valid {
		height: 75%;
		padding: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		line-height: var(--font-line-height-regular);
	}

	.node-parameters-wrapper {
		overflow-y: auto;
		padding: 0 var(--spacing-m) var(--spacing-l) var(--spacing-m);
		flex-grow: 1;
	}

	&.dragging {
		border-color: var(--color-primary);
		box-shadow: 0px 6px 16px rgba(255, 74, 51, 0.15);
	}
}

.parameter-content {
	font-size: 0.9em;
	margin-right: -15px;
	margin-left: -15px;
	input {
		width: calc(100% - 35px);
		padding: 5px;
	}
	select {
		width: calc(100% - 20px);
		padding: 5px;
	}

	&:before {
		display: table;
		content: ' ';
		position: relative;
		box-sizing: border-box;
		clear: both;
	}
}

.parameter-wrapper {
	padding: 0 1em;
}

.color-reset-button-wrapper {
	position: relative;
}
.color-reset-button {
	position: absolute;
	right: 7px;
	top: -25px;
}

.node-version {
	border-top: var(--border-base);
	font-size: var(--font-size-xs);
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs) 0 var(--spacing-2xs) 0;
	color: var(--color-text-light);
}

.parameter-value {
	input.expression {
		border-style: dashed;
		border-color: #ff9600;
		display: inline-block;
		position: relative;
		width: 100%;
		box-sizing: border-box;
		background-color: #793300;
	}
}
</style>
