<script setup lang="ts">
import type {
	AssignmentCollectionValue,
	CalloutAction,
	FilterValue,
	INodeParameters,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import {
	ADD_FORM_NOTICE,
	getParameterValueByPath,
	NodeHelpers,
	resolveRelativePath,
} from 'n8n-workflow';
import { computed, defineAsyncComponent, onErrorCaptured, ref } from 'vue';

import type { INodeUi, IUpdateInformation } from '@/Interface';

import AssignmentCollection from './AssignmentCollection/AssignmentCollection.vue';
import ButtonParameter from './ButtonParameter/ButtonParameter.vue';
import FilterConditions from './FilterConditions/FilterConditions.vue';
import ImportCurlParameter from './ImportCurlParameter.vue';
import MultipleParameter from './MultipleParameter.vue';
import ParameterInputFull from './ParameterInputFull.vue';
import ResourceMapper from './ResourceMapper/ResourceMapper.vue';
import { useI18n } from '@n8n/i18n';
import { useNodeSettingsParameters } from '@/features/ndv/settings/composables/useNodeSettingsParameters';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { useMessage } from '@/app/composables/useMessage';
import {
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	KEEP_AUTH_IN_NDV_FOR_NODES,
	MODAL_CONFIRM,
	WAIT_NODE_TYPE,
} from '@/app/constants';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { captureException } from '@sentry/vue';
import { throttledWatch } from '@vueuse/core';
import get from 'lodash/get';
import { storeToRefs } from 'pinia';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { getParameterTypeOption } from '@/features/ndv/shared/ndv.utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import {
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nLink,
	N8nNotice,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const LazyFixedCollectionParameter = defineAsyncComponent(
	async () => await import('./FixedCollectionParameter.vue'),
);
const LazyCollectionParameter = defineAsyncComponent(
	async () => await import('./CollectionParameter.vue'),
);

// Parameter issues are displayed within the inputs themselves, but some parameters need to show them in the label UI
const showIssuesInLabelFor = ['fixedCollection'];

type Props = {
	node?: INodeUi;
	nodeValues: INodeParameters;
	parameters: INodeProperties[];
	path?: string;
	hideDelete?: boolean;
	indent?: boolean;
	isReadOnly?: boolean;
	hiddenIssuesInputs?: string[];
	entryIndex?: number;
};

const props = withDefaults(defineProps<Props>(), { path: '', hiddenIssuesInputs: () => [] });
const emit = defineEmits<{
	activate: [];
	valueChanged: [value: IUpdateInformation];
	parameterBlur: [value: string];
}>();

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const message = useMessage();
const nodeSettingsParameters = useNodeSettingsParameters();
const asyncLoadingError = ref(false);
const workflowHelpers = useWorkflowHelpers();
const i18n = useI18n();
const {
	dismissCallout,
	isCalloutDismissed,
	openSampleWorkflowTemplate,
	isRagStarterCalloutVisible,
} = useCalloutHelpers();

const { activeNode } = storeToRefs(ndvStore);

onErrorCaptured((e, component) => {
	if (
		!['LazyFixedCollectionParameter', 'LazyCollectionParameter'].includes(
			component?.$options.name as string,
		)
	) {
		return;
	}
	asyncLoadingError.value = true;
	console.error(e);
	captureException(e, {
		tags: {
			asyncLoadingError: true,
		},
	});
	// Don't propagate the error further
	return false;
});

const node = computed(() => props.node ?? ndvStore.activeNode);

const nodeType = computed(() => {
	if (node.value) {
		return nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion);
	}
	return null;
});

// Precomputed parameter data to avoid repeated function calls in template
// Note: `value` is intentionally NOT included here to prevent re-renders when values change.
// Values are fetched via getParameterValue() in the template to avoid CodeMirror cursor
// position issues when typing in editors.
interface ParameterComputedData {
	parameter: INodeProperties;
	path: string;
	isMultipleValues: boolean;
	isDisabled: boolean;
	showOptions: boolean;
	dependentParametersValues: string | null;
	issues: string[];
	isCalloutVisible: boolean;
}

