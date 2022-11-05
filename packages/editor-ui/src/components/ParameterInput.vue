<template>
	<div @keydown.stop :class="parameterInputClasses">
		<expression-edit
			:dialogVisible="expressionEditDialogVisible"
			:value="isResourceLocatorParameter && typeof value !== 'string' ? (value ? value.value : '') : value"
			:parameter="parameter"
			:path="path"
			:eventSource="eventSource || 'ndv'"
			@closeDialog="closeExpressionEditDialog"
			@valueChanged="expressionUpdated"
		></expression-edit>
		<div
			class="parameter-input ignore-key-press"
			:style="parameterInputWrapperStyle"
			@click="openExpressionEdit"
		>
			<resource-locator
				v-if="isResourceLocatorParameter"
				ref="resourceLocator"
				:parameter="parameter"
				:value="value"
				:displayTitle="displayTitle"
				:expressionDisplayValue="expressionDisplayValue"
				:expressionComputedValue="expressionEvaluated"
				:isValueExpression="isValueExpression"
				:isReadOnly="isReadOnly"
				:parameterIssues="getIssues"
				:droppable="droppable"
				:node="node"
				:path="path"
				@input="valueChanged"
				@focus="setFocus"
				@blur="onBlur"
				@drop="onResourceLocatorDrop"
			/>
			<n8n-input
				v-else-if="isValueExpression || droppable || forceShowExpression"
				:size="inputSize"
				:type="getStringInputType"
				:rows="getArgument('rows')"
				:value="expressionDisplayValue"
				:title="displayTitle"
				:readOnly="isReadOnly"
				@keydown.stop
			/>
			<div
				v-else-if="
					['json', 'string'].includes(parameter.type) ||
					remoteParameterOptionsLoadingIssues !== null
				"
			>
				<code-edit
					v-if="codeEditDialogVisible"
					:value="value"
					:parameter="parameter"
					:type="editorType"
					:codeAutocomplete="codeAutocomplete"
					:path="path"
					:readonly="isReadOnly"
					@closeDialog="closeCodeEditDialog"
					@valueChanged="expressionUpdated"
				></code-edit>
				<text-edit
					:dialogVisible="textEditDialogVisible"
					:value="value"
					:parameter="parameter"
					:path="path"
					:isReadOnly="isReadOnly"
					@closeDialog="closeTextEditDialog"
					@valueChanged="expressionUpdated"
				></text-edit>

				<code-node-editor
					v-if="getArgument('editor') === 'codeNodeEditor' && isCodeNode(node)"
					:mode="node.parameters.mode"
					:jsCode="node.parameters.jsCode"
					:isReadOnly="isReadOnly"
					@valueChanged="valueChangedDebounced"
				/>

				<div v-else-if="isEditor === true" class="code-edit clickable ph-no-capture" @click="displayEditDialog()">
					<prism-editor
						v-if="!codeEditDialogVisible"
						:lineNumbers="true"
						:readonly="true"
						:code="displayValue"
						language="js"
					></prism-editor>
				</div>

				<n8n-input
					v-else
					v-model="tempValue"
					ref="inputField"
					:size="inputSize"
					:type="getStringInputType"
					:rows="getArgument('rows')"
					:value="displayValue"
					:disabled="isReadOnly"
					@input="onTextInputChange"
					@change="valueChanged"
					@keydown.stop
					@focus="setFocus"
					@blur="onBlur"
					:title="displayTitle"
					:placeholder="getPlaceholder()"
				>
					<div slot="suffix" class="expand-input-icon-container">
						<font-awesome-icon
							v-if="!isReadOnly"
							icon="expand-alt"
							class="edit-window-button clickable"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="displayEditDialog()"
						/>
					</div>
				</n8n-input>
			</div>

			<div v-else-if="parameter.type === 'color'" ref="inputField" class="color-input">
				<el-color-picker
					size="small"
					class="color-picker"
					:value="displayValue"
					:disabled="isReadOnly"
					@focus="setFocus"
					@blur="onBlur"
					@change="valueChanged"
					:title="displayTitle"
					:show-alpha="getArgument('showAlpha')"
				/>
				<n8n-input
					v-model="tempValue"
					:size="inputSize"
					type="text"
					:value="tempValue"
					:disabled="isReadOnly"
					@change="valueChanged"
					@keydown.stop
					@focus="setFocus"
					@blur="onBlur"
					:title="displayTitle"
				/>
			</div>

			<el-date-picker
				v-else-if="parameter.type === 'dateTime'"
				v-model="tempValue"
				ref="inputField"
				type="datetime"
				:size="inputSize"
				:value="displayValue"
				:title="displayTitle"
				:disabled="isReadOnly"
				:placeholder="
					parameter.placeholder
						? getPlaceholder()
						: $locale.baseText('parameterInput.selectDateAndTime')
				"
				:picker-options="dateTimePickerOptions"
				@change="valueChanged"
				@focus="setFocus"
				@blur="onBlur"
				@keydown.stop
			/>

			<n8n-input-number
				v-else-if="parameter.type === 'number'"
				ref="inputField"
				:size="inputSize"
				:value="displayValue"
				:controls="false"
				:max="getArgument('maxValue')"
				:min="getArgument('minValue')"
				:precision="getArgument('numberPrecision')"
				:disabled="isReadOnly"
				@change="valueChanged"
				@input="onTextInputChange"
				@focus="setFocus"
				@blur="onBlur"
				@keydown.stop
				:title="displayTitle"
				:placeholder="parameter.placeholder"
			/>

			<credentials-select
				v-else-if="
					parameter.type === 'credentialsSelect' || parameter.name === 'genericAuthType'
				"
				ref="inputField"
				:parameter="parameter"
				:node="node"
				:activeCredentialType="activeCredentialType"
				:inputSize="inputSize"
				:displayValue="displayValue"
				:isReadOnly="isReadOnly"
				:displayTitle="displayTitle"
				@credentialSelected="credentialSelected"
				@valueChanged="valueChanged"
				@setFocus="setFocus"
				@onBlur="onBlur"
			>
				<template v-slot:issues-and-options>
					<parameter-issues :issues="getIssues" />
				</template>
			</credentials-select>

			<n8n-select
				v-else-if="parameter.type === 'options'"
				ref="inputField"
				:size="inputSize"
				filterable
				:value="displayValue"
				:placeholder="
					parameter.placeholder ? getPlaceholder() : $locale.baseText('parameterInput.select')
				"
				:loading="remoteParameterOptionsLoading"
				:disabled="isReadOnly || remoteParameterOptionsLoading"
				:title="displayTitle"
				@change="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
			>
				<n8n-option
					v-for="option in parameterOptions"
					:value="option.value"
					:key="option.value"
					:label="getOptionsOptionDisplayName(option)"
				>
					<div class="list-option">
						<div
							class="option-headline ph-no-capture"
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
				:value="displayValue"
				:loading="remoteParameterOptionsLoading"
				:disabled="isReadOnly || remoteParameterOptionsLoading"
				:title="displayTitle"
				:placeholder="$locale.baseText('parameterInput.select')"
				@change="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
			>
				<n8n-option
					v-for="option in parameterOptions"
					:value="option.value"
					:key="option.value"
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

			<el-switch
				v-else-if="parameter.type === 'boolean'"
				class="switch-input"
				ref="inputField"
				active-color="#13ce66"
				:value="displayValue"
				:disabled="isReadOnly"
				@change="valueChanged"
			/>
		</div>

		<parameter-issues v-if="parameter.type !== 'credentialsSelect' && !isResourceLocatorParameter" :issues="getIssues" />
	</div>
