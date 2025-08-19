<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';

import get from 'lodash/get';

import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	InputSize,
} from '@/Interface';
import type {
	CodeExecutionMode,
	EditorType,
	IDataObject,
	ILoadOptions,
	INodeParameterResourceLocator,
	INodeParameters,
	INodeProperties,
	INodePropertyOptions,
	IParameterLabel,
	NodeParameterValueType,
} from 'n8n-workflow';
import { CREDENTIAL_EMPTY_VALUE, isResourceLocatorValue, NodeHelpers } from 'n8n-workflow';

import type { CodeNodeLanguageOption } from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import CredentialsSelect from '@/components/CredentialsSelect.vue';
import ExpressionEditModal from '@/components/ExpressionEditModal.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import JsEditor from '@/components/JsEditor/JsEditor.vue';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ResourceLocator from '@/components/ResourceLocator/ResourceLocator.vue';
import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';
import TextEdit from '@/components/TextEdit.vue';

import {
	formatAsExpression,
	getParameterTypeOption,
	isResourceLocatorParameterType,
	isValidParameterOption,
	parseFromExpression,
	shouldSkipParamValidation,
} from '@/utils/nodeSettingsUtils';
import { hasExpressionMapping, isValueExpression } from '@/utils/nodeTypesUtils';

import {
	AI_TRANSFORM_NODE_TYPE,
	APP_MODALS_ELEMENT_ID,
	CORE_NODES_CATEGORY,
	CUSTOM_API_CALL_KEY,
	ExpressionLocalResolveContextSymbol,
	HTML_NODE_TYPE,
	NODES_USING_CODE_NODE_EDITOR,
} from '@/constants';

import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useNodeSettingsParameters } from '@/composables/useNodeSettingsParameters';
import { htmlEditorEventBus } from '@/event-bus';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';
import { N8nIcon, N8nInput, N8nInputNumber, N8nOption, N8nSelect } from '@n8n/design-system';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { onClickOutside, useElementSize } from '@vueuse/core';
import { captureMessage } from '@sentry/vue';
import { isCredentialOnlyNodeType } from '@/utils/credentialOnlyNodes';
import { hasFocusOnInput, isBlurrableEl, isFocusableEl, isSelectableEl } from '@/utils/typesUtils';
import { completeExpressionSyntax, shouldConvertToExpression } from '@/utils/expressions';
import CssEditor from './CssEditor/CssEditor.vue';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import ExperimentalEmbeddedNdvMapper from '@/components/canvas/experimental/components/ExperimentalEmbeddedNdvMapper.vue';

type Picker = { $emit: (arg0: string, arg1: Date) => void };

type Props = {
	parameter: INodeProperties;
	path: string;
	modelValue: NodeParameterValueType;
	eventBus?: EventBus;
	label?: IParameterLabel;
	additionalExpressionData?: IDataObject;
	rows?: number;
	hint?: string;
	inputSize?: InputSize;
	eventSource?: string;
	expressionEvaluated: unknown;
	documentationUrl?: string;
	isAssignment?: boolean;
	isReadOnly?: boolean;
	hideLabel?: boolean;
	droppable?: boolean;
	activeDrop?: boolean;
	forceShowExpression?: boolean;
	hideIssues?: boolean;
	errorHighlight?: boolean;
	isForCredential?: boolean;
	canBeOverridden?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	hint: undefined,
	inputSize: undefined,
	eventSource: undefined,
	documentationUrl: undefined,
	isReadOnly: false,
	isAssignment: false,
	eventBus: () => createEventBus(),
	additionalExpressionData: () => ({}),
	label: () => ({ size: 'small' }),
});

const emit = defineEmits<{
	focus: [];
	blur: [];
	drop: [expression: string];
	textInput: [update: IUpdateInformation];
	update: [update: IUpdateInformation];
}>();

const externalHooks = useExternalHooks();
const i18n = useI18n();
const nodeHelpers = useNodeHelpers();
const { debounce } = useDebounce();
const workflowHelpers = useWorkflowHelpers();
const nodeSettingsParameters = useNodeSettingsParameters();
const telemetry = useTelemetry();

const credentialsStore = useCredentialsStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();

const expressionLocalResolveCtx = inject(ExpressionLocalResolveContextSymbol, undefined);

// ESLint: false positive
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
const inputField = ref<InstanceType<typeof N8nInput | typeof N8nSelect> | HTMLElement>();
const wrapper = ref<HTMLDivElement>();
const mapperRef = ref<InstanceType<typeof ExperimentalEmbeddedNdvMapper>>();

const nodeName = ref('');
const codeEditDialogVisible = ref(false);
const expressionEditDialogVisible = ref(false);
const remoteParameterOptions = ref<INodePropertyOptions[]>([]);
const remoteParameterOptionsLoading = ref(false);
const remoteParameterOptionsLoadingIssues = ref<string | null>(null);
const textEditDialogVisible = ref(false);
const editDialogClosing = ref(false);
const tempValue = ref('');
const activeCredentialType = ref('');
const dateTimePickerOptions = ref({
	shortcuts: [
		{
			text: 'Today', // TODO

			onClick(picker: Picker) {
				picker.$emit('pick', new Date());
			},
		},
		{
			text: 'Yesterday', // TODO

			onClick(picker: Picker) {
				const date = new Date();
				date.setTime(date.getTime() - 3600 * 1000 * 24);
				picker.$emit('pick', date);
			},
		},
		{
			text: 'A week ago', // TODO

			onClick(picker: Picker) {
				const date = new Date();
				date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
				picker.$emit('pick', date);
			},
		},
	],
});
const isFocused = ref(false);

const contextNode = expressionLocalResolveCtx?.value?.workflow.getNode(
	expressionLocalResolveCtx.value.nodeName,
);
const node = computed(() => contextNode ?? ndvStore.activeNode ?? undefined);
const nodeType = computed(
	() => node.value && nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
);

const shortPath = computed<string>(() => {
	const short = props.path.split('.');
	short.shift();
	return short.join('.');
});

function getTypeOption<T>(optionName: string): T {
	return getParameterTypeOption<T>(props.parameter, optionName);
}

const isModelValueExpression = computed(() => isValueExpression(props.parameter, props.modelValue));

const isResourceLocatorParameter = computed<boolean>(() => {
	return isResourceLocatorParameterType(props.parameter.type);
});

const isSecretParameter = computed<boolean>(() => {
	return getTypeOption('password') === true;
});

const hasRemoteMethod = computed<boolean>(() => {
	return !!getTypeOption('loadOptionsMethod') || !!getTypeOption('loadOptions');
});

const parameterOptions = computed(() => {
	const options = hasRemoteMethod.value ? remoteParameterOptions.value : props.parameter.options;
	const safeOptions = (options ?? []).filter(isValidParameterOption);

	return safeOptions;
});