const parameterItems = ref<ParameterComputedData[]>([]);

// Track previous parameter names for cleanup when parameters are removed from display
let previousParameterNames: string[] = [];

throttledWatch(
	[() => props.parameters, () => props.nodeValues, node],
	() => {
		// Pre-calculate disabled state map
		const disabledMap: Record<string, boolean> = {};
		for (const parameter of props.parameters) {
			const parameterPath = getPath(parameter.name);
			// Pre-calculate disabled state
			if (parameter.disabledOptions) {
				disabledMap[parameterPath] = shouldDisplayNodeParameter(parameter, 'disabledOptions');
			}
		}

		// Filter parameters that should be displayed
		const parameters = props.parameters.filter((parameter: INodeProperties) =>
			shouldDisplayNodeParameter(parameter),
		);

		// Apply node-specific parameter transformations
		let filteredParameters: INodeProperties[];
		if (node.value && node.value.type === FORM_TRIGGER_NODE_TYPE) {
			filteredParameters = updateFormTriggerParameters(parameters, node.value.name);
		} else if (node.value && node.value.type === FORM_NODE_TYPE) {
			filteredParameters = updateFormParameters(parameters, node.value.name);
		} else if (
			node.value &&
			node.value.type === WAIT_NODE_TYPE &&
			node.value.parameters.resume === 'form'
		) {
			filteredParameters = updateWaitParameters(parameters, node.value.name);
		} else {
			filteredParameters = parameters;
		}

		// Compute all parameter data for template usage
		// Note: `value` is intentionally NOT included to prevent re-renders when values change
		// Values are fetched via getParameterValue() in the template instead
		parameterItems.value = filteredParameters.map((parameter) => {
			const parameterPath = getPath(parameter.name);
			const isMultipleValues = multipleValues(parameter);
			const isDisabled = disabledMap[parameterPath] ?? false;
			const showOptions = shouldShowOptions(parameter);
			const dependentParametersValues = getDependentParametersValues(parameter);
			const issues = getParameterIssues(parameter);
			const calloutVisible = parameter.type === 'callout' ? isCalloutVisible(parameter) : false;

			return {
				parameter,
				path: parameterPath,
				isMultipleValues,
				isDisabled,
				showOptions,
				dependentParametersValues,
				issues,
				isCalloutVisible: calloutVisible,
			};
		});

		// Get new parameter names
		const newParameterNames = parameterItems.value.map((paramData) => paramData.parameter.name);

		// Clean up removed parameters - emit valueChanged for parameters that no longer display
		// This handles the edge-case when a parameter display depends on another field with an expression
		for (const parameter of previousParameterNames) {
			if (!newParameterNames.includes(parameter)) {
				emit('valueChanged', {
					name: `${props.path}.${parameter}`,
					node: ndvStore.activeNode?.name || '',
					value: undefined,
				});
			}
		}

		// Update previous names for next comparison
		previousParameterNames = newParameterNames;
	},
	{ throttle: 200, immediate: true },
);

const credentialsParameterIndex = computed(() => {
	return parameterItems.value.findIndex((paramData) => paramData.parameter.type === 'credentials');
});

const calloutParameterIndex = computed(() => {
	return parameterItems.value.findIndex((paramData) => paramData.parameter.type === 'callout');
});

const indexToShowSlotAt = computed(() => {
	if (credentialsParameterIndex.value !== -1) {
		return credentialsParameterIndex.value;
	}

	let index = 0;

	// If the node has a callout don't show credentials before it
	if (calloutParameterIndex.value !== -1) {
		index = calloutParameterIndex.value + 1;
	}

	// For nodes that use old credentials UI, keep credentials below authentication field in NDV
	// otherwise credentials will use auth filed position since the auth field is moved to credentials modal
	const fieldOffset = KEEP_AUTH_IN_NDV_FOR_NODES.includes(nodeType.value?.name || '') ? 1 : 0;
	const credentialsDependencies = getCredentialsDependencies();

	parameterItems.value.forEach((paramData, propIndex) => {
		if (credentialsDependencies.has(paramData.parameter.name)) {
			index = propIndex + fieldOffset;
		}
	});

	return Math.min(index, parameterItems.value.length - 1);
});

