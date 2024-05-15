<template>
	<div ref="wrapper" :class="parameterInputClasses" @keydown.stop>
		<ExpressionEdit
			:dialog-visible="expressionEditDialogVisible"
			:model-value="modelValueExpressionEdit"
			:parameter="parameter"
			:path="path"
			:event-source="eventSource || 'ndv'"
			:is-read-only="isReadOnly"
			:redact-values="shouldRedactValue"
			@close-dialog="closeExpressionEditDialog"
			@update:model-value="expressionUpdated"
		></ExpressionEdit>
		<div class="parameter-input ignore-key-press" :style="parameterInputWrapperStyle">
			<ResourceLocator
				v-if="isResourceLocatorParameter"
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
					:model-value="codeEditDialogVisible"
					append-to-body
					width="80%"
					:title="`${i18n.baseText('codeEdit.edit')} ${$locale
						.nodeText()
						.inputLabelDisplayName(parameter, path)}`"
					:before-close="closeCodeEditDialog"
					data-test-id="code-editor-fullscreen"
				>
					<div :key="codeEditDialogVisible.toString()" class="ignore-key-press code-edit-dialog">
						<CodeNodeEditor
							v-if="editorType === 'codeNodeEditor'"
							:mode="codeEditorMode"
							:model-value="modelValueString"
							:default-value="parameter.default"
							:language="editorLanguage"
							:is-read-only="isReadOnly"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
						<HtmlEditor
							v-else-if="editorType === 'htmlEditor'"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							:disable-expression-coloring="!isHtmlNode"
							:disable-expression-completions="!isHtmlNode"
							fullscreen
							@update:model-value="valueChangedDebounced"
						/>
						<SqlEditor
							v-else-if="editorType === 'sqlEditor'"
							:model-value="modelValueString"
							:dialect="getArgument('sqlDialect')"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fullscreen
							@update:model-value="valueChangedDebounced"
						/>
						<JsEditor
							v-else-if="editorType === 'jsEditor'"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>

						<JsonEditor
							v-else-if="parameter.type === 'json'"
							:model-value="modelValueString"
							:is-read-only="isReadOnly"
							:rows="editorRows"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
					</div>
				</el-dialog>

				<TextEdit
					:dialog-visible="textEditDialogVisible"
					:model-value="modelValue"
					:parameter="parameter"
					:path="path"
					:is-read-only="isReadOnly"
					@close-dialog="closeTextEditDialog"
					@update:model-value="expressionUpdated"
				></TextEdit>

				<CodeNodeEditor
					v-if="editorType === 'codeNodeEditor' && isCodeNode"
					:key="'code-' + codeEditDialogVisible.toString()"
					:mode="codeEditorMode"
					:model-value="modelValueString"
					:default-value="parameter.default"
					:language="editorLanguage"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					:ai-button-enabled="settingsStore.isCloudDeployment"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<n8n-icon
							data-test-id="code-editor-fullscreen-button"
							icon="external-link-alt"
							size="xsmall"
							class="textarea-modal-opener"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</template>
				</CodeNodeEditor>

				<HtmlEditor
					v-else-if="editorType === 'htmlEditor'"
					:key="'html-' + codeEditDialogVisible.toString()"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					:disable-expression-coloring="!isHtmlNode"
					:disable-expression-completions="!isHtmlNode"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<n8n-icon
							data-test-id="code-editor-fullscreen-button"
							icon="external-link-alt"
							size="xsmall"
							class="textarea-modal-opener"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</template>
				</HtmlEditor>

				<SqlEditor
					v-else-if="editorType === 'sqlEditor'"
					:key="'sql-' + codeEditDialogVisible.toString()"
					:model-value="modelValueString"
					:dialect="getArgument('sqlDialect')"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<n8n-icon
							data-test-id="code-editor-fullscreen-button"
							icon="external-link-alt"
							size="xsmall"
							class="textarea-modal-opener"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</template>
				</SqlEditor>

				<JsEditor
					v-else-if="editorType === 'jsEditor'"
					:key="'js-' + codeEditDialogVisible.toString()"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<n8n-icon
							data-test-id="code-editor-fullscreen-button"
							icon="external-link-alt"
							size="xsmall"
							class="textarea-modal-opener"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</template>
				</JsEditor>

				<JsonEditor
					v-else-if="parameter.type === 'json'"
					:key="'json-' + codeEditDialogVisible.toString()"
					:model-value="modelValueString"
					:is-read-only="isReadOnly"
					:rows="editorRows"
					@update:model-value="valueChangedDebounced"
				>
					<template #suffix>
						<n8n-icon
							data-test-id="code-editor-fullscreen-button"
							icon="external-link-alt"
							size="xsmall"
							class="textarea-modal-opener"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</template>
				</JsonEditor>

				<div v-else-if="editorType" class="readonly-code clickable" @click="displayEditDialog()">
					<CodeNodeEditor
						v-if="!codeEditDialogVisible"
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
					:disabled="isReadOnly"
					:title="displayTitle"
					:placeholder="getPlaceholder()"
					@update:model-value="(valueChanged($event) as undefined) && onUpdateTextInput($event)"
					@keydown.stop
					@focus="setFocus"
					@blur="onBlur"
				>
					<template #suffix>
						<n8n-icon
							v-if="!isReadOnly && !isSecretParameter"
							icon="external-link-alt"
							size="xsmall"
							class="edit-window-button textarea-modal-opener"
							:class="{
								focused: isFocused,
								invalid: !isFocused && getIssues.length > 0 && !isModelValueExpression,
							}"
							:title="i18n.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
							@focus="setFocus"
						/>
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
					:show-alpha="getArgument('showAlpha')"
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
				:max="getArgument('maxValue')"
				:min="getArgument('minValue')"
				:precision="getArgument('numberPrecision')"
				:disabled="isReadOnly"
				:class="{ 'ph-no-capture': shouldRedactValue }"
				:title="displayTitle"
				:placeholder="parameter.placeholder"
				@update:model-value="onUpdateTextInput"
				@focus="setFocus"
				@blur="onBlur"
				@keydown.stop
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
				<n8n-option
					v-for="option in parameterOptions"
					:key="option.value"
					:value="option.value"
					:label="getOptionsOptionDisplayName(option)"
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
							class="option-description"
							v-html="getOptionsOptionDescription(option)"
						></div>
					</div>
				</n8n-option>
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
				<n8n-option
					v-for="option in parameterOptions"
					:key="option.value"
					:value="option.value"
					:label="getOptionsOptionDisplayName(option)"
				>
					<div class="list-option">
						<div class="option-headline">{{ getOptionsOptionDisplayName(option) }}</div>
						<div
							v-if="option.description"
							class="option-description"
							v-html="getOptionsOptionDescription(option)"
						></div>
					</div>
				</n8n-option>
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
		</div>

		<ParameterIssues
			v-if="parameter.type !== 'credentialsSelect' && !isResourceLocatorParameter"
			:issues="getIssues"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue';

import { get } from 'lodash-es';

import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	InputSize,
} from '@/Interface';
import type {
	CodeExecutionMode,
	CodeNodeEditorLanguage,
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
import { CREDENTIAL_EMPTY_VALUE, NodeHelpers } from 'n8n-workflow';

import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import CredentialsSelect from '@/components/CredentialsSelect.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import JsEditor from '@/components/JsEditor/JsEditor.vue';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ResourceLocator from '@/components/ResourceLocator/ResourceLocator.vue';
import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';
import TextEdit from '@/components/TextEdit.vue';

import { hasExpressionMapping, isValueExpression } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';

import { CUSTOM_API_CALL_KEY, HTML_NODE_TYPE, NODES_USING_CODE_NODE_EDITOR } from '@/constants';

import { useDebounce } from '@/composables/useDebounce';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { htmlEditorEventBus } from '@/event-bus';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isCredentialOnlyNodeType } from '@/utils/credentialOnlyNodes';
import { N8nInput, N8nSelect } from 'n8n-design-system';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import { useRouter } from 'vue-router';

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
	expressionEvaluated?: string;
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
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	hint: undefined,
	inputSize: undefined,
	eventSource: undefined,
	expressionEvaluated: undefined,
	documentationUrl: undefined,
	isReadOnly: false,
	isAssignment: false,
	eventBus: () => createEventBus(),
	additionalExpressionData: () => ({}),
	label: () => ({ size: 'small' }),
});

const emit = defineEmits<{
	(event: 'focus'): void;
	(event: 'blur'): void;
	(event: 'drop', expression: string): void;
	(event: 'textInput', update: IUpdateInformation): void;
	(event: 'update', update: IUpdateInformation): void;
}>();

const externalHooks = useExternalHooks();
const i18n = useI18n();
const nodeHelpers = useNodeHelpers();
const { callDebounced } = useDebounce();
const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const telemetry = useTelemetry();

const credentialsStore = useCredentialsStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const nodeTypesStore = useNodeTypesStore();

// ESLint: false positive
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-duplicate-type-constituents
const inputField = ref<InstanceType<typeof N8nInput | typeof N8nSelect> | HTMLElement>();
const wrapper = ref<HTMLDivElement>();

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

const displayValue = computed<string | number | boolean | null>(() => {
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
		getArgument('showAlpha') === true &&
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

const isModelValueExpression = computed(() => isValueExpression(props.parameter, props.modelValue));

const dependentParametersValues = computed<string | null>(() => {
	const loadOptionsDependsOn = getArgument<string[] | undefined>('loadOptionsDependsOn');

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
	} catch (error) {
		return null;
	}
});

const node = computed(() => ndvStore.activeNode ?? undefined);

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

const getStringInputType = computed(() => {
	if (getArgument('password') === true) {
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
	);

	if (props.parameter.type === 'credentialsSelect' && displayValue.value === '') {
		issues.parameters = issues.parameters ?? {};

		const issue = i18n.baseText('parameterInput.selectACredentialTypeFromTheDropdown');

		issues.parameters[props.parameter.name] = [issue];
	} else if (
		['options', 'multiOptions'].includes(props.parameter.type) &&
		!remoteParameterOptionsLoading.value &&
		remoteParameterOptionsLoadingIssues.value === null &&
		parameterOptions.value
	) {
		// Check if the value resolves to a valid option
		// Currently it only displays an error in the node itself in
		// case the value is not valid. The workflow can still be executed
		// and the error is not displayed on the node in the workflow
		const validOptions = parameterOptions.value.map((options) => options.value);

		let checkValues: string[] = [];

		if (!skipCheck(displayValue.value)) {
			if (Array.isArray(displayValue.value)) {
				checkValues = checkValues.concat(displayValue.value);
			} else {
				checkValues.push(displayValue.value as string);
			}
		}

		for (const checkValue of checkValues) {
			if (checkValue === null || !validOptions.includes(checkValue)) {
				if (issues.parameters === undefined) {
					issues.parameters = {};
				}

				const issue = i18n.baseText('parameterInput.theValueIsNotSupported', {
					interpolate: { checkValue },
				});

				issues.parameters[props.parameter.name] = [issue];
			}
		}
	} else if (remoteParameterOptionsLoadingIssues.value !== null && !isModelValueExpression.value) {
		if (issues.parameters === undefined) {
			issues.parameters = {};
		}
		issues.parameters[props.parameter.name] = [
			`There was a problem loading the parameter options from server: "${remoteParameterOptionsLoadingIssues.value}"`,
		];
	}

	if (issues?.parameters?.[props.parameter.name] !== undefined) {
		return issues.parameters[props.parameter.name];
	}

	return [];
});

const editorType = computed<EditorType | 'json' | 'code'>(() => {
	return getArgument<EditorType>('editor');
});

const editorLanguage = computed<CodeNodeEditorLanguage>(() => {
	if (editorType.value === 'json' || props.parameter.type === 'json')
		return 'json' as CodeNodeEditorLanguage;
	return getArgument<CodeNodeEditorLanguage>('editorLanguage') ?? 'javaScript';
});

const parameterOptions = computed<INodePropertyOptions[] | undefined>(() => {
	if (!hasRemoteMethod.value) {
		// Options are already given
		return props.parameter.options as INodePropertyOptions[];
	}

	// Options get loaded from server
	return remoteParameterOptions.value;
});

const parameterInputClasses = computed(() => {
	const classes: { [c: string]: boolean } = {
		droppable: props.droppable,
		activeDrop: props.activeDrop,
	};

	const rows = editorRows.value;
	const isTextarea = props.parameter.type === 'string' && rows !== undefined;
	const isSwitch = props.parameter.type === 'boolean' && !isModelValueExpression.value;

	if (!isTextarea && !isSwitch) {
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

const hasRemoteMethod = computed<boolean>(() => {
	return !!getArgument('loadOptionsMethod') || !!getArgument('loadOptions');
});

const shortPath = computed<string>(() => {
	const short = props.path.split('.');
	short.shift();
	return short.join('.');
});

const isResourceLocatorParameter = computed<boolean>(() => {
	return props.parameter.type === 'resourceLocator';
});

const isSecretParameter = computed<boolean>(() => {
	return getArgument('password') === true;
});

const remoteParameterOptionsKeys = computed<string[]>(() => {
	return (remoteParameterOptions.value || []).map((o) => o.name);
});

const shouldRedactValue = computed<boolean>(() => {
	return getStringInputType.value === 'password' || props.isForCredential;
});

const modelValueString = computed<string>(() => {
	return props.modelValue as string;
});

const modelValueResourceLocator = computed<INodeParameterResourceLocator>(() => {
	return props.modelValue as INodeParameterResourceLocator;
});

const modelValueExpressionEdit = computed<string>(() => {
	return isResourceLocatorParameter.value && typeof props.modelValue !== 'string'
		? props.modelValue
			? ((props.modelValue as INodeParameterResourceLocator).value as string)
			: ''
		: (props.modelValue as string);
});

const editorRows = computed(() => getArgument<number>('rows'));

const codeEditorMode = computed<CodeExecutionMode>(() => {
	return node.value?.parameters.mode as CodeExecutionMode;
});

const isCodeNode = computed(
	() => !!node.value && NODES_USING_CODE_NODE_EDITOR.includes(node.value.type),
);

const isHtmlNode = computed(() => !!node.value && node.value.type === HTML_NODE_TYPE);

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

/**
 * Check whether a param value must be skipped when collecting node param issues for validation.
 */
function skipCheck(value: string | number | boolean | null) {
	return typeof value === 'string' && value.includes(CUSTOM_API_CALL_KEY);
}

function getPlaceholder(): string {
	return props.isForCredential
		? i18n.credText().placeholder(props.parameter)
		: i18n.nodeText().placeholder(props.parameter, props.path);
}

function getOptionsOptionDisplayName(option: INodePropertyOptions): string {
	return props.isForCredential
		? i18n.credText().optionsOptionDisplayName(props.parameter, option)
		: i18n.nodeText().optionsOptionDisplayName(props.parameter, option, props.path);
}

function getOptionsOptionDescription(option: INodePropertyOptions): string {
	return props.isForCredential
		? i18n.credText().optionsOptionDescription(props.parameter, option)
		: i18n.nodeText().optionsOptionDescription(props.parameter, option, props.path);
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
		const loadOptionsMethod = getArgument<string | undefined>('loadOptionsMethod');
		const loadOptions = getArgument<ILoadOptions | undefined>('loadOptions');

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
	} catch (error) {
		remoteParameterOptionsLoadingIssues.value = error.message;
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

async function closeTextEditDialog() {
	textEditDialogVisible.value = false;

	editDialogClosing.value = true;
	void nextTick().then(() => {
		inputField.value?.blur?.();
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

function getArgument<T = string | number | boolean | undefined>(argumentName: string): T {
	return props.parameter.typeOptions?.[argumentName];
}

function expressionUpdated(value: string) {
	const val: NodeParameterValueType = isResourceLocatorParameter.value
		? { __rl: true, value, mode: modelValueResourceLocator.value.mode }
		: value;
	valueChanged(val);
}

function openExpressionEditorModal() {
	if (!isModelValueExpression.value) return;

	expressionEditDialogVisible.value = true;
	trackExpressionEditOpen();
}

function onBlur() {
	emit('blur');
	isFocused.value = false;
}

function onResourceLocatorDrop(data: string) {
	emit('drop', data);
}

async function setFocus() {
	if (['json'].includes(props.parameter.type) && getArgument('alwaysOpenEditWindow')) {
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

	const inputRef = inputField.value;
	if (inputRef) {
		if ('focusOnInput' in inputRef) {
			inputRef.focusOnInput();
		} else if (inputRef.focus) {
			inputRef.focus();
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
function valueChangedDebounced(value: NodeParameterValueType | {} | Date) {
	void callDebounced(valueChanged, { debounceTime: 100 }, value);
}
function onUpdateTextInput(value: string) {
	valueChanged(value);
	onTextInputChange(value);
}

function valueChanged(value: NodeParameterValueType | {} | Date) {
	if (remoteParameterOptionsLoading.value) {
		return;
	}

	if (props.parameter.name === 'nodeCredentialType') {
		activeCredentialType.value = value as string;
	}

	if (value instanceof Date) {
		value = value.toISOString();
	}

	if (
		props.parameter.type === 'color' &&
		getArgument('showAlpha') === true &&
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

	const parameterData = {
		node: node.value ? node.value.name : nodeName.value,
		name: props.path,
		value,
	};

	emit('update', parameterData);

	if (props.parameter.name === 'operation' || props.parameter.name === 'mode') {
		telemetry.track('User set node operation or mode', {
			workflow_id: workflowsStore.workflowId,
			node_type: node.value?.type,
			resource: node.value && node.value.parameters.resource,
			is_custom: value === CUSTOM_API_CALL_KEY,
			push_ref: ndvStore.pushRef,
			parameter: props.parameter.name,
		});
	}
}

async function optionSelected(command: string) {
	const prevValue = props.modelValue;

	if (command === 'resetValue') {
		valueChanged(props.parameter.default);
	} else if (command === 'addExpression') {
		if (isResourceLocatorParameter.value) {
			if (isResourceLocatorValue(props.modelValue)) {
				valueChanged({
					__rl: true,
					value: `=${props.modelValue.value}`,
					mode: props.modelValue.mode,
				});
			} else {
				valueChanged({ __rl: true, value: `=${props.modelValue}`, mode: '' });
			}
		} else if (
			props.parameter.type === 'number' &&
			(!props.modelValue || props.modelValue === '[Object: null]')
		) {
			valueChanged('={{ 0 }}');
		} else if (
			props.parameter.type === 'number' ||
			props.parameter.type === 'boolean' ||
			typeof props.modelValue !== 'string'
		) {
			valueChanged(`={{ ${props.modelValue} }}`);
		} else {
			valueChanged(`=${props.modelValue}`);
		}

		await setFocus();
	} else if (command === 'removeExpression') {
		let value: NodeParameterValueType = props.expressionEvaluated;

		isFocused.value = false;

		if (props.parameter.type === 'multiOptions' && typeof value === 'string') {
			value = (value || '')
				.split(',')
				.filter((valueItem) =>
					(parameterOptions.value ?? []).find((option) => option.value === valueItem),
				);
		}

		if (isResourceLocatorParameter.value && isResourceLocatorValue(props.modelValue)) {
			valueChanged({ __rl: true, value, mode: props.modelValue.mode });
		} else {
			let newValue = typeof value !== 'undefined' ? value : null;

			if (props.parameter.type === 'string') {
				// Strip the '=' from the beginning
				newValue = modelValueString.value ? modelValueString.value.toString().substring(1) : null;
			}
			valueChanged(newValue);
		}
	} else if (command === 'refreshOptions') {
		if (isResourceLocatorParameter.value) {
			props.eventBus.emit('refreshList');
		}
		void loadRemoteParameterOptions();
	} else if (command === 'formatHtml') {
		htmlEditorEventBus.emit('format-html');
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

	tempValue.value = displayValue.value as string;

	if (node.value) {
		nodeName.value = node.value.name;
	}

	if (node.value && node.value.parameters.authentication === 'predefinedCredentialType') {
		activeCredentialType.value = node.value.parameters.nodeCredentialType as string;
	}

	if (
		props.parameter.type === 'color' &&
		getArgument('showAlpha') === true &&
		displayValue.value !== null &&
		displayValue.value.toString().charAt(0) !== '#'
	) {
		const newValue = rgbaToHex(displayValue.value as string);
		if (newValue !== null) {
			tempValue.value = newValue;
		}
	}

	void externalHooks.run('parameterInput.mount', {
		parameter: props.parameter,
		inputFieldRef: inputField.value as InstanceType<typeof N8nInput>,
	});
});

onBeforeUnmount(() => {
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
	async () => {
		if (props.parameter.type === 'color' && getArgument('showAlpha') === true) {
			// Do not set for color with alpha else wrong value gets displayed in field
			return;
		}
		tempValue.value = displayValue.value as string;
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
</script>

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

.parameter-input {
	display: inline-block;

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
		font-weight: var(--font-weight-bold);
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
	right: 0;
	bottom: 0;
	background-color: var(--color-code-background);
	padding: 3px;
	line-height: 9px;
	border: var(--border-base);
	border-top-left-radius: var(--border-radius-base);
	border-bottom-right-radius: var(--border-radius-base);
	cursor: pointer;

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
	height: 70vh;

	.code-node-editor {
		height: 100%;
	}
}
</style>