const modelValueString = computed<string>(() => {
	return props.modelValue as string;
});

const modelValueResourceLocator = computed<INodeParameterResourceLocator>(() => {
	return props.modelValue as INodeParameterResourceLocator;
});

const modelValueExpressionEdit = computed<NodeParameterValueType>(() => {
	return isResourceLocatorParameter.value && typeof props.modelValue !== 'string'
		? props.modelValue
			? (props.modelValue as INodeParameterResourceLocator).value
			: ''
		: props.modelValue;
});

const editorRows = computed(() => getTypeOption<number>('rows'));

const editorType = computed<EditorType | 'json' | 'code' | 'cssEditor'>(() => {
	return getTypeOption<EditorType>('editor');
});
const editorIsReadOnly = computed<boolean>(() => {
	return getTypeOption<boolean>('editorIsReadOnly') ?? false;
});

const editorLanguage = computed<CodeNodeLanguageOption>(() => {
	if (editorType.value === 'json' || props.parameter.type === 'json') return 'json';

	if (node.value?.parameters?.language === 'pythonNative') return 'pythonNative';

	return getTypeOption<CodeNodeLanguageOption>('editorLanguage') ?? 'javaScript';
});

const codeEditorMode = computed<CodeExecutionMode>(() => {
	return node.value?.parameters.mode as CodeExecutionMode;
});

const displayValue = computed(() => {
	if (remoteParameterOptionsLoadingIssues.value) {
		if (!nodeType.value || nodeType.value?.codex?.categories?.includes(CORE_NODES_CATEGORY)) {
			return i18n.baseText('parameterInput.loadOptionsError');
		}

		if (nodeType.value?.credentials && nodeType.value?.credentials?.length > 0) {
			const credentialsType = nodeType.value?.credentials[0];

			if (credentialsType.required && !node.value?.credentials) {
				return i18n.baseText('parameterInput.loadOptionsCredentialsRequired');
			}
		}

		return i18n.baseText('parameterInput.loadOptionsErrorService', {
			interpolate: { service: nodeType.value.displayName },
		});
	}

	if (remoteParameterOptionsLoading.value) {
		// If it is loading options from server display
		// to user that the data is loading. If not it would
		// display the user the key instead of the value it
		// represents
		return i18n.baseText('parameterInput.loadingOptions');
	}

	// if the value is marked as empty return empty string, to prevent displaying the asterisks
	if (props.modelValue === CREDENTIAL_EMPTY_VALUE) {
		return '';
	}

	let returnValue;
	if (!isModelValueExpression.value) {
		returnValue = isResourceLocatorParameter.value
			? isResourceLocatorValue(props.modelValue)
				? props.modelValue.value
				: ''
			: props.modelValue;
	} else {
		returnValue = props.expressionEvaluated;
	}

	if (props.parameter.type === 'credentialsSelect' && typeof props.modelValue === 'string') {
		const credType = credentialsStore.getCredentialTypeByName(props.modelValue);
		if (credType) {
			returnValue = credType.displayName;
		}
	}

	if (
		Array.isArray(returnValue) &&
		props.parameter.type === 'color' &&
		getTypeOption('showAlpha') === true &&
		(returnValue as unknown as string).charAt(0) === '#'
	) {
		// Convert the value to rgba that el-color-picker can display it correctly
		const bigint = parseInt((returnValue as unknown as string).slice(1), 16);
		const h = [];
		h.push((bigint >> 24) & 255);
		h.push((bigint >> 16) & 255);
		h.push((bigint >> 8) & 255);
		h.push(((255 - bigint) & 255) / 255);

		returnValue = 'rgba(' + h.join() + ')';
	}

	if (returnValue !== undefined && returnValue !== null && props.parameter.type === 'string') {
		const rows = editorRows.value;
		if (rows === undefined || rows === 1) {
			returnValue = (returnValue as string).toString().replace(/\n/, '|');
		}
	}

	return returnValue as string;
});

const expressionDisplayValue = computed(() => {
	if (props.forceShowExpression) {
		return '';
	}

	const value = isResourceLocatorValue(props.modelValue)
		? props.modelValue.value
		: props.modelValue;
	if (typeof value === 'string' && value.startsWith('=')) {
		return value.slice(1);
	}

	return `${displayValue.value ?? ''}`;
});

const dependentParametersValues = computed<string | null>(() => {
	const loadOptionsDependsOn = getTypeOption<string[] | undefined>('loadOptionsDependsOn');

	if (loadOptionsDependsOn === undefined) {
		return null;
	}

	// Get the resolved parameter values of the current node
	const currentNodeParameters = ndvStore.activeNode?.parameters;
	try {
		const resolvedNodeParameters = workflowHelpers.resolveParameter(currentNodeParameters);

		const returnValues: string[] = [];
		for (const parameterPath of loadOptionsDependsOn) {
			returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
		}

		return returnValues.join('|');
	} catch {
		return null;
	}
});

const getStringInputType = computed(() => {
	if (getTypeOption('password') === true) {
		return 'password';
	}

	const rows = editorRows.value;
	if (rows !== undefined && rows > 1) {
		return 'textarea';
	}

	if (editorType.value === 'code') {
		return 'textarea';
	}

	return 'text';
});

const getIssues = computed<string[]>(() => {
	if (props.hideIssues || !node.value) {
		return [];
	}

	const newPath = shortPath.value.split('.');
	newPath.pop();

	const issues = NodeHelpers.getParameterIssues(
		props.parameter,
		node.value.parameters,
		newPath.join('.'),
		node.value,
		nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion),
	);

	if (props.parameter.type === 'credentialsSelect' && displayValue.value === '') {
		issues.parameters = issues.parameters ?? {};

		const issue = i18n.baseText('parameterInput.selectACredentialTypeFromTheDropdown');

		issues.parameters[props.parameter.name] = [issue];
	} else if (
		['options', 'multiOptions'].includes(props.parameter.type) &&
		!remoteParameterOptionsLoading.value &&
		remoteParameterOptionsLoadingIssues.value === null &&
		parameterOptions.value &&
		(!isModelValueExpression.value || props.expressionEvaluated !== null)
	) {
		// Check if the value resolves to a valid option.
		// For expressions do not validate if there is no evaluated value.
		// Currently, it only displays an error in the node itself in
		// case the value is not valid. The workflow can still be executed
		// and the error is not displayed on the node in the workflow
		const validOptions = parameterOptions.value.map((options) => options.value);

		let checkValues: string[] = [];

		if (!shouldSkipParamValidation(props.parameter, displayValue.value)) {
			if (Array.isArray(displayValue.value)) {
				checkValues = checkValues.concat(displayValue.value);
			} else {
				checkValues.push(displayValue.value);
			}
		}

		for (const checkValue of checkValues) {
			if (checkValue === null || !validOptions.includes(checkValue)) {
				issues.parameters = issues.parameters ?? {};

				const issue = i18n.baseText('parameterInput.theValueIsNotSupported', {
					interpolate: { checkValue },
				});

				issues.parameters[props.parameter.name] = [issue];
			}
		}
	} else if (remoteParameterOptionsLoadingIssues.value !== null && !isModelValueExpression.value) {
		issues.parameters = issues.parameters ?? {};
		issues.parameters[props.parameter.name] = [
			`There was a problem loading the parameter options from server: "${remoteParameterOptionsLoadingIssues.value}"`,
		];
	} else if (props.parameter.type === 'workflowSelector') {
		const selected = modelValueResourceLocator.value?.value;
		if (selected) {
			const isSelectedArchived = workflowsStore.allWorkflows.some(
				(resource) => resource.id === selected && resource.isArchived,
			);

			if (isSelectedArchived) {
				issues.parameters = issues.parameters ?? {};
				const issue = i18n.baseText('parameterInput.selectedWorkflowIsArchived');
				issues.parameters[props.parameter.name] = [issue];
			}
		}
	}

	if (issues?.parameters?.[props.parameter.name] !== undefined) {
		return issues.parameters[props.parameter.name];
	}

	return [];
});

