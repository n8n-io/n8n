<script setup lang="ts">
import { useTemplateRef, computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
	INodeParameters,
	NodeConnectionType,
	NodeParameterValue,
	INodeCredentialDescription,
	PublicInstalledPackage,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, deepCopy } from 'n8n-workflow';
import type {
	CurlToJSONResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
} from '@/Interface';

import { BASE_NODE_SURVEY_URL, NDV_UI_OVERHAUL_EXPERIMENT } from '@/constants';

import ParameterInputList from '@/components/ParameterInputList.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import NodeSettingsTabs from '@/components/NodeSettingsTabs.vue';
import NodeWebhooks from '@/components/NodeWebhooks.vue';
import NDVSubConnections from '@/components/NDVSubConnections.vue';
import NodeSettingsHeader from '@/components/NodeSettingsHeader.vue';
import get from 'lodash/get';

import NodeExecuteButton from './NodeExecuteButton.vue';
import {
	collectSettings,
	createCommonNodeSettings,
	nameIsParameter,
	getNodeSettingsInitialValues,
	collectParametersByTab,
} from '@/utils/nodeSettingsUtils';
import { isCommunityPackageName } from '@/utils/nodeTypesUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useHistoryStore } from '@/stores/history.store';
import { RenameNodeCommand } from '@/models/history';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useUsersStore } from '@/stores/users.store';
import type { EventBus } from '@n8n/utils/event-bus';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { importCurlEventBus, ndvEventBus } from '@/event-bus';
import { ProjectTypes } from '@/types/projects.types';
import FreeAiCreditsCallout from '@/components/FreeAiCreditsCallout.vue';
import { usePostHog } from '@/stores/posthog.store';
import { useResizeObserver } from '@vueuse/core';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { N8nBlockUi, N8nIcon, N8nNotice, N8nText } from '@n8n/design-system';
import ExperimentalEmbeddedNdvHeader from '@/components/canvas/experimental/components/ExperimentalEmbeddedNdvHeader.vue';
import NodeSettingsInvalidNodeWarning from '@/components/NodeSettingsInvalidNodeWarning.vue';
import type { NodeSettingsTab } from '@/types/nodeSettings';
import NodeActionsList from '@/components/NodeActionsList.vue';
import { useNodeCredentialOptions } from '@/composables/useNodeCredentialOptions';

const props = withDefaults(
	defineProps<{
		eventBus?: EventBus;
		dragging: boolean;
		pushRef: string;
		readOnly: boolean;
		foreignCredentials: string[];
		blockUI: boolean;
		executable: boolean;
		inputSize?: number;
		activeNode?: INodeUi;
		isEmbeddedInCanvas?: boolean;
		subTitle?: string;
		extraTabsClassName?: string;
		extraParameterWrapperClassName?: string;
	}>(),
	{
		inputSize: 0,
		activeNode: undefined,
		isEmbeddedInCanvas: false,
		subTitle: undefined,
	},
);

const emit = defineEmits<{
	stopExecution: [];
	valueChanged: [value: IUpdateInformation];
	switchSelectedNode: [nodeName: string];
	openConnectionNodeCreator: [
		nodeName: string,
		connectionType: NodeConnectionType,
		connectionIndex?: number,
	];
	activate: [];
	execute: [];
	captureWheelBody: [WheelEvent];
	dblclickHeader: [MouseEvent];
}>();

const slots = defineSlots<{ actions?: {} }>();

const nodeValues = ref<INodeParameters>(getNodeSettingsInitialValues());

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const historyStore = useHistoryStore();
const posthogStore = usePostHog();

const telemetry = useTelemetry();
const nodeHelpers = useNodeHelpers();
const externalHooks = useExternalHooks();
const i18n = useI18n();
const nodeSettingsParameters = useNodeSettingsParameters();

const nodeParameterWrapper = useTemplateRef('nodeParameterWrapper');
const shouldShowStaticScrollbar = ref(false);

if (props.isEmbeddedInCanvas) {
	useResizeObserver(nodeParameterWrapper, () => {
		shouldShowStaticScrollbar.value =
			(nodeParameterWrapper.value?.scrollHeight ?? 0) >
			(nodeParameterWrapper.value?.offsetHeight ?? 0);
	});
}

const nodeValid = ref(true);
const openPanel = ref<NodeSettingsTab>('params');

// Used to prevent nodeValues from being overwritten by defaults on reopening ndv
const nodeValuesInitialized = ref(false);

const hiddenIssuesInputs = ref<string[]>([]);
const subConnections = ref<InstanceType<typeof NDVSubConnections> | null>(null);

