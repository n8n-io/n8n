<template>
	<div :class="parameterInputClasses" @keydown.stop>
		<ExpressionEdit
			:dialog-visible="expressionEditDialogVisible"
			:model-value="
				isResourceLocatorParameter && typeof modelValue !== 'string'
					? modelValue
						? modelValue.value
						: ''
					: modelValue
			"
			:parameter="parameter"
			:path="path"
			:event-source="eventSource || 'ndv'"
			:is-read-only="isReadOnly"
			:redact-values="shouldRedactValue"
			@closeDialog="closeExpressionEditDialog"
			@update:model-value="expressionUpdated"
		></ExpressionEdit>
		<div class="parameter-input ignore-key-press" :style="parameterInputWrapperStyle">
			<ResourceLocator
				v-if="isResourceLocatorParameter"
				ref="resourceLocator"
				:parameter="parameter"
				:model-value="modelValue"
				:dependent-parameters-values="dependentParametersValues"
				:display-title="displayTitle"
				:expression-display-value="expressionDisplayValue"
				:expression-computed-value="expressionEvaluated"
				:is-value-expression="isValueExpression"
				:is-read-only="isReadOnly"
				:parameter-issues="getIssues"
				:droppable="droppable"
				:node="node"
				:path="path"
				:event-bus="eventBus"
				@update:model-value="valueChanged"
				@modalOpenerClick="openExpressionEditorModal"
				@focus="setFocus"
				@blur="onBlur"
				@drop="onResourceLocatorDrop"
			/>
			<ExpressionParameterInput
				v-else-if="isValueExpression || forceShowExpression"
				ref="inputField"
				:model-value="expressionDisplayValue"
				:title="displayTitle"
				:is-read-only="isReadOnly"
				:rows="rows"
				:is-assignment="isAssignment"
				:path="path"
				:additional-expression-data="additionalExpressionData"
				:class="{ 'ph-no-capture': shouldRedactValue }"
				@update:model-value="expressionUpdated"
				@modalOpenerClick="openExpressionEditorModal"
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
					<div :key="codeEditDialogVisible" class="ignore-key-press code-edit-dialog">
						<CodeNodeEditor
							v-if="editorType === 'codeNodeEditor'"
							:model-value="modelValue"
							:default-value="parameter.default"
							:language="editorLanguage"
							:is-read-only="isReadOnly"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
						<HtmlEditor
							v-else-if="editorType === 'htmlEditor'"
							:model-value="modelValue"
							:is-read-only="isReadOnly"
							:rows="getArgument('rows')"
							:disable-expression-coloring="!isHtmlNode(node)"
							:disable-expression-completions="!isHtmlNode(node)"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
						<SqlEditor
							v-else-if="editorType === 'sqlEditor'"
							:model-value="modelValue"
							:dialect="getArgument('sqlDialect')"
							:is-read-only="isReadOnly"
							:rows="getArgument('rows')"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>
						<JsEditor
							v-else-if="editorType === 'jsEditor'"
							:model-value="modelValue"
							:is-read-only="isReadOnly"
							:rows="getArgument('rows')"
							fill-parent
							@update:model-value="valueChangedDebounced"
						/>

						<JsonEditor
							v-else-if="parameter.type === 'json'"
							:model-value="modelValue"
							:is-read-only="isReadOnly"
							:rows="getArgument('rows')"
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
					@closeDialog="closeTextEditDialog"
					@update:model-value="expressionUpdated"
				></TextEdit>

				<CodeNodeEditor
					v-if="editorType === 'codeNodeEditor' && isCodeNode(node)"
					:key="codeEditDialogVisible"
					:mode="node.parameters.mode"
					:model-value="modelValue"
					:default-value="parameter.default"
					:language="editorLanguage"
					:is-read-only="isReadOnly"
					:rows="getArgument('rows')"
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
					:key="codeEditDialogVisible"
					:model-value="modelValue"
					:is-read-only="isReadOnly"
					:rows="getArgument('rows')"
					:disable-expression-coloring="!isHtmlNode(node)"
					:disable-expression-completions="!isHtmlNode(node)"
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
					:key="codeEditDialogVisible"
					:model-value="modelValue"
					:dialect="getArgument('sqlDialect')"
					:is-read-only="isReadOnly"
					:rows="getArgument('rows')"
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
					:key="codeEditDialogVisible"
					:model-value="modelValue"
					:is-read-only="isReadOnly"
					:rows="getArgument('rows')"
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
					:key="codeEditDialogVisible"
					:model-value="modelValue"
					:is-read-only="isReadOnly"
					:rows="getArgument('rows')"
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
						:model-value="modelValue"
						:language="editorLanguage"
						:is-read-only="true"
						:rows="getArgument('rows')"
					/>
				</div>

				<n8n-input
					v-else
					ref="inputField"
					v-model="tempValue"
					:class="{ 'input-with-opener': true, 'ph-no-capture': shouldRedactValue }"
					:size="inputSize"
					:type="getStringInputType"
					:rows="getArgument('rows')"
					:disabled="isReadOnly"
					:title="displayTitle"
					:placeholder="getPlaceholder()"
					@update:model-value="valueChanged($event) && onUpdateTextInput($event)"
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
								invalid: !isFocused && getIssues.length > 0 && !isValueExpression,
							}"
							:title="i18n.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
							@focus="setFocus"
						/>
					</template>
				</n8n-input>
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
				<n8n-input
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
				:model-value="displayValue"
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

			<n8n-input-number
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
				@credentialSelected="credentialSelected"
				@update:model-value="valueChanged"
				@setFocus="setFocus"
				@onBlur="onBlur"
			>
				<template #issues-and-options>
					<ParameterIssues :issues="getIssues" />
				</template>
			</CredentialsSelect>

			<n8n-select
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
			</n8n-select>

			<n8n-select
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
			</n8n-select>

			<!-- temporary state of booleans while data is mapped -->
			<n8n-input
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