const displayTitle = computed<string>(() => {
	const interpolation = { interpolate: { shortPath: shortPath.value } };

	if (getIssues.value.length && isModelValueExpression.value) {
		return i18n.baseText('parameterInput.parameterHasIssuesAndExpression', interpolation);
	} else if (getIssues.value.length && !isModelValueExpression.value) {
		return i18n.baseText('parameterInput.parameterHasIssues', interpolation);
	} else if (!getIssues.value.length && isModelValueExpression.value) {
		return i18n.baseText('parameterInput.parameterHasExpression', interpolation);
	}

	return i18n.baseText('parameterInput.parameter', interpolation);
});

const displayIssues = computed(
	() =>
		props.parameter.type !== 'credentialsSelect' &&
		!isResourceLocatorParameter.value &&
		getIssues.value.length > 0,
);

const isSwitch = computed(
	() => props.parameter.type === 'boolean' && !isModelValueExpression.value,
);

const isTextarea = computed(
	() => props.parameter.type === 'string' && editorRows.value !== undefined,
);

const parameterInputClasses = computed(() => {
	const classes: Record<string, boolean> = {
		droppable: props.droppable,
		activeDrop: props.activeDrop,
	};

	if (isSwitch.value) {
		classes['parameter-switch'] = true;
	} else {
		classes['parameter-value-container'] = true;
	}

	if (
		!props.droppable &&
		!props.activeDrop &&
		(getIssues.value.length > 0 || props.errorHighlight) &&
		!isModelValueExpression.value
	) {
		classes['has-issues'] = true;
	}

	return classes;
});

const parameterInputWrapperStyle = computed(() => {
	let deductWidth = 0;
	const styles = {
		width: '100%',
	};
	if (props.parameter.type === 'credentialsSelect' || isResourceLocatorParameter.value) {
		return styles;
	}
	if (getIssues.value.length) {
		deductWidth += 20;
	}

	if (deductWidth !== 0) {
		styles.width = `calc(100% - ${deductWidth}px)`;
	}

	return styles;
});

const parameterId = computed(() => {
	return `${node.value?.id ?? crypto.randomUUID()}${props.path}`;
});

const remoteParameterOptionsKeys = computed<string[]>(() => {
	return (remoteParameterOptions.value || []).map((o) => o.name);
});

const shouldRedactValue = computed<boolean>(() => {
	return getStringInputType.value === 'password' || props.isForCredential;
});

const isCodeNode = computed(
	() => !!node.value && NODES_USING_CODE_NODE_EDITOR.includes(node.value.type),
);

const isHtmlNode = computed(() => !!node.value && node.value.type === HTML_NODE_TYPE);

const isInputTypeString = computed(() => props.parameter.type === 'string');
const isInputTypeNumber = computed(() => props.parameter.type === 'number');

const isInputDataEmpty = computed(() => ndvStore.isInputPanelEmpty);
const isDropDisabled = computed(
	() =>
		props.parameter.noDataExpression === true ||
		props.isReadOnly ||
		isResourceLocatorParameter.value ||
		isModelValueExpression.value,
);
const showDragnDropTip = computed(
	() =>
		isFocused.value &&
		(isInputTypeString.value || isInputTypeNumber.value) &&
		!isModelValueExpression.value &&
		!isDropDisabled.value &&
		(!ndvStore.hasInputData || !isInputDataEmpty.value) &&
		!ndvStore.isMappingOnboarded &&
		ndvStore.isInputParentOfActiveNode &&
		!props.isForCredential,
);

const shouldCaptureForPosthog = computed(() => node.value?.type === AI_TRANSFORM_NODE_TYPE);

const shouldShowMapper = computed(
	() =>
		isFocused.value &&
		(isModelValueExpression.value || props.forceShowExpression || props.modelValue === ''),
);

function isRemoteParameterOption(option: INodePropertyOptions) {
	return remoteParameterOptionsKeys.value.includes(option.name);
}

function credentialSelected(updateInformation: INodeUpdatePropertiesInformation) {
	// Update the values on the node
	workflowsStore.updateNodeProperties(updateInformation);

	const updateNode = workflowsStore.getNodeByName(updateInformation.name);

	if (updateNode) {
		// Update the issues
		nodeHelpers.updateNodeCredentialIssues(updateNode);
	}

	void externalHooks.run('nodeSettings.credentialSelected', { updateInformation });
}

function getPlaceholder(): string {
	return props.isForCredential
		? i18n.credText(uiStore.activeCredentialType).placeholder(props.parameter)
		: i18n.nodeText(ndvStore.activeNode?.type).placeholder(props.parameter, props.path);
}

function getOptionsOptionDisplayName(option: INodePropertyOptions): string {
	return props.isForCredential
		? i18n.credText(uiStore.activeCredentialType).optionsOptionDisplayName(props.parameter, option)
		: i18n
				.nodeText(ndvStore.activeNode?.type)
				.optionsOptionDisplayName(props.parameter, option, props.path);
}

function getOptionsOptionDescription(option: INodePropertyOptions): string {
	return props.isForCredential
		? i18n.credText(uiStore.activeCredentialType).optionsOptionDescription(props.parameter, option)
		: i18n
				.nodeText(ndvStore.activeNode?.type)
				.optionsOptionDescription(props.parameter, option, props.path);
}