function updateFormTriggerParameters(parameters: INodeProperties[], triggerName: string) {
	const workflowObject = workflowsStore.workflowObject;
	const connectedNodes = workflowObject.getChildNodes(triggerName);

	const hasFormPage = connectedNodes.some((nodeName) => {
		const _node = workflowObject.getNode(nodeName);
		return _node && _node.type === FORM_NODE_TYPE;
	});

	if (hasFormPage) {
		const triggerParameters: INodeProperties[] = [];

		for (const parameter of parameters) {
			if (parameter.name === 'responseMode') {
				triggerParameters.push({
					displayName: 'On submission, the user will be taken to the next form node',
					name: 'formResponseModeNotice',
					type: 'notice',
					default: '',
				});

				continue;
			}

			if (parameter.name === ADD_FORM_NOTICE) continue;

			if (parameter.name === 'options') {
				const options = (parameter.options as INodeProperties[]).filter(
					(option) => option.name !== 'respondWithOptions',
				);
				triggerParameters.push({
					...parameter,
					options,
				});
				continue;
			}

			triggerParameters.push(parameter);
		}
		return triggerParameters;
	}

	return parameters;
}

function updateWaitParameters(parameters: INodeProperties[], nodeName: string) {
	const workflowObject = workflowsStore.workflowObject;
	const parentNodes = workflowObject.getParentNodes(nodeName);

	const formTriggerName = parentNodes.find(
		(_node) => workflowObject.nodes[_node].type === FORM_TRIGGER_NODE_TYPE,
	);
	if (!formTriggerName) return parameters;

	const connectedNodes = workflowObject.getChildNodes(formTriggerName);

	const hasFormPage = connectedNodes.some((_nodeName) => {
		const _node = workflowObject.getNode(_nodeName);
		return _node && _node.type === FORM_NODE_TYPE;
	});

	if (hasFormPage) {
		const waitNodeParameters: INodeProperties[] = [];

		for (const parameter of parameters) {
			if (parameter.name === 'options') {
				const options = (parameter.options as INodeProperties[]).filter(
					(option) => option.name !== 'respondWithOptions' && option.name !== 'webhookSuffix',
				);
				waitNodeParameters.push({
					...parameter,
					options,
				});
				continue;
			}

			waitNodeParameters.push(parameter);
		}
		return waitNodeParameters;
	}

	return parameters;
}

function updateFormParameters(parameters: INodeProperties[], nodeName: string) {
	const workflowObject = workflowsStore.workflowObject;
	const parentNodes = workflowObject.getParentNodes(nodeName);

	const formTriggerName = parentNodes.find(
		(_node) => workflowObject.nodes[_node].type === FORM_TRIGGER_NODE_TYPE,
	);

	if (formTriggerName) return parameters.filter((parameter) => parameter.name !== 'triggerNotice');

	return parameters;
}

function onParameterBlur(parameterName: string) {
	emit('parameterBlur', parameterName);
}

function getCredentialsDependencies() {
	const dependencies = new Set();

	// Get names of all fields that credentials rendering depends on (using displayOptions > show)
	if (nodeType.value?.credentials) {
		for (const cred of nodeType.value.credentials) {
			if (cred.displayOptions?.show) {
				Object.keys(cred.displayOptions.show).forEach((fieldName) => dependencies.add(fieldName));
			}
		}
	}
	return dependencies;
}

function multipleValues(parameter: INodeProperties): boolean {
	return getParameterTypeOption(parameter, 'multipleValues') === true;
}

function getPath(parameterName: string): string {
	return (props.path ? `${props.path}.` : '') + parameterName;
}

function deleteOption(optionName: string): void {
	const parameterData = {
		name: getPath(optionName),
		value: undefined,
	};

	// TODO: If there is only one option it should delete the whole one

	emit('valueChanged', parameterData);
}