</template>

<script lang="ts">
/* eslint-disable prefer-spread */

import { get } from 'lodash';

import {
	INodeUi,
	INodeUpdatePropertiesInformation,
} from '@/Interface';
import {
	NodeHelpers,
	NodeParameterValue,
	ILoadOptions,
	INodeParameters,
	INodePropertyOptions,
	Workflow,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';

import CodeEdit from '@/components/CodeEdit.vue';
import CredentialsSelect from '@/components/CredentialsSelect.vue';
import ImportParameter from '@/components/ImportParameter.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import ScopesNotice from '@/components/ScopesNotice.vue';
import ParameterOptions from '@/components/ParameterOptions.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ResourceLocator from '@/components/ResourceLocator/ResourceLocator.vue';
// @ts-ignore
import PrismEditor from 'vue-prism-editor';
import TextEdit from '@/components/TextEdit.vue';
import CodeNodeEditor from '@/components/CodeNodeEditor/CodeNodeEditor.vue';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { hasExpressionMapping, isValueExpression } from './helpers';
import { isResourceLocatorValue } from '@/typeGuards';

import mixins from 'vue-typed-mixins';
import { CUSTOM_API_CALL_KEY } from '@/constants';
import { CODE_NODE_TYPE } from '@/constants';
import { PropType } from 'vue';
import { debounceHelper } from './mixins/debounce';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useNDVStore } from '@/stores/ndv';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useCredentialsStore } from '@/stores/credentials';