async function loadRemoteParameterOptions() {
	if (
		!node.value ||
		!hasRemoteMethod.value ||
		remoteParameterOptionsLoading.value ||
		!props.parameter
	) {
		return;
	}
	remoteParameterOptionsLoadingIssues.value = null;
	remoteParameterOptionsLoading.value = true;
	remoteParameterOptions.value.length = 0;

	// Get the resolved parameter values of the current node

	try {
		const currentNodeParameters = (ndvStore.activeNode as INodeUi).parameters;
		const resolvedNodeParameters = workflowHelpers.resolveRequiredParameters(
			props.parameter,
			currentNodeParameters,
		) as INodeParameters;
		const loadOptionsMethod = getTypeOption<string | undefined>('loadOptionsMethod');
		const loadOptions = getTypeOption<ILoadOptions | undefined>('loadOptions');

		const options = await nodeTypesStore.getNodeParameterOptions({
			nodeTypeAndVersion: {
				name: node.value.type,
				version: node.value.typeVersion,
			},
			path: props.path,
			methodName: loadOptionsMethod,
			loadOptions,
			currentNodeParameters: resolvedNodeParameters,
			credentials: node.value.credentials,
		});

		remoteParameterOptions.value = remoteParameterOptions.value.concat(options);
	} catch (error: unknown) {
		if (error instanceof Error) {
			remoteParameterOptionsLoadingIssues.value = error.message;
		} else {
			remoteParameterOptionsLoadingIssues.value = String(error);
		}
	}

	remoteParameterOptionsLoading.value = false;
}

function closeCodeEditDialog() {
	codeEditDialogVisible.value = false;

	editDialogClosing.value = true;

	void nextTick().then(() => {
		editDialogClosing.value = false;
	});
}

function closeExpressionEditDialog() {
	expressionEditDialogVisible.value = false;
}

function trackExpressionEditOpen() {
	if (!node.value) {
		return;
	}

	if (node.value.type.startsWith('n8n-nodes-base') || isCredentialOnlyNodeType(node.value.type)) {
		telemetry.track('User opened Expression Editor', {
			node_type: node.value.type,
			parameter_name: props.parameter.displayName,
			parameter_field_type: props.parameter.type,
			new_expression: !isModelValueExpression.value,
			workflow_id: workflowsStore.workflowId,
			push_ref: ndvStore.pushRef,
			source: props.eventSource ?? 'ndv',
		});
	}
}

function closeTextEditDialog() {
	textEditDialogVisible.value = false;

	editDialogClosing.value = true;
	void nextTick().then(() => {
		if (isBlurrableEl(inputField.value)) {
			inputField.value.blur();
		}
		editDialogClosing.value = false;
	});
}

function displayEditDialog() {
	if (editDialogClosing.value) {
		return;
	}

	if (editorType.value || props.parameter.type === 'json') {
		codeEditDialogVisible.value = true;
	} else {
		textEditDialogVisible.value = true;
	}
}

function openExpressionEditorModal() {
	if (!isModelValueExpression.value) return;

	expressionEditDialogVisible.value = true;
	trackExpressionEditOpen();
}

function selectInput() {
	if (inputField.value) {
		if (isSelectableEl(inputField.value)) {
			inputField.value.select();
		}
	}
}

async function setFocus() {
	if (['json'].includes(props.parameter.type) && getTypeOption('alwaysOpenEditWindow')) {
		displayEditDialog();
		return;
	}

	if (node.value) {
		// When an event like mouse-click removes the active node while
		// editing is active it does not know where to save the value to.
		// For that reason do we save the node-name here. We could probably
		// also just do that once on load but if Vue decides for some reason to
		// reuse the input it could have the wrong value so lets set it everytime
		// just to be sure
		nodeName.value = node.value.name;
	}

	await nextTick();

	if (inputField.value) {
		if (hasFocusOnInput(inputField.value)) {
			inputField.value.focusOnInput();
		} else if (isFocusableEl(inputField.value)) {
			inputField.value.focus();
		}

		isFocused.value = true;
	}

	emit('focus');
}

function rgbaToHex(value: string): string | null {
	// Convert rgba to hex from: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
	const valueMatch = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)$/);
	if (valueMatch === null) {
		// TODO: Display something if value is not valid
		return null;
	}
	const [r, g, b, a] = valueMatch.splice(1, 4).map((v) => Number(v));
	return (
		'#' +
		((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1) +
		((1 << 8) + Math.floor((1 - a) * 255)).toString(16).slice(1)
	);
}
function onTextInputChange(value: string) {
	const parameterData = {
		node: node.value ? node.value.name : nodeName.value,
		name: props.path,
		value,
	};

	emit('textInput', parameterData);
}

function trackWorkflowInputModeEvent(value: string) {
	const telemetryValuesMap: Record<string, string> = {
		workflowInputs: 'fields',
		jsonExample: 'json',
		passthrough: 'all',
	};
	telemetry.track('User chose input data mode', {
		option: telemetryValuesMap[value],
		workflow_id: workflowsStore.workflowId,
		node_id: node.value?.id,
	});
}

function valueChanged(untypedValue: unknown) {
	if (remoteParameterOptionsLoading.value) {
		return;
	}

	const oldValue = get(node.value, props.path) as unknown;
	if (oldValue !== undefined && oldValue === untypedValue) {
		// Skip emit if value hasn't changed
		return;
	}

	let value: NodeParameterValueType;

	if (untypedValue instanceof Date) {
		value = untypedValue.toISOString();
	} else if (
		typeof untypedValue === 'string' ||
		typeof untypedValue === 'number' ||
		typeof untypedValue === 'boolean' ||
		untypedValue === null ||
		Array.isArray(untypedValue)
	) {
		value = untypedValue;
	} else if (typeof untypedValue === 'object' && untypedValue !== null && '__rl' in untypedValue) {
		// likely INodeParameterResourceLocator
		value = untypedValue as NodeParameterValueType;
	} else {
		// fallback
		value = untypedValue as NodeParameterValueType;
	}

	const isSpecializedEditor = props.parameter.typeOptions?.editor !== undefined;

	if (
		!oldValue &&
		oldValue !== undefined &&
		shouldConvertToExpression(value, isSpecializedEditor)
	) {
		// if empty old value and updated value has an expression, add '=' prefix to switch to expression mode
		value = '=' + value;
	}

	if (props.parameter.name === 'nodeCredentialType') {
		activeCredentialType.value = value as string;
	}

	value = completeExpressionSyntax(value, isSpecializedEditor);

	if (
		props.parameter.type === 'color' &&
		getTypeOption('showAlpha') === true &&
		value !== null &&
		value !== undefined &&
		(value as string).toString().charAt(0) !== '#'
	) {
		const newValue = rgbaToHex(value as string);
		if (newValue !== null) {
			tempValue.value = newValue;
			value = newValue;
		}
	}

	const parameterData: IUpdateInformation = {
		node: node.value ? node.value.name : nodeName.value,
		name: props.path,
		value,
	};

	emit('update', parameterData);

	if (props.parameter.name === 'operation' || props.parameter.name === 'mode') {
		telemetry.track('User set node operation or mode', {
			workflow_id: workflowsStore.workflowId,
			node_type: node.value?.type,
			resource: node.value?.parameters.resource,
			is_custom: value === CUSTOM_API_CALL_KEY,
			push_ref: ndvStore.pushRef,
			parameter: props.parameter.name,
		});
	}
	// Track workflow input data mode change
	const isWorkflowInputParameter =
		props.parameter.name === 'inputSource' && props.parameter.default === 'workflowInputs';
	if (isWorkflowInputParameter) {
		trackWorkflowInputModeEvent(value as string);
	}
}