function shouldDisplayNodeParameter(
	parameter: INodeProperties,
	displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
): boolean {
	return nodeSettingsParameters.shouldDisplayNodeParameter(
		props.nodeValues,
		node.value,
		parameter,
		props.path,
		displayKey,
	);
}

function valueChanged(parameterData: IUpdateInformation): void {
	emit('valueChanged', parameterData);
}

function onNoticeAction(action: string) {
	if (action === 'activate') {
		emit('activate');
	}
}

function getParameterIssues(parameter: INodeProperties): string[] {
	if (!node.value || !showIssuesInLabelFor.includes(parameter.type)) {
		return [];
	}
	const issues = NodeHelpers.getParameterIssues(
		parameter,
		node.value.parameters,
		'',
		node.value,
		nodeType.value,
	);

	return issues.parameters?.[parameter.name] ?? [];
}

function shouldShowOptions(parameter: INodeProperties): boolean {
	return parameter.type !== 'resourceMapper';
}

function getDependentParametersValues(parameter: INodeProperties): string | null {
	const loadOptionsDependsOn = getParameterTypeOption(parameter, 'loadOptionsDependsOn');

	if (loadOptionsDependsOn === undefined) {
		return null;
	}

	// Get the resolved parameter values of the current node
	const currentNodeParameters = ndvStore.activeNode?.parameters;
	try {
		const resolvedNodeParameters = workflowHelpers.resolveParameter(currentNodeParameters);

		const returnValues: string[] = [];
		for (let parameterPath of loadOptionsDependsOn) {
			parameterPath = resolveRelativePath(props.path, parameterPath);

			returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
		}

		return returnValues.join('|');
	} catch {
		return null;
	}
}

function getParameterValue<T extends NodeParameterValueType = NodeParameterValueType>(
	name: string,
): T {
	return getParameterValueByPath(props.nodeValues, name, props.path) as T;
}

function isRagStarterCallout(parameter: INodeProperties): boolean {
	return parameter.type === 'callout' && parameter.name === 'ragStarterCallout';
}

function isCalloutVisible(parameter: INodeProperties): boolean {
	if (isCalloutDismissed(parameter.name)) return false;

	if (isRagStarterCallout(parameter)) {
		return isRagStarterCalloutVisible.value;
	}

	return true;
}

function onCalloutAction(action: CalloutAction) {
	switch (action.type) {
		case 'openSampleWorkflowTemplate':
			void openSampleWorkflowTemplate(action.templateId, {
				telemetry: {
					source: 'ndv',
					nodeType: activeNode.value?.type,
				},
			});
			break;
		default:
			break;
	}
}

async function onCalloutDismiss(parameter: INodeProperties) {
	const dismissConfirmed = await message.confirm(
		i18n.baseText('parameterInputList.callout.dismiss.confirm.text'),
		{
			showClose: true,
			confirmButtonText: i18n.baseText(
				'parameterInputList.callout.dismiss.confirm.confirmButtonText',
			),
			cancelButtonText: i18n.baseText(
				'parameterInputList.callout.dismiss.confirm.cancelButtonText',
			),
		},
	);

	if (dismissConfirmed !== MODAL_CONFIRM) {
		return;
	}

	await dismissCallout(parameter.name);
}
</script>