<script lang="ts">
/* eslint-disable prefer-spread */
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import { get } from 'lodash-es';

import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type {
	ILoadOptions,
	INodeParameters,
	INodePropertyOptions,
	Workflow,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
	IParameterLabel,
	EditorType,
	CodeNodeEditorLanguage,
	IDataObject,
} from 'n8n-workflow';
import { NodeHelpers, CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';

import CredentialsSelect from '@/components/CredentialsSelect.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ResourceLocator from '@/components/ResourceLocator/ResourceLocator.vue';
import ExpressionParameterInput from '@/components/ExpressionParameterInput.vue';
import TextEdit from '@/components/TextEdit.vue';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import JsEditor from '@/components/JsEditor/JsEditor.vue';
import JsonEditor from '@/components/JsonEditor/JsonEditor.vue';
import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';

import { hasExpressionMapping, isValueExpression } from '@/utils/nodeTypesUtils';
import { isResourceLocatorValue } from '@/utils/typeGuards';

import { CUSTOM_API_CALL_KEY, HTML_NODE_TYPE, NODES_USING_CODE_NODE_EDITOR } from '@/constants';

import type { PropType } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useSettingsStore } from '@/stores/settings.store';
import { htmlEditorEventBus } from '@/event-bus';
import type { EventBus } from 'n8n-design-system/utils';
import { createEventBus } from 'n8n-design-system/utils';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useI18n } from '@/composables/useI18n';
import type { N8nInput } from 'n8n-design-system';
import { isCredentialOnlyNodeType } from '@/utils/credentialOnlyNodes';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useDebounce } from '@/composables/useDebounce';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';

type Picker = { $emit: (arg0: string, arg1: Date) => void };