export default mixins(
	externalHooks,
	nodeHelpers,
	showMessage,
	workflowHelpers,
	debounceHelper,
)
	.extend({
		name: 'parameter-input',
		components: {
			CodeEdit,
			CodeNodeEditor,
			ExpressionEdit,
			NodeCredentials,
			CredentialsSelect,
			PrismEditor,
			ScopesNotice,
			ParameterOptions,
			ParameterIssues,
			ResourceLocator,
			TextEdit,
			ImportParameter,
		},
		props: {
			isReadOnly: {
				type: Boolean,
			},
			parameter: {
				type: Object as PropType<INodeProperties>,
			},
			path: {
				type: String,
			},
			value: {
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
		},
		data () {
			return {
				codeEditDialogVisible: false,
				nodeName: '',
				expressionAddOperation: 'set' as 'add' | 'set',
				expressionEditDialogVisible: false,
				remoteParameterOptions: [] as INodePropertyOptions[],
				remoteParameterOptionsLoading: false,
				remoteParameterOptionsLoadingIssues: null as string | null,
				textEditDialogVisible: false,
				tempValue: '', //  el-date-picker and el-input does not seem to work without v-model so add one
				CUSTOM_API_CALL_KEY,
				activeCredentialType: '',
				dateTimePickerOptions: {
					shortcuts: [
						{
							text: 'Today', // TODO
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								picker.$emit('pick', new Date());
							},
						},
						{
							text: 'Yesterday', // TODO
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								const date = new Date();
								date.setTime(date.getTime() - 3600 * 1000 * 24);
								picker.$emit('pick', date);
							},
						},
						{
							text: 'A week ago', // TODO
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								const date = new Date();
								date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
								picker.$emit('pick', date);
							},
						},
					],
				},
			};
		},
		watch: {
			dependentParametersValues () {
				// Reload the remote parameters whenever a parameter
				// on which the current field depends on changes
				this.loadRemoteParameterOptions();
			},
			value () {
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
			),
			expressionDisplayValue(): string {
				if (this.activeDrop || this.forceShowExpression) {
					return '';
				}

				const value = isResourceLocatorValue(this.value) ? this.value.value : this.value;
				if (typeof value === 'string' && value.startsWith('=')) {
					return value.slice(1);
				}

				return '';
			},
			isValueExpression(): boolean {
				return isValueExpression(this.parameter, this.value);
			},
			codeAutocomplete (): string | undefined {
				return this.getArgument('codeAutocomplete') as string | undefined;
			},
			dependentParametersValues (): string | null {
				const loadOptionsDependsOn = this.getArgument('loadOptionsDependsOn') as string[] | undefined;

				if (loadOptionsDependsOn === undefined) {
					return null;
				}

				// Get the resolved parameter values of the current node
				const currentNodeParameters = this.ndvStore.activeNode?.parameters;
				try {
					const resolvedNodeParameters = this.resolveParameter(currentNodeParameters);

					const returnValues: string[] = [];
					for (const parameterPath of loadOptionsDependsOn) {
						returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
					}

					return returnValues.join('|');
				} catch (error) {
					return null;
				}
			},
			node (): INodeUi | null {
				return this.ndvStore.activeNode;
			},
			displayTitle (): string {
				const interpolation = { interpolate: { shortPath: this.shortPath } };

				if (this.getIssues.length && this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasIssuesAndExpression',
						interpolation,
					);
				} else if (this.getIssues.length && !this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasIssues',
						interpolation,
					);
				} else if (!this.getIssues.length && this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasExpression',
						interpolation,
					);
				}

				return this.$locale.baseText('parameterInput.parameter', interpolation);
			},
			displayValue (): string | number | boolean | null {
				if (this.remoteParameterOptionsLoading === true) {
					// If it is loading options from server display
					// to user that the data is loading. If not it would
					// display the user the key instead of the value it
					// represents
					return this.$locale.baseText('parameterInput.loadingOptions');
				}

				let returnValue;
				if (this.isValueExpression === false) {
					returnValue = this.isResourceLocatorParameter ? (isResourceLocatorValue(this.value) ? this.value.value: '') : this.value;
				} else {
					returnValue = this.expressionEvaluated;
				}

				if (this.parameter.type === 'credentialsSelect' && typeof this.value === 'string') {
					const credType = this.credentialsStore.getCredentialTypeByName(this.value);
					if (credType) {
						returnValue = credType.displayName;
					}
				}

				if (Array.isArray(returnValue) && this.parameter.type === 'color' && this.getArgument('showAlpha') === true && returnValue.charAt(0) === '#') {
					// Convert the value to rgba that el-color-picker can display it correctly
					const bigint = parseInt(returnValue.slice(1), 16);
					const h = [];
					h.push((bigint >> 24) & 255);
					h.push((bigint >> 16) & 255);
					h.push((bigint >> 8) & 255);
					h.push((255 - bigint & 255) / 255);

					returnValue = 'rgba('+h.join()+')';
				}

				if (returnValue !== undefined && returnValue !== null && this.parameter.type === 'string') {
					const rows = this.getArgument('rows');
					if (rows === undefined || rows === 1) {
						returnValue = returnValue.toString().replace(/\n/, '|');
					}
				}

				return returnValue;
			},
			getStringInputType () {
				if (this.getArgument('password') === true) {
					return 'password';
				}

				const rows = this.getArgument('rows');
				if (rows !== undefined && rows > 1) {
					return 'textarea';
				}

				if (this.parameter.typeOptions && this.parameter.typeOptions.editor === 'code') {
					return 'textarea';
				}

				return 'text';
			},
			getIssues (): string[] {
				if (this.hideIssues === true || this.node === null) {
					return [];
				}

				const newPath = this.shortPath.split('.');
				newPath.pop();

				const issues = NodeHelpers.getParameterIssues(this.parameter, this.node.parameters, newPath.join('.'), this.node);

				if (this.parameter.type === 'credentialsSelect' && this.displayValue === '') {
					issues.parameters = issues.parameters || {};

					const issue = this.$locale.baseText('parameterInput.selectACredentialTypeFromTheDropdown');

					issues.parameters[this.parameter.name] = [issue];
				} else if (
					['options', 'multiOptions'].includes(this.parameter.type) &&
					this.remoteParameterOptionsLoading === false &&
					this.remoteParameterOptionsLoadingIssues === null &&
					this.parameterOptions
				) {
					// Check if the value resolves to a valid option
					// Currently it only displays an error in the node itself in
					// case the value is not valid. The workflow can still be executed
					// and the error is not displayed on the node in the workflow
					const validOptions = this.parameterOptions.map((options) => (options as INodePropertyOptions).value);

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

							const issue = this.$locale.baseText(
								'parameterInput.theValueIsNotSupported',
								{ interpolate: { checkValue } },
							);

							issues.parameters[this.parameter.name] = [issue];
						}
					}
				} else if (this.remoteParameterOptionsLoadingIssues !== null) {
					if (issues.parameters === undefined) {
						issues.parameters = {};
					}
					issues.parameters[this.parameter.name] = [`There was a problem loading the parameter options from server: "${this.remoteParameterOptionsLoadingIssues}"`];
				}

				if (issues !== undefined &&
					issues.parameters !== undefined &&
					issues.parameters[this.parameter.name] !== undefined) {
					return issues.parameters[this.parameter.name];
				}

				return [];
			},
			isEditor (): boolean {
				return ['code', 'json'].includes(this.editorType);
			},
			editorType (): string {
				return this.getArgument('editor') as string;
			},
			parameterOptions (): Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> | undefined {
				if (this.hasRemoteMethod === false) {
					// Options are already given
					return this.parameter.options;
				}

				// Options get loaded from server
				return this.remoteParameterOptions;
			},
			parameterInputClasses () {
				const classes: {[c: string]: boolean} = {
					droppable: this.droppable,
					activeDrop: this.activeDrop,
				};

				const rows = this.getArgument('rows');
				const isTextarea = this.parameter.type === 'string' && rows !== undefined;
				const isSwitch = this.parameter.type === 'boolean' && !this.isValueExpression;

				if (!isTextarea && !isSwitch) {
					classes['parameter-value-container'] = true;
				}

				if (this.isValueExpression || this.forceShowExpression) {
					classes['expression'] = true;
				}
				if (!this.droppable && !this.activeDrop && (this.getIssues.length || this.errorHighlight)) {
					classes['has-issues'] = true;
				}

				return classes;
			},
			parameterInputWrapperStyle () {
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
			hasRemoteMethod (): boolean {
				return !!this.getArgument('loadOptionsMethod') || !!this.getArgument('loadOptions');
			},
			shortPath (): string {
				const shortPath = this.path.split('.');
				shortPath.shift();
				return shortPath.join('.');
			},
			workflow (): Workflow {
				return this.getCurrentWorkflow();
			},
			isResourceLocatorParameter (): boolean {
				return this.parameter.type === 'resourceLocator';
			},
		},
		methods: {
			isRemoteParameterOption(option: INodePropertyOptions) {
				return this.remoteParameterOptions.map(o => o.name).includes(option.name);
			},
			credentialSelected (updateInformation: INodeUpdatePropertiesInformation) {
				// Update the values on the node
				this.workflowsStore.updateNodeProperties(updateInformation);

				const node = this.workflowsStore.getNodeByName(updateInformation.name);

				if (node) {
					// Update the issues
					this.updateNodeCredentialIssues(node);
				}

				this.$externalHooks().run('nodeSettings.credentialSelected', { updateInformation });
			},
			/**
			 * Check whether a param value must be skipped when collecting node param issues for validation.
			 */
			skipCheck(value: string | number | boolean | null) {
				return typeof value === 'string' && value.includes(CUSTOM_API_CALL_KEY);
			},
			getPlaceholder(): string {
				return this.isForCredential
					? this.$locale.credText().placeholder(this.parameter)
					: this.$locale.nodeText().placeholder(this.parameter, this.path);
			},
			getOptionsOptionDisplayName(option: INodePropertyOptions): string {
				return this.isForCredential
					? this.$locale.credText().optionsOptionDisplayName(this.parameter, option)
					: this.$locale.nodeText().optionsOptionDisplayName(this.parameter, option, this.path);
			},
			getOptionsOptionDescription(option: INodePropertyOptions): string {
				return this.isForCredential
					? this.$locale.credText().optionsOptionDescription(this.parameter, option)
					: this.$locale.nodeText().optionsOptionDescription(this.parameter, option, this.path);
			},

			async loadRemoteParameterOptions () {
				if (this.node === null || this.hasRemoteMethod === false || this.remoteParameterOptionsLoading) {
					return;
				}
				this.remoteParameterOptionsLoadingIssues = null;
				this.remoteParameterOptionsLoading = true;
				this.remoteParameterOptions.length = 0;

				// Get the resolved parameter values of the current node

				try {
					const currentNodeParameters = (this.ndvStore.activeNode as INodeUi).parameters;
					const resolvedNodeParameters = this.resolveParameter(currentNodeParameters) as INodeParameters;
					const loadOptionsMethod = this.getArgument('loadOptionsMethod') as string | undefined;
					const loadOptions = this.getArgument('loadOptions') as ILoadOptions | undefined;

					const options = await this.nodeTypesStore.getNodeParameterOptions(
						{
							nodeTypeAndVersion: {
								name: this.node.type,
								version: this.node.typeVersion,
							},
							path: this.path,
							methodName: loadOptionsMethod,
							loadOptions,
							currentNodeParameters: resolvedNodeParameters,
							credentials: this.node.credentials,
						},
					);

					this.remoteParameterOptions.push.apply(this.remoteParameterOptions, options);
				} catch (error) {
					this.remoteParameterOptionsLoadingIssues = error.message;
				}

				this.remoteParameterOptionsLoading = false;
			},
			closeCodeEditDialog () {
				this.codeEditDialogVisible = false;
			},
			closeExpressionEditDialog () {
				this.expressionEditDialogVisible = false;
			},
			trackExpressionEditOpen () {
				if(!this.node) {
					return;
				}

				if((this.node.type as string).startsWith('n8n-nodes-base')) {
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
			closeTextEditDialog () {
				this.textEditDialogVisible = false;
			},
			displayEditDialog () {
				if (this.isEditor) {
					this.codeEditDialogVisible = true;
				} else {
					this.textEditDialogVisible = true;
				}
			},
			getArgument (argumentName: string): string | number | boolean | undefined {
				if (this.parameter.typeOptions === undefined) {
					return undefined;
				}

				if (this.parameter.typeOptions[argumentName] === undefined) {
					return undefined;
				}

				return this.parameter.typeOptions[argumentName];
			},
			expressionUpdated (value: string) {
				const val: NodeParameterValueType = this.isResourceLocatorParameter ? { __rl: true, value, mode: this.value.mode } : value;
				this.valueChanged(val);
			},
			openExpressionEdit() {
				if (this.isValueExpression) {
					this.expressionEditDialogVisible = true;
					this.trackExpressionEditOpen();
					return;
				}
			},
			onBlur () {
				this.$emit('blur');
			},
			onResourceLocatorDrop(data: string) {
				this.$emit('drop', data);
			},
			setFocus () {
				if (this.isValueExpression) {
					this.expressionEditDialogVisible = true;
					this.trackExpressionEditOpen();
					return;
				}

				if (['json', 'string'].includes(this.parameter.type) && this.getArgument('alwaysOpenEditWindow')) {
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

				// Set focus on field
				setTimeout(() => {
					// @ts-ignore
					if (this.$refs.inputField && this.$refs.inputField.$el) {
						// @ts-ignore
						this.$refs.inputField.focus();
					}
				});

				this.$emit('focus');
			},
			isCodeNode(node: INodeUi): boolean {
				return node.type === CODE_NODE_TYPE;
			},
			rgbaToHex (value: string): string | null {
				// Convert rgba to hex from: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
				const valueMatch = (value as string).match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)$/);
				if (valueMatch === null) {
					// TODO: Display something if value is not valid
					return null;
				}
				const [r, g, b, a] = valueMatch.splice(1, 4).map(v => Number(v));
				return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1) + ((1 << 8) + Math.floor((1-a)*255)).toString(16).slice(1);
			},
			onTextInputChange (value: string) {
				const parameterData = {
					node: this.node !== null ? this.node.name : this.nodeName,
					name: this.path,
					value,
				};

				this.$emit('textInput', parameterData);
			},
			valueChangedDebounced (value: NodeParameterValueType | {} | Date) {
				this.callDebounced('valueChanged', { debounceTime: 100 }, value);
			},
			valueChanged (value: NodeParameterValueType | {} | Date) {
				if (this.parameter.name === 'nodeCredentialType') {
					this.activeCredentialType = value as string;
				}

				if (value instanceof Date) {
					value = value.toISOString();
				}

				if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true && value !== null && value !== undefined && value.toString().charAt(0) !== '#') {
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

				this.$emit('valueChanged', parameterData);

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
			optionSelected (command: string) {
				const prevValue = this.value;

				if (command === 'resetValue') {
					this.valueChanged(this.parameter.default);
				} else if (command === 'openExpression') {
					this.expressionEditDialogVisible = true;
				} else if (command === 'addExpression') {
					if (this.isResourceLocatorParameter) {
						if (isResourceLocatorValue(this.value)) {
							this.valueChanged({ __rl: true, value: `=${this.value.value}`, mode: this.value.mode });
						} else {
							this.valueChanged({ __rl: true, value: `=${this.value}`, mode: '' });
						}
					}
					else if (this.parameter.type === 'number' || this.parameter.type === 'boolean') {
						this.valueChanged(`={{${this.value}}}`);
					}
					else {
						this.valueChanged(`=${this.value}`);
					}

					setTimeout(() => {
						this.expressionEditDialogVisible = true;
						this.trackExpressionEditOpen();
					}, 375);
				} else if (command === 'removeExpression') {
					let value: NodeParameterValueType = this.expressionEvaluated;

					if (this.parameter.type === 'multiOptions' && typeof value === 'string') {
						value = (value || '').split(',')
							.filter((value) => (this.parameterOptions || []).find((option) => (option as INodePropertyOptions).value === value));
					}

					if (this.isResourceLocatorParameter && isResourceLocatorValue(this.value)) {
						this.valueChanged({ __rl: true, value, mode: this.value.mode });
					} else {
						this.valueChanged(typeof value !== 'undefined' ? value : null);
					}
				} else if (command === 'refreshOptions') {
					if (this.isResourceLocatorParameter) {
						const resourceLocator = this.$refs.resourceLocator;
						if (resourceLocator) {
							(resourceLocator as Vue).$emit('refreshList');
						}
					}
					this.loadRemoteParameterOptions();
				}

				if (this.node && (command === 'addExpression' || command === 'removeExpression')) {
					const telemetryPayload = {
						node_type: this.node.type,
						parameter: this.path,
						old_mode: command === 'addExpression' ? 'fixed': 'expression',
						new_mode: command === 'removeExpression' ? 'fixed': 'expression',
						was_parameter_empty: prevValue === '' || prevValue === undefined,
						had_mapping: hasExpressionMapping(prevValue),
						had_parameter: typeof prevValue === 'string' && prevValue.includes('$parameter'),
					};
					this.$telemetry.track('User switched parameter mode', telemetryPayload);
					this.$externalHooks().run('parameterInput.modeSwitch', telemetryPayload);
				}
			},
		},
		updated () {
			this.$nextTick(() => {
				const remoteParameterOptions = this.$el.querySelectorAll('.remote-parameter-option');

				if (remoteParameterOptions.length > 0) {
					this.$externalHooks().run('parameterInput.updated', { remoteParameterOptions });
				}
			});
		},
		mounted () {
			this.$on('optionSelected', this.optionSelected);

			this.tempValue = this.displayValue as string;
			if (this.node !== null) {
				this.nodeName = this.node.name;
			}

			if (this.node && this.node.parameters.authentication === 'predefinedCredentialType') {
				this.activeCredentialType = this.node.parameters.nodeCredentialType as string;
			}

			if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true && this.displayValue !== null && this.displayValue.toString().charAt(0) !== '#') {
				const newValue = this.rgbaToHex(this.displayValue as string);
				if (newValue !== null) {
					this.tempValue = newValue;
				}
			}

			if (this.hasRemoteMethod === true && this.node !== null) {
				// Make sure to load the parameter options
				// directly and whenever the credentials change
				this.$watch(() => this.node!.credentials, () => {
					this.loadRemoteParameterOptions();
				}, { deep: true, immediate: true });

				// Reload function on change element from
				// displayOptions.typeOptions.reloadOnChange parameters
				if (this.parameter.typeOptions && this.parameter.typeOptions.reloadOnChange) {
					// Get all parameter in reloadOnChange property
					// This reload when parameters in reloadOnChange is updated
					const parametersOnChange : string[] = this.parameter.typeOptions.reloadOnChange;
					for (let i = 0; i < parametersOnChange.length; i++) {
						const parameter = parametersOnChange[i] as string;
						if (parameter in this.node.parameters) {
							this.$watch(() => {
								if (this.node && this.node.parameters && this.node.parameters[parameter]) {
									return this.node.parameters![parameter];
								} else {
									return null;
								}
							}, () => {
								this.loadRemoteParameterOptions();
							}, { deep: true, immediate: true });
						}
					}
				}
			}

			this.$externalHooks().run('parameterInput.mount', { parameter: this.parameter, inputFieldRef: this.$refs['inputField'] });
		},
	});
</script>

<style scoped lang="scss">

.code-edit {
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
}

::v-deep .color-input {
	display: flex;

	.el-color-picker__trigger {
		border: none;
	}
}
</style>

<style lang="scss">

.ql-editor {
	padding: 6px;
	line-height: 26px;
	background-color: #f0f0f0;
}

.expression {
	textarea, input {
		cursor: pointer !important;
	}

	--input-border-color: var(--color-secondary-tint-1);
	--input-background-color: var(--color-secondary-tint-3);
	--input-font-color: var(--color-secondary);
}


.droppable {
	--input-border-color: var(--color-secondary-tint-1);
	--input-background-color: var(--color-secondary-tint-3);
	--input-border-style: dashed;
}

.activeDrop {
	--input-border-color: var(--color-success);
	--input-background-color: var(--color-success-tint-2);
	--input-border-style: solid;

	textarea, input {
		cursor: grabbing !important;
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

</style>