const installedPackage = ref<PublicInstalledPackage | undefined>(undefined);

const currentWorkflow = computed(
	() => workflowsStore.getWorkflowById(workflowsStore.workflowObject.id), // @TODO check if we actually need workflowObject here
);
const hasForeignCredential = computed(() => props.foreignCredentials.length > 0);
const isHomeProjectTeam = computed(
	() => currentWorkflow.value?.homeProject?.type === ProjectTypes.Team,
);
const isReadOnly = computed(
	() => props.readOnly || (hasForeignCredential.value && !isHomeProjectTeam.value),
);
const node = computed(() => props.activeNode ?? ndvStore.activeNode);

const nodeType = computed(() =>
	node.value ? nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion) : null,
);

const { areAllCredentialsSet } = useNodeCredentialOptions(node, nodeType, '');

const isTriggerNode = computed(() => !!node.value && nodeTypesStore.isTriggerNode(node.value.type));

const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const isExecutable = computed(() =>
	nodeHelpers.isNodeExecutable(node.value, props.executable, props.foreignCredentials),
);

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
	if (!nodeType.value || nodeType.value.hidden) {
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
	if (nodeType.value === null) {
		return [];
	}

	return nodeType.value?.properties ?? [];
});

const parametersByTab = computed(() =>
	collectParametersByTab(parameters.value, props.isEmbeddedInCanvas),
);

const isDisplayingCredentials = computed(
	() =>
		credentialsStore
			.getCredentialTypesNodeDescriptions('', nodeType.value)
			.filter((credentialTypeDescription) => displayCredentials(credentialTypeDescription)).length >
		0,
);

const showNoParametersNotice = computed(
	() =>
		!isDisplayingCredentials.value &&
		(parametersByTab.value.params ?? []).filter((item) => item.type !== 'notice').length === 0,
);

const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

const isCommunityNode = computed(() => !!node.value && isCommunityPackageName(node.value.type));
const packageName = computed(() => node.value?.type.split('.')[0] ?? '');

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

const isNDVV2 = computed(() =>
	posthogStore.isVariantEnabled(
		NDV_UI_OVERHAUL_EXPERIMENT.name,
		NDV_UI_OVERHAUL_EXPERIMENT.variant,
	),
);

const featureRequestUrl = computed(() => {
	if (!nodeType.value) {
		return '';
	}
	return `${BASE_NODE_SURVEY_URL}${nodeType.value.name}`;
});