const valueChangedDebounced = debounce(valueChanged, { debounceTime: 100 });

function expressionUpdated(value: string) {
	const val: NodeParameterValueType = isResourceLocatorParameter.value
		? { __rl: true, value, mode: modelValueResourceLocator.value.mode }
		: value;
	valueChanged(val);
}

function onBlur(event?: FocusEvent | KeyboardEvent) {
	if (
		event?.target instanceof HTMLElement &&
		mapperRef.value?.contentRef &&
		(event.target === mapperRef.value.contentRef ||
			mapperRef.value.contentRef.contains(event.target))
	) {
		return;
	}

	emit('blur');
	isFocused.value = false;
}

function onPaste(event: ClipboardEvent) {
	const pastedText = event.clipboardData?.getData('text');
	const input = event.target;

	if (!(input instanceof HTMLInputElement)) return;

	const start = input.selectionStart ?? 0;

	// When a value starting with `=` is pasted that does not contain expression syntax ({{}})
	// Add an extra `=` to go into expression mode and preserve the original pasted text
	if (pastedText && pastedText.startsWith('=') && !pastedText.match(/{{.*?}}/g) && start === 0) {
		event.preventDefault();

		const end = input.selectionEnd ?? start;
		const text = input.value;
		const withExpressionPrefix = '=' + pastedText;

		input.value = text.substring(0, start) + withExpressionPrefix + text.substring(end);
		input.selectionStart = input.selectionEnd = start + withExpressionPrefix.length;

		valueChanged(input.value);
	}
}

function onPasteNumber(event: ClipboardEvent) {
	const pastedText = event.clipboardData?.getData('text');

	if (shouldConvertToExpression(pastedText)) {
		event.preventDefault();
		valueChanged('=' + pastedText);
		return;
	}
}

function onResourceLocatorDrop(data: string) {
	emit('drop', data);
}

function onUpdateTextInput(value: string) {
	valueChanged(value);
	onTextInputChange(value);
}

async function optionSelected(command: string) {
	const prevValue = props.modelValue;

	switch (command) {
		case 'resetValue':
			return valueChanged(props.parameter.default);

		case 'addExpression':
			valueChanged(formatAsExpression(props.modelValue, props.parameter.type));
			await setFocus();
			break;

		case 'removeExpression':
			isFocused.value = false;
			valueChanged(
				parseFromExpression(
					props.modelValue,
					props.expressionEvaluated,
					props.parameter.type,
					props.parameter.default,
					parameterOptions.value,
				),
			);
			break;

		case 'refreshOptions':
			if (isResourceLocatorParameter.value) {
				props.eventBus.emit('refreshList');
			}
			void loadRemoteParameterOptions();
			return;

		case 'formatHtml':
			htmlEditorEventBus.emit('format-html');
			return;

		case 'focus':
			nodeSettingsParameters.handleFocus(node.value, props.path, props.parameter);
			telemetry.track('User opened focus panel', {
				source: 'parameterButton',
				parameters: focusPanelStore.focusedNodeParametersInTelemetryFormat,
			});
			return;
	}

	if (node.value && (command === 'addExpression' || command === 'removeExpression')) {
		const telemetryPayload = {
			node_type: node.value.type,
			parameter: props.path,
			old_mode: command === 'addExpression' ? 'fixed' : 'expression',
			new_mode: command === 'removeExpression' ? 'fixed' : 'expression',
			was_parameter_empty: prevValue === '' || prevValue === undefined,
			had_mapping: hasExpressionMapping(prevValue),
			had_parameter: typeof prevValue === 'string' && prevValue.includes('$parameter'),
		};
		telemetry.track('User switched parameter mode', telemetryPayload);
		void externalHooks.run('parameterInput.modeSwitch', telemetryPayload);
	}
}

onMounted(() => {
	props.eventBus.on('optionSelected', optionSelected);

	tempValue.value = displayValue.value;

	if (node.value) {
		nodeName.value = node.value.name;
	}

	if (node.value && node.value.parameters.authentication === 'predefinedCredentialType') {
		activeCredentialType.value = node.value.parameters.nodeCredentialType as string;
	}

	if (
		props.parameter.type === 'color' &&
		getTypeOption('showAlpha') === true &&
		displayValue.value !== null &&
		displayValue.value.toString().charAt(0) !== '#'
	) {
		const newValue = rgbaToHex(displayValue.value);
		if (newValue !== null) {
			tempValue.value = newValue;
		}
	}

	void externalHooks.run('parameterInput.mount', {
		parameter: props.parameter,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
		inputFieldRef: inputField.value as InstanceType<typeof N8nInput>,
	});
});

const { height } = useElementSize(wrapper);

const isSingleLineInput = computed(() => {
	if (isTextarea.value && !isModelValueExpression.value) {
		return false;
	}

	/**
	 * There is an awkward edge case here with text boxes that automatically
	 * adjust their row count based on their content:
	 *
	 * If we move the overrideButton to the options row due to going multiline,
	 * the text area gains more width and might return to single line.
	 * This then causes the overrideButton to move inline, creating a loop which results in flickering UI.
	 *
	 * To avoid this, we treat 2 rows of input as single line if we were already single line.
	 */
	if (isSingleLineInput.value) {
		return height.value <= 70;
	}

	return height.value <= 35;
});

defineExpose({
	isSingleLineInput,
	displaysIssues: displayIssues.value,
	focusInput: async () => await setFocus(),
	selectInput: () => selectInput(),
});

onBeforeUnmount(() => {
	valueChangedDebounced.cancel();
	props.eventBus.off('optionSelected', optionSelected);
});

watch(
	() => node.value?.credentials,
	() => {
		if (hasRemoteMethod.value && node.value) {
			void loadRemoteParameterOptions();
		}
	},
	{ immediate: true },
);

watch(dependentParametersValues, async () => {
	// Reload the remote parameters whenever a parameter
	// on which the current field depends on changes
	await loadRemoteParameterOptions();
});