export default defineComponent({
	name: 'ParameterInput',
	components: {
		CodeNodeEditor,
		HtmlEditor,
		JsEditor,
		JsonEditor,
		SqlEditor,
		ExpressionEdit,
		ExpressionParameterInput,
		CredentialsSelect,
		ParameterIssues,
		ResourceLocator,
		TextEdit,
	},
	props: {
		additionalExpressionData: {
			type: Object as PropType<IDataObject>,
			default: () => ({}),
		},
		isReadOnly: {
			type: Boolean,
		},
		rows: {
			type: Number,
			default: 5,
		},
		isAssignment: {
			type: Boolean,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
		},
		path: {
			type: String,
		},
		modelValue: {
			type: [String, Number, Boolean, Array, Object] as PropType<NodeParameterValueType>,
		},
		hideLabel: {
			type: Boolean,
		},
		droppable: {
			type: Boolean,
		},
		activeDrop: {
			type: Boolean,
		},
		forceShowExpression: {
			type: Boolean,
		},
		hint: {
			type: String as PropType<string | undefined>,
		},
		inputSize: {
			type: String,
		},
		hideIssues: {
			type: Boolean,
		},
		documentationUrl: {
			type: String as PropType<string | undefined>,
		},
		errorHighlight: {
			type: Boolean,
		},
		isForCredential: {
			type: Boolean,
		},
		eventSource: {
			type: String,
		},
		expressionEvaluated: {
			type: String as PropType<string | undefined>,
		},
		label: {
			type: Object as PropType<IParameterLabel>,
			default: () => ({
				size: 'small',
			}),
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: () => createEventBus(),
		},
	},
	setup() {
		const externalHooks = useExternalHooks();
		const i18n = useI18n();
		const nodeHelpers = useNodeHelpers();
		const { callDebounced } = useDebounce();
		const router = useRouter();
		const workflowHelpers = useWorkflowHelpers({ router });

		return {
			externalHooks,
			i18n,
			nodeHelpers,
			workflowHelpers,
			callDebounced,
		};
	},
	data() {
		return {
			codeEditDialogVisible: false,
			nodeName: '',
			expressionAddOperation: 'set' as 'add' | 'set',
			expressionEditDialogVisible: false,
			remoteParameterOptions: [] as INodePropertyOptions[],
			remoteParameterOptionsLoading: false,
			remoteParameterOptionsLoadingIssues: null as string | null,
			textEditDialogVisible: false,
			editDialogClosing: false,
			tempValue: '', //  el-date-picker and el-input does not seem to work without v-model so add one
			CUSTOM_API_CALL_KEY,
			activeCredentialType: '',
			dateTimePickerOptions: {
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
			},
			isFocused: false,
		};
	},
	watch: {
		async dependentParametersValues() {
			// Reload the remote parameters whenever a parameter
			// on which the current field depends on changes
			await this.loadRemoteParameterOptions();
		},
		modelValue() {
			if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true) {
				// Do not set for color with alpha else wrong value gets displayed in field
				return;
			}
			this.tempValue = this.displayValue as string;
		},
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useNodeTypesStore,
			useNDVStore,
			useWorkflowsStore,
			useSettingsStore,
		),
		expressionDisplayValue(): string {
			if (this.forceShowExpression) {
				return '';
			}

			const value = isResourceLocatorValue(this.modelValue)
				? this.modelValue.value
				: this.modelValue;
			if (typeof value === 'string' && value.startsWith('=')) {
				return value.slice(1);
			}

			return `${this.displayValue ?? ''}`;
		},
		isValueExpression(): boolean {
			return isValueExpression(this.parameter, this.modelValue);
		},
		codeAutocomplete(): string | undefined {
			return this.getArgument('codeAutocomplete') as string | undefined;
		},
		dependentParametersValues(): string | null {
			const loadOptionsDependsOn = this.getArgument('loadOptionsDependsOn') as string[] | undefined;

			if (loadOptionsDependsOn === undefined) {
				return null;
			}

			// Get the resolved parameter values of the current node
			const currentNodeParameters = this.ndvStore.activeNode?.parameters;
			try {
				const resolvedNodeParameters = this.workflowHelpers.resolveParameter(currentNodeParameters);

				const returnValues: string[] = [];
				for (const parameterPath of loadOptionsDependsOn) {
					returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
				}

				return returnValues.join('|');
			} catch (error) {
				return null;
			}
		},
		node(): INodeUi {
			return this.ndvStore.activeNode!;
		},
		displayTitle(): string {
			const interpolation = { interpolate: { shortPath: this.shortPath } };

			if (this.getIssues.length && this.isValueExpression) {
				return this.i18n.baseText('parameterInput.parameterHasIssuesAndExpression', interpolation);
			} else if (this.getIssues.length && !this.isValueExpression) {
				return this.i18n.baseText('parameterInput.parameterHasIssues', interpolation);
			} else if (!this.getIssues.length && this.isValueExpression) {
				return this.i18n.baseText('parameterInput.parameterHasExpression', interpolation);
			}

			return this.i18n.baseText('parameterInput.parameter', interpolation);
		},
		displayValue(): string | number | boolean | null {
			if (this.remoteParameterOptionsLoading) {
				// If it is loading options from server display
				// to user that the data is loading. If not it would
				// display the user the key instead of the value it
				// represents
				return this.i18n.baseText('parameterInput.loadingOptions');
			}

			// if the value is marked as empty return empty string, to prevent displaying the asterisks
			if (this.modelValue === CREDENTIAL_EMPTY_VALUE) {
				return '';
			}

			let returnValue;
			if (!this.isValueExpression) {
				returnValue = this.isResourceLocatorParameter
					? isResourceLocatorValue(this.modelValue)
						? this.modelValue.value
						: ''
					: this.modelValue;
			} else {
				returnValue = this.expressionEvaluated;
			}

			if (this.parameter.type === 'credentialsSelect' && typeof this.modelValue === 'string') {
				const credType = this.credentialsStore.getCredentialTypeByName(this.modelValue);
				if (credType) {
					returnValue = credType.displayName;
				}
			}

			if (
				Array.isArray(returnValue) &&
				this.parameter.type === 'color' &&
				this.getArgument('showAlpha') === true &&
				returnValue.charAt(0) === '#'
			) {
				// Convert the value to rgba that el-color-picker can display it correctly
				const bigint = parseInt(returnValue.slice(1), 16);
				const h = [];
				h.push((bigint >> 24) & 255);
				h.push((bigint >> 16) & 255);
				h.push((bigint >> 8) & 255);
				h.push(((255 - bigint) & 255) / 255);

				returnValue = 'rgba(' + h.join() + ')';
			}

			if (returnValue !== undefined && returnValue !== null && this.parameter.type === 'string') {
				const rows = this.getArgument('rows');
				if (rows === undefined || rows === 1) {
					returnValue = returnValue.toString().replace(/\n/, '|');
				}
			}

			return returnValue;
		},
		getStringInputType() {
			if (this.getArgument('password') === true) {
				return 'password';
			}

			const rows = this.getArgument('rows');
			if (rows !== undefined && rows > 1) {
				return 'textarea';
			}

			if (this.editorType === 'code') {
				return 'textarea';
			}

			return 'text';
		},
		getIssues(): string[] {
			if (this.hideIssues || this.node === null) {
				return [];
			}

			const newPath = this.shortPath.split('.');
			newPath.pop();

			const issues = NodeHelpers.getParameterIssues(
				this.parameter,
				this.node.parameters,
				newPath.join('.'),
				this.node,
			);

			if (this.parameter.type === 'credentialsSelect' && this.displayValue === '') {
				issues.parameters = issues.parameters || {};

				const issue = this.i18n.baseText('parameterInput.selectACredentialTypeFromTheDropdown');

				issues.parameters[this.parameter.name] = [issue];
			} else if (
				['options', 'multiOptions'].includes(this.parameter.type) &&
				!this.remoteParameterOptionsLoading &&
				this.remoteParameterOptionsLoadingIssues === null &&
				this.parameterOptions
			) {
				// Check if the value resolves to a valid option
				// Currently it only displays an error in the node itself in
				// case the value is not valid. The workflow can still be executed
				// and the error is not displayed on the node in the workflow
				const validOptions = this.parameterOptions.map(
					(options) => (options as INodePropertyOptions).value,
				);

				const checkValues: string[] = [];

				if (!this.skipCheck(this.displayValue)) {
					if (Array.isArray(this.displayValue)) {
						checkValues.push.apply(checkValues, this.displayValue);
					} else {
						checkValues.push(this.displayValue as string);
					}
				}

				for (const checkValue of checkValues) {
					if (checkValue === null || !validOptions.includes(checkValue)) {
						if (issues.parameters === undefined) {
							issues.parameters = {};
						}

						const issue = this.i18n.baseText('parameterInput.theValueIsNotSupported', {
							interpolate: { checkValue },
						});

						issues.parameters[this.parameter.name] = [issue];
					}
				}
			} else if (this.remoteParameterOptionsLoadingIssues !== null && !this.isValueExpression) {
				if (issues.parameters === undefined) {
					issues.parameters = {};
				}
				issues.parameters[this.parameter.name] = [
					`There was a problem loading the parameter options from server: "${this.remoteParameterOptionsLoadingIssues}"`,
				];
			}

			if (issues?.parameters?.[this.parameter.name] !== undefined) {
				return issues.parameters[this.parameter.name];
			}

			return [];
		},
		editorType(): EditorType {
			return this.getArgument('editor') as EditorType;
		},
		editorLanguage(): CodeNodeEditorLanguage {
			if (this.editorType === 'json' || this.parameter.type === 'json') return 'json';
			return (this.getArgument('editorLanguage') as CodeNodeEditorLanguage) ?? 'javaScript';
		},
		parameterOptions():
			| Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>
			| undefined {
			if (!this.hasRemoteMethod) {
				// Options are already given
				return this.parameter.options;
			}

			// Options get loaded from server
			return this.remoteParameterOptions;
		},
		parameterInputClasses() {
			const classes: { [c: string]: boolean } = {
				droppable: this.droppable,
				activeDrop: this.activeDrop,
			};

			const rows = this.getArgument('rows');
			const isTextarea = this.parameter.type === 'string' && rows !== undefined;
			const isSwitch = this.parameter.type === 'boolean' && !this.isValueExpression;

			if (!isTextarea && !isSwitch) {
				classes['parameter-value-container'] = true;
			}

			if (
				!this.droppable &&
				!this.activeDrop &&
				(this.getIssues.length > 0 || this.errorHighlight) &&
				!this.isValueExpression
			) {
				classes['has-issues'] = true;
			}

			return classes;
		},
		parameterInputWrapperStyle() {
			let deductWidth = 0;
			const styles = {
				width: '100%',
			};
			if (this.parameter.type === 'credentialsSelect' || this.isResourceLocatorParameter) {
				return styles;
			}
			if (this.getIssues.length) {
				deductWidth += 20;
			}

			if (deductWidth !== 0) {
				styles.width = `calc(100% - ${deductWidth}px)`;
			}

			return styles;
		},
		hasRemoteMethod(): boolean {
			return !!this.getArgument('loadOptionsMethod') || !!this.getArgument('loadOptions');
		},
		shortPath(): string {
			const shortPath = this.path.split('.');
			shortPath.shift();
			return shortPath.join('.');
		},
		workflow(): Workflow {
			return this.workflowHelpers.getCurrentWorkflow();
		},
		isResourceLocatorParameter(): boolean {
			return this.parameter.type === 'resourceLocator';
		},
		isSecretParameter(): boolean {
			return this.getArgument('password') === true;
		},
		remoteParameterOptionsKeys(): string[] {
			return (this.remoteParameterOptions || []).map((o) => o.name);
		},
		shouldRedactValue(): boolean {
			return this.getStringInputType === 'password' || this.isForCredential;
		},
	},
	async updated() {
		await this.$nextTick();
		const remoteParameterOptions = this.$el.querySelectorAll('.remote-parameter-option');

		if (remoteParameterOptions.length > 0) {
			void this.externalHooks.run('parameterInput.updated', { remoteParameterOptions });
		}
	},
	mounted() {
		this.eventBus.on('optionSelected', this.optionSelected);

		this.tempValue = this.displayValue as string;
		if (this.node !== null) {
			this.nodeName = this.node.name;
		}

		if (this.node && this.node.parameters.authentication === 'predefinedCredentialType') {
			this.activeCredentialType = this.node.parameters.nodeCredentialType as string;
		}

		if (
			this.parameter.type === 'color' &&
			this.getArgument('showAlpha') === true &&
			this.displayValue !== null &&
			this.displayValue.toString().charAt(0) !== '#'
		) {
			const newValue = this.rgbaToHex(this.displayValue as string);
			if (newValue !== null) {
				this.tempValue = newValue;
			}
		}

		if (this.hasRemoteMethod && this.node !== null) {
			// Make sure to load the parameter options
			// directly and whenever the credentials change
			this.$watch(
				() => this.node?.credentials,
				() => {
					void this.loadRemoteParameterOptions();
				},
				{ immediate: true },
			);
		}

		void this.externalHooks.run('parameterInput.mount', {
			parameter: this.parameter,
			inputFieldRef: this.$refs.inputField as InstanceType<typeof N8nInput>,
		});
	},
	beforeUnmount() {
		this.eventBus.off('optionSelected', this.optionSelected);
	},
	methods: {
		isRemoteParameterOption(option: INodePropertyOptions) {
			return this.remoteParameterOptionsKeys.includes(option.name);
		},
		credentialSelected(updateInformation: INodeUpdatePropertiesInformation) {
			// Update the values on the node
			this.workflowsStore.updateNodeProperties(updateInformation);

			const node = this.workflowsStore.getNodeByName(updateInformation.name);

			if (node) {
				// Update the issues
				this.nodeHelpers.updateNodeCredentialIssues(node);
			}

			void this.externalHooks.run('nodeSettings.credentialSelected', { updateInformation });
		},
		/**
		 * Check whether a param value must be skipped when collecting node param issues for validation.
		 */
		skipCheck(value: string | number | boolean | null) {
			return typeof value === 'string' && value.includes(CUSTOM_API_CALL_KEY);
		},
		getPlaceholder(): string {
			return this.isForCredential
				? this.i18n.credText().placeholder(this.parameter)
				: this.i18n.nodeText().placeholder(this.parameter, this.path);
		},
		getOptionsOptionDisplayName(option: INodePropertyOptions): string {
			return this.isForCredential
				? this.i18n.credText().optionsOptionDisplayName(this.parameter, option)
				: this.i18n.nodeText().optionsOptionDisplayName(this.parameter, option, this.path);
		},
		getOptionsOptionDescription(option: INodePropertyOptions): string {
			return this.isForCredential
				? this.i18n.credText().optionsOptionDescription(this.parameter, option)
				: this.i18n.nodeText().optionsOptionDescription(this.parameter, option, this.path);
		},

		async loadRemoteParameterOptions() {
			if (
				this.node === null ||
				!this.hasRemoteMethod ||
				this.remoteParameterOptionsLoading ||
				!this.parameter
			) {
				return;
			}
			this.remoteParameterOptionsLoadingIssues = null;
			this.remoteParameterOptionsLoading = true;
			this.remoteParameterOptions.length = 0;

			// Get the resolved parameter values of the current node

			try {
				const currentNodeParameters = (this.ndvStore.activeNode as INodeUi).parameters;
				const resolvedNodeParameters = this.workflowHelpers.resolveRequiredParameters(
					this.parameter,
					currentNodeParameters,
				) as INodeParameters;
				const loadOptionsMethod = this.getArgument('loadOptionsMethod') as string | undefined;
				const loadOptions = this.getArgument('loadOptions') as ILoadOptions | undefined;

				const options = await this.nodeTypesStore.getNodeParameterOptions({
					nodeTypeAndVersion: {
						name: this.node.type,
						version: this.node.typeVersion,
					},
					path: this.path,
					methodName: loadOptionsMethod,
					loadOptions,
					currentNodeParameters: resolvedNodeParameters,
					credentials: this.node.credentials,
				});

				this.remoteParameterOptions.push.apply(this.remoteParameterOptions, options);
			} catch (error) {
				this.remoteParameterOptionsLoadingIssues = error.message;
			}

			this.remoteParameterOptionsLoading = false;
		},
		closeCodeEditDialog() {
			this.codeEditDialogVisible = false;

			this.editDialogClosing = true;
			void this.$nextTick(() => {
				this.editDialogClosing = false;
			});
		},
		closeExpressionEditDialog() {
			this.expressionEditDialogVisible = false;
		},
		trackExpressionEditOpen() {
			if (!this.node) {
				return;
			}

			if (this.node.type.startsWith('n8n-nodes-base') || isCredentialOnlyNodeType(this.node.type)) {
				this.$telemetry.track('User opened Expression Editor', {
					node_type: this.node.type,
					parameter_name: this.parameter.displayName,
					parameter_field_type: this.parameter.type,
					new_expression: !this.isValueExpression,
					workflow_id: this.workflowsStore.workflowId,
					session_id: this.ndvStore.sessionId,
					source: this.eventSource || 'ndv',
				});
			}
		},
		closeTextEditDialog() {
			this.textEditDialogVisible = false;

			this.editDialogClosing = true;
			void this.$nextTick(() => {
				this.$refs.inputField?.blur?.();
				this.editDialogClosing = false;
			});
		},
		displayEditDialog() {
			if (this.editDialogClosing) {
				return;
			}

			if (this.editorType || this.parameter.type === 'json') {
				this.codeEditDialogVisible = true;
			} else {
				this.textEditDialogVisible = true;
			}
		},
		getArgument(argumentName: string): string | number | boolean | undefined {
			return this.parameter.typeOptions?.[argumentName];
		},
		expressionUpdated(value: string) {
			const val: NodeParameterValueType = this.isResourceLocatorParameter
				? { __rl: true, value, mode: this.modelValue.mode }
				: value;
			this.valueChanged(val);
		},
		openExpressionEditorModal() {
			if (!this.isValueExpression) return;

			this.expressionEditDialogVisible = true;
			this.trackExpressionEditOpen();
		},
		onBlur() {
			this.$emit('blur');
			this.isFocused = false;
		},
		onResourceLocatorDrop(data: string) {
			this.$emit('drop', data);
		},
		async setFocus(event: MouseEvent) {
			if (['json'].includes(this.parameter.type) && this.getArgument('alwaysOpenEditWindow')) {
				this.displayEditDialog();
				return;
			}

			if (this.node !== null) {
				// When an event like mouse-click removes the active node while
				// editing is active it does not know where to save the value to.
				// For that reason do we save the node-name here. We could probably
				// also just do that once on load but if Vue decides for some reason to
				// reuse the input it could have the wrong value so lets set it everytime
				// just to be sure
				this.nodeName = this.node.name;
			}

			await this.$nextTick();

			// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
			const inputRef = this.$refs.inputField as InstanceType<N8nInput> | undefined;
			if (inputRef?.$el) {
				if (inputRef.focusOnInput) {
					inputRef.focusOnInput();
				} else if (inputRef.focus) {
					inputRef.focus();
				}

				this.isFocused = true;
			}

			this.$emit('focus');
		},
		isCodeNode(node: INodeUi): boolean {
			return NODES_USING_CODE_NODE_EDITOR.includes(node.type);
		},
		isHtmlNode(node: INodeUi): boolean {
			return node.type === HTML_NODE_TYPE;
		},
		rgbaToHex(value: string): string | null {
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
		},
		onTextInputChange(value: string) {
			const parameterData = {
				node: this.node !== null ? this.node.name : this.nodeName,
				name: this.path,
				value,
			};

			this.$emit('textInput', parameterData);
		},
		valueChangedDebounced(value: NodeParameterValueType | {} | Date) {
			void this.callDebounced(this.valueChanged, { debounceTime: 100 }, value);
		},
		onUpdateTextInput(value: string) {
			this.valueChanged(value);
			this.onTextInputChange(value);
		},
		valueChanged(value: NodeParameterValueType | {} | Date) {
			if (this.parameter.name === 'nodeCredentialType') {
				this.activeCredentialType = value as string;
			}

			if (value instanceof Date) {
				value = value.toISOString();
			}

			if (
				this.parameter.type === 'color' &&
				this.getArgument('showAlpha') === true &&
				value !== null &&
				value !== undefined &&
				value.toString().charAt(0) !== '#'
			) {
				const newValue = this.rgbaToHex(value as string);
				if (newValue !== null) {
					this.tempValue = newValue;
					value = newValue;
				}
			}

			const parameterData = {
				node: this.node !== null ? this.node.name : this.nodeName,
				name: this.path,
				value,
			};

			this.$emit('update', parameterData);

			if (this.parameter.name === 'operation' || this.parameter.name === 'mode') {
				this.$telemetry.track('User set node operation or mode', {
					workflow_id: this.workflowsStore.workflowId,
					node_type: this.node && this.node.type,
					resource: this.node && this.node.parameters.resource,
					is_custom: value === CUSTOM_API_CALL_KEY,
					session_id: this.ndvStore.sessionId,
					parameter: this.parameter.name,
				});
			}
		},
		async optionSelected(command: string) {
			const prevValue = this.modelValue;

			if (command === 'resetValue') {
				this.valueChanged(this.parameter.default);
			} else if (command === 'addExpression') {
				if (this.isResourceLocatorParameter) {
					if (isResourceLocatorValue(this.modelValue)) {
						this.valueChanged({
							__rl: true,
							value: `=${this.modelValue.value}`,
							mode: this.modelValue.mode,
						});
					} else {
						this.valueChanged({ __rl: true, value: `=${this.modelValue}`, mode: '' });
					}
				} else if (
					this.parameter.type === 'number' &&
					(!this.modelValue || this.modelValue === '[Object: null]')
				) {
					this.valueChanged('={{ 0 }}');
				} else if (
					this.parameter.type === 'number' ||
					this.parameter.type === 'boolean' ||
					typeof this.modelValue !== 'string'
				) {
					this.valueChanged(`={{ ${this.modelValue} }}`);
				} else {
					this.valueChanged(`=${this.modelValue}`);
				}

				await this.setFocus();
			} else if (command === 'removeExpression') {
				let value: NodeParameterValueType = this.expressionEvaluated;

				this.isFocused = false;

				if (this.parameter.type === 'multiOptions' && typeof value === 'string') {
					value = (value || '')
						.split(',')
						.filter((value) =>
							(this.parameterOptions || []).find(
								(option) => (option as INodePropertyOptions).value === value,
							),
						);
				}

				if (this.isResourceLocatorParameter && isResourceLocatorValue(this.modelValue)) {
					this.valueChanged({ __rl: true, value, mode: this.modelValue.mode });
				} else {
					let newValue = typeof value !== 'undefined' ? value : null;

					if (this.parameter.type === 'string') {
						// Strip the '=' from the beginning
						newValue = this.modelValue ? this.modelValue.toString().substring(1) : null;
					}
					this.valueChanged(newValue);
				}
			} else if (command === 'refreshOptions') {
				if (this.isResourceLocatorParameter) {
					this.eventBus.emit('refreshList');
				}
				void this.loadRemoteParameterOptions();
			} else if (command === 'formatHtml') {
				htmlEditorEventBus.emit('format-html');
			}

			if (this.node && (command === 'addExpression' || command === 'removeExpression')) {
				const telemetryPayload = {
					node_type: this.node.type,
					parameter: this.path,
					old_mode: command === 'addExpression' ? 'fixed' : 'expression',
					new_mode: command === 'removeExpression' ? 'fixed' : 'expression',
					was_parameter_empty: prevValue === '' || prevValue === undefined,
					had_mapping: hasExpressionMapping(prevValue),
					had_parameter: typeof prevValue === 'string' && prevValue.includes('$parameter'),
				};
				this.$telemetry.track('User switched parameter mode', telemetryPayload);
				void this.externalHooks.run('parameterInput.modeSwitch', telemetryPayload);
			}
		},
	},
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