const hasOutputConnection = computed(() => {
	if (!node.value) return false;
	const outgoingConnections = workflowsStore.outgoingConnectionsByNodeName(node.value.name);

	// Check if there's at-least one output connection
	return (Object.values(outgoingConnections)?.[0]?.[0] ?? []).length > 0;
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
		const _nodeType = nodeTypesStore.getNodeType(_node.type, _node.typeVersion);
		if (!_nodeType) {
			return;
		}

		// Get only the parameters which are different to the defaults
		let nodeParameters = NodeHelpers.getNodeParameters(
			_nodeType.properties,
			_node.parameters,
			false,
			false,
			_node,
			_nodeType,
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
					_nodeType,
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
			_nodeType.properties,
			nodeParameters as INodeParameters,
			true,
			false,
			_node,
			_nodeType,
		);

		for (const key of Object.keys(nodeParameters as object)) {
			if (nodeParameters?.[key] !== null && nodeParameters?.[key] !== undefined) {
				nodeSettingsParameters.setValue(
					nodeValues,
					`parameters.${key}`,
					nodeParameters[key] as string,
				);
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
	} else if (nameIsParameter(parameterData)) {
		// A node parameter changed
		nodeSettingsParameters.updateNodeParameter(
			nodeValues,
			parameterData,
			newValue,
			_node,
			isToolNode.value,
		);
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
	parametersByTab.value.params.forEach((parameter) => {
		hiddenIssuesInputs.value.push(parameter.name);
	});
	workflowsStore.setNodePristine(node.value.name, false);
};

const nodeSettings = computed(() =>
	createCommonNodeSettings(isExecutable.value, isToolNode.value, i18n.baseText.bind(i18n)),
);

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

	if (nodeType.value !== null) {
		nodeValid.value = true;
		nodeValues.value = collectSettings(node.value, nodeSettings.value);
	} else {
		nodeValid.value = false;
	}

	nodeValuesInitialized.value = true;
};

const onStopExecution = () => {
	emit('stopExecution');
};

const openSettings = () => {
	openPanel.value = 'settings';
};

const onTabSelect = (tab: NodeSettingsTab) => {
	openPanel.value = tab;
};

const onFeatureRequestClick = () => {
	window.open(featureRequestUrl.value, '_blank');
	if (node.value) {
		telemetry.track('User clicked ndv link', {
			node_type: node.value.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: props.pushRef,
			pane: NodeConnectionTypes.Main,
			type: 'i-wish-this-node-would',
		});
	}
};

watch(node, () => {
	setNodeValues();
});

onMounted(async () => {
	populateHiddenIssuesSet();
	setNodeValues();
	props.eventBus?.on('openSettings', openSettings);
	if (node.value !== null) {
		nodeHelpers.updateNodeParameterIssues(node.value, nodeType.value);
	}
	importCurlEventBus.on('setHttpNodeParameters', setHttpNodeParameters);
	ndvEventBus.on('updateParameterValue', valueChanged);

	if (isCommunityNode.value && useUsersStore().isInstanceOwner) {
		installedPackage.value = await useCommunityNodesStore().getInstalledPackage(packageName.value);
	}
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

function handleSelectAction(params: INodeParameters) {
	for (const [key, value] of Object.entries(params)) {
		valueChanged({ name: `parameters.${key}`, value });
	}

	if (isDisplayingCredentials.value && !areAllCredentialsSet.value) {
		onTabSelect('credential');
		return;
	}

	if (parametersByTab.value.params.length > 0) {
		onTabSelect('params');
	}
}
</script>

<template>
	<div
		:class="{
			'node-settings': true,
			dragging: dragging,
			embedded: props.isEmbeddedInCanvas,
		}"
		:data-has-output-connection="hasOutputConnection"
		@keydown.stop
	>
		<ExperimentalEmbeddedNdvHeader
			v-if="isEmbeddedInCanvas && node"
			:node="node"
			:selected-tab="openPanel"
			:read-only="readOnly"
			:node-type="nodeType"
			:push-ref="pushRef"
			:sub-title="subTitle"
			:extra-tabs-class-name="extraTabsClassName"
			:include-action="parametersByTab.action.length > 0"
			:include-credential="isDisplayingCredentials"
			:has-credential-issue="!areAllCredentialsSet"
			@name-changed="nameChanged"
			@tab-changed="onTabSelect"
			@dblclick-title="emit('dblclickHeader', $event)"
		>
			<template #actions>
				<slot name="actions" />
			</template>
		</ExperimentalEmbeddedNdvHeader>
		<div v-else-if="!isNDVV2" :class="$style.header">
			<div class="header-side-menu">
				<NodeTitle
					v-if="node"
					class="node-name"
					:model-value="node.name"
					:node-type="nodeType"
					:read-only="isReadOnly"
					@update:model-value="nameChanged"
				/>
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
			</div>
			<NodeSettingsTabs
				v-if="node && nodeValid"
				:model-value="openPanel"
				:node-type="nodeType"
				:push-ref="pushRef"
				@update:model-value="onTabSelect"
			/>
		</div>
		<NodeSettingsHeader
			v-else-if="node"
			:selected-tab="openPanel"
			:node-name="node.name"
			:node-type="nodeType"
			:execute-button-tooltip="executeButtonTooltip"
			:hide-execute="!isExecutable || blockUI || !node || !nodeValid"
			:disable-execute="outputPanelEditMode.enabled && !isTriggerNode"
			:hide-tabs="!nodeValid"
			:push-ref="pushRef"
			@execute="onNodeExecute"
			@stop-execution="onStopExecution"
			@value-changed="valueChanged"
			@tab-changed="onTabSelect"
		/>

		<NodeSettingsInvalidNodeWarning v-if="node && !nodeValid" :node="node" />

		<div
			v-if="node && nodeValid"
			ref="nodeParameterWrapper"
			:class="[
				'node-parameters-wrapper',
				shouldShowStaticScrollbar ? 'with-static-scrollbar' : '',
				{ 'ndv-v2': isNDVV2 },
				extraParameterWrapperClassName ?? '',
			]"
			data-test-id="node-parameters"
			@wheel.capture="emit('captureWheelBody', $event)"
		>
			<N8nNotice
				v-if="hasForeignCredential && !isHomeProjectTeam"
				:content="
					i18n.baseText('nodeSettings.hasForeignCredential', {
						interpolate: { owner: credentialOwnerName },
					})
				"
			/>
			<FreeAiCreditsCallout />
			<NodeActionsList
				v-if="openPanel === 'action'"
				class="action-tab"
				:node="node"
				@action-selected="handleSelectAction"
			/>
			<NodeCredentials
				v-if="openPanel === 'credential'"
				:node="node"
				:readonly="isReadOnly"
				:show-all="true"
				:hide-issues="hiddenIssuesInputs.includes('credentials')"
				@credential-selected="credentialSelected"
				@value-changed="valueChanged"
				@blur="onParameterBlur"
			/>
			<div v-show="openPanel === 'params'">
				<NodeWebhooks :node="node" :node-type-description="nodeType" />

				<ParameterInputList
					v-if="nodeValuesInitialized"
					:parameters="parametersByTab.params"
					:hide-delete="true"
					:node-values="nodeValues"
					:is-read-only="isReadOnly"
					:hidden-issues-inputs="hiddenIssuesInputs"
					path="parameters"
					:node="props.activeNode"
					@value-changed="valueChanged"
					@activate="onWorkflowActivate"
					@parameter-blur="onParameterBlur"
				>
					<NodeCredentials
						v-if="!isEmbeddedInCanvas"
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
					<N8nText>
						{{ i18n.baseText('nodeSettings.thisNodeDoesNotHaveAnyParameters') }}
					</N8nText>
				</div>

				<div
					v-if="nodeHelpers.isCustomApiCallSelected(nodeValues)"
					class="parameter-item parameter-notice"
					data-test-id="node-parameters-http-notice"
				>
					<N8nNotice
						:content="
							i18n.baseText('nodeSettings.useTheHttpRequestNode', {
								interpolate: { nodeTypeDisplayName: nodeType?.displayName ?? '' },
							})
						"
					/>
				</div>
			</div>
			<div v-show="openPanel === 'settings'">
				<CommunityNodeUpdateInfo
					v-if="isCommunityNode && installedPackage?.updateAvailable"
					data-test-id="update-available"
				/>
				<ParameterInputList
					:parameters="parametersByTab.settings"
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
			<div
				v-if="isNDVV2 && featureRequestUrl && !isEmbeddedInCanvas"
				:class="$style.featureRequest"
			>
				<a target="_blank" @click="onFeatureRequestClick">
					<N8nIcon icon="lightbulb" />
					{{ i18n.baseText('ndv.featureRequest') }}
				</a>
			</div>
		</div>
		<NDVSubConnections
			v-if="node && !props.isEmbeddedInCanvas"
			ref="subConnections"
			:root-node="node"
			@switch-selected-node="onSwitchSelectedNode"
			@open-connection-node-creator="onOpenConnectionNodeCreator"
		/>
		<N8nBlockUi :show="blockUI" />
		<CommunityNodeFooter
			v-if="openPanel === 'settings' && isCommunityNode"
			:package-name="packageName"
			:show-manage="useUsersStore().isInstanceOwner"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	background-color: var(--color-background-base);
}

.featureRequest {
	margin-top: auto;
	align-self: center;

	a {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-4xs);
		margin-top: var(--spacing-xl);

		font-size: var(--font-size-3xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-light);
	}
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
			margin-right: var(--spacing-s);
		}
	}

	.node-parameters-wrapper {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 var(--spacing-m) var(--spacing-l) var(--spacing-m);
		flex-grow: 1;

		&.ndv-v2 {
			padding: 0 var(--spacing-s) var(--spacing-l) var(--spacing-s);
		}
	}

	&.embedded .node-parameters-wrapper {
		padding: 0 var(--spacing-xs) var(--spacing-xs) var(--spacing-xs);

		&:has(.action-tab) {
			padding: 0 0 var(--spacing-xs) 0;
		}
	}

	&.embedded .node-parameters-wrapper.with-static-scrollbar {
		padding: 0 var(--spacing-4xs) var(--spacing-xs) var(--spacing-xs);

		&:has(.action-tab) {
			padding: 0 0 var(--spacing-xs) 0;
		}

		@supports not (selector(::-webkit-scrollbar)) {
			scrollbar-width: thin;
		}
		@supports selector(::-webkit-scrollbar) {
			&::-webkit-scrollbar {
				width: var(--spacing-2xs);
			}
			&::-webkit-scrollbar-thumb {
				border-radius: var(--spacing-2xs);
				background: var(--color-foreground-dark);
				border: var(--spacing-5xs) solid var(--color-background-xlight);
			}
		}
	}

	&.dragging {
		border-color: var(--color-primary);
		box-shadow: 0 6px 16px rgba(255, 74, 51, 0.15);
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

<style lang="scss">
// Hide notice(.ndv-connection-hint-notice) warning when node has output connection
[data-has-output-connection='true'] .ndv-connection-hint-notice {
	display: none;
}
</style>