watch(
	() => props.modelValue,
	() => {
		if (props.parameter.type === 'color' && getTypeOption('showAlpha') === true) {
			// Do not set for color with alpha else wrong value gets displayed in field
			return;
		}
		tempValue.value = displayValue.value;
	},
);

watch(remoteParameterOptionsLoading, () => {
	tempValue.value = displayValue.value;
});

// Focus input field when changing between fixed and expression
watch(isModelValueExpression, async (isExpression, wasExpression) => {
	if (!props.isReadOnly && isExpression !== wasExpression) {
		await nextTick();
		await setFocus();
	}
});

// Investigate invalid parameter options
// Sentry issue: https://n8nio.sentry.io/issues/6275981089/?project=4503960699273216
const unwatchParameterOptions = watch(
	[remoteParameterOptions, () => props.parameter.options],
	([remoteOptions, options]) => {
		const allOptions = [...remoteOptions, ...(options ?? [])];
		const invalidOptions = allOptions.filter((option) => !isValidParameterOption(option));

		if (invalidOptions.length > 0) {
			captureMessage('Invalid parameter options', {
				level: 'error',
				extra: {
					invalidOptions,
					parameter: props.parameter.name,
					node: node.value,
				},
			});
			unwatchParameterOptions();
		}
	},
);

onUpdated(async () => {
	await nextTick();

	if (wrapper.value) {
		const remoteParamOptions = wrapper.value.querySelectorAll('.remote-parameter-option') ?? [];

		if (remoteParamOptions.length > 0) {
			void externalHooks.run('parameterInput.updated', {
				remoteParameterOptions: remoteParamOptions,
			});
		}
	}
});

onClickOutside(wrapper, onBlur);
</script>