<template>
	<div class="parameter-input-list-wrapper">
		<div
			v-for="(item, index) in parameterItems"
			:key="item.parameter.name"
			:class="{ indent }"
			data-test-id="parameter-item"
		>
			<slot v-if="indexToShowSlotAt === index" />

			<div
				v-if="item.isMultipleValues === true && item.parameter.type !== 'fixedCollection'"
				class="parameter-item"
			>
				<MultipleParameter
					:parameter="item.parameter"
					:values="getParameterValue<INodeParameters[]>(item.parameter.name)"
					:node-values="nodeValues"
					:path="item.path"
					:is-read-only="isReadOnly"
					@value-changed="valueChanged"
				/>
			</div>

			<ImportCurlParameter
				v-else-if="item.parameter.type === 'curlImport'"
				:is-read-only="isReadOnly"
				@value-changed="valueChanged"
			/>

			<N8nNotice
				v-else-if="item.parameter.type === 'notice'"
				:class="['parameter-item', item.parameter.typeOptions?.containerClass ?? '']"
				:content="i18n.nodeText(activeNode?.type).inputLabelDisplayName(item.parameter, path)"
				@action="onNoticeAction"
			/>

			<template v-else-if="item.parameter.type === 'callout'">
				<N8nCallout
					v-if="item.isCalloutVisible"
					:icon="(item.parameter.typeOptions?.calloutAction?.icon as IconName) || 'info'"
					icon-size="large"
					:class="['parameter-item', item.parameter.typeOptions?.containerClass ?? '']"
					theme="secondary"
				>
					<N8nText size="small">
						<N8nText
							v-n8n-html="
								i18n.nodeText(activeNode?.type).inputLabelDisplayName(item.parameter, path)
							"
							size="small"
						/>
						<template v-if="item.parameter.typeOptions?.calloutAction">
							{{ ' ' }}
							<N8nLink
								v-if="item.parameter.typeOptions?.calloutAction"
								theme="secondary"
								size="small"
								:bold="true"
								:underline="true"
								@click="onCalloutAction(item.parameter.typeOptions.calloutAction)"
							>
								{{ item.parameter.typeOptions.calloutAction.label }}
							</N8nLink>
						</template>
					</N8nText>

					<template #trailingContent>
						<N8nIcon
							icon="x"
							title="Dismiss"
							size="medium"
							type="secondary"
							class="callout-dismiss"
							data-test-id="callout-dismiss-icon"
							@click="onCalloutDismiss(item.parameter)"
						/>
					</template>
				</N8nCallout>
			</template>

			<div v-else-if="item.parameter.type === 'button'" class="parameter-item">
				<ButtonParameter
					:parameter="item.parameter"
					:path="path"
					:value="getParameterValue<string>(item.parameter.name)"
					:is-read-only="isReadOnly"
					@value-changed="valueChanged"
				/>
			</div>

			<div
				v-else-if="['collection', 'fixedCollection'].includes(item.parameter.type)"
				class="multi-parameter"
			>
				<N8nInputLabel
					:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(item.parameter, path)"
					:tooltip-text="
						i18n.nodeText(activeNode?.type).inputLabelDescription(item.parameter, path)
					"
					size="small"
					:underline="true"
					:input-name="item.parameter.name"
					color="text-dark"
				>
					<template
						v-if="showIssuesInLabelFor.includes(item.parameter.type) && item.issues.length > 0"
						#issues
					>
						<N8nTooltip>
							<template #content>
								<span v-for="(issue, i) in item.issues" :key="i">{{ issue }}</span>
							</template>
							<N8nIcon icon="triangle-alert" size="small" color="danger" />
						</N8nTooltip>
					</template>
				</N8nInputLabel>
				<Suspense v-if="!asyncLoadingError">
					<template #default>
						<LazyCollectionParameter
							v-if="item.parameter.type === 'collection'"
							:parameter="item.parameter"
							:values="getParameterValue<INodeParameters>(item.parameter.name)"
							:node-values="nodeValues"
							:path="item.path"
							:is-read-only="isReadOnly"
							@value-changed="valueChanged"
						/>
						<LazyFixedCollectionParameter
							v-else-if="item.parameter.type === 'fixedCollection'"
							:parameter="item.parameter"
							:values="getParameterValue<Record<string, INodeParameters[]>>(item.parameter.name)"
							:node-values="nodeValues"
							:path="item.path"
							:is-read-only="isReadOnly"
							@value-changed="valueChanged"
						/>
					</template>
					<template #fallback>
						<N8nText size="small" class="async-notice">
							<N8nIcon icon="refresh-cw" size="xsmall" :spin="true" />
							{{ i18n.baseText('parameterInputList.loadingFields') }}
						</N8nText>
					</template>
				</Suspense>
				<N8nText v-else size="small" color="danger" class="async-notice">
					<N8nIcon icon="triangle-alert" size="xsmall" />
					{{ i18n.baseText('parameterInputList.loadingError') }}
				</N8nText>
				<N8nIconButton
					v-if="hideDelete !== true && !isReadOnly && !item.parameter.isNodeSetting"
					type="tertiary"
					text
					size="small"
					icon="trash-2"
					class="icon-button"
					:title="i18n.baseText('parameterInputList.delete')"
					@click="deleteOption(item.parameter.name)"
				></N8nIconButton>
			</div>
			<ResourceMapper
				v-else-if="item.parameter.type === 'resourceMapper'"
				:parameter="item.parameter"
				:node="node"
				:path="item.path"
				:dependent-parameters-values="item.dependentParametersValues"
				:is-read-only="isReadOnly"
				:allow-empty-strings="item.parameter.typeOptions?.resourceMapper?.allowEmptyValues"
				input-size="small"
				label-size="small"
				@value-changed="valueChanged"
			/>
			<FilterConditions
				v-else-if="item.parameter.type === 'filter'"
				:parameter="item.parameter"
				:value="getParameterValue<FilterValue>(item.parameter.name)"
				:path="item.path"
				:node="node"
				:read-only="isReadOnly"
				@value-changed="valueChanged"
			/>
			<AssignmentCollection
				v-else-if="item.parameter.type === 'assignmentCollection'"
				:parameter="item.parameter"
				:value="getParameterValue<AssignmentCollectionValue>(item.parameter.name)"
				:path="item.path"
				:node="node"
				:is-read-only="isReadOnly"
				:default-type="item.parameter.typeOptions?.assignment?.defaultType"
				:disable-type="item.parameter.typeOptions?.assignment?.disableType"
				@value-changed="valueChanged"
			/>
			<div v-else-if="credentialsParameterIndex !== index" class="parameter-item">
				<N8nIconButton
					v-if="hideDelete !== true && !isReadOnly && !item.parameter.isNodeSetting"
					type="tertiary"
					text
					size="small"
					icon="trash-2"
					class="icon-button"
					:title="i18n.baseText('parameterInputList.delete')"
					@click="deleteOption(item.parameter.name)"
				></N8nIconButton>

				<ParameterInputFull
					:parameter="item.parameter"
					:hide-issues="hiddenIssuesInputs.includes(item.parameter.name)"
					:value="getParameterValue(item.parameter.name)"
					:display-options="item.showOptions"
					:path="item.path"
					:is-read-only="isReadOnly || item.isDisabled"
					:hide-label="false"
					:node-values="nodeValues"
					@update="valueChanged"
					@blur="onParameterBlur(item.parameter.name)"
				/>
			</div>
		</div>
		<div v-if="parameterItems.length === 0" :class="{ indent }">
			<slot />
		</div>
	</div>