<template>
	<div
		ref="wrapper"
		:class="[parameterInputClasses, { [$style.tipVisible]: showDragnDropTip }]"
		@keydown.stop
	>
		<ExpressionEditModal
			v-if="typeof modelValueExpressionEdit === 'string'"
			:dialog-visible="expressionEditDialogVisible"
			:model-value="modelValueExpressionEdit"
			:parameter="parameter"
			:node="node"
			:path="path"
			:event-source="eventSource || 'ndv'"
			:is-read-only="isReadOnly"
			:redact-values="shouldRedactValue"
			@close-dialog="closeExpressionEditDialog"
			@update:model-value="expressionUpdated"
		/>

		<ExperimentalEmbeddedNdvMapper
			v-if="node && expressionLocalResolveCtx?.inputNode"
			ref="mapperRef"
			:workflow="expressionLocalResolveCtx?.workflow"
			:node="node"
			:input-node-name="expressionLocalResolveCtx?.inputNode?.name"
			:visible="shouldShowMapper"
			:virtual-ref="wrapper"
		/>

		<div
			:class="[
				'parameter-input',
				'ignore-key-press-canvas',
				{
					[$style.noRightCornersInput]: canBeOverridden,
				},
			]"
			:style="parameterInputWrapperStyle"
		>
			<ResourceLocator
				v-if="parameter.type === 'resourceLocator'"
				ref="resourceLocator"
				:parameter="parameter"
				:model-value="modelValueResourceLocator"
				:dependent-parameters-values="dependentParametersValues"
				:display-title="displayTitle"
				:expression-display-value="expressionDisplayValue"
				:expression-computed-value="expressionEvaluated"
				:is-value-expression="isModelValueExpression"
				:is-read-only="isReadOnly"
				:parameter-issues="getIssues"
				:droppable="droppable"
				:node="node"
				:path="path"
				:event-bus="eventBus"
				@update:model-value="valueChanged"
				@modal-opener-click="openExpressionEditorModal"
				@focus="setFocus"
				@blur="onBlur"
				@drop="onResourceLocatorDrop"
			/>
			<WorkflowSelectorParameterInput
				v-else-if="parameter.type === 'workflowSelector'"
				ref="resourceLocator"
				:parameter="parameter"
				:model-value="modelValueResourceLocator"
				:dependent-parameters-values="dependentParametersValues"
				:display-title="displayTitle"
				:expression-display-value="expressionDisplayValue"
				:expression-computed-value="expressionEvaluated"
				:is-value-expression="isModelValueExpression"
				:expression-edit-dialog-visible="expressionEditDialogVisible"
				:path="path"
				:parameter-issues="getIssues"
				:is-read-only="isReadOnly"
				@update:model-value="valueChanged"
				@modal-opener-click="openExpressionEditorModal"
				@focus="setFocus"
				@blur="onBlur"
				@drop="onResourceLocatorDrop"
			/>
			<ExpressionParameterInput
				v-else-if="isModelValueExpression || forceShowExpression"
				ref="inputField"
				:model-value="expressionDisplayValue"
				:title="displayTitle"
				:is-read-only="isReadOnly"
				:rows="rows"
				:is-assignment="isAssignment"
				:path="path"
				:additional-expression-data="additionalExpressionData"
				:class="{ 'ph-no-capture': shouldRedactValue }"
				:event-bus="eventBus"
				@update:model-value="expressionUpdated"
				@modal-opener-click="openExpressionEditorModal"
				@focus="setFocus"
				@blur="onBlur"
			/>
			<div
				v-else-if="
					['json', 'string'].includes(parameter.type) ||
					remoteParameterOptionsLoadingIssues !== null
				"
			>
				<el-dialog
					width="calc(100% - var(--spacing-3xl))"
					:class="$style.modal"
					:model-value="codeEditDialogVisible"
					:append-to="`#${APP_MODALS_ELEMENT_ID}`"
					:title="`${i18n.baseText('codeEdit.edit')} ${i18n
						.nodeText(ndvStore.activeNode?.type)
						.inputLabelDisplayName(parameter, path)}`"
					:before-close="closeCodeEditDialog"
					data-test-id="code-editor-fullscreen"
				>
					<div class="ignore-key-press-canvas code-edit-dialog">
						<CodeNodeEditor
							v-if="editorType === 'codeNodeEditor' && codeEditDialogVisible"
							:id="parameterId"
							:mode="codeEditorMode"
							:model-value="modelValueString"
							:default-value="parameter.default"
							:language="editorLanguage"
							:is-read-only="isReadOnly"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
						<HtmlEditor
							v-else-if="editorType === 'htmlEditor' && codeEditDialogVisible"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							:disable-expression-coloring="!isHtmlNode"
							:disable-expression-completions="!isHtmlNode"
							fullscreen
							@update:model-value="valueChangedDebounced"
						/>
						<CssEditor
							v-else-if="editorType === 'cssEditor' && codeEditDialogVisible"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							@update:model-value="valueChangedDebounced"
						/>
						<SqlEditor
							v-else-if="editorType === 'sqlEditor' && codeEditDialogVisible"
							:model-value="modelValueString"
							:dialect="getTypeOption('sqlDialect')"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							@update:model-value="valueChangedDebounced"
						/>
						<JsEditor
							v-else-if="editorType === 'jsEditor' && codeEditDialogVisible"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							:posthog-capture="shouldCaptureForPosthog"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>

						<JsonEditor
							v-else-if="parameter.type === 'json' && codeEditDialogVisible"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
					</div>
				</el-dialog>

				<TextEdit
					:dialog-visible="textEditDialogVisible"
					:model-value="`${modelValue}`"
					:parameter="parameter"
					:path="path"
					:is-read-only="isReadOnly"
					@close-dialog="closeTextEditDialog"
					@update:model-value="expressionUpdated"
				></TextEdit>

				<CodeNodeEditor
					v-if="editorType === 'codeNodeEditor' && isCodeNode && !codeEditDialogVisible"
					:id="parameterId"
					:mode="codeEditorMode"
					:model-value="modelValueString"
					:default-value="parameter.default"
					:language="editorLanguage"
					:is-read-only="isReadOnly || editorIsReadOnly"
					:rows="editorRows"
					:ai-button-enabled="settingsStore.isCloudDeployment"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							v-if="!editorIsReadOnly"
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</CodeNodeEditor>

				<HtmlEditor
					v-else-if="editorType === 'htmlEditor' && !codeEditDialogVisible"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					:disable-expression-coloring="!isHtmlNode"
					:disable-expression-completions="!isHtmlNode"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</HtmlEditor>

				<CssEditor
					v-else-if="editorType === 'cssEditor' && !codeEditDialogVisible"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</CssEditor>

				<SqlEditor
					v-else-if="editorType === 'sqlEditor'"
					:model-value="modelValueString"
					:dialect="getTypeOption('sqlDialect')"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</SqlEditor>

				<JsEditor
					v-else-if="editorType === 'jsEditor'"
					:model-value="modelValueString"
					:is-read-only="isReadOnly || editorIsReadOnly"
					:rows="editorRows"
					:posthog-capture="shouldCaptureForPosthog"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							v-if="!editorIsReadOnly"
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</JsEditor>

				<JsonEditor
					v-else-if="parameter.type === 'json' && !codeEditDialogVisible"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<span
							class="textarea-modal-opener"
							data-test-id="code-editor-fullscreen-button"
							@click="displayEditDialog()"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</JsonEditor>

				<div v-else-if="editorType" class="readonly-code clickable" @click="displayEditDialog()">
					<CodeNodeEditor
						v-if="!codeEditDialogVisible"
						:id="parameterId"
						:mode="codeEditorMode"
						:model-value="modelValueString"
						:language="editorLanguage"
						:is-read-only="true"
						:rows="editorRows"
					/>
				</div>

				<N8nInput
					v-else
					ref="inputField"
					v-model="tempValue"
					:class="{ 'input-with-opener': true, 'ph-no-capture': shouldRedactValue }"
					:size="inputSize"
					:type="getStringInputType"
					:rows="editorRows"
					:disabled="
						isReadOnly ||
						remoteParameterOptionsLoading ||
						remoteParameterOptionsLoadingIssues !== null
					"
					:title="displayTitle"
					:placeholder="getPlaceholder()"
					data-test-id="parameter-input-field"
					@update:model-value="(valueChanged($event) as undefined) && onUpdateTextInput($event)"
					@keydown.stop
					@focus="setFocus"
					@blur="onBlur"
					@paste="onPaste"
				>
					<template #suffix>
						<span
							v-if="!isReadOnly && !isSecretParameter"
							:class="{
								'textarea-modal-opener': true,
								'edit-window-button': true,
								focused: isFocused,
								invalid: !isFocused && getIssues.length > 0 && !isModelValueExpression,
							}"
							@click="displayEditDialog()"
							@focus="setFocus"
						>
							<N8nIcon
								icon="external-link"
								size="xsmall"
								:title="i18n.baseText('parameterInput.openEditWindow')"
							/>
						</span>
					</template>
				</N8nInput>
			</div>

			<div v-else-if="parameter.type === 'color'" ref="inputField" class="color-input">
				<el-color-picker
					size="small"
					class="color-picker"
					:model-value="displayValue"
					:disabled="isReadOnly"
					:title="displayTitle"
					:show-alpha="getTypeOption('showAlpha')"
					@focus="setFocus"
					@blur="onBlur"
					@update:model-value="valueChanged"
				/>
				<N8nInput
					v-model="tempValue"
					:size="inputSize"
					type="text"
					:disabled="isReadOnly"
					:title="displayTitle"
					@update:model-value="valueChanged"
					@keydown.stop
					@focus="setFocus"
					@blur="onBlur"
				/>
			</div>

			<el-date-picker
				v-else-if="parameter.type === 'dateTime'"
				ref="inputField"
				v-model="tempValue"
				type="datetime"
				value-format="YYYY-MM-DDTHH:mm:ss"
				:size="inputSize"
				:title="displayTitle"
				:disabled="isReadOnly"
				:placeholder="
					parameter.placeholder
						? getPlaceholder()
						: i18n.baseText('parameterInput.selectDateAndTime')
				"
				:picker-options="dateTimePickerOptions"
				:class="{ 'ph-no-capture': shouldRedactValue }"
				@update:model-value="valueChanged"
				@focus="setFocus"
				@blur="onBlur"
				@keydown.stop
			/>

			<N8nInputNumber
				v-else-if="parameter.type === 'number'"
				ref="inputField"
				:size="inputSize"
				:model-value="displayValue"
				:controls="false"
				:max="getTypeOption('maxValue')"
				:min="getTypeOption('minValue')"
				:precision="getTypeOption('numberPrecision')"
				:disabled="isReadOnly"
				:class="{ 'ph-no-capture': shouldRedactValue }"
				:title="displayTitle"
				:placeholder="parameter.placeholder"
				@update:model-value="onUpdateTextInput"
				@focus="setFocus"
				@blur="onBlur"
				@paste="onPasteNumber"
			/>

			<CredentialsSelect
				v-else-if="parameter.type === 'credentialsSelect' || parameter.name === 'genericAuthType'"
				ref="inputField"
				:parameter="parameter"
				:node="node"
				:active-credential-type="activeCredentialType"
				:input-size="inputSize"
				:display-value="displayValue"
				:is-read-only="isReadOnly"
				:display-title="displayTitle"
				@credential-selected="credentialSelected"
				@update:model-value="valueChanged"
				@set-focus="setFocus"
				@on-blur="onBlur"
			>
				<template #issues-and-options>
					<ParameterIssues :issues="getIssues" />
				</template>
			</CredentialsSelect>

			<N8nSelect
				v-else-if="parameter.type === 'options'"
				ref="inputField"
				:size="inputSize"
				filterable
				:model-value="displayValue"
				:placeholder="
					parameter.placeholder ? getPlaceholder() : i18n.baseText('parameterInput.select')
				"
				:loading="remoteParameterOptionsLoading"
				:disabled="isReadOnly || remoteParameterOptionsLoading"
				:title="displayTitle"
				@update:model-value="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
			>
				<N8nOption
					v-for="option in parameterOptions"
					:key="option.value.toString()"
					:value="option.value"
					:label="getOptionsOptionDisplayName(option)"
					data-test-id="parameter-input-item"
				>
					<div class="list-option">
						<div
							class="option-headline"
							:class="{ 'remote-parameter-option': isRemoteParameterOption(option) }"
						>
							{{ getOptionsOptionDisplayName(option) }}
						</div>
						<div
							v-if="option.description"
							v-n8n-html="getOptionsOptionDescription(option)"
							class="option-description"
						></div>
					</div>
				</N8nOption>
			</N8nSelect>

			<N8nSelect
				v-else-if="parameter.type === 'multiOptions'"
				ref="inputField"
				:size="inputSize"
				filterable
				multiple
				:model-value="displayValue"
				:loading="remoteParameterOptionsLoading"
				:disabled="isReadOnly || remoteParameterOptionsLoading"
				:title="displayTitle"
				:placeholder="i18n.baseText('parameterInput.select')"
				@update:model-value="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
			>
				<N8nOption
					v-for="option in parameterOptions"
					:key="option.value.toString()"
					:value="option.value"
					:label="getOptionsOptionDisplayName(option)"
				>
					<div class="list-option">
						<div class="option-headline">{{ getOptionsOptionDisplayName(option) }}</div>
						<div
							v-if="option.description"
							v-n8n-html="getOptionsOptionDescription(option)"
							class="option-description"
						></div>
					</div>
				</N8nOption>
			</N8nSelect>

			<!-- temporary state of booleans while data is mapped -->
			<N8nInput
				v-else-if="parameter.type === 'boolean' && droppable"
				:size="inputSize"
				:model-value="JSON.stringify(displayValue)"
				:disabled="isReadOnly"
				:title="displayTitle"
			/>
			<el-switch
				v-else-if="parameter.type === 'boolean'"
				ref="inputField"
				:class="{ 'switch-input': true, 'ph-no-capture': shouldRedactValue }"
				active-color="#13ce66"
				:model-value="displayValue"
				:disabled="isReadOnly"
				@update:model-value="valueChanged"
			/>
			<div v-if="!isReadOnly && showDragnDropTip" :class="$style.tip">
				<InlineExpressionTip />
			</div>
		</div>
		<div
			v-if="$slots.overrideButton"
			:class="[
				$style.overrideButton,
				{
					[$style.overrideButtonStandalone]: isSwitch,
					[$style.overrideButtonInline]: !isSwitch,
				},
			]"
		>
			<slot name="overrideButton" />
		</div>
		<ParameterIssues v-if="displayIssues" :issues="getIssues" />
	</div>
</template>

<style scoped lang="scss">
.readonly-code {
	font-size: var(--font-size-xs);
}

.switch-input {
	margin: var(--spacing-5xs) 0 var(--spacing-2xs) 0;
}

.parameter-value-container {
	display: flex;
	align-items: center;
}

.parameter-actions {
	display: inline-flex;
	align-items: center;
}

.parameter-switch {
	display: inline-flex;
	align-self: flex-start;
	justify-items: center;
	gap: var(--spacing-xs);
}

.parameter-input {
	display: inline-block;
	position: relative;

	:deep(.color-input) {
		display: flex;

		.el-color-picker__trigger {
			border: none;
		}
	}
}
</style>

<style lang="scss">
.ql-editor {
	padding: 6px;
	line-height: 26px;
	background-color: #f0f0f0;
}

.droppable {
	--input-border-color: var(--color-ndv-droppable-parameter);
	--input-border-right-color: var(--color-ndv-droppable-parameter);
	--input-border-style: dashed;

	textarea,
	input,
	.cm-editor {
		border-width: 1.5px;
	}
}

.activeDrop {
	--input-border-color: var(--color-success);
	--input-border-right-color: var(--color-success);
	--input-background-color: var(--color-foreground-xlight);
	--input-border-style: solid;

	textarea,
	input {
		cursor: grabbing !important;
		border-width: 1px;
	}
}

.has-issues {
	--input-border-color: var(--color-danger);
}

.el-dropdown {
	color: var(--color-text-light);
}

.list-option {
	margin: 6px 0;
	white-space: normal;
	padding-right: 20px;

	.option-headline {
		font-weight: var(--font-weight-medium);
		line-height: var(--font-line-height-regular);
		overflow-wrap: break-word;
	}

	.option-description {
		margin-top: 2px;
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-line-height-xloose);
		color: $custom-font-very-light;
	}
}

.edit-window-button {
	display: none;
}

.parameter-input:hover .edit-window-button {
	display: inline;
}

.expand-input-icon-container {
	display: flex;
	height: 100%;
	align-items: center;
}

.input-with-opener .el-input__suffix {
	right: 0;
}

.el-input--suffix .el-input__inner {
	padding-right: 0;
}

.textarea-modal-opener {
	position: absolute;
	right: 1px;
	bottom: 1px;
	background-color: var(--color-code-background);
	padding: 3px;
	line-height: 9px;
	border: var(--border-base);
	border-top-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	cursor: pointer;
	border-right: none;
	border-bottom: none;

	svg {
		width: 9px !important;
		height: 9px;
		transform: rotate(270deg);

		&:hover {
			color: var(--color-primary);
		}
	}
}

.focused {
	border-color: var(--color-secondary);
}

.invalid {
	border-color: var(--color-danger);
}

.code-edit-dialog {
	height: 100%;

	.code-node-editor {
		height: 100%;
	}
}
</style>

<style lang="css" module>
.modal {
	--dialog-close-top: var(--spacing-m);
	display: flex;
	flex-direction: column;
	overflow: clip;
	height: calc(100% - var(--spacing-4xl));
	margin-bottom: 0;

	:global(.el-dialog__header) {
		padding-bottom: 0;
	}

	:global(.el-dialog__body) {
		height: calc(100% - var(--spacing-3xl));
		padding: var(--spacing-s);
	}
}

.tipVisible {
	--input-border-bottom-left-radius: 0;
	--input-border-bottom-right-radius: 0;
}

.tip {
	position: absolute;
	z-index: 2;
	top: 100%;
	background: var(--color-code-background);
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
}

.noRightCornersInput > * {
	--input-border-bottom-right-radius: 0;
	--input-border-top-right-radius: 0;
}

.overrideButton {
	align-self: start;
}

.overrideButtonStandalone {
	position: relative;
	/* This is to balance for the extra margin on the switch */
	top: -2px;
}

.overrideButtonInline {
	> button {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}
}
</style>