</template>

<style lang="scss">
.parameter-input-list-wrapper {
	--input--color--background--disabled: var(--color--background);
	.icon-button {
		position: absolute;
		opacity: 0;
		top: -3px;
		left: calc(-0.5 * var(--spacing--xs));
		transition: opacity 100ms ease-in;
		Button {
			color: var(--icon--color);
		}
	}
	.icon-button > Button:hover {
		color: var(--icon--color--hover);
	}

	.indent > div {
		padding-left: var(--spacing--sm);
	}

	.multi-parameter {
		position: relative;
		margin: var(--spacing--xs) 0;

		.parameter-info {
			display: none;
		}
	}

	.parameter-item {
		position: relative;
		margin: var(--spacing--xs) 0;
	}
	.parameter-item:hover > .icon-button,
	.multi-parameter:hover > .icon-button {
		opacity: 1;
	}

	.parameter-notice {
		background-color: var(--color--warning--tint-2);
		color: $custom-font-black;
		margin: 0.3em 0;
		padding: 0.7em;

		a {
			font-weight: var(--font-weight--bold);
		}
	}

	.async-notice {
		display: block;
		padding: var(--spacing--3xs) 0;
	}

	.callout-dismiss {
		margin-left: var(--spacing--xs);
		line-height: 1;
		cursor: pointer;
	}
	.callout-dismiss:hover {
		color: var(--icon--color--hover);
	}
}
</style>
